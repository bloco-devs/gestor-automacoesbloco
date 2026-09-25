// Drena a fila de avisos por WhatsApp — o Blink avisando o solicitante.
//
// Mesma divisão do email: o trigger `trg_demanda_whatsapp` decide QUEM recebe
// e QUANDO; esta função decide O QUE está escrito e faz o envio. O texto mora
// em ../_shared/whatsapp.ts, que é onde está testado.
//
// A DIFERENÇA QUE IMPORTA: ESTA FUNÇÃO NUNCA MANDA A MESMA MENSAGEM DUAS VEZES
//
// A fila de email repete um envio que falhou. Aqui isso seria perigoso: um
// timeout na Uazapi não quer dizer que a mensagem não saiu — a documentação
// deles diz exatamente isso. Então cada linha é RESERVADA como `incerto`
// antes da chamada, e só sai desse estado com uma resposta que diga o que
// aconteceu. Se a função cair no meio, a linha fica `incerto`, e alguém olha.
// Nunca volta sozinha para `pendente`.
//
// Chamada pelo cron, de minuto em minuto (ver o rodapé da migration
// 20260924120000_notificacao_por_whatsapp.sql).

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";
import { getCorsHeaders } from "../_shared/cors.ts";
import {
  classificarResposta,
  esperaAntesDaTentativa,
  montarMensagem,
  ESPERA_PELO_RELATO_MS,
  MAX_TENTATIVAS,
  type DadosMensagem,
  type Evento,
} from "../_shared/whatsapp.ts";

const APP_URL = (Deno.env.get("APP_URL") ?? "https://gestor-automacoesbloco.lovable.app")
  .replace(/\/+$/, "");
const UAZAPI_URL = (Deno.env.get("UAZAPI_URL") ?? "").trim().replace(/\/+$/, "");
const UAZAPI_TOKEN = (Deno.env.get("UAZAPI_TOKEN") ?? "").trim();

/** Menor que o do email: WhatsApp tem limite de envio por número. */
const LOTE_PADRAO = 30;

/** Acima disso a chamada vira `incerto`. */
const TIMEOUT_MS = 15_000;

interface LinhaFila {
  id: string;
  telefone: string;
  demanda_id: string | null;
  evento: Evento;
  dados: DadosMensagem;
  tentativas: number;
  created_at: string;
}

interface RespostaUazapi {
  status: number | "timeout" | "rede";
  id?: string | null;
  erro?: string | null;
  retryAfter?: number | null;
}

async function enviar(numero: string, texto: string, trackId: string): Promise<RespostaUazapi> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(`${UAZAPI_URL}/send/text`, {
      method: "POST",
      headers: { "Content-Type": "application/json", token: UAZAPI_TOKEN },
      body: JSON.stringify({
        number: numero,
        text: texto,
        // Sem isto a Uazapi gera o cartão de pré-visualização do primeiro link,
        // e o cartão era a tela de LOGIN do sistema — ocupando metade da
        // conversa acima da mensagem de verdade.
        linkPreview: false,
        // Cruza o envio com a linha da fila no painel da Uazapi. Não é chave de
        // idempotência (a documentação avisa que aceita repetido); é só rastro.
        track_source: "gestor-automacoes",
        track_id: trackId,
      }),
      signal: ctrl.signal,
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let corpo: any = null;
    try {
      corpo = await res.json();
    } catch {
      /* corpo vazio ou não-JSON: o status já basta */
    }

    const ra = Number(res.headers.get("Retry-After"));
    return {
      status: res.status,
      id: corpo?.id ?? corpo?.messageid ?? corpo?.key?.id ?? null,
      // Só a mensagem de erro da API, curta. Nunca o texto enviado nem o token.
      erro: res.ok ? null : String(corpo?.error ?? corpo?.message ?? `HTTP ${res.status}`).slice(0, 300),
      retryAfter: Number.isFinite(ra) && ra > 0 ? ra : null,
    };
  } catch (e) {
    const timeout = e instanceof DOMException && e.name === "AbortError";
    return { status: timeout ? "timeout" : "rede", erro: timeout ? "timeout" : String(e).slice(0, 300) };
  } finally {
    clearTimeout(timer);
  }
}

