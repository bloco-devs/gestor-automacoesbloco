/**
 * Execution Chain history — ring buffer para diagnostics.
 */
import type { ExecutionChain, ExecutionPlan } from "../types";

const MAX = 100;
const chains: ExecutionChain[] = [];
const plans: ExecutionPlan[] = [];
const listeners = new Set<() => void>();

export function recordPlan(p: ExecutionPlan): void {
  plans.push(p);
  if (plans.length > MAX) plans.shift();
  emit();
}
export function recordChain(c: ExecutionChain): void {
  chains.push(c);
  if (chains.length > MAX) chains.shift();
  emit();
}
export function listPlans(): ExecutionPlan[] {
  return [...plans];
}
export function listChains(): ExecutionChain[] {
  return [...chains];
}
export function subscribeChains(fn: () => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}
export function __resetChains(): void {
  chains.length = 0;
  plans.length = 0;
  emit();
}
function emit() {
  for (const l of listeners) {
    try {
      l();
    } catch {
      /* ignore */
    }
  }
}
