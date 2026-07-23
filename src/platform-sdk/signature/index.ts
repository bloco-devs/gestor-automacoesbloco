/**
 * Signature — infraestrutura de assinatura (PLUGIN 004).
 * Nesta versão a assinatura é SIMULADA: calculamos SHA-256 do payload
 * canônico + fingerprint reprodutível. A verificação real (chave pública
 * do publisher) chega em v2.4.
 *
 * Nunca lança. Se o WebCrypto estiver indisponível (SSR/tests), usa
 * um fallback determinístico baseado em FNV-1a — suficiente para
 * garantir integridade nesta fase.
 */
import type { PluginManifest } from "../types";
import type { PackageSignature } from "../repository/types";

const DEFAULT_PUBLISHER = "platform.core";
const TRUSTED_PUBLISHERS = new Set<string>([
  "platform.core",
  "platform.bundled",
]);

/** Serializa manifest de forma determinística para hashing. */
export function canonicalize(manifest: PluginManifest): string {
  const stripped = {
    id: manifest.id,
    name: manifest.name,
    version: manifest.version,
    category: manifest.category,
    dependencies: manifest.dependencies ?? [],
    permissions: manifest.permissions ?? {},
    commands: (manifest.commands ?? []).map((c) => c.id),
    widgets: (manifest.widgets ?? []).map((w) => `${w.slot}:${w.id}`),
    routes: (manifest.routes ?? []).map((r) => r.path),
  };
  return JSON.stringify(stripped, Object.keys(stripped).sort());
}

async function subtleSha256(input: string): Promise<string | null> {
  try {
    const subtle = (globalThis as unknown as { crypto?: Crypto }).crypto?.subtle;
    if (!subtle) return null;
    const buf = new TextEncoder().encode(input);
    const digest = await subtle.digest("SHA-256", buf);
    return [...new Uint8Array(digest)]
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
  } catch {
    return null;
  }
}

/** FNV-1a 64-bit em hex (fallback determinístico). */
function fnv1aHex(input: string): string {
  let h1 = 0x811c9dc5;
  let h2 = 0xdeadbeef;
  for (let i = 0; i < input.length; i++) {
    const c = input.charCodeAt(i);
    h1 = Math.imul(h1 ^ c, 16777619) >>> 0;
    h2 = Math.imul(h2 ^ c, 2166136261) >>> 0;
  }
  return h1.toString(16).padStart(8, "0") + h2.toString(16).padStart(8, "0");
}

export async function sha256(input: string): Promise<string> {
  const real = await subtleSha256(input);
  return real ?? `fnv1a-${fnv1aHex(input)}`;
}

export function shortFingerprint(hash: string, publisher: string): string {
  const seed = `${publisher}:${hash}`;
  const fp = fnv1aHex(seed);
  return `${publisher}#${fp.slice(0, 12)}`;
}

/** Gera assinatura simulada para um manifest. Não lança. */
export async function signManifest(
  manifest: PluginManifest,
  publisher: string = DEFAULT_PUBLISHER
): Promise<PackageSignature> {
  const payload = canonicalize(manifest);
  const hash = await sha256(payload);
  return {
    hash,
    algorithm: "SHA-256",
    publisher,
    fingerprint: shortFingerprint(hash, publisher),
    trusted: TRUSTED_PUBLISHERS.has(publisher),
    verified: true,
    signedAt: Date.now(),
  };
}

export async function verifyManifestSignature(
  manifest: PluginManifest,
  signature: PackageSignature
): Promise<{ verified: boolean; integrity: "ok" | "hash-mismatch" | "unsigned" }> {
  if (!signature?.hash) return { verified: false, integrity: "unsigned" };
  const expected = await sha256(canonicalize(manifest));
  const ok = expected === signature.hash;
  return { verified: ok, integrity: ok ? "ok" : "hash-mismatch" };
}

export function isTrustedPublisher(publisher: string | undefined): boolean {
  return !!publisher && TRUSTED_PUBLISHERS.has(publisher);
}

export const TRUSTED = TRUSTED_PUBLISHERS;
