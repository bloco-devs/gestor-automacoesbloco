/**
 * Traduz o erro de uma edge function de IA na mensagem que o servidor mandou.
 *
 * O PROBLEMA QUE ISTO RESOLVE
 *
 * As funções de IA respondem com o status certo e um corpo `{ error: "..." }`
 * já em português — por exemplo, `402` com "Créditos de IA esgotados. Adicione
 * créditos em Configurações." Mas o `supabase.functions.invoke` NÃO lê esse
 * corpo: ele lança um `FunctionsHttpError` cuja `message` é sempre a mesma
 * frase genérica, "Edge Function returned a non-2xx status code".
 *
 * O resultado é que a tela sabia o motivo e mostrava um enigma. Quando os
 * créditos acabaram de verdade, foi preciso ir ao banco e ao painel do provedor
 * para descobrir uma coisa que o servidor já tinha dito na primeira resposta.
 *
 * A `Response` original vem em `err.context`. É de lá que se tira a mensagem.
 */

/** Corpo de erro das funções de IA. */
type CorpoErro = { error?: unknown; message?: unknown };

/**
 * `Response` só pode ser lida uma vez. Como o mesmo erro pode passar por aqui
 * mais de uma vez (por exemplo, tratado no serviço e de novo no componente),
 * guardamos o texto já lido junto ao próprio erro.
 */
const LIDO = new WeakMap<object, string>();

function extrair(corpo: unknown): string | null {
  if (!corpo || typeof corpo !== "object") return null;
  const c = corpo as CorpoErro;
  for (const v of [c.error, c.message]) {
    if (typeof v === "string" && v.trim()) return v.trim();
  }
  return null;
}

/**
 * A mensagem para mostrar ao usuário. Nunca lança: se nada der certo, devolve
 * o `padrao`.
 */
export async function mensagemErroIA(err: unknown, padrao = "Não foi possível falar com a IA agora."): Promise<string> {
  if (err && typeof err === "object") {
    const cache = LIDO.get(err as object);
    if (cache) return cache;

    const ctx = (err as { context?: unknown }).context;
    if (ctx instanceof Response) {
      try {
        /* `clone()` para não consumir o corpo de quem mais precise dele. */
        const texto = await ctx.clone().text();
        const msg = extrair(safeJson(texto)) ?? (texto.trim() && !texto.trim().startsWith("<") ? texto.trim() : null);
        if (msg) {
          LIDO.set(err as object, msg);
          return msg;
        }
      } catch {
        /* corpo já consumido ou ilegível: cai para o resto */
      }
    }
  }

  const bruta = err instanceof Error ? err.message : typeof err === "string" ? err : "";
  /* O genérico do supabase-js não informa nada; não vale mostrar. */
  if (/non-2xx status code/i.test(bruta)) return padrao;
  if (/429|muitas solicita/i.test(bruta)) return "Muitas solicitações à IA. Aguarde alguns instantes.";
  return bruta.trim() || padrao;
}

function safeJson(t: string): unknown {
  try {
    return JSON.parse(t);
  } catch {
    return null;
  }
}
