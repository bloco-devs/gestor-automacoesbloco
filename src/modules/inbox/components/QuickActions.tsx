import { memo } from "react";
import { Link } from "react-router-dom";
import { Plus, Sparkles, KanbanSquare, ListChecks, ListTodo } from "lucide-react";
import { Section } from "@/design-system";

const ACTIONS = [
  { to: "/nova-solicitacao", label: "Nova Solicitação", icon: Plus },
  { to: "/nova-solicitacao", label: "Abrir AI Workspace", icon: Sparkles },
  { to: "/solicitacoes/kanban", label: "Kanban", icon: KanbanSquare },
  { to: "/atividades", label: "Sprint atual", icon: ListChecks },
  { to: "/solicitacoes", label: "Backlog", icon: ListTodo },
];

/**
 * DS 3.0 — atalhos não precisam de um card com título dentro de uma coluna
 * que já é lateral. Seção + lista compacta.
 */
function QuickActions() {
  return (
    <Section title="Atalhos">
      <ul className="-mx-2 space-y-0.5" role="list">
        {ACTIONS.map((a) => {
          const Icon = a.icon;
          return (
            <li key={a.label}>
              <Link
                to={a.to}
                className="flex items-center gap-2.5 rounded-md px-2 py-1.5 text-[13px] leading-5 text-foreground/85 transition-colors duration-fast ease-standard hover:bg-muted/50 hover:text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
              >
                <Icon className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
                {a.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </Section>
  );
}

export default memo(QuickActions);
