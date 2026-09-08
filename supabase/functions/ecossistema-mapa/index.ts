// Onda 5 — Ecossistema vivo: lê catálogo do HUB e devolve no formato do mapa.
// Token do HUB nunca sai do servidor. Em qualquer falha, devolve fonte:"erro"
// com HTTP 200 para o front cair no seed sem quebrar a UI.
import { getCorsHeaders } from "../_shared/cors.ts";

const HUB_URL = (Deno.env.get("BLOCO_ID_HUB_URL") ?? "").replace(/\/+$/, "");
const HUB_TOKEN = Deno.env.get("BLOCO_ID_TOKEN") ?? "";
/*
 * O uso NAO vem do PostgREST — vem de uma rota do proprio app do HUB.
 *
 * A tentativa anterior lia a view `ecossistema_uso` direto pelo PostgREST e
 * levava 401. O log mostrou por que, e a lista de segredos do HUB confirmou: a
 * autenticacao dele e por `SISTEMA_TOKEN_<SISTEMA>`, um segredo compartilhado
 * por sistema — nao chave do Supabase. E o que identifica quem chamou, e por
 * isso as execucoes aparecem atribuidas a `automacoes` no HUB.
 *
 * Entao a rota `/api/public/ecossistema-uso` foi criada no HUB com a MESMA
 * autenticacao do catalogo, e e ela que lemos aqui — com o token que ja
 * tinhamos. Nenhuma credencial nova.
 *
 * Em env var, e nao chumbado, para poder mudar de endereco sem novo deploy.
 */
const USO_URL = Deno.env.get("BLOCO_ID_USO_URL")
  ?? "https://blocoid.lovable.app/api/public/ecossistema-uso";
/*
 * Eventos execucao por execucao — a diferenca entre retrato e acontecimento.
 *
 * `saude` diz "o Sienge executou 457 vezes no mes". Isso e um numero numa
 * lista. Estes eventos dizem "as 09:00:38 a Gestao Financeira chamou o Sienge,
 * 200; as 09:00:39, de novo; as 09:00:41, erro 500" — com origem, destino e
 * desfecho. E o que permite o andar mostrar trabalho acontecendo em vez de
 * volume acumulado.
 *
 * O `id` de cada linha e chave de deduplicacao de verdade: a pagina consulta a
 * cada 60 s e recebe a mesma janela varias vezes, e a fila do motor descarta
 * repetido por id. Por isso a rota nao precisa de cursor e esta funcao pode
 * continuar sem estado.
 */
const EVENTOS_URL = Deno.env.get("BLOCO_ID_EVENTOS_URL")
  ?? "https://blocoid.lovable.app/api/public/ecossistema-eventos";
/** A rota aceita ate 60. Em env var para poder afinar sem novo deploy. */
const JANELA_DE_EVENTOS_MIN = Math.min(
  60,
  Math.max(1, Number(Deno.env.get("BLOCO_ID_EVENTOS_MINUTOS") ?? 60)),
);

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

/** Uma execucao de integracao, como o HUB a registrou. */
interface EventoOut {
  id: string;
  created_at: string;
  /** Slug do sistema que chamou. Nulo quando quem chamou foi uma pessoa. */
  origem: string | null;
  /** Slug do no chamado — conector externo, ou o sistema dono do interno. */
  destino: string | null;
  metodo: string | null;
  status_http: number | null;
  falhou: boolean;
  duracao_ms: number | null;
}

/**
 * Le a janela recente de execucoes.
 *
 * Mesma degradacao do `uso`: qualquer problema devolve `undefined` e a resposta
 * fica identica a de antes. Um evento a menos e uma animacao a menos; um mapa
 * quebrado e uma tela inutil.
 */
