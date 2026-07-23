/**
 * FEATURE 023 — Config Center (Onda 4)
 * Client-side store versionado (localStorage) — API isolada permite trocar
 * para tabela `app_settings` no futuro sem alterar consumidores.
 */
import { useEffect, useState, useCallback } from "react";

export type SettingCategory =
  | "sistema"
  | "portal"
  | "workspace"
  | "analytics"
  | "operations"
  | "plugins"
  | "ai"
  | "workflow"
  | "knowledge"
  | "routing"
  | "sdk";

export interface AppSetting {
  key: string;
  category: SettingCategory;
  value: unknown;
  description?: string;
  updatedAt: number;
  version: number;
  history: { at: number; version: number; value: unknown }[];
}

const STORAGE_KEY = "gab:app-settings:v1";
const listeners = new Set<() => void>();

function read(): Record<string, AppSetting> {
  if (typeof window === "undefined") return {};
  try {
    return JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? "{}");
  } catch {
    return {};
  }
}

function write(next: Record<string, AppSetting>) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  for (const l of listeners) l();
}

export function listSettings(): AppSetting[] {
  return Object.values(read()).sort((a, b) => a.key.localeCompare(b.key));
}

export function setSetting(
  key: string,
  category: SettingCategory,
  value: unknown,
  description?: string,
): AppSetting {
  const all = read();
  const prev = all[key];
  const version = (prev?.version ?? 0) + 1;
  const now = Date.now();
  const next: AppSetting = {
    key,
    category,
    value,
    description: description ?? prev?.description,
    updatedAt: now,
    version,
    history: [
      ...((prev?.history ?? []).slice(-9)),
      { at: now, version: prev?.version ?? 0, value: prev?.value ?? null },
    ],
  };
  all[key] = next;
  write(all);
  return next;
}

export function rollbackSetting(key: string, version: number): AppSetting | undefined {
  const all = read();
  const cur = all[key];
  if (!cur) return undefined;
  const target = cur.history.find((h) => h.version === version);
  if (!target) return cur;
  return setSetting(key, cur.category, target.value, cur.description);
}

export function useAppSettings() {
  const [settings, setSettings] = useState<AppSetting[]>(() => listSettings());
  const refresh = useCallback(() => setSettings(listSettings()), []);
  useEffect(() => {
    listeners.add(refresh);
    return () => {
      listeners.delete(refresh);
    };
  }, [refresh]);
  return { settings, setSetting, rollbackSetting, refresh };
}
