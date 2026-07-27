import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { listSolucoes } from "@/lib/supabaseData";
import { relacionar, type Candidato, type Demanda, type Relacionado } from "@/domain/demand";

/**
 * O que já se sabe sobre um problema — determinístico, fase 1.
 *
 * O QUE ELE JUNTA
 *   demandas parecidas   as que já estão carregadas na tela
 *   soluções anteriores  `demanda_solucoes` — o que já foi entregue e funcionou
 *   artigos              `knowledge_articles`, só os publicados
 *
 * Nenhuma chamada de IA. É sobreposição de palavras e igualdade de sistema
 * sobre dados que já estão no banco. Quando a base amadurecer, a IA entra para
 * resumir artigo longo e explicar solução complexa — enriquecendo a busca, não
 * substituindo.
 *
 * POR QUE OS ARTIGOS VÊM TODOS, E NÃO POR BUSCA NO BANCO
 * A tabela tem `search_tsv`, e usar full-text seria o instinto. Mas full-text
 * casa a palavra e não sabe dizer *qual* casou — e o motivo ("fala de
 * exportação e relatório") é justamente o que separa "alguém pesquisou" de
 * "resultado de busca". Trazer os publicados e pontuar em memória custa uma
 * consulta simples e devolve a explicação junto. Se a base passar de alguns
 * milhares de artigos, aí sim vale filtrar por sistema no banco antes.
 */
export function useConhecimento(demanda: Demanda | null, universo: Demanda[], habilitado: boolean) {
  const artigosQ = useQuery({
    queryKey: ["conhecimento", "artigos-publicados"],
    enabled: habilitado,
    staleTime: 10 * 60_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("knowledge_articles")
        .select("id, titulo, resumo, palavras_chave, tags, sistema_slug, url_externa")
        .eq("status", "publicado")
        .is("deleted_at", null)
        .limit(500);
      if (error) throw error;
      return data ?? [];
    },
  });

  const solucoesQ = useQuery({
    queryKey: ["conhecimento", "solucoes"],
    enabled: habilitado,
    staleTime: 10 * 60_000,
    queryFn: listSolucoes,
  });

  const relacionados = useMemo<Relacionado[]>(() => {
    if (!demanda) return [];

    const candidatos: Candidato[] = [
      ...universo.map((d) => ({
        id: d.id,
        genero: "demanda" as const,
        titulo: d.titulo,
        destino: `/demandas/${d.id}`,
        texto: d.descricao,
        sistemaId: d.sistema?.id ?? null,
      })),
      ...(solucoesQ.data ?? []).map((s) => ({
        id: s.id,
        genero: "solucao" as const,
        titulo: s.titulo,
        destino: `/solucoes/${s.id}`,
        texto: s.descricao,
        sistemaId: null,
      })),
      ...(artigosQ.data ?? []).map((a) => ({
        id: a.id,
        genero: "artigo" as const,
        titulo: a.titulo,
        destino: a.url_externa ?? `/base-conhecimento/${a.id}`,
        texto: a.resumo,
        termos: [...(a.palavras_chave ?? []), ...(a.tags ?? [])],
        sistemaId: a.sistema_slug ?? null,
      })),
    ];

    return relacionar(demanda, candidatos);
  }, [demanda, universo, solucoesQ.data, artigosQ.data]);

  return {
    relacionados,
    carregando: artigosQ.isLoading || solucoesQ.isLoading,
  };
}
