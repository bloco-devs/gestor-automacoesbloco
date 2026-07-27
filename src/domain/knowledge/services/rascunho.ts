import type { Demanda, Evento } from "@/domain/demand";
import type { RascunhoDeArtigo, Repeticao } from "../types";

/**
 * O rascunho de artigo, montado a partir da demanda resolvida.
 *
 * NADA AQUI CHAMA IA — E ISSO É O PONTO
 * A demanda resolvida já contém o artigo, espalhado em quatro lugares:
 *
 *   problema        a descrição, ou a primeira fala de quem abriu
 *   sintomas        as falas de quem abriu antes da primeira resposta
 *   solução         as falas da equipe mais próximas da conclusão
 *   como verificar  o checklist, que é a definição de pronto acordada
 *
 * Montar isso é rearranjo de texto que já existe. A IA entra depois, na fase
 * 2, para transformar as frases soltas em prosa — mas o rascunho precisa
 * existir e ser útil mesmo sem ela, senão a Base Viva vira refém de uma
 * chamada que pode falhar, custar ou demorar.
 *
 * A `completude` diz quantas seções vieram com dado real. Um rascunho sem
 * solução não pode ser oferecido como se estivesse pronto para aprovar: quem
 * aprova sem ler publica um artigo vazio, e um artigo vazio ocupa a busca sem
 * resolver — que é o pior estado possível de uma base.
 */

const PARADAS = new Set([
  "para","com","sem","que","não","nao","dos","das","uma","uns","umas","por","como","mais","pelo","pela",
  "esta","este","isso","aquilo","quando","onde","porque","todos","todas","muito","apenas","ainda","pode",
  "preciso","gostaria","favor","poderia","consegue","obrigado","urgente","ajuda","alguem","alguém",
  "bom","boa","dia","tarde","noite","the","and","for",
]);

function tokens(texto: string): string[] {
  return texto
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/\[[^\]]*\]/g, " ")
    .split(/[^a-z0-9]+/)
    .filter((t) => t.length > 3 && !PARADAS.has(t));
}

/** As palavras mais frequentes e específicas, para servirem de busca depois. */
function termosDe(textos: string[], limite = 8): string[] {
  const conta = new Map<string, number>();
  for (const t of textos) {
    for (const palavra of tokens(t)) conta.set(palavra, (conta.get(palavra) ?? 0) + 1);
  }
  return [...conta.entries()]
    .sort((a, b) => b[1] - a[1] || b[0].length - a[0].length)
    .slice(0, limite)
    .map(([p]) => p);
}

function limpar(texto: string): string {
  return texto.replace(/\s+/g, " ").trim();
}

export function rascunhoDeDemanda(
  d: Demanda,
  eventos: Evento[],
  criteriosCumpridos: string[],
  solicitanteId: string | null,
): RascunhoDeArtigo {
  const falas = eventos.filter((e) => e.tipo === "fala" && !e.interna && e.autor);

  const problema = limpar(d.descricao || falas[0]?.texto || d.titulo);

  /**
   * Sintomas são o que quem abriu disse ANTES da primeira resposta da equipe.
   * Depois da primeira resposta a conversa vira negociação — "consegue mandar
   * o print?", "consigo" — e isso não descreve o problema para ninguém.
   */
  const primeiraRespostaEm = falas.find((e) => e.autor?.id !== solicitanteId)?.em;
  const sintomas = falas
    .filter(
      (e) =>
        e.autor?.id === solicitanteId &&
        (!primeiraRespostaEm || new Date(e.em) <= new Date(primeiraRespostaEm)),
    )
    .map((e) => limpar(e.texto))
    .filter((t) => t.length > 15)
    .slice(0, 3);

  /**
   * A solução são as últimas falas da equipe, **menos as que se declaram
   * fracassadas**.
   *
   * O erro mais caro deste arquivo seria documentar como solução uma hipótese
   * que foi descartada: a próxima pessoa lê num artigo publicado, confia na
   * autoridade dele e segue pelo caminho errado. Pegar só as últimas não
   * resolve — numa demanda curta a hipótese descartada É uma das últimas.
   *
   * O que resolve sem IA é um sinal léxico honesto: quem descarta uma
   * tentativa quase sempre escreve isso na mesma frase ("não resolveu",
   * "continua o erro", "sem sucesso"). Não é semântica, é vocabulário — e
   * funciona porque a pessoa está relatando o resultado, não escondendo.
   *
   * O limite conhecido: uma tentativa descartada em silêncio, sem ninguém
   * dizer que falhou, passa. Distinguir esse caso exige entender o texto, e é
   * exatamente onde a IA da fase 2 entra — melhorando o rascunho, não
   * viabilizando-o.
   */
  const FRACASSO =
    /\bn[ãa]o (resolveu|funcionou|adiantou|deu certo|rolou)|sem sucesso|continua (com )?(o )?(mesmo )?erro|voltou a (falhar|dar erro)|persiste\b/i;

  const solucao = falas
    .filter((e) => e.autor && e.autor.id !== solicitanteId && !e.autor.ia)
    .filter((e) => !FRACASSO.test(e.texto))
    .slice(-3)
    .map((e) => limpar(e.texto))
    .filter((t) => t.length > 15);

  const comoVerificar = criteriosCumpridos.map(limpar).filter(Boolean);

  const secoes = [problema, sintomas.join(" "), solucao.join(" "), comoVerificar.join(" ")];
  const completude = secoes.filter((s) => s.length > 15).length / 4;

  return {
    titulo: d.titulo,
    problema,
    sintomas,
    solucao,
    comoVerificar,
    termos: termosDe([d.titulo, problema, ...solucao]),
    sistemaId: d.sistema?.id ?? null,
    origem: "demanda",
    demandasDeOrigem: [d.id],
    completude,
  };
}

