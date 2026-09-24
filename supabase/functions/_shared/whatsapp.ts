// O que o Blink escreve no WhatsApp, e o que fazer com a resposta da Uazapi.
//
// Sem nenhum import de Deno ou de URL, de propósito: este arquivo é importado
// pela edge function E pelos testes do vitest em src/. É aqui que mora tudo o
// que dá para errar sem perceber — texto, rótulo de coluna, decisão de repetir
// um envio — e por isso é aqui que fica o que é testado.

export type Evento = "demanda_criada" | "coluna_mudou" | "demanda_concluida";

export type Status =
  | "backlog"
  | "a_fazer"
  | "em_desenvolvimento"
  | "em_testes"
  | "homologacao"
  | "concluido";

export interface DadosMensagem {
  ticket_code?: string | null;
  titulo?: string | null;
  /** Primeiro nome de quem pediu. */
  nome?: string | null;
  /**
   * Primeiro nome de quem está com a demanda (`demands.assigned_to`). Não vem
   * do trigger: a edge function busca na hora do envio, para a mensagem dizer
   * quem está cuidando AGORA, e não quem estava quando o cartão se moveu.
   */
  responsavel?: string | null;
  status?: string | null;
  status_antes?: string | null;
}

/**
 * O nome de cada coluna, igual ao que aparece no quadro.
 *
 * Cópia de `STATUS_META` em src/domain/demand/mappers/fromDemands.ts — a edge
 * function roda em Deno e não alcança o src/. O teste
 * `src/modules/notificacao-whatsapp/__tests__/texto.test.ts` trava as cópias
 * juntas: se alguém renomear ou reordenar uma coluna lá, o CI quebra aqui, e
 * não na mensagem que chega no celular de alguém.
 */
export const ROTULO_COLUNA: Record<Status, string> = {
  backlog: "Backlog",
  a_fazer: "A fazer",
  em_desenvolvimento: "Em desenvolvimento",
  em_testes: "Em testes",
  homologacao: "Homologação",
  concluido: "Concluída",
};

/** A ordem das colunas no quadro. É o que separa "avançou" de "voltou". */
export const ORDEM_COLUNA: Record<Status, number> = {
  backlog: 0,
  a_fazer: 1,
  em_desenvolvimento: 2,
  em_testes: 3,
  homologacao: 4,
  concluido: 5,
};

/**
 * O QUE O BLINK DIZ EM CADA ETAPA
 *
 * O tom é o de alguém que está acompanhando o pedido junto com a pessoa: diz o
 * que aconteceu, quem está cuidando, e o que vem depois. Cada frase recebe o
 * primeiro nome do responsável quando existe — "Nielson assumiu" é outra
 * mensagem, bem mais humana, que "alguém da equipe assumiu".
 *
 * AVANÇAR E VOLTAR SÃO FRASES DIFERENTES. O cartão que sai de "Em testes" e
 * volta para "Em desenvolvimento" não foi "assumido": alguém achou um ajuste.
 * Mandar "assumiu sua solicitação" de novo seria o Blink contando uma coisa
 * que não aconteceu. A volta é dita como ela é, e dita com calma — voltar uma
 * etapa para acertar é cuidado, não problema.
 *
 * SEM GÊNERO. Nenhuma frase usa artigo antes do nome ("o Nielson") nem
 * adjetivo para quem lê ("fique tranquilo"): o sistema não sabe o gênero de
 * ninguém, e errar isso numa mensagem pessoal é pior do que a frase ficar um
 * pouco menos coloquial.
 */
type Frase = (responsavel: string | null) => string;

export const FRASE_AVANCO: Record<Exclude<Status, "concluido">, Frase> = {
  backlog: () =>
    "Sua solicitação está na fila de análise da equipe. Assim que ela andar, eu te conto.",
  a_fazer: () =>
    "Boa notícia: sua solicitação foi analisada e já entrou na fila de trabalho. Em breve alguém da equipe assume. 👍",
  em_desenvolvimento: (r) =>
    r
      ? `${r} assumiu sua solicitação e já está trabalhando nela. 🙌`
      : "Uma pessoa da equipe assumiu sua solicitação e já está trabalhando nela. 🙌",
  em_testes: (r) =>
    r
      ? `${r} terminou a parte principal e agora está testando tudo com cuidado antes de te entregar. 🔍`
      : "A parte principal ficou pronta e agora está sendo testada com cuidado antes de chegar até você. 🔍",
  homologacao: (r) =>
    r
      ? `Ficou pronta! 🎉 ${r} terminou, e agora só falta você: dá uma olhada e me conta se ficou como esperava.`
      : "Ficou pronta! 🎉 Agora só falta você: dá uma olhada e me conta se ficou como esperava.",
};