Deno.serve(async (req) => {
  const cors = getCorsHeaders(req);
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });

  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { ...cors, "Content-Type": "application/json" },
    });

  if (!UAZAPI_URL || !UAZAPI_TOKEN) {
    // Erro de configuração, não de dados: falhar alto evita gastar a fila
    // contra uma integração que nunca foi configurada.
    return json({ erro: "Uazapi não configurada (UAZAPI_URL / UAZAPI_TOKEN)" }, 503);
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } },
  );

  let limite = LOTE_PADRAO;
  try {
    const body = await req.json();
    if (typeof body?.limite === "number" && body.limite > 0) limite = Math.min(body.limite, 100);
  } catch {
    /* sem corpo — é o caso do cron */
  }

  const agora = new Date();
  const { data, error } = await supabase
    .from("notificacao_whatsapp_fila")
    .select("id, telefone, demanda_id, evento, dados, tentativas, created_at")
    .eq("situacao", "pendente")
    .lt("tentativas", MAX_TENTATIVAS)
    .or(`proxima_tentativa_em.is.null,proxima_tentativa_em.lte.${agora.toISOString()}`)
    .order("created_at", { ascending: true })
    .limit(limite);

  if (error) {
    console.error("notificacao-whatsapp-fila: falha ao ler a fila", error.message);
    return json({ erro: error.message }, 500);
  }

  const cont = { enviados: 0, falhas: 0, repetir: 0, incertos: 0, adiados: 0 };
  let paradaPor: string | null = null;

  for (const linha of (data ?? []) as LinhaFila[]) {
    const dados: DadosMensagem = { ...(linha.dados ?? {}) };

    // --- A resolução, para a mensagem de conclusão -------------------------
    let resolucao: string | null = null;
    if (linha.evento === "demanda_concluida" && linha.demanda_id) {
      const { data: rel } = await supabase
        .from("relatorio_fechamento_tecnico")
        .select("solucao_implementada")
        .eq("demanda_id", linha.demanda_id)
        .eq("situacao", "concluido")
        .maybeSingle();
      resolucao = (rel as { solucao_implementada?: string | null } | null)?.solucao_implementada ?? null;

      const idade = agora.getTime() - new Date(linha.created_at).getTime();
      if (!resolucao && idade < ESPERA_PELO_RELATO_MS) {
        // O relato é a última das três gravações ao concluir. Fica para o
        // próximo minuto — sem gastar tentativa, porque nada falhou.
        cont.adiados++;
        continue;
      }
    }

    // A demanda como ela está AGORA. Duas razões para não confiar só no que o
    // trigger gravou: o código do chamado pode não existir ainda no instante
    // do INSERT, e o responsável é quem está com a demanda na hora do aviso —
    // "Nielson assumiu" tem que ser verdade quando chega no celular.
    if (linha.demanda_id) {
      const { data: dem } = await supabase
        .from("demands")
        .select("ticket_code, title, assigned_to")
        .eq("id", linha.demanda_id)
        .maybeSingle();
      const d = dem as { ticket_code?: string | null; title?: string | null; assigned_to?: string | null } | null;
      dados.ticket_code = dados.ticket_code ?? d?.ticket_code ?? null;
      dados.titulo = dados.titulo ?? d?.title ?? null;

      // Só as mensagens de etapa falam do responsável; nas outras a busca
      // seria à toa.
      if (d?.assigned_to && (linha.evento === "coluna_mudou" || linha.evento === "demanda_concluida")) {
        const { data: perfil } = await supabase
          .from("profiles")
          .select("nome")
          .eq("id", d.assigned_to)
          .maybeSingle();
        const nome = (perfil as { nome?: string | null } | null)?.nome?.trim();
        // Primeiro nome só, como a saudação: é assim que se fala de alguém.
        dados.responsavel = nome ? nome.split(/\s+/)[0] : null;
      }
    }

    // --- Reserva ------------------------------------------------------------
    // Só quem conseguir mudar `pendente` → `incerto` envia. Duas execuções do
    // cron ao mesmo tempo não mandam a mesma mensagem duas vezes.
    const { data: reservada } = await supabase
      .from("notificacao_whatsapp_fila")
      .update({ situacao: "incerto", reservado_em: new Date().toISOString() })
      .eq("id", linha.id)
      .eq("situacao", "pendente")
      .select("id");
    if (!reservada || reservada.length === 0) continue;

    const link = linha.demanda_id ? `${APP_URL}/demandas/${linha.demanda_id}` : null;
    const texto = montarMensagem(linha.evento, dados, { link, appUrl: APP_URL, resolucao });
    const r = await enviar(linha.telefone, texto, linha.id);
    const desfecho = classificarResposta(r.status);
    const tentativas = linha.tentativas + 1;

    // Log sem o texto e sem o número inteiro: o suficiente para correlacionar.
    const logBase = `linha ${linha.id} evento ${linha.evento} fim ${linha.telefone.slice(-4)} status ${r.status}`;

    if (desfecho === "enviado") {
      cont.enviados++;
      await supabase
        .from("notificacao_whatsapp_fila")
        .update({
          situacao: "enviado",
          enviado_em: new Date().toISOString(),
          provedor_mensagem_id: r.id ? String(r.id) : null,
          tentativas,
          ultimo_erro: null,
        })
        .eq("id", linha.id);
    } else if (desfecho === "configuracao") {
      // A API recusou antes de enviar: a linha volta intacta, sem gastar
      // tentativa, e o lote para. As outras dariam o mesmo erro.
      await supabase
        .from("notificacao_whatsapp_fila")
        .update({ situacao: "pendente", reservado_em: null, ultimo_erro: r.erro })
        .eq("id", linha.id);
      paradaPor = `configuração (${r.status}): ${r.erro ?? ""}`;
      console.error(`notificacao-whatsapp-fila: ${logBase} — integração recusou, lote interrompido`);
      break;
    } else if (desfecho === "repetir" && tentativas < MAX_TENTATIVAS) {
      cont.repetir++;
      await supabase
        .from("notificacao_whatsapp_fila")
        .update({
          situacao: "pendente",
          reservado_em: null,
          tentativas,
          ultimo_erro: r.erro,
          proxima_tentativa_em: new Date(
            Date.now() + esperaAntesDaTentativa(tentativas, r.retryAfter),
          ).toISOString(),
        })
        .eq("id", linha.id);
      console.warn(`notificacao-whatsapp-fila: ${logBase} — vai repetir`);
    } else if (desfecho === "incerto") {
      cont.incertos++;
      await supabase
        .from("notificacao_whatsapp_fila")
        .update({ tentativas, ultimo_erro: r.erro })
        .eq("id", linha.id);
      console.warn(`notificacao-whatsapp-fila: ${logBase} — resultado incerto, fica para conferência`);
      // Sem resposta costuma querer dizer provedor fora. As próximas iriam
      // pelo mesmo caminho e virariam `incerto` também — melhor parar e deixar
      // o resto pendente para o próximo minuto.
      if (r.status === "timeout" || r.status === "rede") {
        paradaPor = `sem resposta da Uazapi (${r.status})`;
        break;
      }
    } else {
      // `falhou`, ou `repetir` que esgotou as tentativas.
      cont.falhas++;
      await supabase
        .from("notificacao_whatsapp_fila")
        .update({ situacao: "falhou", tentativas, ultimo_erro: r.erro })
        .eq("id", linha.id);
      console.warn(`notificacao-whatsapp-fila: ${logBase} — falhou`);
    }
  }

  return json({ processados: (data ?? []).length, ...cont, paradaPor });
});
