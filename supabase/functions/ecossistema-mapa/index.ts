// Onda 5 — Ecossistema vivo: lê catálogo do HUB e devolve no formato do mapa.
// Token do HUB nunca sai do servidor. Em qualquer falha, devolve fonte:"erro"
// com HTTP 200 para o front cair no seed sem quebrar a UI.
import { getCorsHeaders } from "../_shared/cors.ts";

const HUB_URL = (Deno.env.get("BLOCO_ID_HUB_URL") ?? "").replace(/\/+$/, "");
const HUB_TOKEN = Deno.env.get("BLOCO_ID_TOKEN") ?? "";
/*
 * Credencial SEPARADA, e para uma coisa so: ler a view de uso pelo PostgREST
 * do HUB.
 *
 * O `BLOCO_ID_TOKEN` nao serve. Ele e validado pela propria
 * `ecossistema-catalogo`, que e uma function — o PostgREST nao o reconhece e
 * responde 401. Isso ficou registrado no log em 08/09/2026, depois de tres
 * rodadas tentando adivinhar por que `uso` nao chegava.
 *
 * A chave esperada aqui e a `anon` do projeto do HUB: ela e publica por
 * natureza (todo front-end do HUB a embarca) e, sozinha, nao abre nada — quem
 * decide o que ela le e o GRANT. Concedemos SELECT apenas na view
 * `ecossistema_uso`, que expoe agregados e nenhuma pessoa identificada.
 *
 * Ausente, o `uso` simplesmente nao vem e o mapa segue igual.
 */
const HUB_ANON = Deno.env.get("BLOCO_ID_HUB_ANON_KEY") ?? "";

interface SistemaOut { id: string; nome: string; grupo: string; status?: string | null }
interface ConectorOut { id: string; nome: string; status?: string | null }
interface IntegracaoOut {
  origem: string;
  destino: string;
  label: string;
  ativo?: boolean | null;
  status?: string | null;
}
interface SaudeNode {
  execs: number;
  ok: number;
  falhas: number;
  falhas_upstream: number;
  ultima: string | null;
  janela_inicio?: string | null;
  janela_dias?: number | null;
}

interface SaudeOut {
  [nodeId: string]: SaudeNode;
}

/**
 * USO HUMANO — sinal diferente de `saude`, e por isso campo separado.
 *
 * `saude` vem de `integracao_execucoes`/`sincronizacao_execucoes`: mede
 * MAQUINA. Ela nunca teve como responder "tem gente usando este sistema", e a
 * tela do Escritorio afirmava o contrario sem querer — o Gestor de Automacoes
 * aparecia sem execucao justamente enquanto era usado.
 *
 * Os dois sinais sao quase complementares. Medido no HUB em 08/09/2026: o
 * sistema com mais gente (`processos`, 7 pessoas em 24 h) tinha ZERO execucao
 * de integracao, e o unico com execucao (`portfolio`) nao tinha ninguem
 * dentro havia mais de um dia.
 *
 * Vem da view `ecossistema_uso`, criada no HUB — agregados por sistema, sem
 * nenhuma pessoa identificada.
 */
interface UsoNode {
  ultimo_login: string | null;
  pessoas_24h: number;
  pessoas_30d: number;
}

interface UsoOut {
  [nodeId: string]: UsoNode;
}

/**
 * Le a view de uso do HUB por PostgREST.
 *
 * SEPARADA da chamada do catalogo, e com degradacao propria, de proposito:
 *
 *   1. A `ecossistema-catalogo` e consumida pelo Diagrama e pelo
 *      `match-ecossistema` alem daqui. Nao alterar o formato dela e o que
 *      garante que este campo novo nao possa quebrar os outros dois.
 *   2. Se o token nao tiver permissao de leitura na view, ou a view nao
 *      existir, `uso` volta indefinido e a resposta fica EXATAMENTE como era
 *      antes. Nada aqui pode derrubar o mapa.
 */
