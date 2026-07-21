import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { ArticleStatus } from "../types";

const LABEL: Record<ArticleStatus, string> = {
  rascunho: "Rascunho",
  em_revisao: "Em revisão",
  publicado: "Publicado",
  arquivado: "Arquivado",
};

const TONE: Record<ArticleStatus, string> = {
  rascunho: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200",
  em_revisao: "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200",
  publicado: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200",
  arquivado: "bg-zinc-200 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300",
};

export function StatusPill({ status }: { status: string }) {
  const key = (LABEL[status as ArticleStatus] ? status : "rascunho") as ArticleStatus;
  return <Badge variant="secondary" className={cn("font-normal", TONE[key])}>{LABEL[key]}</Badge>;
}
