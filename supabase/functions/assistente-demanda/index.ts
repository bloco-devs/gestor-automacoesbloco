import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { callAI, IAUsageError } from "../_shared/ia-gateway.ts";
import { getCorsHeaders } from "../_shared/cors.ts";
import { checkRateLimit } from "../_shared/rate-limit.ts";
import { modeloPara } from "../_shared/modelos.ts";

type ChatMessage = { role: "user" | "assistant"; content: string };

/**
 * A VOZ DO BLINK
 *
 * O que mudou daqui para trás: só o jeito de falar. O método é o mesmo —
 * uma pergunta por vez, cobrindo processo, frequência, dor e resultado
 * esperado, sem sugerir solução. O que estava ruim era o registro: frases de
 * formulário ("Qual a frequência de execução do processo?") feitas para
 * preencher campo, não para conversar com alguém que está com um problema.
 *
 * Blink não se apresenta, não conta piada e não fala de si. Ele soa como um
 * colega competente do outro lado — e um colega competente pergunta
 * "quantas vezes por semana isso acontece?", não "informe a frequência".
 */
const SYSTEM_BASE = `Você é o Blink, o assistente do Gestor de Automações. Ajuda colegas a descrever uma demanda de automação ou melhoria de processo.

COMO VOCÊ FALA
- Português do Brasil, tom de colega de trabalho: próximo, direto, sem cerimônia e sem infantilidade.
- Frases curtas. Uma pergunta por vez.
- Use as palavras que a pessoa usou. Se ela diz "planilha do financeiro", não devolva "sistema de gestão financeira".
- Nada de linguagem de formulário. Pergunte "quantas vezes por semana isso acontece?" em vez de "informe a frequência de execução".
- Quando ela descrever algo trabalhoso ou irritante, reconheça em meia frase e siga. Sem discurso, sem "sinto muito", sem exclamação.
- Nunca se apresente, não fale de si, não use emoji, não diga que é uma IA. Você é só quem está ajudando.

VOCÊ TEM NO MÁXIMO DUAS PERGUNTAS. NÃO HÁ TERCEIRA.
Este é o ponto mais importante. Com duas perguntas não existe "começar
amplo e ir afunilando" — a primeira pergunta já precisa ser a mais útil que
você conseguiria fazer. Trate cada uma como se fosse a última, porque a
segunda é.

O QUE PERGUNTAR DEPENDE DO TIPO DE PROBLEMA

Se algo NÃO FUNCIONA (erro, trava, não salva, não aparece):
1. O que acontece na tela. Aparece mensagem de erro? Trava? Não acontece nada?
2. Acontece sempre ou de vez em quando? Já funcionou antes?
Não pergunte "o que você faz nesse processo" — ela já disse o que estava
fazendo quando quebrou. Perguntar de novo soa como quem não leu.

Se é TRABALHO MANUAL que ela quer facilitar:
1. Quantas vezes por semana, e quanto tempo leva.
2. Qual a parte mais chata ou onde mais erra.

Se é COISA NOVA que ela quer que exista:
1. O que ela faz hoje sem isso.
2. Quem mais precisaria usar.

REGRA QUE VALE PARA OS TRÊS CASOS
Nunca devolva a frase da pessoa em forma de pergunta. Se ela disse "não
consigo criar um ritual", NÃO pergunte "o que você tenta fazer quando quer
criar um ritual?". Isso não acrescenta nada e mostra que você não escutou.
Pergunte o que ela ainda não disse: o que aparece na tela, desde quando,
se acontece sempre.

O QUE VOCÊ NÃO FAZ
- Não sugere solução, não propõe ferramenta, não estima prazo.
- Não inventa dado que a pessoa não disse.
- Não pergunta o que ela já respondeu, nem reformula o que ela disse.
- Não faz pergunta genérica que caberia em qualquer demanda.`;

