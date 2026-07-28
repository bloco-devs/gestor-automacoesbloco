import { getCorsHeaders } from "../_shared/cors.ts";

/**
 * A voz do Blink.
 *
 * POR QUE UMA EDGE FUNCTION E NÃO UMA CHAMADA DO NAVEGADOR
 * A chave da API não pode existir no cliente — quem abrir o inspetor a leva
 * embora e passa a gastar na conta da empresa. O navegador manda texto, a
 * função devolve áudio, e a credencial nunca sai do servidor.
 *
 * O ENDPOINT
 * OpenRouter expõe `/api/v1/audio/speech`, compatível com a API de áudio da
 * OpenAI. Isso permite usar a chave que a empresa já tem, sem abrir conta
 * nova nem administrar uma segunda fatura.
 *
 * A VOZ
 * `gpt-4o-mini-tts` aceita `instructions` — instrução de interpretação em
 * texto livre. É o que permite chegar ao registro pedido (calmo, pausado,
 * acolhedor, contido) sem precisar desenhar e versionar uma voz sob medida.
 * `shimmer` é a base mais macia e neutra do conjunto disponível.
 *
 * CUSTO
 * ~US$0,015 por minuto de áudio. No volume desta empresa, algo perto de
 * US$0,35/mês. O teto de caracteres abaixo não existe por dinheiro: existe
 * porque ninguém escuta um parágrafo de 40 segundos — a pessoa lê antes.
 */

const TETO_DE_CARACTERES = 600;

const MODELO = Deno.env.get("BLINK_VOZ_MODELO") ?? "openai/gpt-4o-mini-tts-2025-12-15";
const VOZ = Deno.env.get("BLINK_VOZ") ?? "shimmer";

const INSTRUCAO_DE_VOZ = [
  "Fale em português do Brasil.",
  "Tom calmo, pausado e acolhedor, como alguém que tem tempo para ouvir.",
  "Voz contida e estável: nunca eufórica, nunca dramática, sem exclamação.",
  "Ritmo ligeiramente mais lento que o normal, com pausas naturais entre as frases.",
  "Transmita atenção e cuidado sem soar infantil.",
].join(" ");

Deno.serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const chave = Deno.env.get("OPENROUTER_API_KEY") ?? "";

  // GET serve para a interface perguntar "a voz está configurada?" antes de
  // oferecer o botão. Botão que aparece e falha é pior que botão ausente.
  if (req.method === "GET") {
    return new Response(JSON.stringify({ disponivel: !!chave }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Método não suportado" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  if (!chave) {
    return new Response(
      JSON.stringify({ error: "Voz não configurada. Falta OPENROUTER_API_KEY." }),
      { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  let texto = "";
  try {
    const body = (await req.json()) as { texto?: string };
    texto = (body.texto ?? "").trim();
  } catch {
    return new Response(JSON.stringify({ error: "Corpo inválido" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  if (!texto) {
    return new Response(JSON.stringify({ error: "Sem texto para falar" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const recortado = texto.length > TETO_DE_CARACTERES ? texto.slice(0, TETO_DE_CARACTERES) : texto;

  const resp = await fetch("https://openrouter.ai/api/v1/audio/speech", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${chave}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      // O slug do OpenRouter inclui a data da versão — `openai/gpt-4o-mini-tts`
      // (sem ela) não existe, e é o "Model not found" que a própria
      // documentação lista como erro mais comum. Fica em variável de ambiente
      // porque a data avança: trocar de versão vira mudar um secret, não
      // publicar código.
      model: MODELO,
      input: recortado,
      voice: VOZ,
      response_format: "mp3",
      // `instructions` NÃO é parâmetro de topo aqui. No OpenRouter, opções
      // específicas do provedor viajam dentro de `provider.options`, e só as
      // do provedor efetivamente escolhido são repassadas. No topo, ela era
      // silenciosamente descartada — o áudio sairia, mas sem o tom pedido.
      provider: {
        options: {
          openai: { instructions: INSTRUCAO_DE_VOZ },
        },
      },
    }),
  });

  if (!resp.ok) {
    const detalhe = await resp.text();
    // Sem isto, um 502 no navegador não diz nada e a investigação começa do
    // zero. O log do provedor é a única pista de qual parâmetro ele recusou.
    console.error("[blink-voz] OpenRouter recusou", {
      status: resp.status,
      modelo: MODELO,
      voz: VOZ,
      detalhe: detalhe.slice(0, 500),
    });
    return new Response(
      JSON.stringify({ error: `Falha ao gerar a voz (${resp.status})`, detalhe }),
      { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  const audio = await resp.arrayBuffer();
  return new Response(audio, {
    headers: {
      ...corsHeaders,
      "Content-Type": "audio/mpeg",
      // O mesmo texto gera o mesmo áudio: cachear evita pagar duas vezes pela
      // mesma frase quando a pessoa recarrega a página.
      "Cache-Control": "public, max-age=86400",
    },
  });
});
