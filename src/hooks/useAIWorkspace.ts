import { useCallback, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { useSetoresNomes } from "@/hooks/useSetores";
import { useEcossistemaSistemas } from "@/hooks/useEcossistemaSistemas";
import { createSolicitacao, salvarMatchEcossistema } from "@/lib/supabaseData";
import { computeScoreSolicitante } from "@/lib/scoreV2";
import type { TipoDemanda } from "@/lib/types";
import { TIPO_DEMANDA_LABEL } from "@/lib/types";
import { aiOrchestrator, type OrchestratorDecision } from "@/modules/ai";
import { useAIWorkspaceSnapshot } from "@/modules/context";

export type ChatRole = "user" | "assistant";
export type ChatMsg = { role: ChatRole; content: string };
export type Phase = "welcome" | "chatting" | "processing" | "preview" | "submitting";

export interface AiPreview {
  titulo: string;
  descricao: string;
  setor: string;
  tipoDemanda: TipoDemanda | null;
  sistemaAlvoSlug: string | null;
  frequencia: number;
  dificuldade: number;
  retorno: number;
  complexidadeDev: number;
  justificativa: string | null;
  tags: string[];
  similares: Array<{ id: string; titulo: string; similaridade: number; motivo: string }>;
  responsavelSugerido: string;
  intent?: OrchestratorDecision["classification"] | null;
}

const MAX_USER_TURNS = 2;

export function impactoFor(retorno: number) {
  if (retorno >= 8) return "Alto";
  if (retorno >= 5) return "Médio-alto";
  if (retorno >= 3) return "Médio";
  return "Baixo";
}

export function complexidadeLabel(v: number): string {
  if (v <= 2) return "Trivial";
  if (v <= 4) return "Fácil";
  if (v <= 6) return "Moderada";
  if (v <= 8) return "Difícil";
  return "Crítica";
}

export function prioridadeLabel(score: number): string {
  if (score >= 75) return "Alta";
  if (score >= 45) return "Média";
  return "Baixa";
}

export function useAIWorkspace() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const setoresDisponiveis = useSetoresNomes();
  const { sistemas } = useEcossistemaSistemas(true);
  const workspaceContext = useAIWorkspaceSnapshot();

  const [phase, setPhase] = useState<Phase>("welcome");
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [thinking, setThinking] = useState(false);
  const [preview, setPreview] = useState<AiPreview | null>(null);
  const cancelled = useRef(false);

  const userTurns = useMemo(() => messages.filter((m) => m.role === "user").length, [messages]);

  const previewScore = useMemo(
    () =>
      preview
        ? Math.round(computeScoreSolicitante(preview.frequencia, preview.dificuldade, preview.retorno))
        : 0,
    [preview],
  );

  const reset = useCallback(() => {
    cancelled.current = true;
    setPhase("welcome");
    setMessages([]);
    setThinking(false);
    setPreview(null);
    setTimeout(() => (cancelled.current = false), 50);
  }, []);

  const finalize = useCallback(
    async (history: ChatMsg[]) => {
      setPhase("processing");
      try {
        const result = await aiOrchestrator.finalize({
          conversation: history,
          sistemas: sistemas.map((s) => ({ slug: s.id, nome: s.nome })),
          workspaceContext,
        });
        if (cancelled.current) return;

        const setorInicial = setoresDisponiveis[0] || "";
        const sistemaNome = result.triagem.sistema_alvo_slug
          ? sistemas.find((s) => s.id === result.triagem.sistema_alvo_slug)?.nome ?? null
          : null;
        const tags: string[] = [];
        const tipo = result.triagem.tipo_demanda as TipoDemanda | null;
        if (tipo) tags.push(TIPO_DEMANDA_LABEL[tipo]);
        if (sistemaNome) tags.push(sistemaNome);
        if (setorInicial) tags.push(setorInicial);

        setPreview({
          titulo: result.titulo,
          descricao: result.descricao,
          setor: setorInicial,
          tipoDemanda: tipo,
          sistemaAlvoSlug: result.triagem.sistema_alvo_slug,
          frequencia: result.triagem.frequencia,
          dificuldade: result.triagem.dificuldade,
          retorno: result.triagem.retorno,
          complexidadeDev: result.triagem.complexidade_dev,
          justificativa: result.triagem.justificativa,
          tags,
          similares: result.similares,
          responsavelSugerido: "A definir pela triagem do time",
          intent: result.decision.classification,
        });
        setPhase("preview");
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Erro ao processar";
        const friendly = /429|muitas solicita/i.test(msg)
          ? "Muitas solicitações à IA. Aguarde alguns instantes e tente novamente."
          : msg;
        toast({ title: "Não foi possível concluir", description: friendly, variant: "destructive" });
        setPhase("chatting");
      }
    },
    [setoresDisponiveis, sistemas, toast, workspaceContext],
  );

  const sendMessage = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || thinking) return;
      const nextHistory: ChatMsg[] = [...messages, { role: "user", content: trimmed }];
      setMessages(nextHistory);
      if (phase === "welcome") setPhase("chatting");
      setThinking(true);
      try {
        const turn = await aiOrchestrator.runTurn(nextHistory, { maxUserTurns: MAX_USER_TURNS, workspaceContext });
        if (turn.shouldFinalize) {
          setThinking(false);
          await finalize(nextHistory);
          return;
        }
        if (turn.nextQuestion) {
          setMessages((m) => [...m, { role: "assistant", content: turn.nextQuestion! }]);
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Erro ao conversar com a IA";
        const friendly = /429|muitas solicita/i.test(msg)
          ? "Muitas solicitações à IA. Aguarde alguns instantes."
          : msg;
        toast({ title: "IA indisponível", description: friendly, variant: "destructive" });
      } finally {
        setThinking(false);
      }
    },
    [finalize, messages, phase, thinking, toast],
  );

  const updatePreview = useCallback((patch: Partial<AiPreview>) => {
    setPreview((p) => (p ? { ...p, ...patch } : p));
  }, []);

  const confirmSubmit = useCallback(async () => {
    if (!preview || !user) return;
    if (!preview.setor) {
      toast({ title: "Setor obrigatório", description: "Selecione o setor no preview.", variant: "destructive" });
      return;
    }
    setPhase("submitting");
    try {
      const nova = await createSolicitacao({
        titulo: preview.titulo,
        descricao: preview.descricao,
        softwares: preview.sistemaAlvoSlug
          ? [sistemas.find((s) => s.id === preview.sistemaAlvoSlug)?.nome ?? preview.sistemaAlvoSlug]
          : [],
        frequencia: preview.frequencia,
        dificuldade: preview.dificuldade,
        retorno: preview.retorno,
        setor: preview.setor,
        solicitanteId: user.id,
        solicitanteNome: user.nome,
        email: user.email,
        tipoDemanda: preview.tipoDemanda,
        sistemaAlvoSlug: preview.sistemaAlvoSlug,
      });
      void (async () => {
        const candidatos = await aiOrchestrator.matchEcossistema({
          titulo: preview.titulo,
          descricao: preview.descricao,
          tipo_demanda: preview.tipoDemanda,
          sistema_alvo_slug: preview.sistemaAlvoSlug,
        });
        if (candidatos.length) {
          try {
            await salvarMatchEcossistema(nova.id, candidatos as never);
          } catch { /* silencioso */ }
        }
      })();
      toast({ title: "Solicitação registrada", description: "Você poderá acompanhar em Minhas Solicitações." });
      navigate("/minhas-solicitacoes");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Erro ao salvar";
      toast({ title: "Falha ao criar solicitação", description: msg, variant: "destructive" });
      setPhase("preview");
    }
  }, [navigate, preview, sistemas, toast, user]);

  return {
    phase,
    messages,
    thinking,
    userTurns,
    maxUserTurns: MAX_USER_TURNS,
    preview,
    previewScore,
    setoresDisponiveis,
    sistemas,
    sendMessage,
    updatePreview,
    confirmSubmit,
    reset,
    goBackToChat: () => setPhase("chatting"),
  };
}
