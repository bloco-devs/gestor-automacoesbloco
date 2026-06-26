/**
 * Adapter de fonte de dados do Mapa/Diagrama.
 *
 * Onda 4: o Diagrama passa a consumir uma `MapaProvider` em vez de
 * chamar `listSolucoes/listConexoes/...` diretamente. Isso prepara
 * o terreno para a Onda 5 (camada Ecossistema lida do HUB) sem
 * refactor adicional.
 *
 * Esta onda implementa APENAS o provider local (`localSolucoesProvider`)
 * que delega ao código existente. O `hubEcossistemaProvider` é um stub
 * "em breve" — não chama o HUB.
 */

import {
  listConexoes,
  listNotas,
  listPosicoes,
  type DiagramaConexao,
  type DiagramaNota,
  type DiagramaPosicao,
} from "@/lib/diagrama";
import { listSolicitacoes, listSolucoes } from "@/lib/supabaseData";
import type { Solicitacao, Solucao } from "@/lib/types";

export type CamadaMapa = "solucoes" | "ecossistema";

export interface MapaSnapshot {
  solucoes: Solucao[];
  solicitacoes: Solicitacao[];
  posicoes: DiagramaPosicao[];
  conexoes: DiagramaConexao[];
  notas: DiagramaNota[];
}

export interface MapaProvider {
  id: CamadaMapa;
  label: string;
  disponivel: boolean;
  /** Mensagem para exibir quando `disponivel === false`. */
  indisponivelMotivo?: string;
  load(): Promise<MapaSnapshot>;
}

export const EMPTY_SNAPSHOT: MapaSnapshot = {
  solucoes: [],
  solicitacoes: [],
  posicoes: [],
  conexoes: [],
  notas: [],
};

/**
 * Camada "Soluções" (atual): lê do banco local via as funções já existentes.
 * O shape devolvido é idêntico ao consumido hoje pelo Diagrama.
 */
export const localSolucoesProvider: MapaProvider = {
  id: "solucoes",
  label: "Soluções",
  disponivel: true,
  async load() {
    const [solucoes, solicitacoes, posicoes, conexoes, notas] = await Promise.all([
      listSolucoes(),
      listSolicitacoes(),
      listPosicoes(),
      listConexoes(),
      listNotas(),
    ]);
    return { solucoes, solicitacoes, posicoes, conexoes, notas };
  },
};

/**
 * Camada "Ecossistema" (futura — Onda 5): virá do HUB.
 * Stub: indisponível e retorna snapshot vazio. NÃO chama o HUB nesta onda.
 */
export const hubEcossistemaProvider: MapaProvider = {
  id: "ecossistema",
  label: "Ecossistema",
  disponivel: false,
  indisponivelMotivo: "Em breve — virá do HUB",
  async load() {
    return EMPTY_SNAPSHOT;
  },
};

export const MAPA_PROVIDERS: Record<CamadaMapa, MapaProvider> = {
  solucoes: localSolucoesProvider,
  ecossistema: hubEcossistemaProvider,
};
