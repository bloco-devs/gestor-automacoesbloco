/**
 * RemoteRepository — PLACEHOLDER (v2.4).
 * Nesta versão nada é baixado da internet. A superfície existe para
 * que o Loader/Marketplace/Sandbox possam listar/plugar o repositório
 * remoto sem refactor futuro.
 */
import type { PluginPackage, PluginRepository } from "./types";

export interface RemoteRepositoryOptions {
  /** URL base (não usada nesta versão). */
  endpoint?: string;
  /** Se true, o Sandbox mostra o repositório como "disponível" mesmo vazio. */
  advertised?: boolean;
}

export class RemoteRepository implements PluginRepository {
  readonly id: string;
  readonly kind = "remote" as const;
  readonly label: string;
  readonly endpoint?: string;
  readonly advertised: boolean;

  constructor(opts: RemoteRepositoryOptions = {}, id = "remote", label = "Remote") {
    this.endpoint = opts.endpoint;
    this.advertised = opts.advertised ?? true;
    this.id = id;
    this.label = label;
  }

  async list(): Promise<PluginPackage[]> {
    // Intencionalmente vazio — v2.4 preencherá com fetch(endpoint).
    return [];
  }

  async get(_id: string): Promise<PluginPackage | null> {
    return null;
  }
}
