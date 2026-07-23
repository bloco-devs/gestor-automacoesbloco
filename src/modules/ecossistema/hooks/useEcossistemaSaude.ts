/**
 * useEcossistemaSaude — agregados reais do Ecossistema.
 *
 * Fontes:
 *  - `ecossistema-mapa` (via `useEcossistemaSistemas` já existente) para catálogo vivo do HUB.
 *  - `solicitacoes` (banco local) para uso real: demandas por sistema, reaproveitamento,
 *    matches recentes.
 *  - `knowledge_articles` para cruzar sistemas sem documentação.
 *  - `duplicatePreventionAnalytics` (localStorage) para "chamados duplicados evitados".
 *
 * Nada de heurísticas: só contagens e cruzamentos.
 */
import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useEcossistemaSistemas, type SistemaAlvoOption } from "@/hooks/useEcossistemaSistemas";
import { readDuplicatePreventionMetrics } from "../utils/duplicatePreventionAnalytics";
import { logEcossistemaEvent, readLastEcossistemaEvent } from "../utils/observability";

const STALE = 60_000;
const GC = 5 * 60_000;

interface SolicitacaoAggRow {
  id: string;
  sistema_alvo_slug: string | null;
  atendida_por_sistema_slug: string | null;
  desfecho: string | null;
  status: string | null;
  created_at: string;
  match_atualizado_em: string | null;
  titulo: string | null;
}

interface KnowledgeArticleAggRow {
  id: string;
  titulo: string | null;
  metadata: Record<string, unknown> | null;
}

async function fetchSolicitacoesAgg(sinceIso: string): Promise<SolicitacaoAggRow[]> {
  const { data, error } = await supabase
    .from("solicitacoes")
    .select("id, sistema_alvo_slug, atendida_por_sistema_slug, desfecho, status, created_at, match_atualizado_em, titulo")
    .gte("created_at", sinceIso)
    .limit(1000);
  if (error) return [];
  return (data ?? []) as SolicitacaoAggRow[];
}

async function fetchKnowledgeArticles(): Promise<KnowledgeArticleAggRow[]> {
  const { data, error } = await supabase
    .from("knowledge_articles")
    .select("id, titulo, metadata")
    .eq("status", "published")
    .is("deleted_at", null)
    .limit(1000);
  if (error) return [];
  return (data ?? []) as KnowledgeArticleAggRow[];
}

export interface SistemaMetric {
  slug: string;
  nome: string;
  grupo: string | null;
  demandasTotal: number;
  demandasAbertas: number;
  reaproveitamentos: number;
  temDocumentacao: boolean;
  temResponsavel: boolean;
  crescimentoPct: number; // vs. primeira metade do período
}

export interface EcossistemaSaudeResult {
  fonte: "hub" | "semente" | null;
  totalSistemas: number;
  semDocumentacao: number;
  semResponsavel: number;
  comMuitasDemandas: number;
  maiorCrescimento: SistemaMetric | null;
  atualizadoEm: number;
  ultimoReprocessadoEm: number | null;
  demandasEvitadasLocal: number;
  taxaReaproveitamento: number;
  totalReaproveitados: number;
  matchesAtualizadosRecentes: number;
  sistemas: SistemaMetric[];
  novosSistemas7d: SistemaMetric[];
  loading: boolean;
  error: string | null;
}

function articleMentionsSistema(a: KnowledgeArticleAggRow, slug: string, nome: string): boolean {
  const meta = a.metadata ?? {};
  const metaSlug = typeof (meta as { sistema_slug?: unknown }).sistema_slug === "string"
    ? String((meta as { sistema_slug?: string }).sistema_slug).toLowerCase()
    : null;
  if (metaSlug && metaSlug === slug.toLowerCase()) return true;
  const titulo = (a.titulo ?? "").toLowerCase();
  return titulo.includes(slug.toLowerCase()) || (nome.length > 2 && titulo.includes(nome.toLowerCase()));
}