export const FRASE_VOLTA: Record<Exclude<Status, "concluido">, Frase> = {
  backlog: () =>
    "Sua solicitação voltou para a fila de análise. Às vezes a equipe precisa entender melhor o pedido antes de seguir — assim que ela andar, eu te conto.",
  a_fazer: () =>
    "Sua solicitação voltou para a fila de trabalho. Nada se perdeu: ela segue assim que alguém da equipe puder assumir.",
  em_desenvolvimento: (r) =>
    r
      ? `${r} encontrou um ajuste para fazer e voltou a trabalhar nela. Melhor acertar agora do que te entregar pela metade. 🛠️`
      : "A equipe encontrou um ajuste para fazer e voltou a trabalhar nela. Melhor acertar agora do que te entregar pela metade. 🛠️",
  em_testes: (r) =>
    r
      ? `${r} fez um ajuste e voltou a testar antes de te entregar de novo. 🔍`
      : "A equipe fez um ajuste e voltou a testar antes de te entregar de novo. 🔍",
  homologacao: (r) => FRASE_AVANCO.homologacao(r),
};

/**
 * Teto do texto da resolução dentro da mensagem.
 *
 * O relato técnico tem mediana perto de 1.100 caracteres e passa de 2.000.
 * Numa notificação isso vira uma parede: a pessoa lê o começo e a mensagem
 * inteira fica com cara de spam. O começo do relato diz o essencial, e o link
 * no fim leva ao texto completo.
 */
export const LIMITE_RESOLUCAO = 700;

function temValor(s: string | null | undefined): s is string {
  return typeof s === "string" && s.trim().length > 0;
}

function ehStatus(s: string | null | undefined): s is Status {
  return !!s && s in ROTULO_COLUNA;
}

/** Corta no fim de uma palavra, nunca no meio dela. */
export function truncar(texto: string, limite = LIMITE_RESOLUCAO): string {
  const t = texto.trim();
  if (t.length <= limite) return t;
  const corte = t.slice(0, limite);
  const ultimoEspaco = corte.lastIndexOf(" ");
  const base = ultimoEspaco > limite * 0.6 ? corte.slice(0, ultimoEspaco) : corte;
  return `${base.replace(/[\s.,;:]+$/, "")}…`;
}

function cabecalho(d: DadosMensagem): string {
  const titulo = temValor(d.titulo) ? d.titulo.trim() : "sua solicitação";
  return temValor(d.ticket_code) ? `*${d.ticket_code.trim()}* — ${titulo}` : `*${titulo}*`;
}

function saudacao(d: DadosMensagem): string {
  return temValor(d.nome) ? `Oi, ${d.nome.trim()}! 😊` : "Oi! 😊";
}

/**
 * A mensagem inteira, pronta para o campo `text` da Uazapi.
 *
 * Formatação do próprio WhatsApp: *negrito* e _itálico_. Nada de HTML, nada de
 * markdown de link — o WhatsApp já transforma URL em link sozinho.
 */
