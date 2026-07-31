/**
 * QUAL MODELO FAZ QUAL TRABALHO
 *
 * Antes, o nome do modelo estava escrito à mão em dez lugares, dentro de oito
 * edge functions. Isso tinha três efeitos, e nenhum era o de "escolher o
 * modelo":
 *
 *   1. Trocar de modelo exigia editar oito arquivos e acertar dez strings.
 *      Esquecer uma não quebra nada visível — a função simplesmente continua
 *      no modelo antigo, e ninguém descobre até estranhar o resultado dela.
 *   2. Testar um modelo em produção era impossível sem um deploy.
 *   3. Todas as funções eram obrigadas a usar o MESMO modelo, o que é a
 *      decisão errada: elas fazem trabalhos de dificuldade muito diferente.
 *
 * OS TRABALHOS NÃO SÃO IGUAIS
 * `triagem` produz o JSON que vira a demanda: enum fechado, quatro números e
 * um slug que precisa existir no catálogo. Se sair errado, o solicitante não
 * consegue abrir a demanda — o erro é bloqueante e visível.
 *
 * `conversa` fala com alguém que não sabe descrever o próprio problema, e tem
 * no máximo duas perguntas para fazer. Erro aqui não trava nada, mas produz
 * uma demanda vaga que custa uma ida e volta humana depois.
 *
 * `apoio` é o resto — similaridade, resumo de pipeline, mapa. Se falhar, a
 * tela mostra menos, e ninguém fica bloqueado.
 *
 * COMO TROCAR SEM DEPLOY
 * Cada trabalho lê uma variável de ambiente própria. Definir
 * `IA_MODELO_TRIAGEM` nos secrets do Supabase troca o modelo da triagem na
 * próxima chamada, sem tocar em código. É isso que permite testar um modelo
 * de verdade — com dados reais, e voltando atrás em segundos se piorar.
 *
 * O padrão é o que já estava rodando. Esta mudança, sozinha, não altera
 * nenhum comportamento: ela só cria o lugar onde a escolha passa a caber.
 */

export type TrabalhoDeIA = "triagem" | "conversa" | "apoio";

/** O que rodava antes desta mudança, em todas as dez chamadas. */
const PADRAO = "google/gemini-3-flash-preview";

const VARIAVEL: Record<TrabalhoDeIA, string> = {
  triagem: "IA_MODELO_TRIAGEM",
  conversa: "IA_MODELO_CONVERSA",
  apoio: "IA_MODELO_APOIO",
};

export function modeloPara(trabalho: TrabalhoDeIA): string {
  const especifico = Deno.env.get(VARIAVEL[trabalho])?.trim();
  if (especifico) return especifico;
  // `IA_MODELO` troca os três de uma vez — útil para experimentar rápido.
  const geral = Deno.env.get("IA_MODELO")?.trim();
  if (geral) return geral;
  return PADRAO;
}
