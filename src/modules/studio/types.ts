/**
 * Studio — tipos do documento low-code (Feature 025).
 * Puro: sem dependências de React, DOM ou Supabase.
 */

export type StudioBreakpoint = "sm" | "md" | "lg" | "xl";
export type StudioTheme = "light" | "dark";

export type StudioBindingKind =
  | "query"
  | "mesh"
  | "analytics"
  | "knowledge"
  | "workflow"
  | "routing"
  | "ai"
  | "flag"
  | "setting";

export interface StudioBinding {
  id: string;
  kind: StudioBindingKind;
  target: string;
  params?: Record<string, unknown>;
  cache?: { staleMs?: number };
}

export interface StudioNode {
  id: string;
  type: string;
  props: Record<string, unknown>;
  style?: Record<string, string>;
  responsive?: Partial<Record<StudioBreakpoint, Record<string, unknown>>>;
  bindings?: Record<string, string>;
  children?: StudioNode[];
}

export interface StudioDocument {
  id: string;
  name: string;
  version: string;
  root: StudioNode;
  bindings: Record<string, StudioBinding>;
  meta: { createdAt: string; updatedAt: string };
}

export interface StudioViewport {
  breakpoint: StudioBreakpoint;
  theme: StudioTheme;
  snap: boolean;
  grid: boolean;
}

export interface StudioState {
  doc: StudioDocument;
  selectedId: string | null;
  viewport: StudioViewport;
  past: StudioDocument[];
  future: StudioDocument[];
}
