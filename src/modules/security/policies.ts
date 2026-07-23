/**
 * Policy Center — store client-side (localStorage) preparado p/ Supabase.
 * API isolada — trocar por tabela `security_policies` depois é 1 arquivo.
 */
import { useEffect, useState } from "react";

export type PolicyCategory = "access" | "data" | "audit" | "operations" | "naming" | "ai" | "sdk";
export type PolicyStatus = "draft" | "active" | "deprecated";

export interface SecurityPolicy {
  id: string;
  title: string;
  description: string;
  category: PolicyCategory;
  version: string;
  owner?: string;
  status: PolicyStatus;
  createdAt: number;
  updatedAt: number;
  lastReview?: number;
}

const KEY = "gab:security-policies:v1";
const listeners = new Set<() => void>();

function read(): SecurityPolicy[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return SEED;
    return JSON.parse(raw) as SecurityPolicy[];
  } catch {
    return SEED;
  }
}

function write(list: SecurityPolicy[]): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(KEY, JSON.stringify(list));
  for (const l of listeners) l();
}

const now = () => Date.now();

const SEED: SecurityPolicy[] = [
  {
    id: "pol_rls_first",
    title: "RLS obrigatório em todas as tabelas públicas",
    description: "Toda tabela em public deve ter ENABLE RLS + POLICY + GRANT explícitos.",
    category: "data",
    version: "1.0.0",
    owner: "Plataforma",
    status: "active",
    createdAt: now() - 86400000 * 90,
    updatedAt: now() - 86400000 * 30,
    lastReview: now() - 86400000 * 30,
  },
  {
    id: "pol_secrets_env",
    title: "Secrets sensíveis apenas em Edge Functions",
    description: "Nenhum secret sensível pode chegar ao bundle do navegador.",
    category: "access",
    version: "1.0.0",
    owner: "Plataforma",
    status: "active",
    createdAt: now() - 86400000 * 60,
    updatedAt: now() - 86400000 * 10,
    lastReview: now() - 86400000 * 10,
  },
  {
    id: "pol_audit_writes",
    title: "Toda mutação sensível registra evento de auditoria",
    description: "Escritas em RBAC, config, plugins e feature flags devem chamar recordAudit().",
    category: "audit",
    version: "1.0.0",
    owner: "Plataforma",
    status: "active",
    createdAt: now() - 86400000 * 45,
    updatedAt: now() - 86400000 * 15,
  },
  {
    id: "pol_plugin_signature",
    title: "Plugins carregados devem passar por verificação de integridade",
    description: "SHA-256 + semver check via Extension Host.",
    category: "sdk",
    version: "1.0.0",
    owner: "SDK",
    status: "active",
    createdAt: now() - 86400000 * 20,
    updatedAt: now() - 86400000 * 5,
  },
];

export function listPolicies(): SecurityPolicy[] {
  return read();
}

export function upsertPolicy(p: Omit<SecurityPolicy, "createdAt" | "updatedAt"> & { createdAt?: number }): SecurityPolicy {
  const list = read();
  const idx = list.findIndex((x) => x.id === p.id);
  const merged: SecurityPolicy = {
    ...p,
    createdAt: p.createdAt ?? (idx >= 0 ? list[idx].createdAt : now()),
    updatedAt: now(),
  };
  if (idx >= 0) list[idx] = merged;
  else list.push(merged);
  write(list);
  return merged;
}

export function removePolicy(id: string): void {
  write(read().filter((p) => p.id !== id));
}

export function usePolicies(): SecurityPolicy[] {
  const [list, setList] = useState<SecurityPolicy[]>(() => read());
  useEffect(() => {
    const l = () => setList(read());
    listeners.add(l);
    window.addEventListener("storage", l);
    return () => {
      listeners.delete(l);
      window.removeEventListener("storage", l);
    };
  }, []);
  return list;
}
