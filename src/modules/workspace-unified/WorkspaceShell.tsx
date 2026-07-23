import { useState, type ReactNode } from "react";
import { NavLink } from "react-router-dom";
import { Home, ListTodo, Wrench, Terminal, Sparkles, PanelRightClose, PanelRightOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { WorkspaceCopilotPanel } from "./WorkspaceCopilotPanel";

const TABS = [
  { to: "/workspace", label: "Hoje", icon: Home, end: true },
  { to: "/workspace/demandas", label: "Demandas", icon: ListTodo },
  { to: "/workspace/builder", label: "Builder", icon: Wrench },
  { to: "/workspace/devtools", label: "DevTools", icon: Terminal },
];

const LS_COPILOT = "workspace-unified:copilot:v1";

function readBool(fallback: boolean): boolean {
  if (typeof window === "undefined") return fallback;
  const v = window.localStorage.getItem(LS_COPILOT);
  return v == null ? fallback : v === "1";
}

/**
 * Shell único do Workspace Unificado (FEATURE 026.3).
 * Header + tabs de topo + slot central + painel Copilot lateral togglável.
 */
export function WorkspaceShell({
  children,
  hideCopilot = false,
}: {
  children: ReactNode;
  hideCopilot?: boolean;
}) {
  const [copilotOpen, setCopilotOpen] = useState<boolean>(() => readBool(true));

  const toggle = () => {
    setCopilotOpen((v) => {
      const next = !v;
      if (typeof window !== "undefined")
        window.localStorage.setItem(LS_COPILOT, next ? "1" : "0");
      return next;
    });
  };

  return (
    <div className="flex h-[calc(100vh-var(--app-header-h,3.5rem))] w-full flex-col">
      <header className="flex items-center gap-2 border-b border-border bg-card/40 px-3 py-1.5">
        <nav aria-label="Workspace" className="flex items-center gap-1">
          {TABS.map((t) => {
            const Icon = t.icon;
            return (
              <NavLink
                key={t.to}
                to={t.to}
                end={t.end}
                className={({ isActive }) =>
                  cn(
                    "flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm transition",
                    isActive
                      ? "bg-muted font-medium text-foreground"
                      : "text-muted-foreground hover:text-foreground",
                  )
                }
              >
                <Icon className="size-4" aria-hidden />
                {t.label}
              </NavLink>
            );
          })}
        </nav>
        <div className="ml-auto flex items-center gap-1">
          {!hideCopilot && (
            <Button
              variant="ghost"
              size="sm"
              onClick={toggle}
              aria-label={copilotOpen ? "Ocultar Copilot" : "Mostrar Copilot"}
              className="gap-1.5"
            >
              <Sparkles className="size-4" aria-hidden />
              <span className="hidden md:inline">Copilot</span>
              {copilotOpen ? (
                <PanelRightClose className="size-4" />
              ) : (
                <PanelRightOpen className="size-4" />
              )}
            </Button>
          )}
        </div>
      </header>

      <div className="grid min-h-0 flex-1 grid-cols-1 lg:grid-cols-[1fr_auto]">
        <main className="min-h-0 min-w-0 overflow-hidden">{children}</main>
        {!hideCopilot && copilotOpen && (
          <div className="hidden min-h-0 lg:block lg:w-[340px] xl:w-[380px]">
            <WorkspaceCopilotPanel />
          </div>
        )}
      </div>
    </div>
  );
}