async function lerUso(
  hubUrl: string,
  token: string,
  validNodeIds: Set<string>,
): Promise<UsoOut | undefined> {
  if (!token) {
    console.warn(
      "[uso] BLOCO_ID_HUB_ANON_KEY nao configurado — a leitura da view nem foi " +
        "tentada. Cadastre o segredo para o sinal de uso humano aparecer.",
    );
    return undefined;
  }
  try {
    const resp = await fetch(
      `${hubUrl}/rest/v1/ecossistema_uso?select=slug,ultimo_login,pessoas_24h,pessoas_30d`,
      { headers: { Authorization: `Bearer ${token}`, apikey: token } },
    );
    if (!resp.ok) {
      /*
       * Log em vez de campo na resposta.
       *
       * A leitura falha em silencio de proposito — nada aqui pode derrubar o
       * mapa. Mas silencio total tornou impossivel distinguir "a funcao nao
       * republicou" de "o token nao le a view": as duas hipoteses produzem
       * exatamente a mesma resposta. Este log aparece em Edge Functions →
       * ecossistema-mapa → Logs e resolve a duvida em uma olhada.
       */
      console.warn(
        `[uso] leitura da view falhou: HTTP ${resp.status} ${resp.statusText}. ` +
          "401/403 = o token nao serve para o PostgREST do HUB; " +
          "404 = a view ecossistema_uso nao existe ou nao esta exposta.",
      );
      return undefined;
    }
    const linhas: unknown = await resp.json();
    if (!Array.isArray(linhas)) return undefined;
    const uso: UsoOut = {};
    for (const l of linhas as Record<string, unknown>[]) {
      const slug = l?.slug ? String(l.slug) : null;
      // Slug que nao existe no catalogo nao entra: o mapa nao desenha node que
      // ele nao conhece, e uma chave orfa aqui viraria dado sem dono.
      if (!slug || !validNodeIds.has(slug)) continue;
      uso[slug] = {
        ultimo_login: l.ultimo_login ? String(l.ultimo_login) : null,
        pessoas_24h: Number(l.pessoas_24h ?? 0),
        pessoas_30d: Number(l.pessoas_30d ?? 0),
      };
    }
    if (Object.keys(uso).length === 0) {
      console.warn(
        `[uso] a view respondeu com ${linhas.length} linha(s), mas nenhum slug ` +
          "casou com o catalogo — o `uso` sai da resposta por nao ter dono.",
      );
      return undefined;
    }
    console.log(`[uso] ok: ${Object.keys(uso).length} sistemas com sinal de acesso.`);
    return uso;
  } catch (e) {
    console.warn(`[uso] leitura da view lancou: ${e instanceof Error ? e.message : String(e)}`);
    return undefined;
  }
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
    const conectorBySlug = new Map<string, any>();
    for (const c of conectoresRaw) {
      if (c?.id) conectorById.set(String(c.id), c);
      if (c?.slug) conectorBySlug.set(String(c.slug), c);
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

    const resolveConector = (h: any): any | null => {
      const raw = h?.conector_id ?? h?.conector_slug ?? h?.conector ?? h?.slug ?? null;
      if (!raw) return null;
      const key = String(raw);
      return conectorById.get(key) ?? conectorBySlug.get(key) ?? null;
    };

    const resolveSistemaNodeId = (h: any): string | null => {
      const raw = h?.sistema_id ?? h?.sistema_operacao ?? h?.sistema_slug ?? h?.sistema ?? null;
      if (!raw) return null;
      const key = String(raw);
      const sistema = sistemaById.get(key) ?? sistemaBySlug.get(key);
      return sistema?.slug ? String(sistema.slug) : validNodeIds.has(key) ? key : null;
    };

    const addSaude = (nodeId: string | null, h: any) => {
      if (!nodeId || !validNodeIds.has(nodeId)) return;
      const cur = saude[nodeId] ?? { execs: 0, ok: 0, falhas: 0, falhas_upstream: 0, ultima: null };
      cur.execs += Number(h?.execs ?? 0);
      cur.ok += Number(h?.ok ?? 0);
      cur.falhas += Number(h?.falhas ?? 0);
      cur.falhas_upstream += Number(h?.falhas_upstream ?? 0);
      const ult = h?.ultima ?? h?.ultima_execucao ?? null;
      if (ult && (!cur.ultima || String(ult) > cur.ultima)) cur.ultima = String(ult);
      const janelaInicio = h?.janela_inicio ?? catalogo?.janela?.inicio ?? null;
      if (janelaInicio && !cur.janela_inicio) cur.janela_inicio = String(janelaInicio);
      const janelaDias = h?.janela_dias ?? catalogo?.janela?.dias ?? null;
      if (janelaDias != null && cur.janela_dias == null) cur.janela_dias = Number(janelaDias);
      saude[nodeId] = cur;
    };

    // Saúde: agregada por nodeId. O HUB pode enviar o conector por UUID ou slug
    // e, em linhas por conector+sistema, também o sistema de operação.
    const saude: SaudeOut = {};
    for (const h of saudeRaw) {
      const conectorNode = conectorNodeId(resolveConector(h));
      const sistemaNode = resolveSistemaNodeId(h);
      addSaude(conectorNode, h);
      if (sistemaNode !== conectorNode) addSaude(sistemaNode, h);
    }

    // Aditivo: quando a leitura falha, `uso` fica de fora e a resposta e a
    // mesma de antes, campo por campo.
    const uso = await lerUso(HUB_URL, HUB_ANON, validNodeIds);

    return ok(
      {
        fonte: "hub",
        gerado_em: new Date().toISOString(),
        sistemas,
        conectoresExternos,
        integracoes: Array.from(edgeMap.values()),
        saude,
        ...(uso ? { uso } : {}),
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
