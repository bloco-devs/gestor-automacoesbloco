import { useCallback, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { useSetoresNomes } from "@/hooks/useSetores";
import { useEcossistemaSistemas } from "@/hooks/useEcossistemaSistemas";
import { createSolicitacao } from "@/lib/supabaseData";
import { computeScoreSolicitante } from "@/lib/scoreV2";
import type { TipoDemanda } from "@/lib/types";
import { TIPO_DEMANDA_LABEL } from "@/lib/types";

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
}

const MAX_USER_TURNS = 2; // no máximo 2 perguntas de IA => 2 respostas do usuário

function deriveTitulo(descricao: string): string {
  const s = descricao.trim().replace(/\s+/g, " ");
  if (!s) return "Nova solicitação";
  const firstSentence = s.split(/(?<=[.!?])\s/)[0] ?? s;
  const base = firstSentence.length > 90 ? firstSentence.slice(0, 87).trim() + "…" : firstSentence;
  return base.charAt(0).toUpperCase() + base.slice(1);
}

function impactoLabel(retorno: number): string {
  if (retorno >= 8) return "Alto";
  if (retorno >= 5) return "Médio-alto";
  if (retorno >= 3) return "Médio";
  return "Baixo";
}

export function impactoFor(retorno: number) {
  return impactoLabel(retorno);
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

  const [phase, setPhase] = useState<Phase>("welcome");
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [thinking, setThinking] = useState(false);
  const [preview, setPreview] = useState<AiPreview | null>(null);
  const cancelled = useRef(false);

  const userTurns = useMemo(() => messages.filter((m) => m.role === "user").length, [messages]);

  const previewScore = useMemo(
    () =>
      preview
        ? Math.round(
            computeScoreSolicitante(preview.frequencia, preview.dificuldade, preview.retorno),
          )
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

  const askNext = useCallback(
    async (history: ChatMsg[]) => {
      const { data, error } = await supabase.functions.invoke("assistente-demanda", {
        body: { action: "next_question", messages: history },
      });
      if (error) throw error;
      if ((data as { error?: string })?.error) throw new Error((data as { error: string }).error);
      return data as { done: boolean; question: string | null };
    },
    [],
  );

  const generateDescription = useCallback(async (history: ChatMsg[]) => {
    const { data, error } = await supabase.functions.invoke("assistente-demanda", {
      body: { action: "generate_description", messages: history },
    });
    if (error) throw error;
    if ((data as { error?: string })?.error) throw new Error((data as { error: string }).error);
    return String((data as { description?: string }).description ?? "").trim();
  }, []);

  const runTriagem = useCallback(
    async (titulo: string, descricao: string) => {
      const { data, error } = await supabase.functions.invoke("triagem-demanda", {
        body: {
          titulo,
          descricao,
          setor: "",
          sistemas: sistemas.map((s) => ({ slug: s.id, nome: s.nome })),
        },
      });
      if (error) throw error;
      if ((data as { error?: string })?.error) throw new Error((data as { error: string }).error);
      return data as {
        frequencia: number;
        dificuldade: number;
        retorno: number;
        complexidade_dev: number;
        tipo_demanda: TipoDemanda | null;
        sistema_alvo_slug: string | null;
        justificativa: string | null;
      };
    },
    [sistemas],
  );

  const runSimilares = useCallback(async (titulo: string, descricao: string) => {
    try {
      const { data, error } = await supabase.functions.invoke("demandas-similares", {
        body: { titulo, descricao },
      });
      if (error) return [];
      const arr = (data as { similares?: unknown })?.similares;
      return Array.isArray(arr) ? (arr as AiPreview["similares"]) : [];
    } catch {
      return [];
    }
  }, []);

  const finalize = useCallback(
    async (history: ChatMsg[]) => {
      setPhase("processing");
      try {
        const descricao = await generateDescription(history);
        if (cancelled.current) return;
        const titulo = deriveTitulo(descricao);
        const [triagem, similares] = await Promise.all([
          runTriagem(titulo, descricao),
          runSimilares(titulo, descricao),
        ]);
        if (cancelled.current) return;

        const setorInicial = setoresDisponiveis[0] || "";
        const sistemaNome =
          triagem.sistema_alvo_slug
            ? sistemas.find((s) => s.id === triagem.sistema_alvo_slug)?.nome ?? null
            : null;
        const tags: string[] = [];
        if (triagem.tipo_demanda) tags.push(TIPO_DEMANDA_LABEL[triagem.tipo_demanda]);
        if (sistemaNome) tags.push(sistemaNome);
        if (setorInicial) tags.push(setorInicial);

        setPreview({
          titulo,
          descricao,
          setor: setorInicial,
          tipoDemanda: triagem.tipo_demanda,
          sistemaAlvoSlug: triagem.sistema_alvo_slug,
          frequencia: triagem.frequencia,
          dificuldade: triagem.dificuldade,
          retorno: triagem.retorno,
          complexidadeDev: triagem.complexidade_dev,
          justificativa: triagem.justificativa,
          tags,
          similares,
          responsavelSugerido: "A definir pela triagem do time",
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
    [generateDescription, runSimilares, runTriagem, setoresDisponiveis, sistemas, toast],
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
        const nextUserTurns = nextHistory.filter((m) => m.role === "user").length;
        if (nextUserTurns >= MAX_USER_TURNS) {
          setThinking(false);
          await finalize(nextHistory);
          return;
        }
        const res = await askNext(nextHistory);
        if (res.done || !res.question) {
          setThinking(false);
          await finalize(nextHistory);
          return;
        }
        setMessages((m) => [...m, { role: "assistant", content: res.question! }]);
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
    [askNext, finalize, messages, phase, thinking, toast],
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
      // Best-effort: match ecossistema em background (mesmo padrão do fluxo clássico)
      void (async () => {
        try {
          const { data, error } = await supabase.functions.invoke("match-ecossistema", {
            body: {
              titulo: preview.titulo,
              descricao: preview.descricao,
              tipo_demanda: preview.tipoDemanda,
              sistema_alvo_slug: preview.sistemaAlvoSlug,
            },
          });
          if (error) return;
          const candidatos = Array.isArray((data as { candidatos?: unknown[] } | null)?.candidatos)
            ? (data as { candidatos: unknown[] }).candidatos
            : [];
          const { salvarMatchEcossistema } = await import("@/lib/supabaseData");
          await salvarMatchEcossistema(nova.id, candidatos as never);
        } catch { /* silencioso */ }
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
