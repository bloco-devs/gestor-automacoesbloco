import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { callAI } from "../_shared/ia-gateway.ts";
import { getCorsHeaders } from "../_shared/cors.ts";
import { checkRateLimit } from "../_shared/rate-limit.ts";
import { modeloPara } from "../_shared/modelos.ts";

/**
 * SUGERIR A CLASSIFICAÇÃO — E SÓ SUGERIR
 *
 * POR QUE ESTA FUNÇÃO É SEPARADA DAS OUTRAS
 *
 * Ela toca a única coisa neste sistema que vira dinheiro. `assistente-demanda`
 * ajuda alguém a descrever um problema; se errar, custa uma ida e volta. Aqui,
 * errar para cima custa R$ 200 de ponto que ninguém deveria ter recebido, e
 * errar para baixo tira de alguém o que era devido. Misturar as duas no mesmo
 * arquivo faria com que uma alteração de tom no Blink pudesse mexer, sem
 * querer, na régua de remuneração.
 *
 * O QUE ELA NÃO DECIDE
 *
 * Nada. Ela devolve uma sugestão e um rascunho de justificativa. Quem grava é
 * `relatorio_classificar()`, chamada pela sessão de uma pessoa, com o nome
 * dessa pessoa no registro e no histórico.
 *
 * Isso não é formalidade. A justificativa existe para que alguém, meses
 * depois, possa conferir a decisão. Justificativa escrita por IA defendendo
 * decisão tomada por IA não permite conferir coisa alguma — só produz um texto
 * plausível em volta de um número que ninguém examinou. E há um precedente
 * concreto neste projeto: o Blink reescreveu o pedido de uma solicitante, o
 * texto ficou fluente, ninguém desconfiou, e a equipe construiu a coisa
 * errada. Fluência convida a menos escrutínio, não a mais.
 *
 * O incentivo também importa. Quem escreve o relato influencia a própria
 * classificação. Com uma pessoa confirmando e assinando, existe alguém para
 * sustentar a decisão. Sem isso, o caminho para pontuar mais passa a ser
 * escrever um resumo mais elaborado — e ninguém precisa ser desonesto para
 * que isso aconteça.
 */

const SYSTEM = `Você classifica a complexidade de entregas técnicas de uma equipe de desenvolvimento, para um programa de remuneração variável.

Sua saída é uma SUGESTÃO que um desenvolvedor vai revisar e confirmar. Ela nunca é gravada direto.

A ESCALA
- facil (50 pontos): quem fez já sabia onde mexer. Alteração localizada, causa evidente pelo próprio pedido, efeito visível na hora se der errado.
- media (100 pontos): foi preciso INVESTIGAR para achar a causa, OU a mudança criou uma regra nova, OU tocou várias partes — mas tudo dentro de uma mesma funcionalidade.
- dificil (200 pontos): a mudança ATRAVESSOU FRONTEIRA — banco de dados, integração com outro sistema, permissão ou segurança — OU o risco de quebrar algo fora do escopo era real.

O QUE NÃO ENTRA NA DECISÃO, EM HIPÓTESE ALGUMA

1. TEMPO. Não existe "levou X horas, logo é Y". A empresa nunca definiu limites de hora, e horas medem disponibilidade, não dificuldade.

2. USO DE IA OU AUTOMAÇÃO. Grande parte do desenvolvimento aqui usa IA. Uma entrega complexa resolvida com boa ferramenta continua sendo complexa — a ferramenta mudou o custo, não o problema. Nunca rebaixe por causa disso, e nunca mencione isso na justificativa.

3. TAMANHO DO TEXTO. Um relato longo não indica entrega difícil, e um relato curto não indica entrega fácil. Julgue o que foi feito, não quanto foi escrito.

4. QUEM FEZ. Você não sabe e não deve considerar.

COMO ESCREVER A JUSTIFICATIVA
- Português do Brasil, 2 a 4 frases, direta.
- Cite o que no relato sustenta o nível: qual fronteira foi atravessada, o que teve de ser investigado, que regra foi criada.
- Escreva como quem vai ter que defender isso numa revisão daqui a seis meses.
- Não use "provavelmente", "aparentemente" nem "parece que". Se o relato não permite afirmar, diga o que falta.
- Nunca escreva que a classificação foi sugerida por IA. Quem confirma assina, e o sistema já registra a origem por conta própria.

QUANDO O RELATO NÃO DÁ BASE
Se o texto não permitir distinguir — por exemplo "ajustado", "corrigido", "feito" — devolva confianca "baixa" e diga na justificativa exatamente o que falta saber. NÃO chute para o meio só para preencher. Uma sugestão fraca sinalizada é útil; uma sugestão errada com cara de segura é pior que nenhuma.

FORMATO — responda APENAS com JSON válido, sem cercas de código:
{"classificacao":"facil|media|dificil","justificativa":"...","confianca":"alta|media|baixa"}`;

