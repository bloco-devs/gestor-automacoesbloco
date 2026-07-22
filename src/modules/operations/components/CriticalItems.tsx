import { Link } from "react-router-dom";
import { AlertTriangle, ChevronRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import type { CriticalItem } from "../types";
import type { UserProfileLite } from "@/modules/demands/types";

const PRIO_TONE: Record<CriticalItem["priority"], string> = {
  baixa: "bg-muted text-foreground",
  media: "bg-info/15 text-info",
  alta: "bg-warning/15 text-warning",
  critica: "bg-destructive/15 text-destructive",
};

export function CriticalItems({
  items,
  profiles,
}: {
  items: CriticalItem[];
  profiles: Map<string, UserProfileLite>;
}) {
  return (
    <Card className="h-full">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <AlertTriangle className="h-4 w-4 text-warning" aria-hidden />
          Fila inteligente
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <ScrollArea className="h-[360px]">
          <ul className="divide-y">
            {items.length === 0 ? (
              <li className="p-6 text-center text-sm text-muted-foreground">
                Nenhuma solicitação crítica agora.
              </li>
            ) : null}
            {items.map((it) => {
              const owner = it.assigned_to ? profiles.get(it.assigned_to) : null;
              return (
                <li key={it.id}>
                  <Link
                    to={it.href}
                    className="flex items-center gap-3 p-3 hover:bg-muted/50 focus-visible:bg-muted/60 focus-visible:outline-none"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium truncate">{it.title}</span>
                        <Badge className={cn("text-xs", PRIO_TONE[it.priority])}>{it.priority}</Badge>
                        {it.sla_status === "estourado" ? (
                          <Badge variant="destructive" className="text-xs">SLA vencido</Badge>
                        ) : it.sla_status === "atencao" ? (
                          <Badge className="bg-warning/15 text-warning text-xs">SLA em risco</Badge>
                        ) : null}
                      </div>
                      <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground truncate">
                        <span>{owner?.nome ?? owner?.email ?? "Sem responsável"}</span>
                        <span>·</span>
                        <span className="truncate">{it.reasons.join(" · ") || "—"}</span>
                      </div>
                    </div>
                    <span className="text-xs font-mono text-muted-foreground">{it.score}</span>
                    <ChevronRight className="h-4 w-4 text-muted-foreground" aria-hidden />
                  </Link>
                </li>
              );
            })}
          </ul>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
