/**
 * Traduz a saúde de 30 dias que o HUB devolve para o comportamento do
 * personagem na tela.
 */

export interface SaudeSistema {
  execs: number;
  ok: number;
  falhas: number;
  falhas_upstream?: number;
  ultima: string | null;
}

/**
 * `sem-dados` não é humor, é ausência de sinal.
 *
 * Antes ele caía em "ocioso" junto com quem tem histórico e só não rodou hoje.
 * São coisas diferentes: treze dos dezesseis sistemas não têm UMA execução
 * registrada em trinta dias, e a tela afirmava que estavam parados quando a
 * verdade é que o HUB nunca ouviu falar deles.
 */
export type Estado = "trabalhando" | "ocioso" | "falha" | "sem-dados";

/** Acima disso o personagem passa a exibir alerta. */
export const LIMIAR_FALHA = 0.05;
/** Sem execução nesta janela, ele fica parado na cadeira. */
export const JANELA_OCIOSO_MS = 24 * 60 * 60 * 1000;

export function estadoDoSistema(saude: SaudeSistema | null | undefined, agora = Date.now()): Estado {
  if (!saude || !saude.execs) return "sem-dados";
  if (saude.falhas / saude.execs >= LIMIAR_FALHA) return "falha";
  if (!saude.ultima) return "ocioso";
  const ultima = Date.parse(saude.ultima);
  if (Number.isNaN(ultima)) return "ocioso";
  return agora - ultima <= JANELA_OCIOSO_MS ? "trabalhando" : "ocioso";
}

/** Quem não anda pelo corredor: sem histórico, ou histórico velho. */
export function estaParado(estado: Estado): boolean {
  return estado === "ocioso" || estado === "sem-dados";
}

/** Quantas falhas vieram do outro lado da integração, não dele. */
export function culpaDeTerceiro(saude: SaudeSistema | null | undefined): boolean {
  if (!saude?.falhas) return false;
  return (saude.falhas_upstream ?? 0) > saude.falhas / 2;
}

/**
 * Frequência de viagens, em segundos entre uma e outra.
 *
 * Não é uma viagem por execução: 1.200 execuções no mês viraria uma correria
 * ilegível. É o volume normalizado contra o sistema mais movimentado do andar,
 * comprimido em log para que o campeão não engula todo mundo.
 */
export function intervaloEntreViagens(execs: number, maiorExecs: number): number {
  const MIN_S = 6;
  const MAX_S = 70;
  if (execs <= 0 || maiorExecs <= 0) return Infinity;
  const proporcao = Math.log10(1 + execs) / Math.log10(1 + maiorExecs);
  return MAX_S - (MAX_S - MIN_S) * Math.min(1, Math.max(0, proporcao));
}
