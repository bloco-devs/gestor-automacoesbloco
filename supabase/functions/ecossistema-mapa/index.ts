// Onda 5 — Ecossistema vivo: lê catálogo do HUB e devolve no formato do mapa.
// Token do HUB nunca sai do servidor. Em qualquer falha, devolve fonte:"erro"
// com HTTP 200 para o front cair no seed sem quebrar a UI.
import { getCorsHeaders } from "../_shared/cors.ts";

const HUB_URL = (Deno.env.get("BLOCO_ID_HUB_URL") ?? "").replace(/\/+$/, "");
const HUB_TOKEN = Deno.env.get("BLOCO_ID_TOKEN") ?? "";

interface SistemaOut { id: string; nome: string; grupo: string; status?: string | null }
interface ConectorOut { id: string; nome: string; status?: string | null }
interface IntegracaoOut {
  origem: string;
  destino: string;
  label: string;
  ativo?: boolean | null;
  status?: string | null;
}
interface SaudeOut {
  [nodeId: string]: { execs: number; ok: number; falhas: number; ultima: string | null };
}

function ok(body: unknown, cors: Record<string, string>) {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { ...cors, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  const cors = getCorsHeaders(req);
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });

  if (!HUB_URL || !HUB_TOKEN) {
    return ok({ fonte: "erro", erro: "HUB não configurado" }, cors);
  }

  let catalogo: any;
  try {
    const resp = await fetch(`${HUB_URL}/functions/v1/ecossistema-catalogo`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${HUB_TOKEN}`,
        "Content-Type": "application/json",
      },
    });
    if (!resp.ok) {
      const txt = await resp.text().catch(() => "");
      return ok({ fonte: "erro", erro: `HUB ${resp.status}: ${txt.slice(0, 200)}` }, cors);
    }
    catalogo = await resp.json();
  } catch (e) {
    return ok(
      { fonte: "erro", erro: e instanceof Error ? e.message : String(e) },
      cors,
    );
  }

  try {
    const sistemasRaw: any[] = Array.isArray(catalogo?.sistemas) ? catalogo.sistemas : [];
    const conectoresRaw: any[] = Array.isArray(catalogo?.conectores) ? catalogo.conectores : [];
    const endpointsRaw: any[] = Array.isArray(catalogo?.endpoints) ? catalogo.endpoints : [];
    const sincsRaw: any[] = Array.isArray(catalogo?.sincronizacoes) ? catalogo.sincronizacoes : [];
    const saudeRaw: any[] = Array.isArray(catalogo?.saude) ? catalogo.saude : [];

    // Índices
    const sistemaById = new Map<string, any>();
    const sistemaBySlug = new Map<string, any>();
    for (const s of sistemasRaw) {
      if (s?.id) sistemaById.set(String(s.id), s);
      if (s?.slug) sistemaBySlug.set(String(s.slug), s);
    }
    const conectorById = new Map<string, any>();
    for (const c of conectoresRaw) {
      if (c?.id) conectorById.set(String(c.id), c);
    }

    // nodeId de um conector: se interno → slug do sistema dono; se externo → slug do conector.
    const conectorNodeId = (c: any): string | null => {
      if (!c) return null;
      if (c.tipo === "externo") return c.slug ? String(c.slug) : null;
      // interno
      const sistemaId = c.sistema_id ? String(c.sistema_id) : null;
      if (sistemaId && sistemaById.has(sistemaId)) {
        const s = sistemaById.get(sistemaId);
        return s?.slug ? String(s.slug) : null;
      }
      return null;
    };

    const sistemas: SistemaOut[] = sistemasRaw
      .filter((s) => s?.slug && s?.nome)
      .map((s) => ({
        id: String(s.slug),
        nome: String(s.nome),
        grupo: s.categoria ? String(s.categoria) : "Outros",
        status: s.status ?? null,
      }));

    const conectoresExternos: ConectorOut[] = conectoresRaw
      .filter((c) => c?.tipo === "externo" && c?.slug && c?.nome)
      .map((c) => ({ id: String(c.slug), nome: String(c.nome), status: c.status ?? null }));

    const validNodeIds = new Set<string>([
      ...sistemas.map((s) => s.id),
      ...conectoresExternos.map((c) => c.id),
    ]);

    // Integrações deduplicadas por (origem,destino) — preserva 1º label, concatena até 2.
    const edgeMap = new Map<string, IntegracaoOut>();
    const addEdge = (e: IntegracaoOut) => {
      if (!e.origem || !e.destino || e.origem === e.destino) return;
      if (!validNodeIds.has(e.origem) || !validNodeIds.has(e.destino)) return;
      const key = `${e.origem}->${e.destino}`;
      const exist = edgeMap.get(key);
      if (!exist) {
        edgeMap.set(key, e);
      } else {
        const labels = exist.label.split(" · ");
        if (e.label && !labels.includes(e.label) && labels.length < 2) {
          exist.label = [...labels, e.label].join(" · ");
        }
        if (e.ativo != null && exist.ativo == null) exist.ativo = e.ativo;
        if (e.status != null && exist.status == null) exist.status = e.status;
      }
    };

    // a) endpoints → consumidores
    for (const ep of endpointsRaw) {
      const conector = ep?.conector_id ? conectorById.get(String(ep.conector_id)) : null;
      const origem = conectorNodeId(conector);
      if (!origem) continue;
      const consumidores: any[] = Array.isArray(ep?.consumidores_permitidos)
        ? ep.consumidores_permitidos
        : [];
      if (consumidores.length === 0) continue;
      const label = String(ep?.escopo_dados ?? ep?.slug ?? "endpoint");
      for (const cons of consumidores) {
        const consSistemaId = typeof cons === "string" ? cons : cons?.sistema_id;
        if (!consSistemaId) continue;
        const s = sistemaById.get(String(consSistemaId));
        const destino = s?.slug ? String(s.slug) : null;
        if (!destino) continue;
        addEdge({ origem, destino, label });
      }
    }

    // b) sincronizações
    for (const s of sincsRaw) {
      const origem = conectorNodeId(
        s?.origem_conector ?? (s?.origem_conector_id ? conectorById.get(String(s.origem_conector_id)) : null),
      );
      const destino = conectorNodeId(
        s?.destino_conector ?? (s?.destino_conector_id ? conectorById.get(String(s.destino_conector_id)) : null),
      );
      if (!origem || !destino) continue;
      addEdge({
        origem,
        destino,
        label: String(s?.entidade ?? "sincronização"),
        ativo: typeof s?.ativo === "boolean" ? s.ativo : null,
        status: s?.ultimo_status ?? null,
      });
    }

    // Saúde: agregada por nodeId
    const saude: SaudeOut = {};
    for (const h of saudeRaw) {
      const conector = h?.conector_id ? conectorById.get(String(h.conector_id)) : null;
      const nodeId = conectorNodeId(conector);
      if (!nodeId) continue;
      const cur = saude[nodeId] ?? { execs: 0, ok: 0, falhas: 0, ultima: null };
      cur.execs += Number(h?.execs ?? 0);
      cur.ok += Number(h?.ok ?? 0);
      cur.falhas += Number(h?.falhas ?? 0);
      const ult = h?.ultima ?? h?.ultima_execucao ?? null;
      if (ult && (!cur.ultima || String(ult) > cur.ultima)) cur.ultima = String(ult);
      saude[nodeId] = cur;
    }

    return ok(
      {
        fonte: "hub",
        gerado_em: new Date().toISOString(),
        sistemas,
        conectoresExternos,
        integracoes: Array.from(edgeMap.values()),
        saude,
      },
      cors,
    );
  } catch (e) {
    return ok(
      { fonte: "erro", erro: e instanceof Error ? e.message : String(e) },
      cors,
    );
  }
});
