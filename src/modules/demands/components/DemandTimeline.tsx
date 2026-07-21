import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowRight,
  Flag,
  Layers,
  Loader2,
  Lock,
  MessageSquare,
  Send,
  UserPlus,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import {
  createComment,
  listAuditLogs,
  listComments,
  type DemandAuditLog,
  type DemandComment,
} from "../timeline-service";
import { getProfilesByIds } from "../service";
import {
  COMPLEXITY_META,
  PRIORITY_META,
  STATUS_COLUMNS,
  type DemandComplexity,
  type DemandPriority,
  type DemandStatus,
} from "../types";

interface Props {
  demandId: string;
}

type TimelineItem =
  | { kind: "comment"; at: string; data: DemandComment }
  | { kind: "log"; at: string; data: DemandAuditLog };

function relative(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const s = Math.round(diffMs / 1000);
  if (s < 60) return "agora";
  const m = Math.round(s / 60);
  if (m < 60) return `há ${m} min`;
  const h = Math.round(m / 60);
  if (h < 24) return `há ${h} h`;
  const d = Math.round(h / 24);
  if (d < 7) return `há ${d} d`;
  return new Date(iso).toLocaleString("pt-BR");
}

function statusLabel(v: string | null | undefined): string {
  if (!v) return "—";
  return STATUS_COLUMNS.find((s) => s.id === (v as DemandStatus))?.label ?? v;
}

function priorityLabel(v: string | null | undefined): string {
  if (!v) return "—";
  return PRIORITY_META[v as DemandPriority]?.label ?? v;
}

function complexityLabel(v: string | null | undefined): string {
  if (!v) return "—";
  return COMPLEXITY_META[v as DemandComplexity]?.label ?? v;
}

function initialsFrom(name: string | null | undefined, email: string | null | undefined, fallback = "?") {
  return (name || email || fallback).slice(0, 2).toUpperCase();
}

