/**
 * Camada de dados local (mock) usando localStorage.
 * Estruturada para ser facilmente substituída por chamadas Supabase.
 *
 * Para integrar Supabase mais tarde:
 *   - Substitua cada função (listSolicitacoes, createSolicitacao, etc.) por queries supabase.from('...')
 *   - Substitua o auth (signIn / signUp / signOut / currentUser) por supabase.auth
 *   - Mantenha a mesma assinatura para não precisar tocar os componentes
 */
import type {
  Integracao,
  Melhoria,
  Profile,
  Solicitacao,
  Solucao,
} from "./types";
import { calcScore } from "./score";

// 🔧 Email do desenvolvedor fixo (ajuste conforme combinado com a equipe)
export const DEV_EMAIL = "blococcomercial@gmail.com";

const KEYS = {
  users: "app:users",
  session: "app:session",
  solicitacoes: "app:solicitacoes",
  solucoes: "app:solucoes",
  integracoes: "app:integracoes",
  melhorias: "app:melhorias",
};

type StoredUser = Profile & { senha: string };

function read<T>(k: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(k);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}
function write<T>(k: string, v: T) {
  localStorage.setItem(k, JSON.stringify(v));
  window.dispatchEvent(new CustomEvent("app:store-change", { detail: { key: k } }));
}
function uid() {
  return crypto.randomUUID();
}

/* ---------------- Auth ---------------- */
export function currentUser(): Profile | null {
  return read<Profile | null>(KEYS.session, null);
}
export function signOut() {
  localStorage.removeItem(KEYS.session);
  window.dispatchEvent(new CustomEvent("app:store-change", { detail: { key: KEYS.session } }));
}
export function signUp(nome: string, email: string, senha: string): Profile {
  const users = read<StoredUser[]>(KEYS.users, []);
  if (users.some((u) => u.email.toLowerCase() === email.toLowerCase())) {
    throw new Error("Já existe uma conta com este email.");
  }
  const role = email.toLowerCase() === DEV_EMAIL.toLowerCase() ? "developer" : "requester";
  const profile: Profile = { id: uid(), email, nome, role };
  users.push({ ...profile, senha });
  write(KEYS.users, users);
  write<Profile>(KEYS.session, profile);
  return profile;
}
export function signIn(email: string, senha: string): Profile {
  const users = read<StoredUser[]>(KEYS.users, []);
  const u = users.find((x) => x.email.toLowerCase() === email.toLowerCase() && x.senha === senha);
  if (!u) throw new Error("Email ou senha inválidos.");
  const profile: Profile = { id: u.id, email: u.email, nome: u.nome, role: u.role };
  write<Profile>(KEYS.session, profile);
  return profile;
}

/* ---------------- Solicitações ---------------- */
export function listSolicitacoes(): Solicitacao[] {
  return read<Solicitacao[]>(KEYS.solicitacoes, []);
}
export function listMinhasSolicitacoes(userId: string): Solicitacao[] {
  return listSolicitacoes().filter((s) => s.solicitanteId === userId);
}
export function getSolicitacao(id: string): Solicitacao | undefined {
  return listSolicitacoes().find((s) => s.id === id);
}
export function createSolicitacao(
  data: Omit<Solicitacao, "id" | "score" | "status" | "createdAt" | "updatedAt">,
): Solicitacao {
  const all = listSolicitacoes();
  const now = new Date().toISOString();
  const novo: Solicitacao = {
    ...data,
    id: uid(),
    status: "novo",
    score: calcScore(data),
    createdAt: now,
    updatedAt: now,
  };
  all.unshift(novo);
  write(KEYS.solicitacoes, all);
  return novo;
}
export function updateSolicitacao(id: string, patch: Partial<Solicitacao>): Solicitacao {
  const all = listSolicitacoes();
  const i = all.findIndex((s) => s.id === id);
  if (i < 0) throw new Error("Solicitação não encontrada");
  const merged = { ...all[i], ...patch, updatedAt: new Date().toISOString() };
  // Recalcula score se algum fator mudou
  merged.score = calcScore(merged);
  all[i] = merged;
  write(KEYS.solicitacoes, all);
  return merged;
}

/* ---------------- Soluções ---------------- */
export function listSolucoes(): Solucao[] {
  return read<Solucao[]>(KEYS.solucoes, []);
}
export function createSolucao(data: Omit<Solucao, "id" | "createdAt">): Solucao {
  const all = listSolucoes();
  const novo: Solucao = { ...data, id: uid(), createdAt: new Date().toISOString() };
  all.unshift(novo);
  write(KEYS.solucoes, all);
  return novo;
}
export function updateSolucao(id: string, patch: Partial<Solucao>) {
  const all = listSolucoes();
  const i = all.findIndex((s) => s.id === id);
  if (i < 0) return;
  all[i] = { ...all[i], ...patch };
  write(KEYS.solucoes, all);
}
export function deleteSolucao(id: string) {
  write(KEYS.solucoes, listSolucoes().filter((s) => s.id !== id));
}

/* ---------------- Integrações ---------------- */
export function listIntegracoes(): Integracao[] {
  return read<Integracao[]>(KEYS.integracoes, []);
}
export function createIntegracao(data: Omit<Integracao, "id">): Integracao {
  const all = listIntegracoes();
  const novo: Integracao = { ...data, id: uid() };
  all.unshift(novo);
  write(KEYS.integracoes, all);
  return novo;
}
export function deleteIntegracao(id: string) {
  write(KEYS.integracoes, listIntegracoes().filter((i) => i.id !== id));
}

/* ---------------- Melhorias ---------------- */
export function listMelhorias(solucaoId?: string): Melhoria[] {
  const all = read<Melhoria[]>(KEYS.melhorias, []);
  return solucaoId ? all.filter((m) => m.solucaoId === solucaoId) : all;
}
export function createMelhoria(data: Omit<Melhoria, "id">): Melhoria {
  const all = read<Melhoria[]>(KEYS.melhorias, []);
  const novo: Melhoria = { ...data, id: uid() };
  all.unshift(novo);
  write(KEYS.melhorias, all);
  return novo;
}
export function updateMelhoria(id: string, patch: Partial<Melhoria>) {
  const all = read<Melhoria[]>(KEYS.melhorias, []);
  const i = all.findIndex((m) => m.id === id);
  if (i < 0) return;
  all[i] = { ...all[i], ...patch };
  write(KEYS.melhorias, all);
}
export function deleteMelhoria(id: string) {
  write(KEYS.melhorias, read<Melhoria[]>(KEYS.melhorias, []).filter((m) => m.id !== id));
}

/* ---------------- Subscribe (realtime mock) ---------------- */
export function subscribe(cb: () => void): () => void {
  const handler = () => cb();
  window.addEventListener("app:store-change", handler);
  window.addEventListener("storage", handler);
  return () => {
    window.removeEventListener("app:store-change", handler);
    window.removeEventListener("storage", handler);
  };
}
