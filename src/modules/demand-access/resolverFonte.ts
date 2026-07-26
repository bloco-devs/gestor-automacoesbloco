import type { FonteId } from "@/domain/demand";
import type { Escopo } from "./types";

/**
 * O ÚNICO lugar do sistema que decide de qual tabela as demandas vêm.
 *
 * Este arquivo é o interruptor da migração. Abandonar `atividades_cards` é
 * mudar o `return` de `"atividades"` para `"demands"` aqui — nenhuma tela,
 * nenhum componente e nenhum teste de UI precisa mudar.
 *
 * Estado atual e por quê:
 *
 *   escopo "projeto"  -> atividades   Um projeto é hoje um quadro, e as
 *                                     demandas de um quadro só existem em
 *                                     `atividades_cards`. Migrar isso exige
 *                                     mover dados, não trocar código.
 *
 *   escopo "global"   -> demands      A fila geral do Help Desk. `demands` tem
 *                                     SLA, tipo, complexidade, auditoria e os
 *                                     campos de IA — é a fonte certa para
 *                                     qualquer coisa que não seja um quadro
 *                                     importado.
 *
 * Ou seja: a convivência das duas fontes já está implementada, e é declarativa.
 */
export function resolverFonte(escopo: Escopo): FonteId {
  switch (escopo.tipo) {
    case "projeto":
      return "atividades";
    case "demanda":
      // Uma demanda avulsa (sem projeto) é um ticket do Help Desk.
      return escopo.projetoId ? "atividades" : "demands";
    case "global":
    default:
      return "demands";
  }
}

/** O id do projeto quando o escopo tem um. `null` quando a fonte não é por projeto. */
export function projetoDoEscopo(escopo: Escopo): string | null {
  if (escopo.tipo === "projeto") return escopo.projetoId;
  if (escopo.tipo === "demanda") return escopo.projetoId ?? null;
  return null;
}
