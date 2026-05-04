import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { KanbanSquare, LayoutDashboard, ListChecks, LogOut, Plus, Sparkles, ListTodo, Gauge } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/ThemeToggle";
import { cn } from "@/lib/utils";
import blocoLogo from "@/assets/bloco-logo.png";

const devNav = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/solicitacoes", label: "Solicitações", icon: ListChecks },
  { to: "/kanban", label: "Kanban", icon: KanbanSquare },
  { to: "/solucoes", label: "Soluções", icon: Sparkles },
];
const requesterNav = [
  { to: "/dashboard-solicitante", label: "Dashboard", icon: Gauge },
  { to: "/minhas-demandas", label: "Minhas Demandas", icon: ListTodo },
  { to: "/nova-demanda", label: "Nova Demanda", icon: Plus },
];

export default function AppLayout() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const nav = user?.role === "developer" ? devNav : requesterNav;

  return (
    <div className="min-h-screen flex">
      <aside className="hidden md:flex w-64 flex-col border-r border-sidebar-border bg-sidebar">
        <div className="px-5 py-6 flex items-center gap-3">
          <img
            src={blocoLogo}
            alt="Bloco Construções"
            className="size-10 rounded-lg object-cover"
          />
          <div>
            <div className="text-sm font-brand font-bold whitespace-nowrap">Gestor de Automações</div>
          </div>
        </div>
        <nav className="flex-1 px-3 py-2 space-y-1">
          {nav.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                cn(
                  "flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors",
                  isActive
                    ? "bg-sidebar-accent text-sidebar-accent-foreground border border-sidebar-border"
                    : "text-sidebar-foreground hover:bg-sidebar-accent/60",
                )
              }
            >
              <item.icon className="size-4" />
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="p-3 border-t border-sidebar-border">
          <div className="px-2 py-1.5 mb-2">
            <div className="text-sm font-medium truncate">{user?.nome}</div>
            <div className="text-xs text-muted-foreground truncate">
              {user?.role === "developer" ? "Desenvolvedor" : "Solicitante"}
            </div>
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              className="flex-1 justify-start"
              onClick={() => {
                signOut();
                navigate("/auth");
              }}
            >
              <LogOut className="size-4" />
              Sair
            </Button>
            <ThemeToggle />
          </div>
        </div>
      </aside>

      <main className="flex-1 min-w-0">
        <header className="md:hidden border-b border-border px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <img
              src={blocoLogo}
              alt="Bloco Construções"
              className="size-7 rounded-md object-cover"
            />
            <div>
              <div className="text-sm font-brand font-bold whitespace-nowrap">Gestor de Automações</div>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <ThemeToggle />
            <Button variant="ghost" size="sm" onClick={() => { signOut(); navigate("/auth"); }}>
              <LogOut className="size-4" />
            </Button>
          </div>
        </header>
        <nav className="md:hidden flex flex-wrap gap-1 overflow-hidden px-3 py-2 border-b border-border">
          {nav.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                cn(
                  "flex min-w-0 flex-1 items-center justify-center gap-2 px-3 py-1.5 rounded-md text-xs whitespace-nowrap",
                  isActive ? "bg-accent text-accent-foreground" : "text-muted-foreground hover:bg-muted",
                )
              }
            >
              <item.icon className="size-3.5" />
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="w-full min-w-0 max-w-7xl mx-auto p-4 md:p-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