function getServiceClient() {
  const url = Deno.env.get("SUPABASE_URL") ?? "";
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

async function getUserIdFromAuth(req: Request): Promise<string | null> {
  const auth = req.headers.get("Authorization") ?? "";
  const token = auth.toLowerCase().startsWith("bearer ") ? auth.slice(7) : "";
  if (!token) return null;
  try {
    const url = Deno.env.get("SUPABASE_URL") ?? "";
    const anon = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
    const client = createClient(url, anon, {
      global: { headers: { Authorization: `Bearer ${token}` } },
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data } = await client.auth.getUser();
    return data.user?.id ?? null;
  } catch {
    return null;
  }
}

Deno.serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { action, messages } = (await req.json()) as {
      action: "next_question" | "generate_description" | "generate_title";
      messages: ChatMessage[];
    };


    if (!action || !Array.isArray(messages)) {
      return new Response(JSON.stringify({ error: "Payload inválido" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userId = await getUserIdFromAuth(req);

    // Rate limit (best-effort) — 20 req/60s por usuário.
    const svc = getServiceClient();
    const rl = await checkRateLimit(svc, userId);
    if (!rl.permitido) {
      return new Response(
        JSON.stringify({ error: "Muitas solicitações à IA. Aguarde alguns instantes." }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const userTurns = messages.filter((m) => m.role === "user").length;

    if (action === "next_question") {
      const system = `${SYSTEM_BASE}

Você já fez ${messages.filter((m) => m.role === "assistant").length} pergunta(s) e recebeu ${userTurns} resposta(s).

O limite REAL é 2 perguntas — a tela encerra a conversa aí, e este número
dizia 4. O modelo se planejava para quatro rodadas, gastava a primeira
numa pergunta ampla para afunilar depois, e as duas rodadas seguintes
nunca chegavam. A pergunta larga, que era o começo de um plano, virava a
única pergunta feita.

Se já tiver informação suficiente OU já fez 2 perguntas, retorne apenas a
string especial "[FIM]".
Caso contrário, retorne APENAS a próxima pergunta (sem prefixos, sem numeração).`;

      const data = await callAI(
        {
          model: modeloPara("conversa"),
          messages: [{ role: "system", content: system }, ...messages],
        },
        { acao: "assistente-demanda:next_question", userId },
      ) as any;
      const content: string = data.choices?.[0]?.message?.content?.trim() ?? "";
      const done = content.includes("[FIM]") || userTurns >= 4;
      return new Response(JSON.stringify({ done, question: done ? null : content }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "generate_title") {
      const system = `Com base na conversa entre o assistente e o solicitante, escreva o TÍTULO da demanda.

REGRA ESTRITA: o título deve ser extremamente resumido, direto e claro, contendo no máximo 5 a 7 palavras. Deixe os detalhes apenas para a descrição.
- Sem ponto final, sem aspas, sem prefixos como "Título:".
- Português do Brasil, usando as palavras do solicitante.
- Retorne apenas o título, nada mais.`;
      const data = await callAI(
        {
          model: modeloPara("conversa"),
          messages: [{ role: "system", content: system }, ...messages],
        },
        { acao: "assistente-demanda:generate_title", userId },
      ) as any;
      const title: string = data.choices?.[0]?.message?.content?.trim() ?? "";
      return new Response(JSON.stringify({ title }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "generate_description") {
      const system = `Com base na conversa abaixo entre o assistente e o solicitante, escreva uma DESCRIÇÃO DA DEMANDA em português, em 1 a 2 parágrafos, em primeira pessoa do solicitante, de forma objetiva e completa. Não inclua perguntas, não use bullet points, não inclua título. Retorne apenas o texto da descrição.`;
      const data = await callAI(
        {
          model: modeloPara("conversa"),
          messages: [{ role: "system", content: system }, ...messages],
        },
        { acao: "assistente-demanda:generate_description", userId },
      ) as any;
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
    const status = e instanceof IAUsageError ? e.status : 500;
    const message = e instanceof Error ? e.message : "Erro desconhecido";
    console.error("assistente-demanda error:", message);
    return new Response(JSON.stringify({ error: message }), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
