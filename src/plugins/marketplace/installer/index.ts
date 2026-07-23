/**
 * Installer — placeholder para v2.1.
 * Nesta versão, todos os plugins são "bundled" pelo Host.
 * A API foi desenhada para receber futuramente:
 *   - repositórios remotos
 *   - assinatura digital
 *   - versionamento
 *   - instalação dinâmica via dynamic import
 */
import type { PluginManifest } from "@/platform-sdk";

export type InstallSource =
  | { kind: "bundled"; manifest: PluginManifest }
  | { kind: "remote"; url: string; signature?: string; version?: string };

export interface InstallResult {
  ok: boolean;
  reason?: string;
  manifest?: PluginManifest;
}

export const pluginInstaller = {
  supportsRemote: false as const,

  install(source: InstallSource): InstallResult {
    if (source.kind === "bundled") {
      return { ok: true, manifest: source.manifest };
    }
    return {
      ok: false,
      reason:
        "Instalação remota indisponível nesta versão. Ver docs/54-Plugin-Marketplace.md § Roadmap v2.1.",
    };
  },
};