async function lerEventos(
  url: string,
  token: string,
  validNodeIds: Set<string>,
): Promise<EventoOut[] | undefined> {
  if (!url || !token) return undefined;
  try {
    /*
     * SESSENTA minutos, nao dez.
     *
     * Dez foi escolha minha, supondo fluxo continuo. Medido no HUB: as rajadas
     * acontecem em dois instantes do dia, e numa janela de dez minutos havia
     * ZERO execucao contra 10 na ultima hora. O recurso ficava invisivel —
     * apareceria so para quem abrisse a pagina nos dez minutos seguintes a uma
     * rajada.
     *
     * A fala passou a dizer a HORA do registro em vez de "agora", justamente
     * para a janela poder ser larga sem a animacao mentir sobre quando foi.
     */
    const resp = await fetch(`${url}?minutos=${JANELA_DE_EVENTOS_MIN}`, {
      method: "GET",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    });
    if (!resp.ok) {
      console.warn(`[eventos] a rota respondeu HTTP ${resp.status} ${resp.statusText}.`);
      return undefined;
    }
    const corpo: unknown = await resp.json();
    const linhas = (corpo as { eventos?: unknown })?.eventos;
    if (!Array.isArray(linhas)) {
      console.warn("[eventos] a rota respondeu sem o campo `eventos` como lista.");
      return undefined;
    }
    const fora: EventoOut[] = [];
    for (const l of linhas as Record<string, unknown>[]) {
      if (!l?.id || !l?.created_at) continue;
      const origem = l.origem_slug ? String(l.origem_slug) : null;
      const destino = l.destino_slug ? String(l.destino_slug) : null;
      /*
       * Evento cujo destino o mapa nao conhece nao entra. Nao e filtro de
       * conveniencia: o motor precisa de uma mesa ou porta para onde andar, e
       * evento sem no desenhavel viraria viagem para lugar nenhum.
       */
      if (!destino || !validNodeIds.has(destino)) continue;
      fora.push({
        id: String(l.id),
        created_at: String(l.created_at),
        origem: origem && validNodeIds.has(origem) ? origem : null,
        destino,
        metodo: l.metodo ? String(l.metodo) : null,
        status_http: l.status_http == null ? null : Number(l.status_http),
        falhou: l.falhou === true,
        duracao_ms: l.duracao_ms == null ? null : Number(l.duracao_ms),
      });
    }
    if (fora.length === 0) {
      console.warn(
        `[eventos] a rota devolveu ${linhas.length} linha(s) e nenhuma sobrou apos ` +
          "casar com o catalogo — sem dado, token recusado, ou destinos desconhecidos.",
      );
      return undefined;
    }
    console.log(`[eventos] ok: ${fora.length} execucoes na janela.`);
    return fora;
  } catch (e) {
    console.warn(`[eventos] a leitura lancou: ${e instanceof Error ? e.message : String(e)}`);
    return undefined;
  }
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
  url: string,
  token: string,
  validNodeIds: Set<string>,
): Promise<UsoOut | undefined> {
  if (!url || !token) {
    console.warn("[uso] sem URL ou sem token — a leitura nem foi tentada.");
    return undefined;
  }
  try {
    const resp = await fetch(url, {
      method: "GET",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    });
    if (!resp.ok) {
      console.warn(`[uso] a rota respondeu HTTP ${resp.status} ${resp.statusText}.`);
      return undefined;
    }
    const corpo: unknown = await resp.json();
    const linhas = (corpo as { uso?: unknown })?.uso;
    if (!Array.isArray(linhas)) {
      console.warn("[uso] a rota respondeu sem o campo `uso` como lista.");
      return undefined;
    }
    /*
     * A rota devolve 200 com lista vazia tambem quando o token e invalido — foi
     * combinado assim para que ninguem quebre por causa disso. O efeito
     * colateral e que "vazio" nao distingue "nao ha dado" de "nao autorizado",
     * e por isso o log diz explicitamente que os dois casos caem aqui.
     */
    if (linhas.length === 0) {
      console.warn("[uso] a rota devolveu lista vazia — sem dado, ou token recusado.");
      return undefined;
    }
    const uso: UsoOut = {};
    for (const l of linhas as Record<string, unknown>[]) {
      const slug = l?.slug ? String(l.slug) : null;
      // Slug fora do catalogo nao entra: o mapa nao desenha node que nao
      // conhece, e chave orfa aqui seria dado sem dono.
      if (!slug || !validNodeIds.has(slug)) continue;
      uso[slug] = {
        ultimo_login: l.ultimo_login ? String(l.ultimo_login) : null,
        pessoas_24h: Number(l.pessoas_24h ?? 0),
        pessoas_30d: Number(l.pessoas_30d ?? 0),
      };
    }
    if (Object.keys(uso).length === 0) {
      console.warn(
        `[uso] a rota devolveu ${linhas.length} linha(s), mas nenhum slug casou ` +
          "com o catalogo — o `uso` sai da resposta por nao ter dono.",
      );
      return undefined;
    }
    console.log(`[uso] ok: ${Object.keys(uso).length} sistemas com sinal de acesso.`);
    return uso;
  } catch (e) {
    console.warn(`[uso] a leitura lancou: ${e instanceof Error ? e.message : String(e)}`);
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
    // Em paralelo: sao duas rotas independentes e nenhuma depende da outra.
    const [uso, eventos] = await Promise.all([
      lerUso(USO_URL, HUB_TOKEN, validNodeIds),
      lerEventos(EVENTOS_URL, HUB_TOKEN, validNodeIds),
    ]);

    return ok(
      {
        fonte: "hub",
        gerado_em: new Date().toISOString(),
        sistemas,
        conectoresExternos,
        integracoes: Array.from(edgeMap.values()),
        saude,
        ...(uso ? { uso } : {}),
        ...(eventos ? { eventos } : {}),
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