function getServiceClient() {
  return createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
  );
}

async function getUserIdFromAuth(req: Request): Promise<string | null> {
  try {
    const auth = req.headers.get("Authorization");
    if (!auth) return null;
    const client = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: auth } } },
    );
    const { data } = await client.auth.getUser();
    return data.user?.id ?? null;
  } catch {
    return null;
  }
}

const NIVEIS = ["facil", "media", "dificil"];

Deno.serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { titulo, pedido, relato, sistemas } = (await req.json()) as {
      titulo?: string;
      /** A descrição original da demanda — o que foi pedido. */
      pedido?: string;
      /** Como foi resolvido, nas palavras de quem resolveu. É a base do juízo. */
      relato?: string;
      sistemas?: string[];
    };

    if (!relato || relato.trim().length < 20) {
      return new Response(
        JSON.stringify({ error: "Relato curto demais para sugerir classificação." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Exige sessão: a sugestão é insumo de decisão financeira e não deve ser
    // acessível sem usuário identificado, mesmo sendo só leitura.
    const userId = await getUserIdFromAuth(req);
    if (!userId) {
      return new Response(JSON.stringify({ error: "Não autenticado." }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const rl = await checkRateLimit(getServiceClient(), userId);
    if (!rl.permitido) {
      return new Response(
        JSON.stringify({ error: "Muitas solicitações à IA. Aguarde alguns instantes." }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const entrada = [
      titulo ? `TÍTULO: ${titulo}` : null,
      pedido ? `O QUE FOI PEDIDO:\n${pedido}` : null,
      `COMO FOI RESOLVIDO:\n${relato}`,
      sistemas?.length ? `SISTEMAS AFETADOS: ${sistemas.join(", ")}` : null,
    ]
      .filter(Boolean)
      .join("\n\n");

    // `triagem` e não `conversa`: o trabalho aqui é produzir JSON com enum
    // fechado, que é exatamente o que aquele perfil de modelo atende.
    const data = (await callAI(
      {
        model: modeloPara("triagem"),
        messages: [
          { role: "system", content: SYSTEM },
          { role: "user", content: entrada },
        ],
      },
      { acao: "sugerir-classificacao", userId },
    )) as any;

    const bruto: string = data.choices?.[0]?.message?.content?.trim() ?? "";

    /**
     * O modelo às vezes devolve o JSON dentro de cerca de código, apesar da
     * instrução. Extrair o primeiro objeto é mais barato que uma segunda
     * chamada — e falhar aqui não pode derrubar a conclusão da demanda.
     */
    let sugestao: { classificacao?: string; justificativa?: string; confianca?: string } = {};
    try {
      const m = bruto.match(/\{[\s\S]*\}/);
      sugestao = JSON.parse(m ? m[0] : bruto);
    } catch {
      return new Response(
        JSON.stringify({ error: "A IA não devolveu uma sugestão utilizável." }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Enum fora do catálogo é recusado, não corrigido para o vizinho mais
    // próximo. Adivinhar aqui produziria um nível que ninguém escolheu.
    if (!NIVEIS.includes(String(sugestao.classificacao))) {
      return new Response(
        JSON.stringify({ error: "A IA devolveu um nível inválido." }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    return new Response(
      JSON.stringify({
        classificacao: sugestao.classificacao,
        justificativa: String(sugestao.justificativa ?? "").trim(),
        confianca: ["alta", "media", "baixa"].includes(String(sugestao.confianca))
          ? sugestao.confianca
          : "baixa",
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