export function DemandTimeline({ demandId }: Props) {
  const qc = useQueryClient();
  const { toast } = useToast();

  const commentsQ = useQuery({
    queryKey: ["demand-comments", demandId],
    queryFn: () => listComments(demandId),
  });
  const logsQ = useQuery({
    queryKey: ["demand-audit-logs", demandId],
    queryFn: () => listAuditLogs(demandId),
  });

  const [content, setContent] = useState("");
  const [isInternal, setIsInternal] = useState(false);

  const sendMut = useMutation({
    mutationFn: () => createComment(demandId, content.trim(), isInternal),
    onSuccess: () => {
      setContent("");
      qc.invalidateQueries({ queryKey: ["demand-comments", demandId] });
    },
    onError: (e) =>
      toast({
        title: "Erro ao enviar",
        description: e instanceof Error ? e.message : "Falha",
        variant: "destructive",
      }),
  });

  // Realtime
  useEffect(() => {
    const channel = supabase
      .channel(`demand-timeline-${demandId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "demand_comments", filter: `demand_id=eq.${demandId}` },
        () => qc.invalidateQueries({ queryKey: ["demand-comments", demandId] }),
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "demand_audit_logs", filter: `demand_id=eq.${demandId}` },
        () => qc.invalidateQueries({ queryKey: ["demand-audit-logs", demandId] }),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [demandId, qc]);

  // Profiles (comment authors + audit users + audit assigned_to values)
  const userIds = useMemo(() => {
    const s = new Set<string>();
    for (const c of commentsQ.data ?? []) if (c.user_id) s.add(c.user_id);
    for (const l of logsQ.data ?? []) {
      if (l.user_id) s.add(l.user_id);
      if (l.field_name === "assigned_to") {
        if (l.old_value) s.add(l.old_value);
        if (l.new_value) s.add(l.new_value);
      }
    }
    return Array.from(s);
  }, [commentsQ.data, logsQ.data]);

  const profilesQ = useQuery({
    queryKey: ["timeline-profiles", userIds.sort().join(",")],
    queryFn: () => getProfilesByIds(userIds),
    enabled: userIds.length > 0,
  });

  const displayName = (id: string | null | undefined) => {
    if (!id) return "Sistema";
    const p = profilesQ.data?.get(id);
    return p?.nome || p?.email || id.slice(0, 8);
  };

  const items: TimelineItem[] = useMemo(() => {
    const arr: TimelineItem[] = [];
    for (const c of commentsQ.data ?? []) arr.push({ kind: "comment", at: c.created_at, data: c });
    for (const l of logsQ.data ?? []) arr.push({ kind: "log", at: l.created_at, data: l });
    arr.sort((a, b) => (a.at < b.at ? 1 : -1));
    return arr;
  }, [commentsQ.data, logsQ.data]);

  const loading = commentsQ.isLoading || logsQ.isLoading;

  return (
    <div className="space-y-4">
      {/* Composer */}
      <div className="rounded-lg border border-border/60 bg-card p-3 space-y-2">
        <Textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Escreva um comentário… (suporta quebras de linha)"
          rows={3}
          className="resize-none text-sm"
        />
        <div className="flex items-center justify-between gap-2">
          <label className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer">
            <Switch checked={isInternal} onCheckedChange={setIsInternal} />
            <Lock className="size-3.5" />
            Nota interna (visível apenas para a equipe)
          </label>
          <Button
            size="sm"
            onClick={() => sendMut.mutate()}
            disabled={!content.trim() || sendMut.isPending}
            className="gap-1.5"
          >
            {sendMut.isPending ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : (
              <Send className="size-3.5" />
            )}
            Enviar
          </Button>
        </div>
      </div>

      {/* Timeline */}
      {loading && (
        <div className="space-y-2">
          <Skeleton className="h-14 w-full" />
          <Skeleton className="h-8 w-2/3" />
          <Skeleton className="h-14 w-full" />
        </div>
      )}

      {!loading && items.length === 0 && (
        <p className="text-sm text-muted-foreground italic text-center py-6">
          Nenhuma atividade registrada ainda.
        </p>
      )}

      <ul className="space-y-3">
        {items.map((item) => {
          if (item.kind === "comment") {
            const c = item.data;
            const isAi = c.is_ai === true;
            const p = c.user_id ? profilesQ.data?.get(c.user_id) : undefined;
            return (
              <li key={`c-${c.id}`} className="flex gap-2.5">
                <Avatar className="size-8 shrink-0">
                  {isAi ? (
                    <AvatarFallback className="text-xs bg-primary/15 text-primary">
                      IA
                    </AvatarFallback>
                  ) : (
                    <>
                      {p?.avatar_url && (
                        <AvatarImage src={p.avatar_url} alt={p.nome || p.email || ""} />
                      )}
                      <AvatarFallback className="text-xs">
                        {initialsFrom(p?.nome, p?.email, c.user_id ?? undefined)}
                      </AvatarFallback>
                    </>
                  )}
                </Avatar>
                <div
                  className={cn(
                    "flex-1 rounded-md border px-3 py-2",
                    isAi
                      ? "bg-primary/5 border-primary/30"
                      : c.is_internal
                        ? "bg-warning/5 border-warning/30"
                        : "bg-muted/30 border-border/60",
                  )}
                >
                  <div className="flex items-center gap-2 text-xs mb-1">
                    <span className="font-medium">
                      {isAi ? "Agente IA · Nível 1" : displayName(c.user_id)}
                    </span>
                    <span className="text-muted-foreground">·</span>
                    <span className="text-muted-foreground">{relative(c.created_at)}</span>
                    {isAi && (
                      <Badge
                        variant="outline"
                        className="ml-auto h-5 gap-1 text-[10px] bg-primary/10 text-primary border-primary/40"
                      >
                        Resposta automática
                      </Badge>
                    )}
                    {!isAi && c.is_internal && (
                      <Badge
                        variant="outline"
                        className="ml-auto h-5 gap-1 text-[10px] bg-warning/10 text-warning border-warning/40"
                      >
                        <Lock className="size-2.5" /> Nota Interna
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm whitespace-pre-wrap break-words">{c.content}</p>
                </div>
              </li>
            );
          }
          const l = item.data;
          return (
            <li key={`l-${l.id}`} className="flex items-start gap-2.5 pl-2">
              <div className="mt-1 text-muted-foreground shrink-0">
                <AuditIcon action={l.action} />
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                <span className="font-medium text-foreground">{displayName(l.user_id)}</span>{" "}
                {describeLog(l, displayName)} <span className="text-muted-foreground/70">· {relative(l.created_at)}</span>
              </p>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function AuditIcon({ action }: { action: string }) {
  if (action === "status_changed") return <ArrowRight className="size-3.5" />;
  if (action === "priority_changed") return <Flag className="size-3.5" />;
  if (action === "complexity_changed") return <Layers className="size-3.5" />;
  if (action === "assigned") return <UserPlus className="size-3.5" />;
  return <MessageSquare className="size-3.5" />;
}

function describeLog(l: DemandAuditLog, displayName: (id: string | null) => string): string {
  switch (l.action) {
    case "status_changed":
      return `alterou o status de "${statusLabel(l.old_value)}" para "${statusLabel(l.new_value)}"`;
    case "priority_changed":
      return `alterou a prioridade de "${priorityLabel(l.old_value)}" para "${priorityLabel(l.new_value)}"`;
    case "complexity_changed":
      return `alterou a complexidade de "${complexityLabel(l.old_value)}" para "${complexityLabel(l.new_value)}"`;
    case "assigned": {
      const from = l.old_value ? displayName(l.old_value) : "ninguém";
      const to = l.new_value ? displayName(l.new_value) : "ninguém";
      return `alterou o responsável de ${from} para ${to}`;
    }
    default:
      return `${l.action} ${l.field_name ?? ""}`.trim();
  }
}
