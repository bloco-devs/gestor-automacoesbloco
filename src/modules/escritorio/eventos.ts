/**
 * EVENTOS DO ESCRITÓRIO — o que realmente mudou no ecossistema.
 *
 * O HUB não entrega um stream de eventos: entrega um RETRATO agregado por
 * sistema (execs, ok, falhas, falhas_upstream, ultima) numa janela de dias.
 * Não existe id de evento, não existe carimbo por falha, não existe qual
 * integração caiu, e não existe ciclo `reconhecido`/`em análise`.
 *
 * Então o evento aqui é a TRANSIÇÃO entre dois retratos consecutivos. Isso é
 * fato, não invenção: se `falhas` subiu entre o retrato das 13:40 e o das
 * 13:41, falhas novas aconteceram de verdade. O que este módulo NÃO faz é
 * deduzir causa, integração, quantidade exata ou estado intermediário — nada
 * disso está no dado. A granularidade é a do refresh: 60 segundos.
 *
 * A fronteira é `FonteDeEventos`. Hoje só existe `fonteDeRetratos` (o diff).
 * No dia em que o HUB expuser `/ecossistema-eventos`, escreve-se uma segunda
 * implementação e o resto — fila, incidentes, motor, conversa, balão —
 * continua exatamente igual. A especificação desse endpoint está em
 * `docs/ecossistema-eventos.md`.
 */

import { culpaDeTerceiro, estadoDoSistema, type Estado, type SaudeSistema } from "./estado";

export type TipoEvento =
  | "entrou_em_falha"
  | "falha_nova"
  | "recuperado"
  | "voltou_a_reportar"
  | "comecou_a_executar";

/** Único contexto que o retrato sustenta: a falha veio de fora. */
export type ContextoEvento = "upstream";

export interface EventoEcossistema {
  /**
   * Determinístico, a partir de dado real: tipo + sistema + ciclo. Quando o
   * HUB fornecer um id de verdade, é só passá-lo aqui — nada mais muda.
   */
  id: string;
  tipo: TipoEvento;
  /** Slug do sistema afetado, o mesmo que identifica o BLINK. */
  sistema: string;
  contexto?: ContextoEvento;
  timestamp: number;
  prioridade: number;
  /* Campos que o retrato ainda não sustenta. Ficam opcionais para o dia em
   * que o HUB os fornecer, sem obrigar ninguém a preenchê-los agora. */
  integracao?: string;
  severidade?: string;
  status?: string;
}

/**
 * Menor número = mais urgente. Cair vale mais que voltar, voltar vale mais
 * que começar a rodar, e qualquer um deles vale mais que conversa ambiental.
 */
export const PRIORIDADE: Record<TipoEvento, number> = {
  entrou_em_falha: 1,
  falha_nova: 2,
  recuperado: 3,
  voltou_a_reportar: 4,
  comecou_a_executar: 5,
};
export const PRIORIDADE_AMBIENTE = 9;

/** Retrato = o mapa de saúde por sistema, exatamente como o HUB devolve. */
export type Retrato = Record<string, SaudeSistema>;

const positivo = (n: number | undefined) => (typeof n === "number" && n > 0 ? n : 0);

/**
 * Fonte de eventos. Hoje só existe a de retratos; a interface é o que permite
 * plugar o stream do HUB depois sem tocar no motor.
 */
export interface FonteDeEventos {
  observar(retrato: Retrato, agora: number): EventoEcossistema[];
  /** Sistemas com problema em aberto — o que ainda está PENDENTE. */
  pendentes(): string[];
}

/**
 * Diff entre retratos, com registro de incidente aberto.
 *
 * O registro é o que separa "evento novo" de "evento já conhecido": enquanto
 * um sistema estiver com incidente aberto, o crescimento do contador de
 * falhas NÃO vira conversa nova. Sem isso, o mesmo problema geraria um aviso
 * a cada 60 segundos até alguém consertar.
 */
