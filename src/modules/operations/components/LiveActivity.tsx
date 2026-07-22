import { Link } from "react-router-dom";
import { Activity } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { ActivityItem } from "../types";
import type { UserProfileLite } from "@/modules/demands/types";

function ago(iso: string): string {
  try {
    return formatDistanceToNow(new Date(iso), { addSuffix: true, locale: ptBR });
  } catch {
    return "—";
  }
}

export function LiveActivity({
  items,
  profiles,
}: {
  items: ActivityItem[];
  profiles: Map<string, UserProfileLite>;
}) {
  return (
    <Card className="h-full">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <Activity className="h-4 w-4" aria-hidden />
          Atividade recente
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <ScrollArea className="h-[360px]">
          <ol className="divide-y">
            {items.length === 0 ? (
              <li className="p-6 text-center text-sm text-muted-foreground">Sem eventos recentes.</li>
            ) : null}
            {items.map((it) => {
              const actor = it.actorId ? profiles.get(it.actorId) : null;
              return (
                <li key={it.id} className="p-3 text-sm">
                  <Link to={it.href} className="hover:underline">
                    <span className="font-medium">{actor?.nome ?? actor?.email ?? "Sistema"}</span>{" "}
                    <span className="text-muted-foreground">{it.summary}</span>{" "}
                    <span className="text-foreground/80">"{it.title}"</span>
                  </Link>
                  <div className="text-xs text-muted-foreground">{ago(it.createdAt)}</div>
                </li>
              );
            })}
          </ol>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
