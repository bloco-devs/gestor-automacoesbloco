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
  nome?: string | null;
  status?: string | null;
  status_antes?: string | null;
}

/**
 * O nome de cada coluna, igual ao que aparece no quadro.
 *
 * Cópia de `STATUS_META` em src/domain/demand/mappers/fromDemands.ts — a edge
 * function roda em Deno e não alcança o src/. O teste
 * `src/modules/notificacao-whatsapp/__tests__/texto.test.ts` trava as duas
 * listas juntas: se alguém renomear uma coluna lá, o CI quebra aqui, e não na
 * mensagem que chega no celular de alguém.
 */
export const ROTULO_COLUNA: Record<Status, string> = {
  backlog: "Backlog",
  a_fazer: "A fazer",
  em_desenvolvimento: "Em desenvolvimento",
  em_testes: "Em testes",
  homologacao: "Homologação",
  concluido: "Concluída",
};

/**
 * O que a coluna significa para quem pediu.
 *
 * O nome da coluna é vocabulário da equipe. "Em testes" diz algo para quem
 * desenvolve; para quem pediu, o que importa é "ainda não chegou até mim, mas
 * está perto". Cada mensagem leva as duas coisas: o nome, para bater com o que
 * a pessoa vê se abrir o sistema, e a frase, para ela não precisar abrir.
 */
export const FRASE_COLUNA: Record<Exclude<Status, "concluido">, string> = {
  backlog: "Ela voltou para a fila de análise da equipe.",
  a_fazer: "Ela já está na fila de trabalho da equipe.",
  em_desenvolvimento: "Alguém da equipe já está trabalhando nela.",
  em_testes: "Está sendo testada antes de chegar até você.",
  homologacao: "Ficou pronta e agora precisa de você: confira se está como esperava.",
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

function rotulo(status: string | null | undefined): string | null {
  return status && status in ROTULO_COLUNA ? ROTULO_COLUNA[status as Status] : null;
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

  if (evento === "demanda_criada") {
    const nome = temValor(d.nome) ? `, ${d.nome.trim()}` : "";
    partes.push(`Oi${nome}! Aqui é o Blink, do Gestor de Automações. 👋`);
    partes.push(`Recebi sua solicitação:\n${cabecalho(d)}`);
    partes.push(
      "A partir de agora eu te aviso por aqui cada vez que ela mudar de etapa, até ficar pronta.",
    );
    if (link) partes.push(`Acompanhe quando quiser: ${link}`);
  } else if (evento === "demanda_concluida") {
    partes.push(`✅ ${cabecalho(d)}`);
    if (temValor(opts.resolucao)) {
      partes.push("Sua solicitação foi concluída.");
      partes.push(`*O que foi feito:*\n${truncar(opts.resolucao)}`);
      if (link) partes.push(`Detalhes: ${link}`);
    } else {
      // Sem o relato, a mensagem não inventa um resumo: diz que acabou e
      // aponta para onde o registro vai estar.
      partes.push(
        link
          ? `Sua solicitação foi concluída. O registro do que foi feito fica aqui: ${link}`
          : "Sua solicitação foi concluída.",
      );
    }
  } else {
    const para = rotulo(d.status) ?? "uma nova etapa";
    const de = rotulo(d.status_antes);
    const frase =
      d.status && d.status in FRASE_COLUNA
        ? FRASE_COLUNA[d.status as keyof typeof FRASE_COLUNA]
        : null;

    partes.push(cabecalho(d));
    partes.push(
      de ? `Sua solicitação passou de _${de}_ para *${para}*.` : `Sua solicitação foi para *${para}*.`,
    );
    if (frase) partes.push(frase);
    if (link) {
      // Só uma etapa pede ação. Nas outras o link é conveniência; nesta ele é
      // o ponto da mensagem inteira.
      partes.push(d.status === "homologacao" ? `Validar agora: ${link}` : link);
    }
  }

  partes.push(`_Para parar de receber estes avisos: ${opts.appUrl}/preferencias_`);
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
