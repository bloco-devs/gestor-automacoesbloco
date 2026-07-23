export interface InventoryStat {
  key: string;
  label: string;
  count: number;
  description?: string;
}

export interface CatalogNode {
  id: string;
  label: string;
  type: "page" | "module" | "hook" | "service" | "engine" | "edge" | "provider" | "design-system" | "component-group";
  path?: string;
  imports?: number;
  reuse?: number;
  updatedAt?: string;
  dependencies?: string[];
}

export interface LargeFile {
  path: string;
  bytes: number;
  category: "page" | "component" | "module" | "lib" | "generated";
}

export interface HealthFinding {
  id: string;
  kind: "large-file" | "large-hook" | "large-component" | "duplication" | "circular" | "unused" | "similar";
  severity: "info" | "warn" | "error";
  message: string;
  path?: string;
}

export interface DependencyEdge {
  from: string;
  to: string;
  strength?: 1 | 2 | 3;
}

export interface FeatureEntry {
  id: string;
  name: string;
  status: "shipped" | "in-progress" | "planned";
  doc?: string;
  depends?: string[];
}

export interface DocGroup {
  id: string;
  label: string;
  items: Array<{ file: string; title: string }>;
}

export type QualityGrade = "A+" | "A" | "B" | "C";

export interface QualityAxis {
  key: string;
  label: string;
  score: number; // 0..100
  weight: number; // 0..1
  detail?: string;
}

export interface QualityScore {
  grade: QualityGrade;
  total: number;
  axes: QualityAxis[];
}

export interface ReadinessItem {
  id: string;
  label: string;
  status: "ok" | "warn" | "pending";
  detail?: string;
}

export interface ReuseEntry {
  id: string;
  label: string;
  kind: "component" | "hook" | "service" | "module";
  reuseCount: number;
  path?: string;
}

export interface TechnicalDebtItem {
  module: string;
  kind: "todo" | "risk" | "roadmap" | "pending";
  message: string;
  path?: string;
}
