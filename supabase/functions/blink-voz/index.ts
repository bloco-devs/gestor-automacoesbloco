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

/**
 * UMA CASCATA, E NÃO UM MODELO
 *
 * O identificador `openai/gpt-4o-mini-tts-2025-12-15` está correto — é o que
 * a página do modelo publica — e mesmo assim o OpenRouter respondeu "does not
 * exist". Isso não é erro de digitação: um modelo pode não estar liberado
 * para a conta, para a região, ou pode ter saído do catálogo entre a
 * documentação e hoje.
 *
 * Descobrir qual funciona testando um por vez custa um ciclo de deploy a
 * cada tentativa. A função passa a percorrer a lista e usar o primeiro que
 * responder. É a diferença entre um sistema que exige acerto na primeira e um
 * que se resolve sozinho.
 *
 * A ORDEM TEM RAZÃO
 * 1. GPT-4o Mini TTS — o único que aceita `instructions`, a instrução de
 *    interpretação em texto que produz o tom pedido. Se estiver disponível,
 *    é o melhor resultado.
 * 2. Gemini 3.1 Flash TTS — cobertura ampla de idiomas e boa qualidade.
 * 3. Kokoro 82M — leve e barato, suporta português. Rede de segurança.
 *
 * `BLINK_VOZ_MODELO` continua existindo: se definido, ele é o único tentado.
 * Serve para fixar um modelo depois que se souber qual funciona, sem esperar
 * a cascata em toda chamada.
 */
const MODELO_FIXO = Deno.env.get("BLINK_VOZ_MODELO");

const CANDIDATOS: Array<{ modelo: string; voz: string }> = [
  { modelo: "openai/gpt-4o-mini-tts-2025-12-15", voz: "shimmer" },
  { modelo: "google/gemini-3.1-flash-tts-preview", voz: "Aoede" },
  { modelo: "hexgrad/kokoro-82m", voz: "pf_dora" },
];

const VOZ_FIXA = Deno.env.get("BLINK_VOZ");

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

  const tentativas = MODELO_FIXO
    ? [{ modelo: MODELO_FIXO, voz: VOZ_FIXA ?? "shimmer" }]
    : CANDIDATOS.map((cand) => ({ modelo: cand.modelo, voz: VOZ_FIXA ?? cand.voz }));

  const recusas: string[] = [];
  let resp: Response | null = null;
  let usado: { modelo: string; voz: string } | null = null;

  for (const tentativa of tentativas) {
    const r = await fetch("https://openrouter.ai/api/v1/audio/speech", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${chave}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: tentativa.modelo,
        input: recortado,
        voice: tentativa.voz,
        response_format: "mp3",
        // `instructions` não é parâmetro de topo aqui: opções específicas do
        // provedor viajam dentro de `provider.options`, e só as do provedor
        // efetivamente escolhido são repassadas. Nos modelos que não são da
        // OpenAI, isto é simplesmente ignorado.
        provider: {
          options: {
            openai: { instructions: INSTRUCAO_DE_VOZ },
          },
        },
      }),
    });

    if (r.ok) {
      resp = r;
      usado = tentativa;
      break;
    }

    const detalhe = await r.text();
    recusas.push(`${tentativa.modelo} (${r.status}): ${detalhe.slice(0, 200)}`);
  }

  if (!resp || !usado) {
    // Todas recusaram. O log guarda a recusa de CADA uma — sem isso, a
    // investigação recomeça do zero a cada tentativa.
    console.error("[blink-voz] nenhum modelo de voz aceitou", { recusas });
    return new Response(
      JSON.stringify({ error: "Nenhum modelo de voz disponível na conta.", recusas }),
      { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  // Registrar qual venceu permite fixar `BLINK_VOZ_MODELO` depois e parar de
  // pagar o custo das tentativas anteriores em toda chamada.
  console.log("[blink-voz] gerou com", usado);

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
