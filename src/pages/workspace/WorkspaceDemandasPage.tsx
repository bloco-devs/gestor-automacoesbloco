import { lazy, Suspense, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { List, LayoutGrid, Timer, Clock, GanttChart } from "lucide-react";
import { Loader2 } from "lucide-react";
import { WorkspaceShell } from "@/modules/workspace-unified";
import { cn } from "@/lib/utils";

const Solicitacoes = lazy(() => import("@/pages/Solicitacoes"));
// O "Quadros" e o modulo Atividades (quadros estilo Trello: colunas, drag & drop,
// etiquetas, checklists, anexos, capas, prazos e importacao do Trello), nao o
// Kanban simplificado de solicitacoes que estava aqui antes.
const Atividades = lazy(() => import("@/pages/Atividades"));
const SolicitacoesGantt = lazy(() => import("@/pages/SolicitacoesGantt"));

/**
 * /workspace/demandas — página única com abas.
 * Sprint e Timeline reutilizam a mesma fonte (Lista com ordenação diferente
 * e Gantt como visualização temporal). Nada duplicado.
 */
const VIEWS = [
  { id: "lista", label: "Lista", icon: List },
  { id: "board", label: "Quadros", icon: LayoutGrid },
  { id: "sprint", label: "Sprint", icon: Timer },
  { id: "timeline", label: "Timeline", icon: Clock },
  { id: "gantt", label: "Gantt", icon: GanttChart },
] as const;

type ViewId = (typeof VIEWS)[number]["id"];

export default function WorkspaceDemandasPage() {
  const [params, setParams] = useSearchParams();
  const raw = params.get("view") as ViewId | null;
  const view: ViewId = useMemo(
    () => (VIEWS.some((v) => v.id === raw) ? (raw as ViewId) : "lista"),
    [raw],
  );

  const setView = (id: ViewId) => {
    const next = new URLSearchParams(params);
    next.set("view", id);
    setParams(next, { replace: true });
  };

  return (
    <WorkspaceShell>
      <div className="flex h-full min-h-0 flex-col">
        <div className="surface-glass sticky top-0 z-10 flex items-center gap-1 border-b px-3 py-1.5">
          {VIEWS.map((v) => {
            const Icon = v.icon;
            const active = v.id === view;
            return (
              <button
                key={v.id}
                type="button"
                onClick={() => setView(v.id)}
                aria-pressed={active}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs transition",
                  active
                    ? "bg-muted font-medium text-foreground"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                <Icon className="size-3.5" aria-hidden />
                {v.label}
              </button>
            );
          })}
        </div>
        <div className="min-h-0 flex-1 overflow-auto">
          <Suspense
            fallback={
              <div className="flex h-full items-center justify-center">
                <Loader2 className="size-5 animate-spin text-muted-foreground" />
              </div>
            }
          >
            {view === "board" && <Atividades />}
            {view === "gantt" && <SolicitacoesGantt />}
            {view === "timeline" && <SolicitacoesGantt />}
            {(view === "lista" || view === "sprint") && <Solicitacoes />}
          </Suspense>
        </div>
      </div>
    </WorkspaceShell>
  );
}
