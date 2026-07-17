import type { AtividadeCard, AtividadePersona, PrazoStatus } from "@/lib/atividades";
import type { AssignableUser } from "@/lib/types";

export function initials(nome: string) {
  return nome
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("");
}

export interface ResponsavelDisplay {
  id: string;
  nome: string;
  avatarUrl?: string | null;
}

export function buildResponsaveisDisplay(
  card: AtividadeCard,
  responsaveisMap: Map<string, AssignableUser>,
  personasMap: Map<string, AtividadePersona>,
  personasByUser: Map<string, AtividadePersona[]>,
): ResponsavelDisplay[] {
  const result: ResponsavelDisplay[] = [];
  const usersCoveredByPersona = new Set<string>();
  for (const pid of card.responsavelPersonaIds) {
    const p = personasMap.get(pid);
    if (!p) continue;
    const u = responsaveisMap.get(p.userId);
    result.push({ id: `p:${p.id}`, nome: p.nome, avatarUrl: u?.avatarUrl ?? null });
    usersCoveredByPersona.add(p.userId);
  }
  for (const uid of card.responsavelIds) {
    if (usersCoveredByPersona.has(uid)) continue;
    const u = responsaveisMap.get(uid);
    if (!u) continue;
    const userPersonas = personasByUser.get(uid) ?? [];
    void userPersonas;
    result.push({ id: `u:${uid}`, nome: u.nome, avatarUrl: u.avatarUrl ?? null });
  }
  return result;
}

export const PRAZO_FILTERS: { key: PrazoStatus | "todos"; label: string }[] = [
  { key: "todos", label: "Todos" },
  { key: "atrasado", label: "Atrasadas" },
  { key: "hoje", label: "Vence hoje" },
  { key: "em-breve", label: "Próximos 7 dias" },
  { key: "sem-prazo", label: "Sem prazo" },
  { key: "concluido", label: "Concluídas" },
];