export function montarMensagem(
  evento: Evento,
  d: DadosMensagem,
  opts: { link: string | null; appUrl: string; resolucao?: string | null },
): string {
  const partes: string[] = [];
  const link = opts.link;
  const resp = temValor(d.responsavel) ? d.responsavel.trim() : null;

  if (evento === "demanda_criada") {
    partes.push(`${saudacao(d)} Aqui é o Blink, do Gestor de Automações.`);
    partes.push(`Recebi sua solicitação e já deixei tudo registrado:\n${cabecalho(d)}`);
    partes.push(
      "Vou te acompanhando por aqui: a cada passo que ela der, eu te conto. Não precisa ficar conferindo o sistema.",
    );
    if (link) partes.push(`Se quiser dar uma espiada: ${link}`);
  } else if (evento === "demanda_concluida") {
    partes.push(saudacao(d));
    partes.push(`Prontinho — sua solicitação foi concluída! ✅\n${cabecalho(d)}`);
    if (temValor(opts.resolucao)) {
      partes.push(`*O que foi feito:*\n${truncar(opts.resolucao)}`);
    }
    if (resp) partes.push(`Quem cuidou dela foi ${resp}.`);
    partes.push(
      "Obrigado pela paciência! Se precisar de mais alguma coisa, é só abrir uma nova solicitação. 💙",
    );
    if (link) {
      // Sem o relato, o link é onde o registro do que foi feito vai estar. A
      // mensagem não inventa um resumo que ninguém escreveu.
      partes.push(temValor(opts.resolucao) ? `Detalhes: ${link}` : `O registro do que foi feito fica aqui: ${link}`);
    }
  } else {
    const para: Status | null = ehStatus(d.status) ? d.status : null;
    const de: Status | null = ehStatus(d.status_antes) ? d.status_antes : null;
    const voltou = para !== null && de !== null && ORDEM_COLUNA[para] < ORDEM_COLUNA[de];

    partes.push(saudacao(d));
    if (para && para !== "concluido") {
      partes.push((voltou ? FRASE_VOLTA : FRASE_AVANCO)[para](resp));
    }
    partes.push(cabecalho(d));
    partes.push(`Etapa atual: *${para ? ROTULO_COLUNA[para] : "atualizada"}*`);
    if (link) {
      // Só uma etapa pede ação. Nas outras o link é conveniência; nesta ele é
      // o ponto da mensagem inteira.
      partes.push(para === "homologacao" ? `Validar agora: ${link}` : link);
    }
  }

  partes.push(`_Se preferir não receber estes avisos, é só desligar aqui: ${opts.appUrl}/preferencias_`);
  return partes.join("\n\n");
}

// ---------------------------------------------------------------------------
// A resposta da Uazapi
// ---------------------------------------------------------------------------

/**
 * O que fazer depois de chamar `POST /send/text`.
 *
 *   enviado  → a API aceitou. (Aceitar não é entregar — mas é o fim do nosso lado.)
 *   falhou   → erro desta mensagem (400: payload inválido, número recusado).
 *              Repetir igual daria o mesmo erro. Para e espera uma pessoa.
 *   configuracao → 401/403/404: token, permissão ou instância. Não é erro da
 *              mensagem, é erro da integração — e vale para TODAS da fila.
 *              A linha volta para pendente (sabemos que não saiu: a API
 *              recusou antes) e o lote para, em vez de marcar a fila inteira
 *              como falha por causa de um token vencido.
 *   repetir  → a própria API disse que foi limite (429) ou falha dela (5xx).
 *              Nesse caso ela respondeu, então sabemos que não enviou.
 *   incerto  → não houve resposta (timeout, rede) ou houve conflito (409).
 *              A mensagem PODE ter saído. A documentação da Uazapi é explícita
 *              em não repetir às cegas, e repetir aqui é mandar duas vezes a
 *              mesma coisa para o celular de alguém.
 */
export type Desfecho = "enviado" | "falhou" | "configuracao" | "repetir" | "incerto";

export function classificarResposta(status: number | "timeout" | "rede"): Desfecho {
  if (status === "timeout" || status === "rede") return "incerto";
  if (status >= 200 && status < 300) return "enviado";
  if (status === 409) return "incerto";
  if (status === 401 || status === 403 || status === 404) return "configuracao";
  if (status === 429 || status >= 500) return "repetir";
  return "falhou";
}

/** Depois disso um `repetir` vira `falhou`. */
export const MAX_TENTATIVAS = 3;

/**
 * Espera antes da próxima tentativa, em milissegundos.
 *
 * 1, 5 e 15 minutos: o cron roda de minuto em minuto, então intervalo menor
 * que isso não existe na prática. Quando a API manda `Retry-After`, vale o
 * maior dos dois — ela sabe melhor do que nós quando o limite volta.
 */
export function esperaAntesDaTentativa(tentativa: number, retryAfterSegundos?: number | null): number {
  const escada = [60_000, 5 * 60_000, 15 * 60_000];
  const base = escada[Math.min(Math.max(tentativa, 1), escada.length) - 1];
  const pedida = retryAfterSegundos && retryAfterSegundos > 0 ? retryAfterSegundos * 1000 : 0;
  return Math.max(base, pedida);
}

/**
 * Quanto tempo a mensagem de conclusão espera pelo relato técnico.
 *
 * Concluir faz três chamadas em sequência, e o relato é a última. Em condições
 * normais ele chega segundos depois do status. Dez minutos cobrem a pessoa que
 * concluiu e ficou revisando o texto antes de salvar; depois disso a mensagem
 * sai sem a resolução, porque a demanda está concluída de qualquer jeito e o
 * solicitante precisa saber disso.
 */
export const ESPERA_PELO_RELATO_MS = 10 * 60_000;