/**
 * Detecta soluções que já se repetiram.
 *
 * A REGRA
 * Só entram demandas concluídas. Agrupa por vocabulário específico em comum —
 * o mesmo mecanismo que relaciona conhecimento, aplicado ao passado. Um grupo
 * vira sugestão a partir de `minimo` ocorrências.
 *
 * POR QUE TRÊS E NÃO CINCO
 * Cinco é seguro demais: na quinta vez, a equipe já perdeu quatro
 * oportunidades de escrever. Três é o menor número em que "coincidência" deixa
 * de ser explicação razoável — e o custo de uma sugestão errada é uma pessoa
 * dizer "não" uma vez, contra o custo de nunca sugerir, que é a base nunca
 * existir.
 *
 * Determinístico: nenhuma chamada de IA para descobrir que algo se repetiu.
 */
export function detectarRepeticoes(concluidas: Demanda[], minimo = 3): Repeticao[] {
  /**
   * Agrupamento incremental, e não por chave fixa.
   *
   * A primeira versão montava uma chave com as duas palavras mais fortes de
   * cada demanda. Parecia suficiente e não era: "Exportação de relatório trava
   * no financeiro" e "Exportação de relatório lenta demais" produziam chaves
   * diferentes — `exportacao+financeiro` e `exportacao+relatorio` — e as duas
   * demandas, que são obviamente sobre o mesmo assunto, caíam em grupos
   * separados. Um teste apanhou isso.
   *
   * Chave fixa exige que duas frases escolham as MESMAS duas palavras entre as
   * mais fortes, o que depende de quantas palavras cada uma tem. Comparar cada
   * demanda com os grupos já formados não tem essa fragilidade: basta
   * compartilhar duas palavras específicas com o núcleo do grupo.
   */
  const grupos: Array<{ ids: string[]; nucleo: Set<string>; sistemaId: string | null }> = [];

  for (const d of concluidas) {
    if (!d.concluida) continue;
    const palavras = new Set(termosDe([d.titulo, d.descricao ?? ""], 6));
    if (palavras.size < 2) continue;

    const grupo = grupos.find((g) => {
      let comuns = 0;
      for (const p of palavras) if (g.nucleo.has(p)) comuns += 1;
      return comuns >= 2;
    });

    if (grupo) {
      grupo.ids.push(d.id);
      // O núcleo é a INTERSEÇÃO, não a união: unir faria o grupo crescer até
      // aceitar qualquer coisa, e no fim tudo seria o mesmo assunto.
      for (const p of [...grupo.nucleo]) if (!palavras.has(p)) grupo.nucleo.delete(p);
      if (grupo.sistemaId !== (d.sistema?.id ?? null)) grupo.sistemaId = null;
    } else {
      grupos.push({ ids: [d.id], nucleo: palavras, sistemaId: d.sistema?.id ?? null });
    }
  }

  return grupos
    .filter((g) => g.ids.length >= minimo)
    .map((g) => ({
      demandaIds: g.ids,
      assunto: [...g.nucleo].slice(0, 4),
      vezes: g.ids.length,
      sistemaId: g.sistemaId,
    }))
    .sort((a, b) => b.vezes - a.vezes);
}

/**
 * A frase da sugestão.
 *
 * Ela é uma pergunta, não um aviso. "Essa solução já foi usada 4 vezes" só
 * informa; a pergunta oferece a ação no mesmo lugar — e é a diferença entre
 * um painel que se lê e um painel que se usa.
 */
export function fraseDaRepeticao(r: Repeticao): string {
  const assunto = r.assunto.slice(0, 2).join(" e ");
  return `${r.vezes} demandas sobre ${assunto} terminaram parecido. Virar artigo?`;
}
