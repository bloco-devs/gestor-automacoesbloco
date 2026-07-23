/**
 * Developer Tools do Copilot — buffer de últimos prompts.
 * Alimenta o Sandbox `/admin/sdk`.
 */
import type { CopilotDiagnosticEntry } from "../types";

const buffer: CopilotDiagnosticEntry[] = [];
const listeners = new Set<() => void>();
const MAX = 25;

export function recordDiagnostic(entry: CopilotDiagnosticEntry): void {
  buffer.push(entry);
  if (buffer.length > MAX) buffer.shift();
  for (const l of listeners) l();
}

export function listDiagnostics(): readonly CopilotDiagnosticEntry[] {
  return buffer.slice().reverse();
}

export function subscribeDiagnostics(fn: () => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function __resetDiagnosticsForTests() {
  buffer.length = 0;
  listeners.clear();
}
