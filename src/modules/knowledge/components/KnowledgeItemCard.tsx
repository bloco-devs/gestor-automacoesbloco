import { memo } from "react";
import { Link } from "react-router-dom";
import { BookOpen, FileText, HelpCircle, LinkIcon, ListChecks, MessagesSquare, PlayCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import type { KnowledgeItem } from "../types";

const ICON = {
  artigo: BookOpen,
  faq: HelpCircle,
  procedimento: ListChecks,
  video: PlayCircle,
  documento: FileText,
  link: LinkIcon,
  solicitacao: MessagesSquare,
} as const;

interface Props {
  item: KnowledgeItem;
  onOpen?: (item: KnowledgeItem) => void;
}

export const KnowledgeItemCard = memo(function KnowledgeItemCard({ item, onOpen }: Props) {
  const Icon = ICON[item.kind] ?? BookOpen;
  const isExternal = Boolean(item.urlExterna);
  const inner = (
    <div className="flex gap-3">
      <div className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
        <Icon className="size-4" aria-hidden />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <div className="truncate text-sm font-medium text-foreground">{item.titulo}</div>
          <span
            aria-label={`Relevância ${item.relevancia}%`}
            className={cn(
              "shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-medium",
              item.relevancia >= 80
                ? "bg-emerald-500/15 text-emerald-600"
                : item.relevancia >= 60
                  ? "bg-amber-500/15 text-amber-600"
                  : "bg-muted text-muted-foreground",
            )}
          >
            {item.relevancia}%
          </span>
        </div>
        {item.resumo && (
          <div className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">{item.resumo}</div>
        )}
        <div className="mt-1 flex items-center gap-2 text-[11px] text-muted-foreground">
          {item.categoria && <span>{item.categoria}</span>}
          {item.atualizadoEm && (
            <span aria-label="Última atualização">
              · Atualizado em {new Date(item.atualizadoEm).toLocaleDateString("pt-BR")}
            </span>
          )}
        </div>
      </div>
    </div>
  );

  const className = "block rounded-xl border border-transparent bg-background/60 p-3 transition hover:border-border hover:bg-background focus:outline-none focus-visible:ring-2 focus-visible:ring-ring";

  if (isExternal) {
    return (
      <a
        href={item.urlExterna!}
        target="_blank"
        rel="noopener noreferrer"
        className={className}
        onClick={() => onOpen?.(item)}
      >
        {inner}
      </a>
    );
  }
  return (
    <Link to={item.href} className={className} onClick={() => onOpen?.(item)}>
      {inner}
    </Link>
  );
});
