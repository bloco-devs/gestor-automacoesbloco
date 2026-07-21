import { memo } from "react";
import { Link } from "react-router-dom";
import { Plus, Sparkles, KanbanSquare, ListChecks, ListTodo } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const ACTIONS = [
  { to: "/nova-solicitacao", label: "Nova Solicitação", icon: Plus },
  { to: "/nova-solicitacao", label: "Abrir AI Workspace", icon: Sparkles },
  { to: "/solicitacoes/kanban", label: "Kanban", icon: KanbanSquare },
  { to: "/atividades", label: "Sprint atual", icon: ListChecks },
  { to: "/solicitacoes", label: "Backlog", icon: ListTodo },
];

function QuickActions() {
  return (
    <Card>
      <CardHeader className="pb-2"><CardTitle className="text-base">Atalhos</CardTitle></CardHeader>
      <CardContent>
        <ul className="grid grid-cols-1 gap-1.5" role="list">
          {ACTIONS.map((a) => {
            const Icon = a.icon;
            return (
              <li key={a.label}>
                <Link
                  to={a.to}
                  className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-accent focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <Icon className="h-4 w-4 text-muted-foreground" />
                  {a.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </CardContent>
    </Card>
  );
}

export default memo(QuickActions);
