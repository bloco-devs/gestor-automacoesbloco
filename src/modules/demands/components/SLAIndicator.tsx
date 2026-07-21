import { useEffect, useState } from "react";
import { CheckCircle2, Clock, Flag, PauseCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import type { DemandSlaStatus, DemandStatus } from "../types";

interface Props {
  slaDueAt: string | null;
  slaStatus: DemandSlaStatus;
  demandStatus: DemandStatus;
  createdAt: string;
  size?: "sm" | "md";
  className?: string;
}

function fmt(ms: number) {
  const total = Math.abs(Math.floor(ms / 1000));
  const d = Math.floor(total / 86400);
  const h = Math.floor((total % 86400) / 3600);
  const m = Math.floor((total % 3600) / 60);
  if (d > 0) return `${d}d ${h}h`;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

/**
 * Retorna { kind, label } derivado do prazo.
 * kind ∈ ok | warning | overdue | done | done_late | paused | none
 */
export function computeSlaView(
  slaDueAt: string | null,
  slaStatus: DemandSlaStatus,
  demandStatus: DemandStatus,
  createdAt: string,
  now: number,
) {
  if (!slaDueAt) {
    return { kind: "none" as const, label: "Sem SLA definido", ms: 0 };
  }
  const due = new Date(slaDueAt).getTime();
  const created = new Date(createdAt).getTime();
  const remaining = due - now;
  const totalWindow = Math.max(due - created, 1);

  if (demandStatus === "concluido" || slaStatus === "cumprido") {
    const late = now > due;
    return {
      kind: late ? ("done_late" as const) : ("done" as const),
      label: late ? `Concluído (+${fmt(now - due)} atrasado)` : "Concluído no prazo",
      ms: remaining,
    };
  }

  if (slaStatus === "pausado") {
    return { kind: "paused" as const, label: "SLA pausado", ms: remaining };
  }

  if (remaining <= 0) {
    return { kind: "overdue" as const, label: `Atrasado +${fmt(-remaining)}`, ms: remaining };
  }

  const pctRemaining = remaining / totalWindow;
  if (pctRemaining <= 0.25) {
    return { kind: "warning" as const, label: `Resta ${fmt(remaining)}`, ms: remaining };
  }
  return { kind: "ok" as const, label: `Resta ${fmt(remaining)}`, ms: remaining };
}

const STYLES: Record<string, { cls: string; Icon: typeof Clock }> = {
  ok: { cls: "bg-success/10 text-success border-success/30", Icon: Clock },
  warning: { cls: "bg-warning/15 text-warning border-warning/40", Icon: Clock },
  overdue: { cls: "bg-destructive/15 text-destructive border-destructive/40", Icon: Flag },
  done: { cls: "bg-success/10 text-success border-success/30", Icon: CheckCircle2 },
  done_late: { cls: "bg-muted text-muted-foreground border-border", Icon: CheckCircle2 },
  paused: { cls: "bg-muted text-muted-foreground border-border", Icon: PauseCircle },
  none: { cls: "bg-muted/40 text-muted-foreground border-border/60", Icon: Clock },
};

export function SLAIndicator({
  slaDueAt,
  slaStatus,
  demandStatus,
  createdAt,
  size = "sm",
  className,
}: Props) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(id);
  }, []);

  const view = computeSlaView(slaDueAt, slaStatus, demandStatus, createdAt, now);
  const { cls, Icon } = STYLES[view.kind];

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-md border font-medium tabular-nums",
        size === "sm" ? "text-[10px] px-1.5 py-0.5" : "text-xs px-2 py-1",
        cls,
        className,
      )}
      title={slaDueAt ? `Prazo: ${new Date(slaDueAt).toLocaleString("pt-BR")}` : "SLA não definido"}
    >
      <Icon className={size === "sm" ? "size-3" : "size-3.5"} />
      {view.label}
    </span>
  );
}
