/**
 * Binding Registry — kinds suportados para configuração (Onda 5).
 * Somente metadados. O Studio não executa side effects.
 */
import type { StudioBindingKind } from "../types";

export interface BindingKindSpec {
  kind: StudioBindingKind;
  label: string;
  description: string;
  /** Prefixo lógico usado no campo `target` do binding. */
  scheme: string;
  hint?: string;
}

export const BINDING_KINDS: BindingKindSpec[] = [
  {
    kind: "query",
    label: "React Query",
    description: "Consulta cliente com cache e stale time.",
    scheme: "query://",
    hint: "query://dashboard/metrics",
  },
  {
    kind: "mesh",
    label: "Service Mesh",
    description: "Resolve um serviço publicado no Service Mesh.",
    scheme: "mesh://",
    hint: "mesh://service.knowledge",
  },
  {
    kind: "analytics",
    label: "Analytics",
    description: "Leitura de séries do módulo de Analytics.",
    scheme: "analytics://",
    hint: "analytics://systems/affinity",
  },
  {
    kind: "knowledge",
    label: "Knowledge",
    description: "Consulta da Base de Conhecimento.",
    scheme: "knowledge://",
    hint: "knowledge://search?q=",
  },
  {
    kind: "workflow",
    label: "Workflow SDK",
    description: "Referência a triggers/actions registrados.",
    scheme: "workflow://",
    hint: "workflow://actions/notify",
  },
  {
    kind: "routing",
    label: "Smart Routing",
    description: "Sugestão de responsáveis via routing engine.",
    scheme: "routing://",
    hint: "routing://suggest",
  },
  {
    kind: "ai",
    label: "AI SDK",
    description: "Prompt/skill/agente registrado no AI SDK.",
    scheme: "ai://",
    hint: "ai://skills/summarize",
  },
  {
    kind: "flag",
    label: "Feature Flag",
    description: "Feature Flag do módulo de hardening.",
    scheme: "flag://",
    hint: "flag://studio.experimental",
  },
  {
    kind: "setting",
    label: "Setting",
    description: "Valor do Settings Center.",
    scheme: "setting://",
    hint: "setting://ui/theme",
  },
];

export function findBindingKind(kind: StudioBindingKind): BindingKindSpec | undefined {
  return BINDING_KINDS.find((b) => b.kind === kind);
}
