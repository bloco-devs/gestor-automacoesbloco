/**
 * Extension Host — Repository types (PLUGIN 004).
 * Modelo canônico de um "Plugin Package" distribuível.
 * Aditivo: não substitui `PluginManifest` do SDK — apenas o envelopa.
 */
import type { PluginManifest } from "../types";

export type RepositoryKind = "bundled" | "local" | "remote";

/** Metadados que acompanham cada package no repositório. */
export interface PackageMetadata {
  /** SDK mínimo esperado pelo plugin. Semver. */
  sdkVersion?: string;
  /** Host mínimo esperado pelo plugin. Semver. */
  hostVersion?: string;
  /** Categorias declarativas (indexação). */
  keywords?: string[];
  /** URL de origem (repositório remoto), opcional. */
  homepage?: string;
  /** Publisher fingerprint (arbitrário; verificado pela assinatura). */
  publisher?: string;
  /** Publicado em ms epoch. */
  publishedAt?: number;
  /** Texto do README (markdown), opcional. */
  readme?: string;
  /** CHANGELOG (markdown), opcional. */
  changelog?: string;
  /** URL do ícone (svg/png). Placeholder para v2.4. */
  iconUrl?: string;
}

/** Assinatura simulada. Verificação real chega em v2.4. */
export interface PackageSignature {
  /** SHA-256 do payload canônico. */
  hash: string;
  /** Algoritmo. Sempre "SHA-256" nesta versão. */
  algorithm: "SHA-256";
  /** Publisher declarado (não verificado ainda). */
  publisher?: string;
  /** Fingerprint reprodutível derivado do hash + publisher. */
  fingerprint: string;
  /** Se o host reconhece o publisher (lista trusted). */
  trusted: boolean;
  /** Se a assinatura foi verificada com sucesso. */
  verified: boolean;
  /** Timestamp de assinatura simulada. */
  signedAt: number;
}

/** Package canônico transportado por um Repository. */
export interface PluginPackage {
  /** Deve casar com `manifest.id`. */
  id: string;
  /** Deve casar com `manifest.version`. */
  version: string;
  /** Manifest completo (executável). */
  manifest: PluginManifest;
  /** Metadados descritivos. */
  metadata: PackageMetadata;
  /** Assinatura (simulada nesta versão). */
  signature: PackageSignature;
}

/** Interface implementada por todo Repository. */
export interface PluginRepository {
  readonly id: string;
  readonly kind: RepositoryKind;
  readonly label: string;
  list(): Promise<PluginPackage[]>;
  get(id: string): Promise<PluginPackage | null>;
  /** Preparado para futura instalação; nesta versão pode lançar. */
  publish?(pkg: PluginPackage): Promise<void>;
  /** Preparado para futura remoção; nesta versão pode lançar. */
  remove?(id: string): Promise<void>;
}

export interface RepositoryDiagnosticsEntry {
  repository: string;
  kind: RepositoryKind;
  packageId: string;
  version: string;
  valid: boolean;
  errors: string[];
  warnings: string[];
  signature: PackageSignature;
  integrity: "ok" | "hash-mismatch" | "unsigned";
  compatibility: {
    ok: boolean;
    sdkOk: boolean;
    hostOk: boolean;
    reasons: string[];
  };
}
