import { describe, it, expect, beforeEach } from "vitest";
import {
  serviceMesh,
  serviceRegistry,
  provide,
  resolve,
  optional,
  required,
  discover,
  listContracts,
  checkCapabilities,
  versionSatisfies,
  bootstrapBuiltInProviders,
  teardownBuiltInProviders,
  __resetMeshDiagnostics,
  meshEventHistory,
  SERVICE_CONTRACTS,
  type KnowledgeService,
  type RoutingService,
} from "../services";
import { platformPermissions } from "../permissions/permissions";

const kn: KnowledgeService = {
  kind: "knowledge",
  async search({ query, limit = 3 }) {
    return Array.from({ length: limit }, (_, i) => ({
      id: `k-${i}`,
      title: `${query}-${i}`,
    }));
  },
};

const rt: RoutingService = {
  kind: "routing",
  async suggest() {
    return [{ candidateId: "c1", score: 0.9 }];
  },
};

beforeEach(() => {
  serviceRegistry.__resetForTests();
  __resetMeshDiagnostics();
  // permissões: limpar por prevenção.
  platformPermissions.grant("consumer.a", "knowledge.read");
  platformPermissions.grant("consumer.a", "routing.read");
});

describe("Service Mesh · Registry", () => {
  it("registra e lista providers", () => {
    provide({
      id: "p.knowledge",
      pluginId: "provider.plugin",
      contract: "service.knowledge",
      version: "1.0.0",
      impl: kn,
    });
    expect(serviceRegistry.list()).toHaveLength(1);
    expect(serviceRegistry.findByContract("service.knowledge")).toHaveLength(1);
  });

  it("rejeita ids duplicados", () => {
    provide({ id: "dup", pluginId: "x", contract: "service.knowledge", version: "1.0.0", impl: kn });
    expect(() =>
      provide({ id: "dup", pluginId: "x", contract: "service.knowledge", version: "1.0.0", impl: kn }),
    ).toThrow();
  });

  it("dispose remove do registry", () => {
    const h = provide({ id: "p1", pluginId: "x", contract: "service.knowledge", version: "1.0.0", impl: kn });
    h.dispose();
    expect(serviceRegistry.list()).toHaveLength(0);
  });
});

describe("Service Mesh · Discovery", () => {
  beforeEach(() => {
    provide({ id: "k1", pluginId: "px", contract: "service.knowledge", version: "1.0.0", impl: kn });
    provide({ id: "k2", pluginId: "py", contract: "service.knowledge", version: "2.1.0", impl: kn });
    provide({ id: "r1", pluginId: "px", contract: "service.routing", version: "1.0.0", impl: rt });
  });

  it("filtra por contract", () => {
    expect(discover({ contract: "service.knowledge" })).toHaveLength(2);
  });

  it("filtra por pluginId", () => {
    expect(discover({ pluginId: "px" })).toHaveLength(2);
  });

  it("filtra por version range", () => {
    expect(discover({ contract: "service.knowledge", version: "^2.0.0" })).toHaveLength(1);
  });

  it("listContracts agrega", () => {
    const contracts = listContracts();
    expect(contracts.find((c) => c.contract === "service.knowledge")?.providers).toBe(2);
  });
});

describe("Service Mesh · Consumer", () => {
  beforeEach(() => {
    provide({ id: "k1", pluginId: "px", contract: "service.knowledge", version: "1.0.0", impl: kn });
  });

  it("resolve retorna implementação tipada", async () => {
    const svc = resolve("service.knowledge", { consumerId: "consumer.a" });
    const results = await svc.search({ query: "hi", limit: 2 });
    expect(results).toHaveLength(2);
  });

  it("optional retorna null quando não há provider", () => {
    expect(optional("service.workflow", { consumerId: "consumer.a" })).toBeNull();
  });

  it("required lança quando não há provider", () => {
    expect(() => required("service.workflow", { consumerId: "consumer.a" })).toThrow();
  });

  it("registra evento consumer.resolved", () => {
    resolve("service.knowledge", { consumerId: "consumer.a" });
    expect(meshEventHistory().some((e) => e.kind === "consumer.resolved")).toBe(true);
  });

  it("incrementa contador de resoluções", () => {
    resolve("service.knowledge", { consumerId: "consumer.a" });
    resolve("service.knowledge", { consumerId: "consumer.a" });
    expect(serviceRegistry.get("k1")?.resolveCount).toBe(2);
  });
});

describe("Service Mesh · Capability Resolver", () => {
  it("versionSatisfies exact + caret + tilde", () => {
    expect(versionSatisfies("1.0.0", "1.0.0")).toBe(true);
    expect(versionSatisfies("1.2.3", "^1.0.0")).toBe(true);
    expect(versionSatisfies("2.0.0", "^1.0.0")).toBe(false);
    expect(versionSatisfies("1.2.5", "~1.2.0")).toBe(true);
    expect(versionSatisfies("1.3.0", "~1.2.0")).toBe(false);
  });

  it("checkCapabilities identifica missing", () => {
    const c = checkCapabilities("cx", ["a", "b"]);
    expect(c.granted).toBe(false);
    expect(c.missing).toEqual(["a", "b"]);
  });

  it("bloqueia resolve quando consumidor não tem capability exigida", () => {
    provide({
      id: "restrictedSvc",
      pluginId: "px",
      contract: "service.analytics",
      version: "1.0.0",
      requiresCapabilities: ["analytics.write"],
      impl: { kind: "analytics", async summary() { return { totalDemands: 0, openDemands: 0, averageAgeDays: 0 }; } },
    });
    expect(() => resolve("service.analytics", { consumerId: "consumer.a" })).toThrow();
    expect(meshEventHistory().some((e) => e.kind === "capability.denied")).toBe(true);
  });
});

describe("Service Mesh · Provider health", () => {
  it("reportHealth atualiza status", () => {
    const h = provide({ id: "p1", pluginId: "x", contract: "service.knowledge", version: "1.0.0", impl: kn });
    h.reportHealth({ status: "degraded", message: "slow" });
    expect(serviceRegistry.get("p1")?.health.status).toBe("degraded");
  });

  it("runHealthCheck usa probe", async () => {
    const h = provide({
      id: "p1",
      pluginId: "x",
      contract: "service.knowledge",
      version: "1.0.0",
      impl: kn,
      health: () => ({ status: "healthy", at: Date.now() }),
    });
    const result = await h.runHealthCheck();
    expect(result?.status).toBe("healthy");
  });
});

describe("Service Mesh · Bootstrap builtins", () => {
  beforeEach(() => teardownBuiltInProviders());

  it("registra providers built-in", () => {
    bootstrapBuiltInProviders();
    expect(serviceMesh.discover({ pluginId: "platform.core" }).length).toBeGreaterThanOrEqual(3);
    expect(serviceMesh.optional("service.knowledge", { consumerId: "consumer.a" })).not.toBeNull();
  });

  it("é idempotente", () => {
    bootstrapBuiltInProviders();
    const before = serviceMesh.discover({ pluginId: "platform.core" }).length;
    bootstrapBuiltInProviders();
    expect(serviceMesh.discover({ pluginId: "platform.core" }).length).toBe(before);
  });
});
