/**
 * Projeto na apuração do ciclo.
 *
 * REGRA DESTE ARQUIVO, herdada de `apuracao-data.ts`: nada aqui calcula valor
 * em reais, e nada aqui decide pontos. Os pontos vêm da RPC, que os copia de
 * `relatorio_classificacao_tipo` no momento da decisão.
 *
 * O RATEIO TAMBÉM NÃO É CALCULADO AQUI. `pontos_por_pessoa` vem pronto do
 * banco, e é o piso da divisão: no fechamento o resto vai para o primeiro
 * responsável. Recalcular na tela seria a segunda conta para o mesmo fato, e
 * é assim que dois números do mesmo valor passam a discordar.
 *
 * Os casts `as never` acompanham o resto do módulo: as tabelas e funções de
 * relatório não estão em `types.ts`, que é gerado e não inclui o esquema deste
 * módulo.
 */

import { supabase } from "@/integrations/supabase/client";

/*
 * CONCLUIR E REABRIR NÃO MORAM AQUI.
 *
 * Concluir um projeto é ciclo de vida dele, não apuração: quem faz isso é o
 * administrador do projeto, na tela de projetos, e a permissão da RPC é
 * `atividades_can_admin_board`. Está em `@/modules/demand-access`, junto de
 * `useProjetos` — a mesma fronteira que impede a tela de projetos de saber que
 * hoje um projeto é um quadro importado do Trello.
 *
 * Aqui fica só o que é apuração: a fila e a classificação.
 */

// ---------------------------------------------------------------------------
// A fila
// ---------------------------------------------------------------------------

export interface ProjetoParaClassificar {
  projeto_id: string;
  slug: string;
  nome: string;
  /** Carimbo de conclusão. NÃO é a data de arquivamento. */
  concluido_em: string;
  concluido_por: string | null;
  responsaveis: number;
  /** Nomes em ordem, para a tela mostrar entre quem os pontos são rateados. */
  responsavel_nomes: string | null;
  cartoes: number;
  ja_classificado: boolean;
  /** A decisão atual. Nulos quando ninguém classificou ainda. */
  classificacao: string | null;
  rotulo: string | null;
  pontos: number | null;
  /** Piso da divisão por responsável; nulo enquanto não há classificação. */
  pontos_por_pessoa: number | null;
  justificativa: string | null;
  classificado_por: string | null;
  classificado_em: string | null;
  autoclassificada: boolean;
  vezes_alterada: number;
  /** Rótulo do ciclo em que já foi apurado. Não nulo = congelado, não muda mais. */
  apurado_no_ciclo: string | null;
}

/**
 * Só projeto com `concluido_em` aparece. Projeto arquivado NÃO é filtrado: o
 * AVD está concluído e arquivado ao mesmo tempo, e precisa ser classificado.
 */
export async function buscarProjetosParaClassificar(): Promise<ProjetoParaClassificar[]> {
  const { data, error } = await supabase.rpc(
    "relatorio_projetos_para_classificar" as never,
    {} as never,
  );
  // Sem rede de proteção: lista vazia é informação real ("nenhum projeto
  // concluído ainda"), e erro precisa aparecer em vez de virar tela vazia.
  if (error) throw error;
  return (data ?? []) as unknown as ProjetoParaClassificar[];
}

// ---------------------------------------------------------------------------
// Classificar
// ---------------------------------------------------------------------------

export async function classificarProjeto(
  projetoId: string,
  classificacao: string,
  justificativa: string,
  motivo?: string,
): Promise<void> {
  const { error } = await supabase.rpc("relatorio_classificar_projeto" as never, {
    _projeto_id: projetoId,
    _classificacao: classificacao,
    _justificativa: justificativa,
    _motivo: motivo ?? null,
  } as never);
  // As mensagens da RPC já são escritas para quem lê — não traduzir de novo.
  if (error) throw new Error(error.message);
}
