/**
 * FEATURE 023 — Feature Flags (Onda 3)
 * Client-side store (localStorage) — API isolada permite trocar para tabela
 * `feature_flags` no futuro sem alterar consumidores.
 */
import { useEffect, useState, useCallback } from "react";

export type FlagScope = "global" | "developer" | "admin" | "builder" | "requester";

export interface FeatureFlag {
  key: string;
  enabled: boolean;
  description?: string;
  scope: FlagScope;
  roles?: string[];
  createdAt: number;
  updatedAt: number;
}

const STORAGE_KEY = "gab:feature-flags:v1";
const listeners = new Set<() => void>();

function read(): Record<string, FeatureFlag> {
  if (typeof window === "undefined") return {};
  try {
    return JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? "{}");
  } catch {
    return {};
  }
}

function write(next: Record<string, FeatureFlag>) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  for (const l of listeners) l();
}

export function listFlags(): FeatureFlag[] {
  return Object.values(read()).sort((a, b) => a.key.localeCompare(b.key));
}

export function getFlag(key: string): FeatureFlag | undefined {
  return read()[key];
}

export function setFlag(input: Partial<FeatureFlag> & { key: string; enabled: boolean }): FeatureFlag {
  const all = read();
  const now = Date.now();
  const prev = all[input.key];
  const next: FeatureFlag = {
    key: input.key,
    enabled: input.enabled,
    description: input.description ?? prev?.description,
    scope: input.scope ?? prev?.scope ?? "global",
    roles: input.roles ?? prev?.roles,
    createdAt: prev?.createdAt ?? now,
    updatedAt: now,
  };
  all[input.key] = next;
  write(all);
  return next;
}

export function removeFlag(key: string): void {
  const all = read();
  delete all[key];
  write(all);
}

export function useFeatureFlag(key: string): boolean {
  const [enabled, setEnabled] = useState<boolean>(() => !!read()[key]?.enabled);
  useEffect(() => {
    const upd = () => setEnabled(!!read()[key]?.enabled);
    listeners.add(upd);
    return () => {
      listeners.delete(upd);
    };
  }, [key]);
  return enabled;
}

export function useFeatureFlags() {
  const [flags, setFlags] = useState<FeatureFlag[]>(() => listFlags());
  const refresh = useCallback(() => setFlags(listFlags()), []);
  useEffect(() => {
    listeners.add(refresh);
    return () => {
      listeners.delete(refresh);
    };
  }, [refresh]);
  return { flags, setFlag, removeFlag, refresh };
}