export function useEcossistemaSaude(): EcossistemaSaudeResult {
  const eco = useEcossistemaSistemas(true);

  const sinceIso = useMemo(() => new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString(), []);

  const solicQ = useQuery({
    queryKey: ["ecossistema", "saude", "solicitacoes", sinceIso],
    queryFn: () => fetchSolicitacoesAgg(sinceIso),
    staleTime: STALE,
    gcTime: GC,
  });

  const artigosQ = useQuery({
    queryKey: ["ecossistema", "saude", "artigos"],
    queryFn: fetchKnowledgeArticles,
    staleTime: 5 * 60_000,
    gcTime: GC,
  });

  const result = useMemo<EcossistemaSaudeResult>(() => {
    const sistemas: SistemaAlvoOption[] = eco.sistemas ?? [];
    const solic = solicQ.data ?? [];
    const artigos = artigosQ.data ?? [];
    const now = Date.now();
    const half = now - 45 * 24 * 60 * 60 * 1000;
    const oneWeekAgo = now - 7 * 24 * 60 * 60 * 1000;

    const sistemaRows: SistemaMetric[] = sistemas.map((s) => {
      const slugLower = String(s.id).toLowerCase();
      const demandas = solic.filter((d) => (d.sistema_alvo_slug ?? "").toLowerCase() === slugLower);
      const abertas = demandas.filter((d) => d.status && !["concluido", "cancelado", "atendido"].includes(d.status));
      const reap = solic.filter(
        (d) =>
          (d.atendida_por_sistema_slug ?? "").toLowerCase() === slugLower &&
          d.desfecho === "atendida_por_sistema",
      );
      const first = demandas.filter((d) => new Date(d.created_at).getTime() < half).length;
      const second = demandas.filter((d) => new Date(d.created_at).getTime() >= half).length;
      const crescimentoPct = first === 0 ? (second > 0 ? 100 : 0) : ((second - first) / first) * 100;
      const temDoc = artigos.some((a) => articleMentionsSistema(a, String(s.id), s.nome));
      const temResp = Boolean(
        (s as SistemaAlvoOption & { responsavel?: string | null }).responsavel ||
          (s as SistemaAlvoOption & { owner?: string | null }).owner,
      );
      return {
        slug: String(s.id),
        nome: s.nome,
        grupo: s.grupo ?? null,
        demandasTotal: demandas.length,
        demandasAbertas: abertas.length,
        reaproveitamentos: reap.length,
        temDocumentacao: temDoc,
        temResponsavel: temResp,
        crescimentoPct,
      };
    });

    const totalDemandas = solic.length;
    const totalReaproveitados = solic.filter((d) => d.desfecho === "atendida_por_sistema").length;
    const taxaReaproveitamento = totalDemandas > 0 ? (totalReaproveitados / totalDemandas) * 100 : 0;

    const matchesAtualizadosRecentes = solic.filter(
      (d) => d.match_atualizado_em && new Date(d.match_atualizado_em).getTime() >= oneWeekAgo,
    ).length;

    const local = readDuplicatePreventionMetrics();
    const ultimoRepr = readLastEcossistemaEvent("ecossistema.reprocessed");

    const semDocumentacao = sistemaRows.filter((s) => !s.temDocumentacao).length;
    const semResponsavel = sistemaRows.filter((s) => !s.temResponsavel).length;
    const p75Demandas = (() => {
      const arr = sistemaRows.map((s) => s.demandasTotal).sort((a, b) => a - b);
      if (arr.length === 0) return Infinity;
      return arr[Math.floor(arr.length * 0.75)] ?? 0;
    })();
    const comMuitas = sistemaRows.filter((s) => s.demandasTotal > 0 && s.demandasTotal >= p75Demandas && s.demandasTotal >= 3).length;
    const maiorCrescimento = [...sistemaRows]
      .filter((s) => s.demandasTotal >= 2)
      .sort((a, b) => b.crescimentoPct - a.crescimentoPct)[0] ?? null;

    // "Novos sistemas 7d" — dá para inferir por saude no HUB; sem timestamp de criação, considera
    // sistemas que apareceram pela primeira vez em demandas no último 7d (proxy real).
    const slugsRecentes = new Set(
      solic
        .filter((d) => new Date(d.created_at).getTime() >= oneWeekAgo && d.sistema_alvo_slug)
        .map((d) => String(d.sistema_alvo_slug).toLowerCase()),
    );
    const slugsAntigos = new Set(
      solic
        .filter((d) => new Date(d.created_at).getTime() < oneWeekAgo && d.sistema_alvo_slug)
        .map((d) => String(d.sistema_alvo_slug).toLowerCase()),
    );
    const novosSistemas7d = sistemaRows.filter(
      (s) => slugsRecentes.has(s.slug.toLowerCase()) && !slugsAntigos.has(s.slug.toLowerCase()),
    );

    return {
      fonte: eco.fonte,
      totalSistemas: sistemaRows.length,
      semDocumentacao,
      semResponsavel,
      comMuitasDemandas: comMuitas,
      maiorCrescimento,
      atualizadoEm: now,
      ultimoReprocessadoEm: ultimoRepr?.at ?? null,
      demandasEvitadasLocal: local.demandasEvitadas,
      taxaReaproveitamento,
      totalReaproveitados,
      matchesAtualizadosRecentes,
      sistemas: sistemaRows.sort((a, b) => b.demandasTotal - a.demandasTotal),
      novosSistemas7d,
      loading: eco.loading || solicQ.isLoading || artigosQ.isLoading,
      error:
        (solicQ.error instanceof Error && solicQ.error.message) ||
        (artigosQ.error instanceof Error && artigosQ.error.message) ||
        null,
    };
  }, [eco.sistemas, eco.fonte, eco.loading, solicQ.data, solicQ.isLoading, solicQ.error, artigosQ.data, artigosQ.isLoading, artigosQ.error]);

  useMemo(() => {
    if (!result.loading) logEcossistemaEvent("ecossistema.analytics.updated", { total: result.totalSistemas });
  }, [result.loading, result.totalSistemas]);

  return result;
}
