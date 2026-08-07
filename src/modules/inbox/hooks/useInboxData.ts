import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { listSolicitacoes } from "@/lib/supabaseData";
import { useAuth } from "@/hooks/useAuth";
import { rankInbox } from "../services/priority-engine";
import type { InboxItem, RankedInboxItem, RecentActivityItem } from "../types";
import type { Solicitacao } from "@/lib/types";

function toInboxItem(s: Solicitacao): InboxItem {
  const priority = s.scoreFinal ?? s.scoreSolicitante ?? s.score ?? 0;
  return {
    id: s.id,
    title: s.titulo,
    system: s.sistemaAlvoSlug ?? s.setor ?? null,
    status: s.status,
    priority,
    responsibleId: s.avaliadoPor ?? null,
    responsibleName: null,
    requesterId: s.solicitanteId,
    requesterName: s.solicitanteNome,
    tags: s.integracoes ?? [],
    sprint: null,
    sla: s.dataFimPrevista ?? null,
    updatedAt: s.updatedAt,
    createdAt: s.createdAt,
    ordemManual: s.ordemManual ?? null,
    href: `/solicitacao/${s.id}`,
  };
}

export interface UseInboxDataResult {
  items: RankedInboxItem[];
  recent: RecentActivityItem[];
  loading: boolean;
  error: Error | null;
  refetch: () => void;
}

export function useInboxData(): UseInboxDataResult {
  const { user } = useAuth();
  const q = useQuery({
    queryKey: ["inbox", "solicitacoes"],
    queryFn: listSolicitacoes,
    staleTime: 30_000,
  });

  const items = useMemo(() => {
    const raw = (q.data ?? []).map(toInboxItem);
    return rankInbox(raw, { currentUserId: user?.id ?? null });
  }, [q.data, user?.id]);

  const recent = useMemo<RecentActivityItem[]>(() => {
    const uid = user?.id ?? null;
    return (q.data ?? [])
      .filter((s) => !uid || s.solicitanteId === uid || s.avaliadoPor === uid)
      .slice(0, 6)
      .map<RecentActivityItem>((s) => ({
        id: s.id,
        kind: s.avaliadoEm ? "status_changed" : "created",
        title: s.titulo,
        when: s.updatedAt,
        href: `/solicitacao/${s.id}`,
      }));
  }, [q.data, user?.id]);

  return {
    items,
    recent,
    loading: q.isLoading,
    error: (q.error as Error) ?? null,
    refetch: () => void q.refetch(),
  };
}
