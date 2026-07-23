import { describe, it, expect, beforeEach } from "vitest";
import {
  BundledRepository,
  LocalRepository,
  RemoteRepository,
  PluginRepositoryRegistry,
  bootstrapDefaultRepositories,
  pluginRepositoryRegistry,
  signManifest,
  verifyManifestSignature,
  canonicalize,
  loadFromRepositories,
  diagnoseRepositories,
  validatePackage,
  satisfies,
  compareVersions,
  checkHostCompatibility,
  SDK_VERSION,
  HOST_VERSION,
  type PluginPackage,
} from "@/platform-sdk/extension-host";
import HelloPlugin from "@/platform-sdk/runtime/plugins/hello";
import AICopilotPlugin from "@/plugins/ai-copilot";

async function makePackage(): Promise<PluginPackage> {
  const signature = await signManifest(HelloPlugin, "platform.bundled");
  return {
    id: HelloPlugin.id,
    version: HelloPlugin.version,
    manifest: HelloPlugin,
    metadata: {
      sdkVersion: "1.0.0",
      hostVersion: "1.0.0",
      publisher: "platform.bundled",
    },
    signature,
  };
}

describe("Versioning · semver enxuto", () => {
  it("compara versões", () => {
    expect(compareVersions("1.0.0", "1.0.0")).toBe(0);
    expect(compareVersions("1.0.0", "1.0.1")).toBe(-1);
    expect(compareVersions("2.0.0", "1.9.9")).toBe(1);
    expect(compareVersions("bad", "1.0.0")).toBeNull();
  });

  it("satisfies aceita ranges básicos", () => {
    expect(satisfies("1.0.0")).toBe(true);
    expect(satisfies("1.0.0", "1.0.0")).toBe(true);
    expect(satisfies("1.2.0", ">=1.0.0")).toBe(true);
    expect(satisfies("0.9.0", ">=1.0.0")).toBe(false);
    expect(satisfies("1.5.9", "^1.2.3")).toBe(true);
    expect(satisfies("2.0.0", "^1.2.3")).toBe(false);
    expect(satisfies("1.2.9", "~1.2.3")).toBe(true);
    expect(satisfies("1.3.0", "~1.2.3")).toBe(false);
  });

  it("checkHostCompatibility avalia SDK+Host", () => {
    const r = checkHostCompatibility({
      sdkCurrent: SDK_VERSION,
      hostCurrent: HOST_VERSION,
      sdkRequired: ">=1.0.0",
    });
    expect(r.ok).toBe(true);
    const bad = checkHostCompatibility({
      sdkCurrent: SDK_VERSION,
      hostCurrent: HOST_VERSION,
      sdkRequired: ">=99.0.0",
    });
    expect(bad.ok).toBe(false);
    expect(bad.reasons.length).toBeGreaterThan(0);
  });
});

describe("Signature (simulada)", () => {
  it("assina e verifica manifest", async () => {
    const sig = await signManifest(HelloPlugin, "platform.bundled");
    expect(sig.hash).toBeTruthy();
    expect(sig.algorithm).toBe("SHA-256");
    expect(sig.trusted).toBe(true);
    expect(sig.fingerprint).toContain("platform.bundled#");
    const v = await verifyManifestSignature(HelloPlugin, sig);
    expect(v.verified).toBe(true);
    expect(v.integrity).toBe("ok");
  });

  it("detecta hash-mismatch", async () => {
    const sig = await signManifest(HelloPlugin, "platform.bundled");
    const tampered = { ...sig, hash: sig.hash + "00" };
    const v = await verifyManifestSignature(HelloPlugin, tampered);
    expect(v.integrity).toBe("hash-mismatch");
  });

  it("canonicalize é determinístico", () => {
    expect(canonicalize(HelloPlugin)).toBe(canonicalize(HelloPlugin));
  });
});

describe("Manifest Validator (Package-aware)", () => {
  it("aprova package coerente", async () => {
    const pkg = await makePackage();
    const r = validatePackage(pkg);
    expect(r.valid).toBe(true);
  });

  it("rejeita package com id divergente", async () => {
    const pkg = await makePackage();
    const bad = { ...pkg, id: "outro" };
    const r = validatePackage(bad);
    expect(r.valid).toBe(false);
    expect(r.packageErrors.some((e) => e.includes("Package.id"))).toBe(true);
  });
});

describe("Repositories", () => {
  it("BundledRepository lista e busca packages", async () => {
    const repo = new BundledRepository([
      { manifest: HelloPlugin, publisher: "platform.bundled" },
    ]);
    const list = await repo.list();
    expect(list).toHaveLength(1);
    expect(list[0].id).toBe(HelloPlugin.id);
    expect(await repo.get(HelloPlugin.id)).not.toBeNull();
    expect(await repo.get("desconhecido")).toBeNull();
  });

  it("LocalRepository publica/remove", async () => {
    const repo = new LocalRepository();
    repo.__reset();
    const pkg = await makePackage();
    await repo.publish(pkg);
    expect((await repo.list())).toHaveLength(1);
    await repo.remove(pkg.id);
    expect((await repo.list())).toHaveLength(0);
  });

  it("RemoteRepository é placeholder vazio", async () => {
    const repo = new RemoteRepository({ advertised: true });
    expect(await repo.list()).toEqual([]);
    expect(await repo.get("qq")).toBeNull();
  });

  it("Registry dedup por id", async () => {
    const reg = new PluginRepositoryRegistry();
    reg.register(new BundledRepository([{ manifest: HelloPlugin }]));
    reg.register(new BundledRepository([{ manifest: HelloPlugin }]));
    reg.register(new RemoteRepository());
    const collected = await reg.collect();
    expect(collected).toHaveLength(1);
  });
});

describe("Extension Loader", () => {
  beforeEach(() => {
    pluginRepositoryRegistry.reset();
  });

  it("carrega + admite plugins bundled", async () => {
    bootstrapDefaultRepositories([
      { manifest: HelloPlugin },
      { manifest: AICopilotPlugin },
    ]);
    const report = await loadFromRepositories(pluginRepositoryRegistry);
    expect(report.entries.length).toBeGreaterThanOrEqual(2);
    expect(report.admittedManifests.map((m) => m.id)).toContain(HelloPlugin.id);
    expect(report.rejected).toHaveLength(0);
  });

  it("rejeita package incompatível (hostVersion futura)", async () => {
    pluginRepositoryRegistry.reset();
    const registry = new PluginRepositoryRegistry();
    const repo = new BundledRepository([]);
    registry.register(repo);
    // injeta manualmente um package "do futuro"
    const pkg = await makePackage();
    pkg.metadata.hostVersion = ">=99.0.0";
    // sobrescreve internamente a lista
    (repo as unknown as { cache: PluginPackage[] }).cache = [pkg];
    const report = await loadFromRepositories(registry);
    expect(report.admittedManifests).toHaveLength(0);
    expect(report.rejected[0].rejectionReason).toMatch(/Incompat/);
  });
});

describe("Repository Diagnostics", () => {
  it("agrega diagnostics de todos os repositórios", async () => {
    pluginRepositoryRegistry.reset();
    bootstrapDefaultRepositories([{ manifest: HelloPlugin }]);
    const report = await diagnoseRepositories(pluginRepositoryRegistry);
    expect(report.totalRepositories).toBeGreaterThanOrEqual(3);
    expect(report.totalPackages).toBeGreaterThanOrEqual(1);
    expect(report.entries[0].signature.verified).toBe(true);
    expect(report.entries[0].compatibility.ok).toBe(true);
    expect(report.summary.valid).toBeGreaterThanOrEqual(1);
  });
});
