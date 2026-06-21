import { admin } from "../_shared/provision.ts";

const HUB_TOKEN = Deno.env.get("BLOCO_ID_TOKEN") ?? "";
const LAUNCHER = (Deno.env.get("BLOCO_ID_LAUNCHER_URL") ?? "https://blocoid.lovable.app").replace(/\/+$/, "");

function buildCors(req: Request) {
  const origin = req.headers.get("origin") ?? "";
  // Permite a própria origem do app e o launcher do hub.
  const allowed = origin && (origin === LAUNCHER || true) ? origin : LAUNCHER;
  // Observação: server-to-server (hub→app) não envia Origin; nesse caso devolvemos o launcher.
  return {
    "Access-Control-Allow-Origin": allowed || LAUNCHER,
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    Vary: "Origin",
  } as Record<string, string>;
}

function json(cors: Record<string, string>, payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...cors, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  const cors = buildCors(req);
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });

  const auth = req.headers.get("Authorization") ?? "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";
  if (!HUB_TOKEN || token !== HUB_TOKEN) return json(cors, { ok: false, error: "unauthorized" }, 401);

  let body: any;
  try { body = await req.json(); } catch { body = {}; }

  const op = String(body?.op ?? "");
  if (op === "ping") return json(cors, { ok: true, ping: true });

  const sb = admin();

  // Aceita "recurso" (canônico) e "nome_logico" (legado/interno).
  const nomeLogico = String(body?.recurso ?? body?.nome_logico ?? "");
  if (!nomeLogico) return json(cors, { ok: false, error: "recurso_required" }, 400);

  const { data: cfg, error: cfgErr } = await sb
    .from("bloco_connect_recursos")
    .select("nome_logico, tipo, recurso, colunas, chave, ativo")
    .eq("nome_logico", nomeLogico)
    .maybeSingle();
  if (cfgErr) return json(cors, { ok: false, error: cfgErr.message }, 500);
  if (!cfg || !cfg.ativo) return json(cors, { ok: false, error: "forbidden" }, 403);

  try {
    if (op === "ler") {
      if (cfg.tipo !== "leitura") return json(cors, { ok: false, error: "forbidden" }, 403);

      const colunasPermitidas: string[] = cfg.colunas ?? [];
      // Canônico: colunas?: string[]; fallback: tudo permitido.
      const colunasReq: string[] = Array.isArray(body?.colunas) ? body.colunas.map(String) : [];
      let selCols = colunasPermitidas;
      if (colunasReq.length) {
        if (colunasPermitidas.length) {
          for (const c of colunasReq) {
            if (!colunasPermitidas.includes(c)) {
              return json(cors, { ok: false, error: `coluna_nao_permitida:${c}` }, 403);
            }
          }
        }
        selCols = colunasReq;
      }
      const sel = selCols.length ? selCols.join(",") : "*";

      // Canônico: "filtro"; legado: "filtros".
      const filtro = (body?.filtro ?? body?.filtros ?? {}) as Record<string, unknown>;
      const limitRaw = Number(body?.limit ?? 100);
      const limit = Math.min(Math.max(Number.isFinite(limitRaw) ? limitRaw : 100, 1), 1000);

      let q = sb.from(cfg.recurso).select(sel, { count: "exact" });
      for (const [k, v] of Object.entries(filtro)) {
        if (colunasPermitidas.length && !colunasPermitidas.includes(k)) {
          return json(cors, { ok: false, error: `filtro_nao_permitido:${k}` }, 403);
        }
        q = q.eq(k, v as any);
      }
      q = q.limit(limit);

      const { data, count, error } = await q;
      if (error) return json(cors, { ok: false, error: error.message }, 500);
      return json(cors, { ok: true, linhas: data ?? [], total: count ?? (data?.length ?? 0) });
    }

    if (op === "gravar") {
      if (cfg.tipo !== "escrita") return json(cors, { ok: false, error: "forbidden" }, 403);

      // Canônico: alvo (= recurso). Aceita override apenas se igual ao recurso configurado.
      const alvo = body?.alvo ? String(body.alvo) : cfg.recurso;
      if (alvo !== cfg.recurso) return json(cors, { ok: false, error: "alvo_invalido" }, 403);

      // Chave de upsert: prioriza body.chave (se permitida), senão cfg.chave.
      const chave = body?.chave ? String(body.chave) : (cfg.chave ?? "");
      if (!chave) return json(cors, { ok: false, error: "sem_chave" }, 500);

      const colunasPermitidas: string[] = cfg.colunas ?? [];

      // Canônico: "registros": [...]; legado: "linhas": [...] ou "linha": {...}.
      let registros: Array<Record<string, unknown>> = [];
      if (Array.isArray(body?.registros)) registros = body.registros;
      else if (Array.isArray(body?.linhas)) registros = body.linhas;
      else if (body?.linha && typeof body.linha === "object") registros = [body.linha];
      else return json(cors, { ok: false, error: "registros_required" }, 400);

      const filtradas: Array<Record<string, unknown>> = [];
      for (const reg of registros) {
        const obj: Record<string, unknown> = {};
        for (const [k, v] of Object.entries(reg ?? {})) {
          if (colunasPermitidas.length === 0 || colunasPermitidas.includes(k)) obj[k] = v;
        }
        if (!(chave in obj)) {
          return json(cors, { ok: false, error: "chave_ausente" }, 400);
        }
        filtradas.push(obj);
      }
      if (!filtradas.length) return json(cors, { ok: false, error: "registros_vazios" }, 400);

      const { data, error } = await sb
        .from(cfg.recurso)
        .upsert(filtradas, { onConflict: chave })
        .select();
      if (error) return json(cors, { ok: false, error: error.message }, 500);
      return json(cors, { ok: true, upsert: data?.length ?? filtradas.length, linhas: data ?? [] });
    }

    return json(cors, { ok: false, error: "op_invalida" }, 400);
  } catch (e) {
    console.error("bloco-connect error", e);
    return json(cors, { ok: false, error: String((e as Error)?.message ?? e) }, 500);
  }
});
