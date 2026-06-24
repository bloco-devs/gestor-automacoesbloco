import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface Props {
  source: string;
  updatedAt?: string | Date;
  className?: string;
}

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

export function DataSourceBadge({ source, updatedAt, className }: Props) {
  const date = updatedAt ? (updatedAt instanceof Date ? updatedAt : new Date(updatedAt)) : null;
  const rel = date && !Number.isNaN(date.getTime()) ? relativeTime(date) : null;
  return (
    <Badge variant="outline" className={cn("text-[10px] font-normal py-0 px-1.5 h-5 gap-1", className)}>
      <span className="text-muted-foreground">Fonte:</span> {source}
      {rel && <span className="text-muted-foreground"> · atualizado {rel}</span>}
    </Badge>
  );
}

export default DataSourceBadge;
