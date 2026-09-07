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
  | "comecou_a_executar"
  | "demanda_nova"
  | "demanda_avancou"
  | "demanda_concluida";

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
  demanda_avancou: 4,
  demanda_concluida: 4,
  demanda_nova: 5,
  voltou_a_reportar: 6,
  comecou_a_executar: 7,
};
export const PRIORIDADE_AMBIENTE = 9;

/** Retrato = o mapa de saúde por sistema, exatamente como o HUB devolve. */
export type Retrato = Record<string, SaudeSistema>;

const positivo = (n: number | undefined) => (typeof n === "number" && n > 0 ? n : 0);

/**
 * Quanto tempo uma execução continua contando como "agora".
 *
 * Duas vezes o refresh de 60 s. É o que permite a primeira leitura já saber
 * quem está ativo — sem retrato anterior não existe "avançou" —, e continua
 * sendo uma janela de minutos, não as 24 h da regra de saúde.
 */
export const JANELA_ATIVIDADE_MS = 120_000;

/** Executou dentro da janela de atividade? É o "agora" que o retrato sustenta. */
export const executouAgora = (saude: SaudeSistema | undefined, agora: number): boolean => {
  if (!saude?.ultima) return false;
  const t = Date.parse(saude.ultima);
  return !Number.isNaN(t) && agora - t <= JANELA_ATIVIDADE_MS;
};

/**
 * Fonte de eventos. Hoje só existe a de retratos; a interface é o que permite
 * plugar o stream do HUB depois sem tocar no motor.
 */
export interface FonteDeEventos {
  observar(retrato: Retrato, agora: number): EventoEcossistema[];
  /** Sistemas com problema em aberto — o que ainda está PENDENTE. */
  pendentes(): string[];
  /**
   * Quem EXECUTOU desde o retrato anterior.
   *
   * Isto é ATIVIDADE, não saúde. `estadoDoSistema` chama de "trabalhando"
   * quem executou nas últimas 24 h — o que responde "está operacional?", não
   * "está trabalhando agora?". Um conector que rodou ontem às 22 h aparecia
   * como trabalhando hoje de manhã e saía pela porta entregar, sem nada ter
   * acontecido. O único sinal de agora que o retrato tem é o `ultima` ter
   * avançado entre duas leituras.
   */
  ativos(): ReadonlySet<string>;
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
  let executaram: Set<string> = new Set();

  return {
    pendentes: () => [...abertos],
    ativos: () => executaram,

    observar(retrato, agora) {
      ciclo += 1;
      const eventos: EventoEcossistema[] = [];
      const agoraAtivos = new Set<string>();
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
         * Atividade: ou o carimbo da última execução andou desde a leitura
         * anterior, ou ele é recente o bastante para valer sozinho. O segundo
         * caso é o que faz a primeira abertura da tela já mostrar quem roda.
         */
        if (executouAgora(depois, agora) || (antes && depois.ultima && depois.ultima !== antes.ultima)) {
          agoraAtivos.add(sistema);
        }

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
      executaram = agoraAtivos;
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


/* --------------------------------------------------------- demandas --- */

/**
 * Estados reais da tabela `demands`. Não existe "resolvido" nem "em análise";
 * o terminal é `concluido`. Nada aqui é inventado.
 */
export const STATUS_DEMANDA = [
  "backlog",
  "a_fazer",
  "em_desenvolvimento",
  "em_testes",
  "homologacao",
  "concluido",
] as const;
export type StatusDemanda = (typeof STATUS_DEMANDA)[number];

/** Etapas em que alguém está efetivamente trabalhando na demanda. */
export const STATUS_EM_TRABALHO: readonly StatusDemanda[] = [
  "em_desenvolvimento",
  "em_testes",
  "homologacao",
];

export const emTrabalho = (status: string): boolean =>
  (STATUS_EM_TRABALHO as readonly string[]).includes(status);

/** O mínimo que o escritório precisa saber de uma demanda. */
export interface DemandaResumo {
  id: string;
  status: string;
}

/**
 * Diff entre duas fotos do Kanban.
 *
 * ATENÇÃO AO ROTEAMENTO. A demanda NÃO pertence ao sistema para o qual o
 * evento é endereçado. Hoje não existe chave confiável entre `demands` e o
 * sistema do ecossistema — `system_id` aponta para `solucoes`, que está
 * vazia, e `sistema_slug` não é escrita por ninguém. Então o evento é
 * endereçado ao BLINK que representa o Kanban, como RESPONSÁVEL VISUAL pelo
 * trabalho. É roteamento provisório, não propriedade da demanda; no dia em
 * que existir a chave, muda-se só o `sistema` daqui.
 */
export function fonteDeDemandas(
  sistemaResponsavel: string,
  inicial: DemandaResumo[] = [],
): {
  observar(demandas: DemandaResumo[], agora: number): EventoEcossistema[];
  /** Quantas demandas estão em etapa de trabalho agora. */
  emTrabalho(): number;
} {
  let anterior = new Map(inicial.map((d) => [d.id, d.status]));
  let trabalhando = inicial.filter((d) => emTrabalho(d.status)).length;
  let ciclo = 0;

  return {
    emTrabalho: () => trabalhando,

    observar(demandas, agora) {
      ciclo += 1;
      const eventos: EventoEcossistema[] = [];
      const atual = new Map(demandas.map((d) => [d.id, d.status]));
      const push = (tipo: TipoEvento, chave: string) => {
        eventos.push({
          id: `${tipo}:${chave}:${ciclo}`,
          tipo,
          sistema: sistemaResponsavel,
          timestamp: agora,
          prioridade: PRIORIDADE[tipo],
        });
      };

      /*
       * A primeira leitura não gera evento: sem foto anterior não dá para
       * saber o que mudou, e o Kanban inteiro viraria uma enxurrada de avisos
       * na abertura da tela.
       */
      if (anterior.size > 0) {
        for (const [id, status] of atual) {
          const antes = anterior.get(id);
          if (antes === undefined) push("demanda_nova", id);
          else if (antes !== status) {
            push(status === "concluido" ? "demanda_concluida" : "demanda_avancou", id);
          }
        }
      }

      anterior = atual;
      trabalhando = demandas.filter((d) => emTrabalho(d.status)).length;
      return eventos;
    },
  };
}
