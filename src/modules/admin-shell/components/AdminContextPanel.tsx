import { Link } from "react-router-dom";
import { ExternalLink, Info } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ADMIN_GROUPS } from "../navigation/registry";
import type { AdminNavItem } from "../types";

interface Props {
  active: AdminNavItem | null;
}

export function AdminContextPanel({ active }: Props) {
  const group = active ? ADMIN_GROUPS.find((g) => g.id === active.group) : null;
  return (
    <aside aria-label="Painel contextual" className="space-y-3 text-sm">
      <Card className="surface-1">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-sm">
            <Info className="h-4 w-4 text-primary" aria-hidden />
            {active ? active.label : "Administração"}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-xs text-muted-foreground">
          {active ? (
            <>
              <p>{active.details ?? active.description}</p>
              {group && (
                <div>
                  <span className="text-foreground">Categoria:</span> {group.label}
                </div>
              )}
              <div>
                <span className="text-foreground">Rota:</span>{" "}
                <code className="rounded bg-muted px-1 py-0.5 text-[11px]">{active.href}</code>
              </div>
              {active.status && (
                <div className="flex items-center gap-1.5">
                  <span className="text-foreground">Status:</span>
                  <Badge variant="secondary" className="text-[10px]">{active.status}</Badge>
                </div>
              )}
              {active.related && active.related.length > 0 && (
                <div>
                  <div className="mb-1 text-foreground">Relacionados</div>
                  <ul className="space-y-1">
                    {active.related.map((r) => (
                      <li key={r.href}>
                        <Link to={r.href} className="inline-flex items-center gap-1 text-primary hover:underline">
                          <ExternalLink className="h-3 w-3" aria-hidden />
                          {r.label}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </>
          ) : (
            <p>Selecione um destino no menu para ver detalhes, dependências e rotas relacionadas.</p>
          )}
          <div className="pt-2 text-[11px]">
            <Link to="/ajuda" className="text-primary hover:underline">Documentação</Link>
          </div>
        </CardContent>
      </Card>
    </aside>
  );
}
