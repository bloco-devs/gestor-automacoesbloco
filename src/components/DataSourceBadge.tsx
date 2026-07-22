import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export type DataSourceVariant = "hub" | "local" | "seed" | "match-ia" | "importado";

interface Props {
  /** Etiqueta livre (legado). Se `variant` não for informado, é exibida como fonte. */
  source?: string;
  /** Fonte semântica; controla texto e cor. */
  variant?: DataSourceVariant;
  updatedAt?: string | Date;
  className?: string;
}

const VARIANT_LABEL: Record<DataSourceVariant, string> = {
  hub: "HUB Bloco ID",
  local: "Local",
  seed: "Semente (offline)",
  "match-ia": "Sugestão IA",
  importado: "Importado",
};

const VARIANT_CLASSES: Record<DataSourceVariant, string> = {
  hub: "border-primary/40 text-primary",
  local: "border-border text-foreground/80",
  seed: "border-amber-500/40 text-amber-700 dark:text-amber-400",
  "match-ia": "border-violet-500/40 text-violet-700 dark:text-violet-400",
  importado: "border-blue-500/40 text-blue-700 dark:text-blue-400",
};

function relativeTime(d: Date): string {
  const diff = Date.now() - d.getTime();
  const min = Math.floor(diff / 60000);
  if (min < 1) return "agora";
  if (min < 60) return `há ${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `há ${h} h`;
  const days = Math.floor(h / 24);
  if (days < 30) return `há ${days} d`;
  const months = Math.floor(days / 30);
  if (months < 12) return `há ${months} mês${months === 1 ? "" : "es"}`;
  const years = Math.floor(months / 12);
  return `há ${years} ano${years === 1 ? "" : "s"}`;
}

/**
 * Badge único para indicar a origem de um dado no Ecossistema:
 * HUB / Local / Semente / Sugestão IA / Importado.
 * Compatível com uso legado (`source` livre) quando `variant` não é passado.
 */
export function DataSourceBadge({ source, variant, updatedAt, className }: Props) {
  const date = updatedAt ? (updatedAt instanceof Date ? updatedAt : new Date(updatedAt)) : null;
  const rel = date && !Number.isNaN(date.getTime()) ? relativeTime(date) : null;
  const label = variant ? VARIANT_LABEL[variant] : source ?? "";
  const colorCls = variant ? VARIANT_CLASSES[variant] : "";
  return (
    <Badge
      variant="outline"
      className={cn("text-[10px] font-normal py-0 px-1.5 h-5 gap-1", colorCls, className)}
    >
      <span className="text-muted-foreground">Fonte:</span> {label}
      {rel && <span className="text-muted-foreground"> · atualizado {rel}</span>}
    </Badge>
  );
}

export default DataSourceBadge;
