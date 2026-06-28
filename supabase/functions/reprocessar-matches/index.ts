// Onda B5 — reprocessar-matches: roda o `match-ecossistema` em lote para
// demandas abertas sem match recente e salva o cache em `solicitacoes.match_sugestoes`.
// Autorizado para dev/admin (chamada interativa) OU service role (cron).
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders } from "../_shared/cors.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

const LIMITE_LOTE = 20;
const REPROCESSAR_APOS_DIAS = 7;

function svc() {
  return createClient(SUPABASE_URL, SERVICE_ROLE, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

type CallerKind = "service_role" | "user" | "none";

function detectCaller(req: Request): { kind: CallerKind; token: string } {
  const auth = req.headers.get("Authorization") ?? "";
  const token = auth.toLowerCase().startsWith("bearer ") ? auth.slice(7) : "";
  if (!token) return { kind: "none", token: "" };
  if (SERVICE_ROLE && token === SERVICE_ROLE) return { kind: "service_role", token };
  return { kind: "user", token };
}

async function getUserIdFromToken(token: string): Promise<string | null> {
  try {
    const anon = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
    const client = createClient(SUPABASE_URL, anon, {
      global: { headers: { Authorization: `Bearer ${token}` } },
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data } = await client.auth.getUser();
    return data.user?.id ?? null;
  } catch {
    return null;
  }
}

async function isDevOrAdmin(s: ReturnType<typeof svc>, userId: string): Promise<boolean> {
  const { data: roles } = await s
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .eq("role", "admin")
    .maybeSingle();
  if (roles) return true;
  const { data: u } = await s.auth.admin.getUserById(userId);
  const email = u?.user?.email?.toLowerCase() ?? null;
  if (!email) return false;
  const { data: ae } = await s
    .from("allowed_emails")
    .select("role")
    .eq("email", email)
    .maybeSingle();
  const role = (ae as { role?: string } | null)?.role ?? null;
  return role === "developer" || role === "administrador";
}

type DemandaPendente = {
  id: string;
  titulo: string | null;
  descricao: string | null;
  tipo_demanda: string | null;
  sistema_alvo_slug: string | null;
};

async function chamarMatch(d: DemandaPendente): Promise<unknown[] | null> {
  try {
    const resp = await fetch(`${SUPABASE_URL}/functions/v1/match-ecossistema`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${SERVICE_ROLE}`,
        apikey: SERVICE_ROLE,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        titulo: d.titulo ?? "",
        descricao: d.descricao ?? "",
        tipo_demanda: d.tipo_demanda,
        sistema_alvo_slug: d.sistema_alvo_slug,
      }),
    });
    if (!resp.ok) {
      console.warn("reprocessar-matches: match-ecossistema status", resp.status, "demanda", d.id);
      return null;
    }
    const json = await resp.json().catch(() => null);
    const arr = Array.isArray((json as { candidatos?: unknown[] } | null)?.candidatos)
      ? (json as { candidatos: unknown[] }).candidatos
      : [];
    return arr;
  } catch (e) {
    console.warn("reprocessar-matches: exceção em demanda", d.id, e instanceof Error ? e.message : String(e));
    return null;
  }
}

Deno.serve(async (req) => {
  const cors = getCorsHeaders(req);
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });

  try {
    const caller = detectCaller(req);
    if (caller.kind === "none") return json({ error: "Não autenticado." }, 401);

    const s = svc();
    if (caller.kind === "user") {
      const uid = await getUserIdFromToken(caller.token);
      if (!uid) return json({ error: "Token inválido." }, 401);
      if (!(await isDevOrAdmin(s, uid))) {
        return json({ error: "Acesso restrito ao gestor de tecnologia." }, 403);
      }
    }

    const desde = new Date(Date.now() - REPROCESSAR_APOS_DIAS * 24 * 60 * 60 * 1000).toISOString();

    // Total pendente (para informar)
    const { count: totalPendentes } = await s
      .from("solicitacoes")
      .select("id", { count: "exact", head: true })
      .in("status", ["novo", "em_analise", "aprovado"])
      .is("desfecho", null)
      .or(`match_atualizado_em.is.null,match_atualizado_em.lt.${desde}`);

    const { data: pendentes, error: selErr } = await s
      .from("solicitacoes")
      .select("id, titulo, descricao, tipo_demanda, sistema_alvo_slug")
      .in("status", ["novo", "em_analise", "aprovado"])
      .is("desfecho", null)
      .or(`match_atualizado_em.is.null,match_atualizado_em.lt.${desde}`)
      .order("created_at", { ascending: true })
      .limit(LIMITE_LOTE);
    if (selErr) return json({ error: selErr.message }, 500);

    const lista = (pendentes ?? []) as DemandaPendente[];
    let processadas = 0;

    for (const d of lista) {
      const candidatos = await chamarMatch(d);
      if (candidatos === null) continue;
      const { error: updErr } = await s
        .from("solicitacoes")
        .update({
          match_sugestoes: candidatos as unknown,
          match_atualizado_em: new Date().toISOString(),
        } as never)
        .eq("id", d.id);
      if (updErr) {
        console.warn("reprocessar-matches: update falhou", d.id, updErr.message);
        continue;
      }
      processadas++;
    }

    return json({
      ok: true,
      processadas,
      total_pendentes: totalPendentes ?? lista.length,
      lote: lista.length,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Erro desconhecido";
    console.error("reprocessar-matches error:", msg);
    return json({ error: msg }, 500);
  }
});
