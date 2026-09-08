/**
 * Fonte de dados do Escritório. É a MESMA da camada Ecossistema do Diagrama:
 * a edge function `ecossistema-mapa`, com o seed como degradação.
 *
 * Esta tela só lê. Não escreve em lugar nenhum.
 */

import { supabase } from "@/integrations/supabase/client";
import type { EcossistemaHubData } from "@/lib/mapaSource";
import {
  CONECTORES_EXTERNOS_SEED,
  INTEGRACOES_HUB_SEED,
  INTEGRACOES_SEED,
  SISTEMAS_SEED,
} from "@/lib/ecossistemaSeed";
import type { SaudeSistema } from "./estado";
import type { ExecucaoDoHub } from "./eventos";

export interface SistemaEco {
  id: string;
  nome: string;
  grupo: string;
  status?: string | null;
}
export interface ConectorEco {
  id: string;
  nome: string;
  status?: string | null;
}
export interface IntegracaoEco {
  origem: string;
  destino: string;
  label: string;
}

/**
 * Uso HUMANO de um sistema — pergunta diferente da que `saude` responde.
 *
 * `saude` mede máquina: execução de integração. Um sistema pode ter zero
 * execução e nove pessoas dentro, e é literalmente o caso do Gestão de
 * Processos. Enquanto isso o Portfólio tem execução e ninguém dentro desde
 * ontem. Os dois sinais são quase opostos, e por isso não se misturam aqui.
 *
 * `pessoas_24h` conta LOGIN por SSO na janela, não trabalho efetivo — o rótulo
 * na tela diz "acessaram", nunca "trabalhando".
 */
export interface UsoSistema {
  ultimo_login: string | null;
  pessoas_24h: number;
  pessoas_30d: number;
}

export interface DadosEscritorio {
  fonte: "hub" | "semente";
  geradoEm: string | null;
  sistemas: SistemaEco[];
  conectores: ConectorEco[];
  integracoes: IntegracaoEco[];
  saude: Record<string, SaudeSistema>;
  /** Vazio quando o HUB não manda — a tela não pode depender disto. */
  uso: Record<string, UsoSistema>;
  /**
   * Execuções da janela recente, cruas. Quem agrupa em rajada é
   * `agruparExecucoes`, não este carregador: aqui o dado chega como veio.
   */
  execucoes: ExecucaoDoHub[];
}

export const DADOS_SEMENTE: DadosEscritorio = {
  fonte: "semente",
  geradoEm: null,
  sistemas: SISTEMAS_SEED.map((s) => ({ id: s.id, nome: s.nome, grupo: s.grupo })),
  conectores: CONECTORES_EXTERNOS_SEED.map((c) => ({ id: c.id, nome: c.nome })),
  integracoes: [...INTEGRACOES_SEED, ...INTEGRACOES_HUB_SEED],
  saude: {},
  uso: {},
  execucoes: [],
};

export async function carregarEscritorio(): Promise<DadosEscritorio> {
  try {
    const { data, error } = await supabase.functions.invoke<EcossistemaHubData>("ecossistema-mapa", {
      method: "GET",
    });
    if (error) throw error;
    if (data?.fonte !== "hub" || !Array.isArray(data.sistemas) || data.sistemas.length === 0) {
      throw new Error("HUB sem sistemas");
    }
    return {
      fonte: "hub",
      geradoEm: data.gerado_em ?? null,
      sistemas: data.sistemas.map((s) => ({
        id: s.id,
        nome: s.nome,
        grupo: s.grupo || "Outros",
        status: s.status ?? null,
      })),
      conectores: (data.conectoresExternos ?? []).map((c) => ({
        id: c.id,
        nome: c.nome,
        status: c.status ?? null,
      })),
      integracoes: data.integracoes ?? [],
      saude: (data.saude ?? {}) as Record<string, SaudeSistema>,
      uso: (data.uso ?? {}) as Record<string, UsoSistema>,
      execucoes: (data.eventos ?? []) as ExecucaoDoHub[],
    };
  } catch (e) {
    console.warn("ecossistema-mapa indisponível; escritório usando o seed.", e);
    return DADOS_SEMENTE;
  }
}
