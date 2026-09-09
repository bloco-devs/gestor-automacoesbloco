// Edge `rpa-registrar` — projeto Gestor de Automacoes (cgbhpenkytibgiosksrb).
//
// Unico caminho de escrita nas tabelas rpa_*: o runner do VPS nunca fala direto
// com o Supabase (regra LE-5). Roda com verify_jwt=false, entao se autentica
// sozinha pelo token no corpo — nao confia em quem a chamou.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.58.0";

const TOKEN_ESPERADO = Deno.env.get("HUB_RPA_TOKEN") ?? "";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const admin = createClient(SUPABASE_URL, SERVICE_ROLE, {
  auth: { persistSession: false },
});

function json(status: number, corpo: unknown): Response {
  return new Response(JSON.stringify(corpo), {
    status,
    headers: { "content-type": "application/json; charset=utf-8" },
  });
}

/** Comparacao de tempo constante: evita distinguir tokens pelo tempo de resposta. */
function tokenConfere(recebido: string): boolean {
  if (!TOKEN_ESPERADO || recebido.length !== TOKEN_ESPERADO.length) return false;
  let diferenca = 0;
  for (let i = 0; i < TOKEN_ESPERADO.length; i++) {
    diferenca |= recebido.charCodeAt(i) ^ TOKEN_ESPERADO.charCodeAt(i);
  }
  return diferenca === 0;
}

/** Resolve o uuid do robo pelo slug. As execucoes referenciam `rpa_robos.id`. */
async function idDoRobo(slug: string): Promise<string | null> {
  const { data } = await admin.from("rpa_robos").select("id").eq("slug", slug).maybeSingle();
  return data?.id ?? null;
}

Deno.serve(async (req) => {
  if (req.method !== "POST") return json(405, { erro: "use POST" });

  let corpo: Record<string, unknown>;
  try {
    corpo = await req.json();
  } catch {
    return json(400, { erro: "corpo nao e JSON valido" });
  }

  if (!tokenConfere(String(corpo.token ?? ""))) {
    return json(401, { erro: "token invalido" });
  }

  const tipo = String(corpo.tipo ?? "");
  const p = (corpo.payload ?? {}) as Record<string, unknown>;

  try {
    switch (tipo) {
      case "robo_upsert": {
        const { data, error } = await admin
          .from("rpa_robos")
          .upsert(
            {
              slug: p.slug, nome: p.nome, objetivo: p.objetivo,
              sistema_alvo: p.sistema_alvo, criticidade: p.criticidade,
              agenda: p.agenda, healing: p.healing,
              timeout_min: p.timeout_min, retries: p.retries,
              tempo_manual_estimado_min: p.tempo_manual_estimado_min,
              versao_ativa: p.versao_ativa, atualizado_em: new Date().toISOString(),
            },
            { onConflict: "slug" },
          )
          .select("id")
          .single();
        if (error) throw error;
        return json(200, { ok: true, id: data.id });
      }

      case "versao_nova": {
        const roboId = await idDoRobo(String(p.robo_slug));
        if (!roboId) return json(404, { erro: `robo "${p.robo_slug}" nao cadastrado` });
        // A mesma versao reenviada nao duplica nem falha: ignoreDuplicates.
        const { error } = await admin.from("rpa_versoes").upsert(
          {
            robo_id: roboId, robo_slug: p.robo_slug, versao: p.versao,
            hash_sha256: p.hash_sha256, manifesto_url: p.manifesto_url,
            origem: p.origem ?? "humano", motivo: p.motivo,
            resumo_diff: p.resumo_diff, aprovado_por: p.aprovado_por,
          },
          { onConflict: "robo_slug,versao", ignoreDuplicates: true },
        );
        if (error) throw error;
        return json(200, { ok: true });
      }

      case "execucao_inicio": {
        const roboId = await idDoRobo(String(p.robo_slug));
        if (!roboId) return json(404, { erro: `robo "${p.robo_slug}" nao cadastrado` });
        // Idempotente por run_id: um reenvio da mesma execucao atualiza, nao duplica.
        const { data, error } = await admin
          .from("rpa_execucoes")
          .upsert(
            {
              run_id: p.run_id, robo_id: roboId, robo_slug: p.robo_slug,
              versao: p.versao, modo: p.modo ?? "normal", disparo: p.disparo ?? "agenda",
              status: "em_execucao", iniciado_em: p.iniciado_em ?? new Date().toISOString(),
            },
            { onConflict: "run_id" },
          )
          .select("id")
          .single();
        if (error) throw error;
        return json(200, { ok: true, id: data.id });
      }

      case "execucao_fim": {
        const { data, error } = await admin
          .from("rpa_execucoes")
          .update({
            status: p.status, finalizado_em: p.finalizado_em ?? new Date().toISOString(),
            duracao_s: p.duracao_s, passos_total: p.passos_total, passos_ok: p.passos_ok,
            passo_falha: p.passo_falha, codigo_anomalia: p.codigo_anomalia,
            evidencias_url: p.evidencias_url, resumo_json: p.resumo_json,
          })
          .eq("run_id", p.run_id)
          .select("id")
          .maybeSingle();
        if (error) throw error;
        if (!data) return json(404, { erro: `run_id "${p.run_id}" nao encontrado` });
        return json(200, { ok: true, id: data.id });
      }

      case "incidente": {
        const { data: exec } = await admin
          .from("rpa_execucoes").select("id").eq("run_id", p.run_id).maybeSingle();
        if (!exec) return json(404, { erro: `run_id "${p.run_id}" nao encontrado` });
        const { data, error } = await admin
          .from("rpa_incidentes")
          .insert({
            execucao_id: exec.id, robo_slug: p.robo_slug, tipo: p.tipo,
            diagnostico: p.diagnostico, acao: p.acao,
            tokens_in: p.tokens_in ?? 0, tokens_out: p.tokens_out ?? 0,
            custo_brl: p.custo_brl ?? 0, desfecho: p.desfecho,
          })
          .select("id")
          .single();
        if (error) throw error;
        return json(200, { ok: true, id: data.id });
      }

      default:
        return json(400, {
          erro: `tipo desconhecido: ${tipo}`,
          tipos: ["robo_upsert", "versao_nova", "execucao_inicio", "execucao_fim", "incidente"],
        });
    }
  } catch (erro) {
    console.error("rpa-registrar", tipo, erro);
    return json(500, { erro: erro instanceof Error ? erro.message : String(erro) });
  }
});
