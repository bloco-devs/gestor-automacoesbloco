import type { LinhaDeImplementacao } from "./relatorios-data";

/**
 * OS CAMPOS DO RELATO TÉCNICO, EM ORDEM DE LEITURA.
 *
 * A ordem é a de quem lê de fora e precisa entender a entrega sem ter
 * participado dela: qual era o problema, o que foi feito, o que mudou, no que
 * deu. Os quatro primeiros são obrigatórios para concluir o fechamento, então
 * numa entrega registrada eles sempre existem — os demais aparecem só quando
 * se aplicam, porque nem toda entrega mexe em banco, integração ou RLS.
 *
 * ESTA LISTA MORA AQUI, E NÃO NA TELA, DE PROPÓSITO.
 *
 * A tela tinha a lista; o PDF não tinha nenhuma — imprimia código, título,
 * classificação e pontos, e parava aí. Quem abria o documento via quanto a
 * entrega valeu em pontos e nada sobre o que foi entregue.
 *
 * Com a lista num só lugar, um campo novo no fechamento aparece nos dois
 * lugares de uma vez. Duplicada, ela ia divergir no primeiro campo novo — e a
 * divergência apareceria justamente no documento que sai da equipe.
 *
 * Nota interna nunca entra aqui: o RH tem `relatorios.ver` e lê esta consulta.
 * O que aparece é o que alguém redigiu como relato oficial.
 */
export const CAMPOS_DO_RELATO: Array<{ chave: keyof LinhaDeImplementacao; rotulo: string }> = [
  { chave: "fechamento_problema", rotulo: "Qual era o problema" },
  { chave: "fechamento_solucao", rotulo: "Como foi resolvido" },
  { chave: "fechamento_alterado", rotulo: "O que foi alterado" },
  { chave: "fechamento_resultado", rotulo: "Resultado obtido" },
  { chave: "fechamento_funcionalidades", rotulo: "Funcionalidades implementadas" },
  { chave: "fechamento_integracoes", rotulo: "Integrações" },
  { chave: "fechamento_banco", rotulo: "Alterações no banco" },
  { chave: "fechamento_seguranca", rotulo: "Segurança e permissões" },
  { chave: "fechamento_testes", rotulo: "Como foi testado" },
  { chave: "fechamento_observacoes", rotulo: "Observações" },
];

/**
 * Os campos do relato que a demanda de fato tem preenchidos.
 *
 * Campo em branco não vira linha vazia no documento — um rótulo seguido de
 * nada afirma que a pergunta foi respondida com o silêncio, quando o que houve
 * é que ela não se aplicava àquela entrega.
 */
export function relatoPreenchido(
  l: LinhaDeImplementacao,
): Array<{ rotulo: string; texto: string }> {
  const preenchidos: Array<{ rotulo: string; texto: string }> = [];
  for (const campo of CAMPOS_DO_RELATO) {
    const valor = l[campo.chave];
    if (typeof valor === "string" && valor.trim().length > 0) {
      preenchidos.push({ rotulo: campo.rotulo, texto: valor.trim() });
    }
  }
  return preenchidos;
}
