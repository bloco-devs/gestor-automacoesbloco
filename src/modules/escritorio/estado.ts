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
 * Há DOIS jeitos de um sistema não ter execução, e eles não são a mesma coisa.
 *
 * O diagnóstico do HUB mostrou os dois lado a lado: das dezesseis salas, onze
 * têm linha de saúde dizendo `execs: 0` na janela de trinta dias, e duas
 * (`sucesso-cliente`, `captacao`) não têm linha nenhuma. A tela chamava as
 * treze de "sem dados no HUB" — e para onze delas isso era falso: o HUB tem
 * o registro, monitora, e responde zero. Zero é uma informação; ausência de
 * linha é outra.
 *
 *   sem-dados     o HUB não tem registro deste nó. Não se sabe nada.
 *   sem-execucao  o HUB tem registro e afirma nenhuma execução em 30 dias.
 *   ocioso        executou dentro da janela de 30 d, mas não nas últimas 24 h.
 *   trabalhando   executou nas últimas 24 h.
 *   falha         taxa de erro acima do limiar.
 *
 * `sem-execucao` NÃO é atividade e NÃO vira "trabalhando" em hipótese alguma:
 * ele continua parado na cadeira, como sempre esteve. O que muda é só a tela
 * parar de afirmar ignorância onde existe medição.
 */
export type Estado = "trabalhando" | "ocioso" | "falha" | "sem-execucao" | "sem-dados";

/** Acima disso o personagem passa a exibir alerta. */
export const LIMIAR_FALHA = 0.05;
/** Sem execução nesta janela, ele fica parado na cadeira. */
export const JANELA_OCIOSO_MS = 24 * 60 * 60 * 1000;

/**
 * Quantas execuções NÃO concluíram.
 *
 * `ok`, `falhas` e `falhas_upstream` são disjuntos e somam `execs` — conferido
 * em quatro nós do retrato real. Então o que não deu certo é a soma das duas
 * falhas, e é isso que a taxa tem de medir.
 *
 * A REGRA ANTIGA DIVIDIA SÓ `falhas`, E ISSO ESCONDIA O PIOR CASO DO ANDAR.
 *
 * Quando o `comercial-leitura` finalmente ganhou dono, em 08/09/2026, a Gestão
 * Comercial e Marketing apareceu com 85 execuções, 16 bem-sucedidas, ZERO
 * falhas próprias e 69 de terceiro. Pela regra antiga a taxa era 0/85 = 0% e o
 * andar dizia "trabalhando" — sobre 16 sucessos em 85 tentativas.
 *
 * Defender que "o sistema não está com defeito, a dependência dele está" é
 * verdade e é irrelevante para quem olha a tela: a leitura não chegou. Quem
 * diz de quem é a culpa é `culpaDeTerceiro`, e a fala do balão usa isso desde
 * o começo — o estado diz QUE falhou, o texto diz DE QUEM.
 */
export function naoConcluiu(saude: SaudeSistema): number {
  return saude.falhas + (saude.falhas_upstream ?? 0);
}

export function estadoDoSistema(saude: SaudeSistema | null | undefined, agora = Date.now()): Estado {
  // ausência de registro e registro zerado se separam AQUI, e só aqui
  if (!saude) return "sem-dados";
  if (!saude.execs) return "sem-execucao";
  if (naoConcluiu(saude) / saude.execs >= LIMIAR_FALHA) return "falha";
  if (!saude.ultima) return "ocioso";
  const ultima = Date.parse(saude.ultima);
  if (Number.isNaN(ultima)) return "ocioso";
  return agora - ultima <= JANELA_OCIOSO_MS ? "trabalhando" : "ocioso";
}

/**
 * Quem não anda pelo corredor: sem histórico, histórico zerado ou velho.
 *
 * `sem-execucao` entra aqui pelo mesmo motivo que `sem-dados` sempre entrou —
 * quem não executou nada não tem o que ir entregar. A separação de rótulo não
 * mexe em quem levanta da mesa.
 */
export function estaParado(estado: Estado): boolean {
  return estado === "ocioso" || estado === "sem-execucao" || estado === "sem-dados";
}

/** Verdade sobre o HUB, não sobre o sistema: existe medição para este nó? */
export function semRegistroNoHub(estado: Estado): boolean {
  return estado === "sem-dados";
}

export interface ResumoDeEstados {
  trabalhando: number;
  ocioso: number;
  falha: number;
  semExecucao: number;
  semDados: number;
}

/**
 * O resumo que a página mostra. Vive aqui, e não dentro do componente, para
 * poder ser conferido contra o retrato real do HUB num teste.
 */
export function resumoDeEstados(
  nos: { id: string }[],
  saude: Record<string, SaudeSistema | undefined>,
  agora = Date.now(),
): ResumoDeEstados {
  const r: ResumoDeEstados = { trabalhando: 0, ocioso: 0, falha: 0, semExecucao: 0, semDados: 0 };
  for (const no of nos) {
    switch (estadoDoSistema(saude[no.id], agora)) {
      case "trabalhando": r.trabalhando++; break;
      case "falha": r.falha++; break;
      case "sem-execucao": r.semExecucao++; break;
      case "sem-dados": r.semDados++; break;
      default: r.ocioso++;
    }
  }
  return r;
}

/**
 * A maior parte do que não concluiu veio do outro lado?
 *
 * Ela abria com `if (!saude?.falhas) return false` — e isso a tornava cega
 * justamente no caso mais claro. O Sienge tem 30 chamadas não concluídas, TODAS
 * atribuídas a upstream e ZERO falhas próprias: pela guarda antiga a resposta
 * era "não é culpa de terceiro", quando é 100% dele.
 *
 * Agora a base da conta é o que não concluiu, igual à taxa de falha. O estado
 * diz QUE falhou; esta função diz DE QUEM, e é ela que escolhe o banco de
 * falas de upstream.
 */
export function culpaDeTerceiro(saude: SaudeSistema | null | undefined): boolean {
  if (!saude) return false;
  const total = naoConcluiu(saude);
  if (!total) return false;
  return (saude.falhas_upstream ?? 0) > total / 2;
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
