import { useCallback, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { useSetoresNomes } from "@/hooks/useSetores";
import { useEcossistemaSistemas } from "@/hooks/useEcossistemaSistemas";
import { salvarMatchEcossistema } from "@/lib/supabaseData";
import { useCriarDemanda } from "@/modules/demand-access";
import {
  complexidadeDeEscala,
  criteriosMinimos,
  prioridadeDeScore,
  tipoDeClassificacao,
  type NovaDemanda,
} from "@/domain/demand";
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
  const { criar } = useCriarDemanda();
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
    [finalize, messages, phase, thinking, toast, workspaceContext],
  );

  const updatePreview = useCallback((patch: Partial<AiPreview>) => {
    setPreview((p) => (p ? { ...p, ...patch } : p));
  }, []);

  /**
   * A demanda que a conversa produziu, no formato do domínio.
   *
   * Fica fora do `confirmSubmit` para que o preview possa mostrar exatamente
   * o que vai ser criado. Preview que mostra uma coisa e grava outra é pior
   * que não ter preview.
   */
  const demandaDoPreview = useMemo<NovaDemanda | null>(() => {
    if (!preview) return null;
    const criterios = criteriosMinimos(
      preview.titulo,
      // A conversa ainda não devolve critérios estruturados; quando devolver,
      // basta trocar esta linha. Até lá o piso garante que nasçam com algum.
      [],
    );
    return {
      titulo: preview.titulo,
      resumo: preview.descricao,
      descricaoTecnica: preview.justificativa ?? "",
      tipo: tipoDeClassificacao(preview.tipoDemanda, `${preview.titulo} ${preview.descricao}`),
      complexidade: complexidadeDeEscala(preview.complexidadeDev),
      prioridade: prioridadeDeScore(previewScore),
      sistemaId: preview.sistemaAlvoSlug,
      criteriosDeAceite: criterios,
      origemIa: true,
      confianca: preview.intent?.confidence ?? 0.5,
    };
  }, [preview, previewScore]);

  /**
   * Confirmar cria uma DEMANDA, não uma solicitação.
   *
   * Antes havia duas esteiras: a conversa gerava uma `solicitacao`, e alguém
   * depois a transformava em demanda. Essa segunda etapa era triagem manual —
   * exatamente o que a IA existe para eliminar. E a tabela de solicitações não
   * é lida por nenhuma lente do Workspace, então o desenvolvedor nunca via o
   * que a IA tinha produzido.
   *
   * Agora o usuário confirma e o trabalho aparece na fila de quem vai fazer.
   */
  const confirmSubmit = useCallback(async () => {
    if (!demandaDoPreview || !user) return;
    setPhase("submitting");
    try {
      const { id } = await criar(demandaDoPreview);

      // O casamento com o ecossistema continua acontecendo, em segundo plano:
      // ele enriquece o contexto e nunca deve segurar a confirmação de quem
      // acabou de descrever um problema.
      void (async () => {
        const candidatos = await aiOrchestrator.matchEcossistema({
          titulo: demandaDoPreview.titulo,
          descricao: demandaDoPreview.resumo,
          tipo_demanda: preview?.tipoDemanda ?? null,
          sistema_alvo_slug: demandaDoPreview.sistemaId,
        });
        if (candidatos.length) {
          try {
            await salvarMatchEcossistema(id, candidatos as never);
          } catch { /* silencioso */ }
        }
      })();

      toast({ title: "Demanda criada", description: "Você pode acompanhar o andamento por aqui." });
      // Vai para a demanda, não para uma lista: a pessoa acabou de descrever
      // um problema e quer ver o que virou disso.
      navigate(`/demandas/${id}`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Erro ao salvar";
      toast({ title: "Falha ao criar a demanda", description: msg, variant: "destructive" });
      setPhase("preview");
    }
  }, [criar, demandaDoPreview, navigate, preview, toast, user]);

  return {
    phase,
    messages,
    thinking,
    userTurns,
    maxUserTurns: MAX_USER_TURNS,
    preview,
    previewScore,
    demandaDoPreview,
    setoresDisponiveis,
    sistemas,
    sendMessage,
    updatePreview,
    confirmSubmit,
    reset,
    goBackToChat: () => setPhase("chatting"),
  };
}
