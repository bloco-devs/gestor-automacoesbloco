/**
 * Bounded context `knowledge` — a Base Viva.
 *
 * A DIFERENÇA ENTRE ESTA BASE E UMA WIKI
 * Wiki depende de alguém parar o trabalho e escrever num editor em branco.
 * Isso não acontece — não por preguiça, mas porque no momento em que o
 * problema acaba de ser resolvido a pessoa já está no próximo, e uma semana
 * depois ela não lembra o suficiente para escrever bem.
 *
 * Aqui o conhecimento nasce da operação: a demanda resolvida JÁ contém o
 * artigo. O problema está na descrição, os sintomas estão nas primeiras
 * mensagens, a solução está nas últimas, e a definição de pronto está no
 * checklist. Montar isso é rearranjo de texto que já existe — não é geração.
 *
 * A REGRA QUE NÃO SE QUEBRA
 * Nenhum artigo é criado automaticamente. A IA prepara; quem publica é uma
 * pessoa. Base que se publica sozinha vira base em que ninguém confia — e uma
 * base em que ninguém confia é pior que base nenhuma, porque consome as
 * buscas sem resolver.
 *
 * Como todo domínio deste sistema: sem React, sem Tailwind, sem tabela.
 */

export type OrigemDoRascunho = "demanda" | "repeticao";

/** O rascunho que a pessoa vai aprovar, ajustar ou descartar. */
export interface RascunhoDeArtigo {
  titulo: string;
  /** Uma frase: o que estava acontecendo. */
  problema: string;
  /** Como o problema se manifesta — serve para outra pessoa se reconhecer nele. */
  sintomas: string[];
  /** O que foi feito. Vem do fio, não da imaginação. */
  solucao: string[];
  /** Como saber que resolveu. Vem do checklist da demanda. */
  comoVerificar: string[];
  /** Palavras pelas quais a próxima pessoa vai procurar isto. */
  termos: string[];
  sistemaId: string | null;
  origem: OrigemDoRascunho;
  /** As demandas que originaram este rascunho. Vira vínculo ao publicar. */
  demandasDeOrigem: string[];
  /**
   * O quanto o rascunho está completo, de 0 a 1.
   *
   * Não é confiança de IA: é quantas das cinco seções foram preenchidas com
   * dado real. Um rascunho com solução vazia não deve ser oferecido como se
   * estivesse pronto para aprovar.
   */
  completude: number;
}

/** Um grupo de demandas que terminaram praticamente da mesma forma. */
export interface Repeticao {
  /** As demandas do grupo, da mais recente para a mais antiga. */
  demandaIds: string[];
  /** O assunto que elas têm em comum, em palavras. */
  assunto: string[];
  /** Quantas vezes. É o número que aparece na sugestão. */
  vezes: number;
  sistemaId: string | null;
}

/**
 * O valor medido de um artigo.
 *
 * Existe para responder "esse conhecimento gera valor?" — e a resposta honesta
 * exige vínculo persistido entre artigo e demanda. Enquanto o esquema não
 * tiver isso, os campos derivados ficam em `null` em vez de zero: `0 usos`
 * afirma que ninguém usou; `null` admite que não sabemos.
 */
export interface ValorDoArtigo {
  artigoId: string;
  demandaDeOrigemId: string | null;
  aprovadoPor: string | null;
  criadoEm: string;
  /** Quantas vezes foi oferecido como relacionado. */
  vezesOferecido: number | null;
  /** Quantas demandas foram concluídas depois de ele ser aberto ali. */
  demandasResolvidas: number | null;
}
