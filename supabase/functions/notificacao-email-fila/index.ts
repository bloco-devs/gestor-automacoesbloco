// Drena a fila de avisos por email.
//
// O trigger `trg_demanda_email` decide QUEM recebe e QUANDO; esta função
// decide O QUE está escrito e faz o envio. A divisão é de propósito: mudar o
// texto de um email é a coisa mais frequente que vai acontecer aqui, e não
// pode exigir migration.
//
// Chamada de dois lugares:
//   • pelo cron, de minuto em minuto (ver o rodapé da migration);
//   • pelo botão "Processar agora" do painel, quando alguém não quer esperar.
//
// É idempotente: processa só o que está `pendente` e marca cada linha antes de
// passar para a próxima. Duas execuções simultâneas no pior caso repetem um
// envio, nunca perdem um.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";
import { getCorsHeaders } from "../_shared/cors.ts";
import { enviarEmail, escapeHtml, emailConfigurado } from "../_shared/email-hub.ts";

const APP_URL = Deno.env.get("APP_URL") ?? "https://gestor-automacoesbloco.lovable.app";

/** Depois disso a linha vira `falhou` e para de consumir cron. */
const MAX_TENTATIVAS = 3;

/** Teto por execução. Com cron de 1 minuto, dá 3000 emails/hora — folga larga. */
const LOTE_PADRAO = 50;

interface DadosDemanda {
  ticket_code?: string | null;
  titulo?: string | null;
  nome?: string | null;
  rotulo?: string | null;
  rotulo_antes?: string | null;
  status?: string | null;
}

interface LinhaFila {
  id: string;
  destinatario_email: string;
  demanda_id: string | null;
  evento: string;
  dados: DadosDemanda;
  tentativas: number;
}

// ---------------------------------------------------------------------------
// Texto
// ---------------------------------------------------------------------------

/**
 * O assunto carrega a mensagem inteira, de propósito.
 *
 * A maioria destes emails vai ser lida na lista da caixa de entrada, sem
 * abrir. "Atualização na sua demanda" obriga a abrir para descobrir se
 * interessa — e por isso não é aberto. "Pronta para sua validação" já disse
 * tudo, e quem abre é quem vai agir.
 */
function montarAssunto(evento: string, d: DadosDemanda): string {
  const ticket = d.ticket_code ? `[${d.ticket_code}] ` : "";

  if (evento === "demanda_criada") return `${ticket}Recebemos sua solicitação`;
  if (evento === "demanda_concluida") return `${ticket}Concluída`;

  switch (d.rotulo) {
    case "Em desenvolvimento":
      return `${ticket}Entrou em desenvolvimento`;
    case "Aguardando validação":
      return `${ticket}Pronta para sua validação`;
    case "Em análise":
      return `${ticket}Voltou para análise`;
    default:
      return `${ticket}${d.rotulo ?? "Atualização"}`;
  }
}

/** Frase principal do corpo. Uma só, em português de gente. */
function montarChamada(evento: string, d: DadosDemanda): string {
  if (evento === "demanda_criada") {
    return "Recebemos sua solicitação e ela já entrou na fila da equipe.";
  }
  if (evento === "demanda_concluida") {
    return "Sua solicitação foi concluída.";
  }

  switch (d.rotulo) {
    case "Em desenvolvimento":
      return "Alguém da equipe assumiu sua solicitação e começou a trabalhar nela.";
    case "Aguardando validação":
      return "A equipe terminou o trabalho e agora precisa de você: confira se ficou como esperava.";
    case "Em análise":
      return "Sua solicitação voltou para análise da equipe.";
    default:
      return `Sua solicitação agora está em ${d.rotulo ?? "andamento"}.`;
  }
}

/**
 * Só um dos avisos pede ação. Nos outros o botão é conveniência; neste ele é o
 * ponto do email inteiro, e o texto muda para dizer isso.
 */
function montarRotuloBotao(evento: string, d: DadosDemanda): string {
  if (evento === "status_mudou" && d.rotulo === "Aguardando validação") {
    return "Validar agora";
  }
  return "Abrir solicitação";
}

