import { Users } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import type { UserProfileLite } from "@/modules/demands/types";
import type { UserWorkload } from "@/modules/demands/service";

function initials(name: string | null | undefined, email: string | null | undefined): string {
  const src = (name ?? email ?? "?").trim();
  const parts = src.split(/\s+/);
  return ((parts[0]?.[0] ?? "?") + (parts[1]?.[0] ?? "")).toUpperCase();
}

export function TeamWorkload({
  workloads,
  profiles,
}: {
  workloads: UserWorkload[];
  profiles: Map<string, UserProfileLite>;
}) {
  const max = Math.max(1, ...workloads.map((w) => w.active_count));
  return (
    <Card className="h-full">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <Users className="h-4 w-4" aria-hidden />
          Equipe · carga atual
        </CardTitle>
      </CardHeader>
      <CardContent>
        {workloads.length === 0 ? (
          <p className="text-sm text-muted-foreground">Sem dados de carga.</p>
        ) : (
          <ul className="space-y-3">
            {workloads.slice(0, 8).map((w) => {
              const p = profiles.get(w.user_id);
              const pct = Math.round((w.active_count / max) * 100);
              return (
                <li key={w.user_id} className="flex items-center gap-3">
                  <Avatar className="h-8 w-8">
                    {p?.avatar_url ? <AvatarImage src={p.avatar_url} alt="" /> : null}
                    <AvatarFallback>{initials(p?.nome ?? w.nome, p?.email ?? w.email)}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <span className="truncate text-sm">{p?.nome ?? w.nome ?? w.email ?? "—"}</span>
                      <span className="text-xs text-muted-foreground">{w.active_count} ativos</span>
                    </div>
                    <Progress value={pct} className="mt-1" aria-label={`Carga de ${p?.nome ?? "atendente"}`} />
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
