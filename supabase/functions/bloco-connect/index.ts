import { admin } from "../_shared/provision.ts";

const HUB_TOKEN = Deno.env.get("BLOCO_ID_TOKEN") ?? "";
const LAUNCHER = Deno.env.get("BLOCO_ID_LAUNCHER_URL") ?? "https://blocoid.lovable.app";

const cors = {
  "Access-Control-Allow-Origin": LAUNCHER,
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  Vary: "Origin",
};

function json(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...cors, "Content-Type": "application/json" },
  });
}

function unauthorized() {
  return json({ ok: false, error: "unauthorized" }, 401);
}

function forbidden() {
  return json({ ok: false, error: "forbidden" }, 403);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });

  const auth = req.headers.get("Authorization") ?? "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";
  if (!HUB_TOKEN || token !== HUB_TOKEN) return unauthorized();

  let body: any;
  try { body = await req.json(); } catch { body = {}; }

  const op = String(body?.op ?? "");
  if (op === "ping") return json({ ok: true, ping: true });

  const sb = admin();

  const nomeLogico = String(body?.recurso ?? body?.nome_logico ?? "");
  if (!nomeLogico) return json({ ok: false, error: "recurso_required" }, 400);

  const { data: cfg, error: cfgErr } = await sb
    .from("bloco_connect_recursos")
    .select("nome_logico, tipo, recurso, colunas, chave, ativo")
    .eq("nome_logico", nomeLogico)
    .maybeSingle();
  if (cfgErr) return json({ ok: false, error: cfgErr.message }, 500);
  if (!cfg || !cfg.ativo) return forbidden();

  try {
    if (op === "ler") {
      if (cfg.tipo !== "leitura") return forbidden();
      const colunasPermitidas: string[] = cfg.colunas ?? [];
      const sel = colunasPermitidas.length ? colunasPermitidas.join(",") : "*";

      const filtros = (body?.filtros ?? {}) as Record<string, unknown>;
      const limitRaw = Number(body?.limit ?? 100);
      const limit = Math.min(Math.max(Number.isFinite(limitRaw) ? limitRaw : 100, 1), 1000);

      let q = sb.from(cfg.recurso).select(sel, { count: "exact" });
      for (const [k, v] of Object.entries(filtros)) {
        if (colunasPermitidas.length && !colunasPermitidas.includes(k)) {
          return json({ ok: false, error: `filtro_nao_permitido:${k}` }, 403);
        }
        q = q.eq(k, v as any);
      }
      q = q.limit(limit);

      const { data, count, error } = await q;
      if (error) return json({ ok: false, error: error.message }, 500);
      return json({ ok: true, linhas: data ?? [], total: count ?? (data?.length ?? 0) });
    }

    if (op === "gravar") {
      if (cfg.tipo !== "escrita") return forbidden();
      if (!cfg.chave) return json({ ok: false, error: "sem_chave" }, 500);

      const colunasPermitidas: string[] = cfg.colunas ?? [];
      const linha = (body?.linha ?? {}) as Record<string, unknown>;
      const filtrada: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(linha)) {
        if (colunasPermitidas.length === 0 || colunasPermitidas.includes(k)) filtrada[k] = v;
      }
      if (!(cfg.chave in filtrada)) {
        return json({ ok: false, error: "chave_ausente" }, 400);
      }

      const { data, error } = await sb
        .from(cfg.recurso)
        .upsert(filtrada, { onConflict: cfg.chave })
        .select();
      if (error) return json({ ok: false, error: error.message }, 500);
      return json({ ok: true, linhas: data ?? [] });
    }

    return json({ ok: false, error: "op_invalida" }, 400);
  } catch (e) {
    console.error("bloco-connect error", e);
    return json({ ok: false, error: String((e as Error)?.message ?? e) }, 500);
  }
});
