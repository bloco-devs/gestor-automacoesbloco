import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  listActivityLog,
  listComentarios,
  type AtividadeLogEntry,
  type CardComentario,
} from "@/lib/atividades";
import type { AssignableUser } from "@/lib/types";
import { atividadesKeys } from "@/hooks/useAtividadesBoard";

const LOG_LABELS: Record<string, string> = {
  criado: "criou o card",
  movido: "moveu de coluna",
  renomeado: "renomeou",
  prazo: "atualizou o prazo",
  concluido: "marcou como concluído",
  reaberto: "reabriu o card",
};

function formatDateTime(iso: string) {
  try {
    return new Date(iso).toLocaleString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

export function AtividadeTimeline({
  cardId,
  responsaveis,
}: {
  cardId: string;
  responsaveis: AssignableUser[];
}) {
  const logsQ = useQuery<AtividadeLogEntry[]>({
    queryKey: atividadesKeys.activity(cardId),
    queryFn: () => listActivityLog(cardId),
    staleTime: 15_000,
  });
  const comentariosQ = useQuery<CardComentario[]>({
    queryKey: atividadesKeys.comentarios(cardId),
    queryFn: () => listComentarios(cardId),
    staleTime: 15_000,
  });

  const loading = logsQ.isLoading || comentariosQ.isLoading;
  const error = logsQ.error || comentariosQ.error;

  useEffect(() => {
    if (error) {
      console.error(error);
      toast.error("Não foi possível carregar a atividade");
    }
  }, [error]);

  const nomeMap = useMemo(
    () => new Map(responsaveis.map((u) => [u.id, u.nome])),
    [responsaveis],
  );

  const merged = useMemo(() => {
    const items: {
      key: string;
      when: string;
      who: string;
      kind: "log" | "comment";
      text: string;
    }[] = [];
    for (const l of logsQ.data ?? []) {
      const who = (l.userId && nomeMap.get(l.userId)) || l.userEmail || "Sistema";
      let text = LOG_LABELS[l.tipo] ?? l.tipo;
      const payload = l.payload as { de?: string; para?: string };
      if (l.tipo === "renomeado" && payload.de && payload.para) {
        text = `renomeou "${payload.de}" → "${payload.para}"`;
      }
      items.push({ key: `l:${l.id}`, when: l.createdAt, who, kind: "log", text });
    }
    for (const c of comentariosQ.data ?? []) {
      const who = (c.userId && nomeMap.get(c.userId)) || "Usuário";
      items.push({ key: `c:${c.id}`, when: c.createdAt, who, kind: "comment", text: c.texto });
    }
    items.sort((a, b) => b.when.localeCompare(a.when));
    return items;
  }, [logsQ.data, comentariosQ.data, nomeMap]);

  if (loading) return <p className="text-sm text-muted-foreground">Carregando...</p>;
  if (merged.length === 0)
    return <p className="text-sm text-muted-foreground">Sem atividade ainda.</p>;

  return (
    <div className="space-y-3">
      {merged.map((m) => (
        <div key={m.key} className="flex gap-3 text-sm">
          <div className="mt-1.5 size-2 rounded-full bg-muted-foreground/40 shrink-0" />
          <div className="flex-1 min-w-0">
            <div className="text-xs text-muted-foreground">
              <span className="font-medium text-foreground">{m.who}</span>{" "}
              {m.kind === "log" ? <>{m.text}</> : <>comentou</>} · {formatDateTime(m.when)}
            </div>
            {m.kind === "comment" && (
              <div className="mt-1 rounded-md border border-border/60 bg-muted/30 p-2 text-sm whitespace-pre-wrap">
                {m.text}
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

// Reexporta o formatter usado por ComentariosSection.
export { formatDateTime };
