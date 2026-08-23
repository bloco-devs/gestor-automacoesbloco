// Envio de email pelo HUB Bloco ID.
//
// O Gestor não fala com servidor de email. Quem tem a chave do Resend é o HUB,
// e todo mundo aqui manda por ele — `confirmar-atendimento-existente` já fazia
// isso, com a chamada escrita dentro do próprio arquivo.
//
// Este módulo nasceu daquela função, mas NÃO a substituiu ainda: a original
// segue de pé onde está. Trocar por esta aqui obrigaria a redeployar uma
// function que hoje funciona, e o deploy de functions neste projeto passa pelo
// Lovable — risco desnecessário para uma limpeza sem efeito visível. Fica como
// dívida consciente, e some no dia em que aquela function precisar de deploy
// por outro motivo.
//
// A diferença de contrato: lá bastava um booleano, porque o email era um extra
// e falhar em silêncio era aceitável. A fila precisa gravar POR QUE falhou —
// senão o painel mostra "falhou" e ninguém consegue agir. Por isso `enviarEmail`
// devolve o motivo junto.

const HUB_URL = Deno.env.get("BLOCO_ID_HUB_URL") ?? "";
const HUB_TOKEN = Deno.env.get("BLOCO_ID_TOKEN") ?? "";

/** O HUB está configurado? Sem isso não adianta nem tentar. */
export function emailConfigurado(): boolean {
  return Boolean(HUB_URL && HUB_TOKEN);
}

export function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export interface ResultadoEnvio {
  ok: boolean;
  /** Preenchido só quando `ok` é false. Vai direto para `ultimo_erro` na fila. */
  erro?: string;
}

export async function enviarEmail(args: {
  para: string;
  assunto: string;
  html: string;
}): Promise<ResultadoEnvio> {
  if (!emailConfigurado()) {
    return { ok: false, erro: "BLOCO_ID_HUB_URL ou BLOCO_ID_TOKEN ausente" };
  }

  try {
    const resp = await fetch(`${HUB_URL}/functions/v1/api-gateway/email/send`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${HUB_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        to: args.para,
        subject: args.assunto,
        html: args.html,
      }),
    });

    if (!resp.ok) {
      const txt = await resp.text().catch(() => "");
      // O corpo do erro do HUB entra truncado: é o que faz a diferença entre
      // "falhou" e "falhou porque o domínio não está verificado", mas não
      // precisa de um stack trace inteiro dentro de uma coluna de texto.
      return { ok: false, erro: `HUB ${resp.status}: ${txt.slice(0, 300)}` };
    }

    return { ok: true };
  } catch (e) {
    return { ok: false, erro: e instanceof Error ? e.message : String(e) };
  }
}