function montarHtml(evento: string, d: DadosDemanda, link: string | null): string {
  const nome = escapeHtml(d.nome ?? "").trim();
  const saudacao = nome ? `Olá, ${nome}.` : "Olá.";
  const chamada = escapeHtml(montarChamada(evento, d));
  const titulo = escapeHtml((d.titulo ?? "").trim());
  const ticket = escapeHtml((d.ticket_code ?? "").trim());
  const rotulo = escapeHtml((d.rotulo ?? "").trim());

  const linhaTicket = ticket
    ? `<span style="color:#64748b;font-size:13px">${ticket}</span><br>`
    : "";

  const bloco = titulo
    ? `<div style="border-left:3px solid #2563eb;padding:8px 0 8px 14px;margin:20px 0">
${linhaTicket}<strong style="font-size:16px">${titulo}</strong>
${rotulo ? `<br><span style="color:#475569;font-size:14px">Situação: ${rotulo}</span>` : ""}
</div>`
    : "";

  const botao = link
    ? `<p style="margin:24px 0"><a href="${escapeHtml(link)}" style="display:inline-block;padding:10px 16px;background:#2563eb;color:#fff;text-decoration:none;border-radius:6px">${escapeHtml(montarRotuloBotao(evento, d))}</a></p>`
    : "";

  const rodapeExtra =
    evento === "demanda_criada"
      ? "<p style=\"color:#475569\">Você vai receber um aviso aqui a cada passo importante. Não precisa entrar no sistema para acompanhar.</p>"
      : "";

  return `<!doctype html><html><body style="font-family:Arial,sans-serif;color:#0f172a;line-height:1.5">
<p>${saudacao}</p>
<p>${chamada}</p>
${bloco}
${botao}
${rodapeExtra}
<p style="color:#64748b;font-size:12px;margin-top:24px">
Esta mensagem foi enviada pelo Gestor de Automações Bloco.<br>
Para escolher quais avisos você recebe, acesse <a href="${escapeHtml(APP_URL)}/preferencias" style="color:#64748b">suas preferências</a>.
</p>
</body></html>`;
}

// ---------------------------------------------------------------------------
// Handler
// ---------------------------------------------------------------------------

Deno.serve(async (req) => {
  const cors = getCorsHeaders(req);
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });

  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { ...cors, "Content-Type": "application/json" },
    });

  if (!emailConfigurado()) {
    // Erro de configuração, não de dados: falhar alto evita que a fila
    // acumule tentativas gastas contra um HUB que nunca foi configurado.
    return json(
      { erro: "HUB de email não configurado (BLOCO_ID_HUB_URL / BLOCO_ID_TOKEN)" },
      503,
    );
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } },
  );

  let limite = LOTE_PADRAO;
  try {
    const body = await req.json();
    if (typeof body?.limite === "number" && body.limite > 0) {
      limite = Math.min(body.limite, 200);
    }
  } catch {
    // Sem corpo (é o caso do cron) — segue com o padrão.
  }

  const { data, error } = await supabase
    .from("notificacao_email_fila")
    .select("id, destinatario_email, demanda_id, evento, dados, tentativas")
    .eq("situacao", "pendente")
    .lt("tentativas", MAX_TENTATIVAS)
    .order("created_at", { ascending: true })
    .limit(limite);

  if (error) {
    console.error("notificacao-email-fila: falha ao ler a fila", error.message);
    return json({ erro: error.message }, 500);
  }

  const linhas = (data ?? []) as LinhaFila[];
  let enviados = 0;
  let falhas = 0;

  for (const linha of linhas) {
    const dados = linha.dados ?? {};
    const link = linha.demanda_id ? `${APP_URL}/demandas/${linha.demanda_id}` : null;

    const resultado = await enviarEmail({
      para: linha.destinatario_email,
      assunto: montarAssunto(linha.evento, dados),
      html: montarHtml(linha.evento, dados, link),
    });

    if (resultado.ok) {
      enviados++;
      await supabase
        .from("notificacao_email_fila")
        .update({ situacao: "enviado", enviado_em: new Date().toISOString(), ultimo_erro: null })
        .eq("id", linha.id);
    } else {
      falhas++;
      const tentativas = linha.tentativas + 1;
      // Continua `pendente` enquanto houver tentativa sobrando: o cron do
      // minuto seguinte pega de novo. Só vira `falhou` no fim da corda, e aí
      // para de ser trabalho repetido para sempre.
      await supabase
        .from("notificacao_email_fila")
        .update({
          tentativas,
          ultimo_erro: resultado.erro ?? "erro desconhecido",
          situacao: tentativas >= MAX_TENTATIVAS ? "falhou" : "pendente",
        })
        .eq("id", linha.id);
      console.warn(
        `notificacao-email-fila: envio ${linha.id} falhou (tentativa ${tentativas}):`,
        resultado.erro,
      );
    }
  }

  return json({ processados: linhas.length, enviados, falhas });
});
