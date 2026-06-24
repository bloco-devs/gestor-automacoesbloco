import { callAI } from "../_shared/ia-gateway.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

type ChatMessage = { role: "user" | "assistant"; content: string };

const SYSTEM_BASE = `Você é um assistente que ajuda colaboradores a descrever uma demanda de automação/melhoria de processo de forma clara e objetiva.
Faça perguntas curtas, em português, UMA de cada vez. Cubra ao longo da conversa: (1) o que a pessoa faz hoje no processo, (2) com qual frequência/contexto, (3) qual a maior dor/dificuldade, (4) qual o resultado esperado.
Seja amigável e direto. Não dê sugestões nem soluções — apenas pergunte para entender melhor.`;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { action, messages } = (await req.json()) as {
      action: "next_question" | "generate_description";
      messages: ChatMessage[];
    };

    if (!action || !Array.isArray(messages)) {
      return new Response(JSON.stringify({ error: "Payload inválido" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userTurns = messages.filter((m) => m.role === "user").length;

    if (action === "next_question") {
      const system = `${SYSTEM_BASE}

Você já fez ${messages.filter((m) => m.role === "assistant").length} pergunta(s) e recebeu ${userTurns} resposta(s).
Limite total: 4 perguntas. Se já tiver informação suficiente OU já fez 4 perguntas, retorne apenas a string especial "[FIM]".
Caso contrário, retorne APENAS a próxima pergunta (sem prefixos, sem numeração).`;

      const data = await callAI({
        model: "google/gemini-3-flash-preview",
        messages: [{ role: "system", content: system }, ...messages],
      }) as any;
      const content: string = data.choices?.[0]?.message?.content?.trim() ?? "";
      const done = content.includes("[FIM]") || userTurns >= 4;
      return new Response(JSON.stringify({ done, question: done ? null : content }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "generate_description") {
      const system = `Com base na conversa abaixo entre o assistente e o solicitante, escreva uma DESCRIÇÃO DA DEMANDA em português, em 1 a 2 parágrafos, em primeira pessoa do solicitante, de forma objetiva e completa. Não inclua perguntas, não use bullet points, não inclua título. Retorne apenas o texto da descrição.`;
      const data = await callAI({
        model: "google/gemini-3-flash-preview",
        messages: [{ role: "system", content: system }, ...messages],
      });
      const description: string = data.choices?.[0]?.message?.content?.trim() ?? "";
      return new Response(JSON.stringify({ description }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Ação desconhecida" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Erro desconhecido";
    console.error("assistente-demanda error:", message);
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