export function fonteDeRetratos(inicial: Retrato = {}): FonteDeEventos {
  let anterior: Retrato = inicial;
  let ciclo = 0;
  const abertos = new Set<string>();

  return {
    pendentes: () => [...abertos],

    observar(retrato, agora) {
      ciclo += 1;
      const eventos: EventoEcossistema[] = [];
      const push = (tipo: TipoEvento, sistema: string, contexto?: ContextoEvento) => {
        eventos.push({
          id: `${tipo}:${sistema}:${ciclo}`,
          tipo,
          sistema,
          contexto,
          timestamp: agora,
          prioridade: PRIORIDADE[tipo],
        });
      };

      for (const sistema of Object.keys(retrato)) {
        const antes = anterior[sistema];
        const depois = retrato[sistema];
        if (!depois) continue;
        /*
         * Sistema que ainda não estava no retrato anterior não gera evento:
         * não dá para saber se ele mudou ou se acabou de entrar no catálogo.
         */
        if (!antes) continue;

        const estadoAntes: Estado = estadoDoSistema(antes, agora);
        const estadoDepois: Estado = estadoDoSistema(depois, agora);
        const upstream = culpaDeTerceiro(depois) ? ("upstream" as const) : undefined;

        if (estadoAntes !== "falha" && estadoDepois === "falha") {
          abertos.add(sistema);
          push("entrou_em_falha", sistema, upstream);
        } else if (estadoAntes === "falha" && estadoDepois === "trabalhando") {
          abertos.delete(sistema);
          push("recuperado", sistema);
        } else if (!abertos.has(sistema) && positivo(depois.falhas) > positivo(antes.falhas)) {
          // falhas novas sem trocar de estado, e sem incidente já em aberto
          abertos.add(sistema);
          push("falha_nova", sistema, upstream);
        }

        if (positivo(antes.execs) === 0 && positivo(depois.execs) > 0) {
          push("comecou_a_executar", sistema);
        } else if (
          estadoAntes === "sem-dados" &&
          estadoDepois !== "sem-dados" &&
          depois.ultima &&
          depois.ultima !== antes.ultima
        ) {
          push("voltou_a_reportar", sistema);
        }
      }

      anterior = retrato;
      return eventos;
    },
  };
}

/* ------------------------------------------------------------- fila --- */

export interface Cooldowns {
  /** Mesmo tipo de evento, mesmo sistema. */
  evento: number;
  /** Mesmo par de BLINKs. */
  par: number;
  /** Mesma relação: tipo de evento + destino. */
  relacao: number;
}

export const COOLDOWN_PADRAO: Cooldowns = { evento: 180, par: 120, relacao: 90 };

/** Depois disso o evento é velho demais para virar conversa. */
export const VALIDADE_EVENTO = 15 * 60;

export interface Par {
  origem: string;
  destino: string;
}

export interface FilaDeEventos {
  registrar(eventos: EventoEcossistema[], agora: number): void;
  /**
   * Próximo evento atendível. `resolver` devolve o par de sistemas ou null
   * quando ninguém pode receber a notícia agora; nesse caso o evento fica na
   * fila para a próxima tentativa.
   */
  proximo(
    agora: number,
    resolver: (evento: EventoEcossistema) => Par | null,
  ): { evento: EventoEcossistema; par: Par } | null;
  /** Liga os cooldowns e tira o evento da fila. */
  confirmar(evento: EventoEcossistema, par: Par, agora: number): void;
  tamanho(): number;
  pendentes(): EventoEcossistema[];
}

export function criarFilaDeEventos(cooldowns: Cooldowns = COOLDOWN_PADRAO): FilaDeEventos {
  const fila: EventoEcossistema[] = [];
  const jaVistos = new Set<string>();
  const ultimoEvento = new Map<string, number>();
  const ultimoPar = new Map<string, number>();
  const ultimaRelacao = new Map<string, number>();

  const chaveEvento = (e: EventoEcossistema) => `${e.tipo}:${e.sistema}`;
  const chavePar = (p: Par) => [p.origem, p.destino].sort().join("|");
  const chaveRelacao = (e: EventoEcossistema, p: Par) => `${e.tipo}->${p.destino}`;

  return {
    registrar(eventos, agora) {
      for (const e of eventos) {
        if (jaVistos.has(e.id)) continue;
        jaVistos.add(e.id);
        /*
         * Agrupamento: o retrato já chega agregado, então vinte falhas do
         * mesmo sistema vêm como um evento só. O que pode repetir é o mesmo
         * TIPO em ciclos seguidos — e aí o pendente é substituído, não
         * empilhado.
         */
        const igual = fila.findIndex((f) => chaveEvento(f) === chaveEvento(e));
        if (igual >= 0) fila[igual] = e;
        else fila.push(e);
      }
      for (let i = fila.length - 1; i >= 0; i--) {
        if (agora - fila[i].timestamp > VALIDADE_EVENTO) fila.splice(i, 1);
      }
      fila.sort((a, b) => a.prioridade - b.prioridade || a.timestamp - b.timestamp);
    },

    proximo(agora, resolver) {
      for (const evento of fila) {
        if (agora - (ultimoEvento.get(chaveEvento(evento)) ?? -Infinity) < cooldowns.evento) continue;
        const par = resolver(evento);
        if (!par) continue;
        if (agora - (ultimoPar.get(chavePar(par)) ?? -Infinity) < cooldowns.par) continue;
        if (agora - (ultimaRelacao.get(chaveRelacao(evento, par)) ?? -Infinity) < cooldowns.relacao) continue;
        return { evento, par };
      }
      return null;
    },

    confirmar(evento, par, agora) {
      const i = fila.indexOf(evento);
      if (i >= 0) fila.splice(i, 1);
      ultimoEvento.set(chaveEvento(evento), agora);
      ultimoPar.set(chavePar(par), agora);
      ultimaRelacao.set(chaveRelacao(evento, par), agora);
    },

    tamanho: () => fila.length,
    pendentes: () => [...fila],
  };
}
