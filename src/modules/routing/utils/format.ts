import type { ConfidenceLevel } from "../types";

export function confidenceLabel(c: ConfidenceLevel): string {
  return c === "high" ? "Alta confiança" : c === "medium" ? "Confiança média" : "Baixa confiança";
}

export function confidenceClass(c: ConfidenceLevel): string {
  return c === "high"
    ? "bg-success/15 text-success border-success/30"
    : c === "medium"
    ? "bg-info/15 text-info border-info/30"
    : "bg-muted text-muted-foreground border-border";
}

export function initialsOf(name: string | null | undefined, fallback: string): string {
  const src = (name && name.trim()) || fallback;
  return src.slice(0, 2).toUpperCase();
}
