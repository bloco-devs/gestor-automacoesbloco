/**
 * Built-in providers — expõem no Mesh serviços derivados dos módulos oficiais
 * do app (Knowledge, Routing, Analytics). Isto permite que plugins consumam
 * essas capacidades SEM importar módulos diretamente.
 *
 * Este é o ÚNICO arquivo do Service Mesh que conhece o app. Todo o resto do
 * `services/` é agnóstico. Chamado uma vez pelo host (SdkSandbox / App boot).
 */
import { serviceMesh } from "../mesh/mesh";
import { platformPermissions } from "../../permissions/permissions";
import type {
  KnowledgeService,
  RoutingService,
  AnalyticsService,
  SearchService,
} from "../contracts";

const PLUGIN_ID = "platform.core";
let booted = false;
const handles: Array<{ id: string; dispose: () => void }> = [];

export function bootstrapBuiltInProviders(): void {
  if (booted) return;
  booted = true;

  // Garante capabilities usadas pelos providers built-in.
  platformPermissions.grant(PLUGIN_ID, "knowledge.read");
  platformPermissions.grant(PLUGIN_ID, "routing.read");
  platformPermissions.grant(PLUGIN_ID, "analytics.read");
  platformPermissions.grant(PLUGIN_ID, "search.read");

  /* ---------------- Knowledge ---------------- */
  const knowledge: KnowledgeService = {
    kind: "knowledge",
    async search({ query, limit = 5 }) {
      try {
        const { knowledgeService } = await import("@/modules/knowledge");
        const results = await knowledgeService.search({ query, limit }).catch(() => []);
        return (results ?? []).map((r) => ({
          id: r.id,
          title: r.title ?? r.slug ?? r.id,
          slug: r.slug,
          similarity: r.similarity,
          source: "knowledge",
        }));
      } catch {
        return [];
      }
    },
    async suggestForContext({ text }) {
      if (!text) return [];
      return knowledge.search({ query: text, limit: 3 });
    },
  };
  handles.push(
    serviceMesh.provide({
      id: "platform.core.knowledge",
      pluginId: PLUGIN_ID,
      contract: "service.knowledge",
      version: "1.0.0",
      visibility: "public",
      impl: knowledge,
      health: () => ({ status: "healthy", at: Date.now() }),
    }),
  );

  /* ---------------- Routing ---------------- */
  const routing: RoutingService = {
    kind: "routing",
    async suggest() {
      // Wrapper leve — módulos podem ser plugados on-demand no futuro.
      return [];
    },
  };
  handles.push(
    serviceMesh.provide({
      id: "platform.core.routing",
      pluginId: PLUGIN_ID,
      contract: "service.routing",
      version: "1.0.0",
      visibility: "public",
      impl: routing,
      health: () => ({ status: "healthy", at: Date.now() }),
    }),
  );

  /* ---------------- Analytics ---------------- */
  const analytics: AnalyticsService = {
    kind: "analytics",
    async summary() {
      return { totalDemands: 0, openDemands: 0, averageAgeDays: 0 };
    },
    track: () => {
      /* no-op — plugins de analytics podem substituir. */
    },
  };
  handles.push(
    serviceMesh.provide({
      id: "platform.core.analytics",
      pluginId: PLUGIN_ID,
      contract: "service.analytics",
      version: "1.0.0",
      visibility: "public",
      impl: analytics,
      health: () => ({ status: "healthy", at: Date.now() }),
    }),
  );

  /* ---------------- Search (universal) ---------------- */
  const search: SearchService = {
    kind: "search",
    async query(text, limit = 10) {
      const hits = await knowledge.search({ query: text, limit });
      return hits.map((h) => ({
        id: h.id,
        title: h.title,
        kind: "knowledge",
        href: h.slug ? `/base-conhecimento/${h.slug}` : undefined,
      }));
    },
  };
  handles.push(
    serviceMesh.provide({
      id: "platform.core.search",
      pluginId: PLUGIN_ID,
      contract: "service.search",
      version: "1.0.0",
      visibility: "public",
      impl: search,
      health: () => ({ status: "healthy", at: Date.now() }),
    }),
  );
}

export function teardownBuiltInProviders(): void {
  for (const h of handles) h.dispose();
  handles.length = 0;
  booted = false;
}

export function isBootstrapped(): boolean {
  return booted;
}
