import type { Demanda } from "../types";

/**
 * O que já se sabe sobre este problema.
 *
 * A META, DITA COM PRECISÃO
 * "O desenvolvedor deve ter a sensação de que alguém já pesquisou antes dele."
 * Uma lista de links não produz essa sensação — produz a sensação de resultado
 * de busca, que é o oposto: resultado de busca é trabalho que ele ainda vai
 * ter. O que diferencia as duas coisas é **o motivo**. "Artigo X" é um link;
 * "Artigo X — mesmo sistema, fala de exportação" é alguém tendo pesquisado.
 *
 * Por isso todo item daqui carrega `porque`. Um relacionado sem motivo não
 * entra na lista: se o sistema não sabe explicar por que aquilo é relevante,
 * ele não sabe se é relevante.
 *
 * TUDO DETERMINÍSTICO
 * Nenhuma chamada de IA. É sobreposição de palavras e igualdade de sistema
 * sobre dados que já estão no banco — instantâneo, offline, custo zero. A IA
 * entra na fase 2 para resumir artigo longo e explicar solução complexa; ela
 * enriquece a busca, não a substitui.
 */

export type GeneroRelacionado = "demanda" | "solucao" | "artigo";

export interface Relacionado {
  id: string;
  genero: GeneroRelacionado;
  titulo: string;
  /** Por que isto apareceu. Sem motivo, o item não entra. */
  porque: string;
  /** Para navegar. Rota interna ou URL externa. */
  destino: string;
  /** 0–1. Usado só para ordenar; nunca é mostrado. */
  peso: number;
}

/** Candidato a relacionado, no formato mínimo que a busca precisa. */
export interface Candidato {
  id: string;
  genero: GeneroRelacionado;
  titulo: string;
  destino: string;
  /** Resumo, corpo ou descrição — o que houver. */
  texto?: string | null;
  /** Palavras-chave e tags já cadastradas. */
  termos?: string[];
  /** Sistema a que se refere, quando declarado. */
  sistemaId?: string | null;
}

/**
 * Palavras que não são assunto.
 *
 * Além das preposições óbvias, esta lista tem um segundo grupo que só faz
 * sentido num corpus de chamados: **os verbos de pedido**. "Preciso",
 * "gostaria", "poderia", "consegue" aparecem em quase todo chamado, então duas
 * demandas sem nada em comum casam por elas — foi exatamente o que um teste
 * apanhou aqui. Relacionar por essas palavras é pior que não relacionar: o
 * desenvolvedor abre o artigo, vê que não tem nada a ver, e passa a ignorar o
 * painel inteiro.
 */
const PARADAS = new Set([
  "para","com","sem","que","não","nao","dos","das","uma","uns","umas","por","como","mais","pelo","pela",
  "esta","este","isso","aquilo","aquele","aquela","quando","onde","porque","todos","todas","muito",
  "apenas","ainda","pode","está","estao","estão","fazer","tem","têm","the","and","for","are","was",
  // Verbos e fórmulas de pedido: presentes em quase todo chamado.
  "preciso","precisa","precisamos","queria","quero","gostaria","favor","poderia","podia","consegue",
  "conseguem","seria","possivel","possível","obrigado","obrigada","urgente","ajuda","ajudar","alguem",
  "alguém","bom","boa","dia","tarde","noite","funcione","funciona","funcionar","funcionando",
]);

function tokens(texto: string): Set<string> {
  return new Set(
    texto
      .toLowerCase()
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .replace(/\[[^\]]*\]/g, " ")
      .split(/[^a-z0-9]+/)
      .filter((t) => t.length > 3 && !PARADAS.has(t)),
  );
}

/** As três palavras mais específicas em comum, para virar frase. */
function comuns(a: Set<string>, b: Set<string>): string[] {
  const iguais: string[] = [];
  for (const t of b) if (a.has(t)) iguais.push(t);
  // Palavra mais longa costuma ser mais específica — "exportacao" diz mais que
  // "erro", e é ela que faz o motivo soar como pesquisa e não como acaso.
  return iguais.sort((x, y) => y.length - x.length).slice(0, 3);
}

/**
 * Relaciona uma demanda ao que já existe.
 *
 * A REGRA DE CORTE
 * Sistema igual sozinho não basta: num sistema com trezentos artigos, "mesmo
 * sistema" traria trezentos. Exige-se pelo menos uma palavra específica em
 * comum — e aí o sistema igual entra como reforço, elevando o peso e mudando
 * a frase do motivo.
 *
 * Cinco itens no máximo. Um painel com quinze relacionados devolve ao
 * desenvolvedor o trabalho de filtrar, que é justamente o que ele deveria ter
 * economizado.
 */
export function relacionar(d: Demanda, candidatos: Candidato[], limite = 5): Relacionado[] {
  const alvo = tokens(`${d.titulo} ${d.descricao ?? ""}`);
  if (alvo.size < 2) return [];

  const achados: Relacionado[] = [];

  for (const c of candidatos) {
    if (c.id === d.id) continue;

    const dele = tokens(`${c.titulo} ${c.texto ?? ""} ${(c.termos ?? []).join(" ")}`);
    if (dele.size === 0) continue;

    const iguais = comuns(alvo, dele);
    if (iguais.length === 0) continue;

    const mesmoSistema = !!d.sistema && !!c.sistemaId && d.sistema.id === c.sistemaId;
    const proporcao = iguais.length / Math.min(alvo.size, dele.size);

    // Duas palavras em comum é o piso quando os sistemas diferem; com o mesmo
    // sistema, uma palavra específica já é sinal suficiente.
    if (!mesmoSistema && iguais.length < 2) continue;

    const assunto = iguais.slice(0, 2).join(" e ");
    const porque = mesmoSistema
      ? `Mesmo sistema, fala de ${assunto}`
      : `Fala de ${assunto}`;

    achados.push({
      id: c.id,
      genero: c.genero,
      titulo: c.titulo,
      porque,
      destino: c.destino,
      peso: proporcao + (mesmoSistema ? 0.5 : 0) + iguais.length * 0.1,
    });
  }

  /**
   * A ordem entre gêneros é deliberada quando o peso empata: solução anterior
   * vale mais que artigo, e artigo vale mais que demanda parecida. Uma solução
   * já foi aplicada e funcionou; um artigo foi escrito para ser lido; uma
   * demanda parecida ainda pode estar aberta e sem resposta.
   */
  const desempate: Record<GeneroRelacionado, number> = { solucao: 0, artigo: 1, demanda: 2 };

  return achados
    .sort((a, b) => b.peso - a.peso || desempate[a.genero] - desempate[b.genero])
    .slice(0, limite);
}

/**
 * A frase do bloco, para quem lê antes de olhar a lista.
 *
 * Existe porque "existe documentação?" é uma das perguntas dos 20 segundos, e
 * a resposta precisa caber numa linha.
 */
export function resumirRelacionados(itens: Relacionado[]): string | null {
  if (itens.length === 0) return null;
  const conta = new Map<GeneroRelacionado, number>();
  for (const i of itens) conta.set(i.genero, (conta.get(i.genero) ?? 0) + 1);
  const nome: Record<GeneroRelacionado, [string, string]> = {
    artigo: ["artigo", "artigos"],
    solucao: ["solução anterior", "soluções anteriores"],
    demanda: ["demanda parecida", "demandas parecidas"],
  };
  return [...conta.entries()]
    .map(([g, n]) => `${n} ${nome[g][n === 1 ? 0 : 1]}`)
    .join(", ");
}
