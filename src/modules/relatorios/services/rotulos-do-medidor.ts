/**
 * Largura reservada a um rótulo do medidor, em porcentagem da régua. Dois
 * rótulos mais próximos que isto não caberiam lado a lado.
 */
export const LARGURA_DO_ROTULO = 10;

/**
 * DISTRIBUI OS RÓTULOS DO MEDIDOR EM LINHAS PARA QUE NENHUM CAIA SOBRE O OUTRO.
 *
 * Recebe as posições já ordenadas e devolve, para cada uma, a linha em que ela
 * deve ser desenhada. Quem não tem espaço em nenhuma linha aberta ganha uma
 * linha nova abaixo.
 *
 * Esta é a regra que faltava. Cada marco era posicionado por `left` absoluto e
 * nada olhava o vizinho — e os degraus de 100% e de 100,01% distam um centésimo
 * de ponto percentual, que na régua é o mesmo pixel. Os dois rótulos eram
 * impressos exatamente um sobre o outro, e na tela "R$ 1.000,00" cruzava com
 * "a definir" até os dois ficarem ilegíveis.
 *
 * O número de linhas não é fixo de propósito. Com duas linhas fixas, três
 * degraus grudados voltariam a se sobrepor — e as faixas são cadastradas pelo
 * RH, então quantos degraus se encostam não é decisão do componente. A altura do
 * bloco de legendas acompanha o que sair daqui.
 */
export function distribuirEmLinhas(
  posicoes: number[],
  larguraDoRotulo = LARGURA_DO_ROTULO,
): number[] {
  const ultimoPorLinha: number[] = [];
  return posicoes.map((pos) => {
    const livre = ultimoPorLinha.findIndex((ultimo) => pos - ultimo >= larguraDoRotulo);
    const linha = livre === -1 ? ultimoPorLinha.length : livre;
    ultimoPorLinha[linha] = pos;
    return linha;
  });
}

/** Altura de uma linha de rótulo: o degrau, o valor e a folga entre pares. */
export const ALTURA_DA_LINHA = 26;
