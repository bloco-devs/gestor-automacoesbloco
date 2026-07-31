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

A PRIMEIRA PERGUNTA, SE VOCÊ NÃO SABE O SISTEMA

Se a pessoa não disse EM QUAL SISTEMA o problema acontece, e não dá para
deduzir com segurança pelo que ela escreveu, essa é a sua primeira pergunta.
Antes de qualquer detalhe técnico.

O motivo é simples: o sistema decide quem vai resolver. Uma demanda com o
erro perfeitamente descrito e sem sistema fica parada esperando alguém
adivinhar de quem é. Uma demanda com o sistema certo e o erro mal descrito
chega em quem sabe perguntar o resto.

Não pergunte "em qual sistema?" e pronto — isso obriga a pessoa a lembrar
nomes. Ofereça os dois ou três mais prováveis pelo que ela descreveu, e
deixe a saída aberta. Assim:

  "Isso é no Gestor de RH ou no Gestão Comercial? Se for outro, me diz qual."

Se ela citou o sistema, ou se o que ela descreveu só pode ser um deles, não
gaste a pergunta com isso — vá direto ao que falta.

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
    const { action, messages, sistemas } = (await req.json()) as {
      action: "next_question" | "generate_description" | "generate_title";
      messages: ChatMessage[];
      /** Catálogo do ecossistema. Opcional: sem ele, o Blink não pergunta sobre sistema. */
      sistemas?: Array<{ slug?: string; nome?: string }>;
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
      /**
       * Sem a lista, a regra "ofereça dois ou três nomes prováveis" seria
       * letra morta — o modelo teria a instrução e nenhum nome. Vazia, ele
       * simplesmente não pergunta sobre sistema, que é o comportamento certo
       * quando não há catálogo para oferecer.
       */
      const listaDeSistemas = Array.isArray(sistemas) ? sistemas : [];
      const catalogo = listaDeSistemas.length
        ? `\n\nSISTEMAS EXISTENTES (use estes nomes exatos ao perguntar):\n${listaDeSistemas
            .map((s: { slug?: string; nome?: string }) => `- ${s.nome ?? s.slug}`)
            .join("\n")}`
        : "";

      const system = `${SYSTEM_BASE}${catalogo}

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
      /**
       * A DESCRIÇÃO É LIDA POR QUEM VAI CONSERTAR, NÃO POR QUEM PEDIU
       *
       * Antes ela saía em primeira pessoa e em prosa corrida: "Estou
       * enfrentando dificuldades técnicas ao tentar criar uma pop-up, pois o
       * processo é interrompido por uma mensagem de erro desconhecido..."
       * Correto, e inútil para trabalhar. O desenvolvedor precisa ler três
       * linhas para extrair o que cabia em uma, e não consegue colar aquilo
       * em lugar nenhum sem reescrever antes.
       *
       * Quem abriu a demanda já leu o que escreveu — ele não volta aqui para
       * reler a própria queixa em terceira pessoa. Quem volta é quem vai
       * resolver.
       *
       * O formato fixo existe para ser COLÁVEL: quem for pedir ajuda a uma IA
       * copia o bloco inteiro e ele já está estruturado. Prosa corrida
       * obrigaria a reescrever antes de colar, e é isso que faz as pessoas
       * desistirem de usar o que o sistema produziu.
       *
       * "Não inventar" é a parte mais importante. Um passo de reprodução
       * plausível que a pessoa não descreveu manda o desenvolvedor investigar
       * um caminho que ninguém percorreu — pior que não ter passo nenhum.
       */
      const system = `Com base na conversa abaixo entre o assistente e o solicitante, escreva a descrição TÉCNICA da demanda, em português, para quem vai desenvolver.

Quem lê isto é o desenvolvedor, não quem abriu. Escreva para ele.

Use exatamente este formato, nesta ordem, omitindo as seções sem informação:

**O que acontece**
Uma ou duas frases, direto. O comportamento observado, sem rodeio e sem
"o usuário relata que". Ex: "O botão Salvar não responde ao criar POP."

**Como reproduzir**
Passos numerados, só os que a pessoa DESCREVEU. Se ela não detalhou o
caminho, escreva "Não detalhado na conversa." e nada mais.

**Comportamento esperado**
O que deveria acontecer, numa frase.

**Evidências**
Mensagem de erro exata (entre aspas), print anexado, horário — só o que foi
mencionado. Omita a seção inteira se não houver nada.

**Pistas técnicas**
Só se houver base na conversa: tela ou módulo citado, se é sempre ou
intermitente, se começou depois de alguma mudança. Omita se não houver.

REGRAS
- Não invente passo, mensagem de erro, versão, navegador ou causa provável.
  Se a conversa não disse, a seção fica de fora ou diz "não detalhado".
- Não repita a frase do solicitante palavra por palavra: traduza para
  comportamento observável.
- Sem saudação, sem "Prezados", sem "Fico no aguardo", sem primeira pessoa.
- Não proponha solução nem estime prazo.

Retorne apenas o texto, sem título e sem cercas de código.`;
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
