import { supabase } from "@/integrations/supabase/client";

// Tabelas criadas fora do fluxo de tipos gerados.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const sb = supabase as any;

/**
 * A CAPA DO CARTÃO — o que se vê sem abrir o modal.
 *
 * O modal já tinha etiquetas e membros; o quadro não. Isso obrigava a abrir
 * cartão por cartão para saber quem está com o quê — o oposto do que um quadro
 * serve para fazer. Aqui as duas relações são lidas EM LOTE (uma consulta para
 * todos os cartões visíveis, não uma por cartão), porque num quadro de 60
 * cartões o padrão N+1 custa 120 requisições.
 */

export interface EtiquetaDaCapa {
  id: string;
  nome: string | null;
  cor: string;
}

export interface CapaDoCartao {
  etiquetas: EtiquetaDaCapa[];
  /** Ids de usuário; o nome/avatar é resolvido pela lista da equipe. */
  membrosIds: string[];
}

export type CapasPorCard = Map<string, CapaDoCartao>;

/** Postgres tem limite de tamanho de query; fatiamos o `IN (...)`. */
const LOTE = 200;

function fatias<T>(itens: T[], tamanho: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < itens.length; i += tamanho) out.push(itens.slice(i, i + tamanho));
  return out;
}

export async function listCapasDosCards(cardIds: string[]): Promise<CapasPorCard> {
  const capas: CapasPorCard = new Map();
  if (cardIds.length === 0) return capas;

  const garantir = (cardId: string): CapaDoCartao => {
    let atual = capas.get(cardId);
    if (!atual) {
      atual = { etiquetas: [], membrosIds: [] };
      capas.set(cardId, atual);
    }
    return atual;
  };

  for (const lote of fatias(cardIds, LOTE)) {
    const [vinculos, membros] = await Promise.all([
      sb
        .from("atividades_card_etiquetas")
        .select("card_id, etiqueta_id, atividades_etiquetas ( id, nome, cor )")
        .in("card_id", lote),
      sb.from("atividades_card_membros").select("card_id, user_id").in("card_id", lote),
    ]);

    if (vinculos.error) throw vinculos.error;
    if (membros.error) throw membros.error;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    for (const row of (vinculos.data ?? []) as any[]) {
      const et = row.atividades_etiquetas;
      if (!et) continue;
      garantir(row.card_id).etiquetas.push({ id: et.id, nome: et.nome ?? null, cor: et.cor });
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    for (const row of (membros.data ?? []) as any[]) {
      garantir(row.card_id).membrosIds.push(row.user_id);
    }
  }

  return capas;
}
