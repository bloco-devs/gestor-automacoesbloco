/**
 * Service Registry — armazena descritores de serviços publicados por plugins.
 * Isolado do PluginRegistry. Nenhum plugin importa outro para acessar isto.
 */
import type { ServiceContractId, ServiceContractMap } from "../contracts";

export type ServiceVisibility = "public" | "internal" | "restricted";
export type ServiceStatus = "healthy" | "degraded" | "down" | "unknown";

export interface ServiceHealth {
  status: ServiceStatus;
  message?: string;
  latencyMs?: number;
  at: number;
}

export interface ServiceRecord<C extends ServiceContractId = ServiceContractId> {
  id: string;
  pluginId: string;
  contract: C;
  version: string;
  visibility: ServiceVisibility;
  /** Capabilities exigidas do consumidor para poder resolver este serviço. */
  requiresCapabilities?: string[];
  /** Implementação. Compartilhada por referência entre consumidores. */
  impl: ServiceContractMap[C];
  registeredAt: number;
  health: ServiceHealth;
  /** Contador de resoluções bem-sucedidas (telemetria in-memory). */
  resolveCount: number;
  /** Última falha reportada por health(). */
  lastError?: string;
}

type Listener = () => void;

class ServiceRegistry {
  private records = new Map<string, ServiceRecord>();
  private listeners = new Set<Listener>();

  register<C extends ServiceContractId>(record: Omit<ServiceRecord<C>, "registeredAt" | "health" | "resolveCount">): ServiceRecord<C> {
    if (this.records.has(record.id)) {
      throw new Error(`Service already registered: ${record.id}`);
    }
    const full: ServiceRecord<C> = {
      ...record,
      registeredAt: Date.now(),
      health: { status: "unknown", at: Date.now() },
      resolveCount: 0,
    };
    this.records.set(record.id, full as unknown as ServiceRecord);
    this.emit();
    return full;
  }

  unregister(id: string): void {
    if (this.records.delete(id)) this.emit();
  }

  unregisterByPlugin(pluginId: string): void {
    let changed = false;
    for (const [id, rec] of this.records) {
      if (rec.pluginId === pluginId) {
        this.records.delete(id);
        changed = true;
      }
    }
    if (changed) this.emit();
  }

  get(id: string): ServiceRecord | undefined {
    return this.records.get(id);
  }

  list(): ServiceRecord[] {
    return Array.from(this.records.values());
  }

  findByContract<C extends ServiceContractId>(contract: C): ServiceRecord<C>[] {
    return this.list().filter((r) => r.contract === contract) as ServiceRecord<C>[];
  }

  updateHealth(id: string, health: Partial<ServiceHealth>): void {
    const r = this.records.get(id);
    if (!r) return;
    r.health = { ...r.health, ...health, at: Date.now() };
    if (health.status && health.status !== "healthy") r.lastError = health.message;
    this.emit();
  }

  incrementResolve(id: string): void {
    const r = this.records.get(id);
    if (!r) return;
    r.resolveCount += 1;
  }

  subscribe(l: Listener): () => void {
    this.listeners.add(l);
    return () => this.listeners.delete(l);
  }

  __resetForTests(): void {
    this.records.clear();
    this.listeners.clear();
  }

  private emit(): void {
    for (const l of this.listeners) l();
  }
}

export const serviceRegistry = new ServiceRegistry();
export type { ServiceRegistry };
