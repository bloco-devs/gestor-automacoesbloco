import { memo, type ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export type StatTone = "neutral" | "success" | "warning" | "danger" | "info";

/**
 * A cor só entra quando o número *significa* algo (meta batida, risco, erro).
 * KPI neutro é preto/branco — cor não é decoração.
 */
const TONE: Record<StatTone, string> = {
  neutral: "text-foreground",
  success: "text-success",
  warning: "text-warning",
  danger: "text-destructive",
  info: "text-info",
};

export interface StatCardProps {
  label: string;
  value: ReactNode;
  icon?: LucideIcon;
  hint?: ReactNode;
  tone?: StatTone;
  className?: string;
}

/**
 * DS 3.0 — StatCard
 *
 * Deixou de ser um "widget" (caixa + borda + sombra + ícone colorido dentro de
 * um quadradinho) e virou um bloco tipográfico: label discreto, número grande,
 * auxiliar pequeno. A separação entre KPIs passa a ser feita por espaço e
 * alinhamento — que é como Linear, Vercel e Stripe apresentam métricas.
 *
 * O nome e a API continuam iguais (label/value/icon/hint/tone/className), então
 * as ~48 telas que já usam o componente herdam o visual novo sem nenhuma mudança.
 */
export const StatCard = memo(function StatCard({
  label,
  value,
  icon: Icon,
  hint,
  tone = "neutral",
  className,
}: StatCardProps) {
  return (
    <div className={cn("flex min-w-0 flex-col gap-1.5", className)}>
      <div className="flex items-center gap-1.5 text-muted-foreground">
        {Icon ? <Icon className="h-3.5 w-3.5 shrink-0 opacity-70" aria-hidden /> : null}
        <span className="ds-label truncate">{label}</span>
      </div>
      <div className={cn("ds-metric", TONE[tone])}>{value}</div>
      {hint ? <div className="ds-caption text-muted-foreground">{hint}</div> : null}
    </div>
  );
});
