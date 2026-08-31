import { describe, expect, it } from "vitest";
import { mensagemErroIA } from "../erro-ia";

/** Imita o que o `supabase.functions.invoke` lança: mensagem genérica e a
 *  `Response` real escondida em `context`. */
function erroDeFuncao(status: number, corpo: unknown) {
  const e = new Error("Edge Function returned a non-2xx status code") as Error & {
    context?: Response;
  };
  e.context = new Response(typeof corpo === "string" ? corpo : JSON.stringify(corpo), {
    status,
    headers: { "content-type": "application/json" },
  });
  return e;
}

describe("mensagemErroIA", () => {
  it("tira a mensagem do corpo em vez de mostrar o genérico do supabase-js", async () => {
    const err = erroDeFuncao(402, { error: "Créditos de IA esgotados. Adicione créditos em Configurações." });
    await expect(mensagemErroIA(err)).resolves.toBe(
      "Créditos de IA esgotados. Adicione créditos em Configurações.",
    );
  });

  it("aceita `message` quando o corpo usa esse nome", async () => {
    const err = erroDeFuncao(500, { message: "Falha no provedor" });
    await expect(mensagemErroIA(err)).resolves.toBe("Falha no provedor");
  });

  it("nunca devolve a frase genérica do supabase-js", async () => {
    const err = new Error("Edge Function returned a non-2xx status code");
    const msg = await mensagemErroIA(err, "padrão");
    expect(msg).toBe("padrão");
    expect(msg).not.toMatch(/non-2xx/i);
  });

  it("traduz 429 quando não há corpo para ler", async () => {
    await expect(mensagemErroIA(new Error("429 Too Many Requests"))).resolves.toMatch(/Muitas solicita/);
  });

  it("cai no padrão quando o corpo é HTML de gateway", async () => {
    const err = erroDeFuncao(502, "<html><body>Bad Gateway</body></html>");
    await expect(mensagemErroIA(err, "padrão")).resolves.toBe("padrão");
  });

  it("cai no padrão sem quebrar se o corpo já foi consumido", async () => {
    /* Corpo de `Response` só se lê uma vez, e nem `clone()` recupera depois
       disso. O contrato aqui é não lançar — a mensagem está perdida. */
    const err = erroDeFuncao(402, { error: "Créditos de IA esgotados." });
    await err.context!.text();
    await expect(mensagemErroIA(err, "padrão")).resolves.toBe("padrão");
  });

  it("memoriza, para o mesmo erro passar por aqui duas vezes", async () => {
    /* Acontece quando o serviço trata e o componente trata de novo. */
    const err = erroDeFuncao(402, { error: "Créditos de IA esgotados." });
    await expect(mensagemErroIA(err)).resolves.toBe("Créditos de IA esgotados.");
    await expect(mensagemErroIA(err)).resolves.toBe("Créditos de IA esgotados.");
  });

  it("preserva a mensagem quando o erro é um Error comum", async () => {
    await expect(mensagemErroIA(new Error("Payload inválido"))).resolves.toBe("Payload inválido");
  });
});
