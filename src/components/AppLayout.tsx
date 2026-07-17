import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { ChevronDown, Compass, GanttChartSquare, GitMerge, HelpCircle, KanbanSquare, LayoutDashboard, List, ListChecks, ListTodo, LogOut, Menu, Network, Plus, Repeat, Settings, Sparkles, Gauge, PanelLeftClose, PanelLeftOpen, Activity, X } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import {
  DndContext,
  DragEndEvent,
  PointerSensor,
  KeyboardSensor,
  closestCenter,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

import { NotificacoesBell } from "@/components/NotificacoesBell";
import { ThemeToggle } from "@/components/ThemeToggle";
import { cn } from "@/lib/utils";
import { countPendingDevEvaluations } from "@/lib/supabaseData";
import { supabase } from "@/integrations/supabase/client";
import { OnboardingTour, useOnboardingTour } from "@/components/OnboardingTour";
import blocoLogo from "@/assets/bloco-logo.png";

type NavItem = {
  to?: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  /** Quando definido, o item é um pai colapsável e não navega ao clique. */
  children?: NavItem[];
  /** Routes que mantêm o pai marcado como ativo (para realçar e auto-abrir). */
  matchPrefix?: string;
};

const devNav: NavItem[] = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  {
    label: "Solicitações",
    icon: ListChecks,
    matchPrefix: "/solicitacoes",
    children: [
      { to: "/solicitacoes", label: "Lista", icon: List },
      { to: "/solicitacoes/kanban", label: "Kanban", icon: KanbanSquare },
      { to: "/solicitacoes/gantt", label: "Gantt", icon: GanttChartSquare },
    ],
  },
  {
    label: "Soluções",
    icon: Sparkles,
    matchPrefix: "/solucoes",
    children: [
      { to: "/solucoes", label: "Lista", icon: List },
      { to: "/solucoes/kanban", label: "Kanban", icon: KanbanSquare },
      { to: "/solucoes/gantt", label: "Gantt", icon: GanttChartSquare },
    ],
  },
  { to: "/diagrama", label: "Diagrama", icon: Network },
  { to: "/consolidacao", label: "Consolidação", icon: GitMerge },
  { to: "/atividades", label: "Atividades", icon: KanbanSquare },
  { to: "/observabilidade-ia", label: "Observabilidade IA", icon: Activity },
  { to: "/ajuda", label: "Ajuda", icon: HelpCircle },
  { to: "/configuracoes", label: "Configurações", icon: Settings },
];
const requesterNav: NavItem[] = [
  { to: "/dashboard-solicitante", label: "Dashboard", icon: Gauge },
  { to: "/minhas-solicitacoes", label: "Minhas Solicitações", icon: ListTodo },
  { to: "/nova-solicitacao", label: "Nova Solicitação", icon: Plus },
  {
    label: "Solicitações",
    icon: ListChecks,
    matchPrefix: "/solicitacoes",
    children: [
      { to: "/solicitacoes", label: "Lista", icon: List },
      { to: "/solicitacoes/kanban", label: "Kanban", icon: KanbanSquare },
      { to: "/solicitacoes/gantt", label: "Gantt", icon: GanttChartSquare },
    ],
  },
  { to: "/ajuda", label: "Ajuda", icon: HelpCircle },
];

// Builder: pode cadastrar soluções nas próprias solicitações; precisa ver
// Soluções e Diagrama além do menu base do solicitante.
const builderNav: NavItem[] = [
  { to: "/dashboard-solicitante", label: "Dashboard", icon: Gauge },
  { to: "/minhas-solicitacoes", label: "Minhas Solicitações", icon: ListTodo },
  { to: "/nova-solicitacao", label: "Nova Solicitação", icon: Plus },
  {
    label: "Solicitações",
    icon: ListChecks,
    matchPrefix: "/solicitacoes",
    children: [
      { to: "/solicitacoes", label: "Lista", icon: List },
      { to: "/solicitacoes/kanban", label: "Kanban", icon: KanbanSquare },
      { to: "/solicitacoes/gantt", label: "Gantt", icon: GanttChartSquare },
    ],
  },
  {
    label: "Soluções",
    icon: Sparkles,
    matchPrefix: "/solucoes",
    children: [
      { to: "/solucoes", label: "Lista", icon: List },
      { to: "/solucoes/kanban", label: "Kanban", icon: KanbanSquare },
      { to: "/solucoes/gantt", label: "Gantt", icon: GanttChartSquare },
    ],
  },
  { to: "/diagrama", label: "Diagrama", icon: Network },
  { to: "/ajuda", label: "Ajuda", icon: HelpCircle },
];

const SIDEBAR_MIN = 160;
const SIDEBAR_MAX = 480;
const SIDEBAR_DEFAULT = 256;
const SIDEBAR_STORAGE_KEY = "app:sidebarWidth";

function dataTourFor(item: NavItem): string | null {
  if (item.to === "/dashboard" || item.to === "/dashboard-solicitante") return "nav-dashboard";
  if (item.matchPrefix === "/solicitacoes" || item.to === "/minhas-solicitacoes") return "nav-solicitacoes";
  if (item.matchPrefix === "/solucoes") return "nav-solucoes";
  if (item.to === "/ajuda") return "nav-ajuda";
  return null;
}

export default function AppLayout() {
  const { user, signOut, isDual } = useAuth();
  const navigate = useNavigate();
  const { start: startTour } = useOnboardingTour();
  // Administrador sempre vê a navegação completa de dev — mesmo que tenha
  // trocado viewAs para requester/builder — para não ficar sem acesso a
  // Configurações nem ao seletor de perfil.
  const isDeveloperEffective = user?.role === "developer" || !!user?.isAdministrador;
  const isBuilderRole = user?.role === "builder";
  const nav = isDeveloperEffective ? devNav : isBuilderRole ? builderNav : requesterNav;
  const roleLabel = user?.isAdministrador
    ? "Administrador"
    : user?.role === "developer"
      ? "Desenvolvedor"
      : user?.role === "builder"
        ? "Builder"
        : "Solicitante";


  const [sidebarWidth, setSidebarWidth] = useState<number>(() => {
    if (typeof window === "undefined") return SIDEBAR_DEFAULT;
    const stored = Number(window.localStorage.getItem(SIDEBAR_STORAGE_KEY));
    return Number.isFinite(stored) && stored >= SIDEBAR_MIN && stored <= SIDEBAR_MAX
      ? stored
      : SIDEBAR_DEFAULT;
  });
  const [sidebarHidden, setSidebarHidden] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return window.localStorage.getItem("app:sidebarHidden") === "1";
  });
  const isMobile = useIsMobile();
  const [mobileOpen, setMobileOpen] = useState(false);
  const { pathname } = useLocation();
  // Fecha o drawer ao navegar (somente mobile)
  useEffect(() => {
    if (isMobile) setMobileOpen(false);
  }, [pathname, isMobile]);
  useEffect(() => {
    window.localStorage.setItem("app:sidebarHidden", sidebarHidden ? "1" : "0");
  }, [sidebarHidden]);
  const draggingRef = useRef(false);
  const isDeveloper = isDeveloperEffective;
  const [pendingEvalCount, setPendingEvalCount] = useState<number>(0);

  const navOrderKey = `app:sidebarNavOrder:${user?.role ?? "anon"}`;
  const [navOrder, setNavOrder] = useState<string[]>(() => {
    if (typeof window === "undefined") return nav.map((n) => n.label);
    try {
      const raw = window.localStorage.getItem(navOrderKey);
      const stored = raw ? (JSON.parse(raw) as string[]) : [];
      const valid = stored.filter((l) => nav.some((n) => n.label === l));
      const missing = nav.map((n) => n.label).filter((l) => !valid.includes(l));
      return [...valid, ...missing];
    } catch {
      return nav.map((n) => n.label);
    }
  });
  useEffect(() => {
    const labels = nav.map((n) => n.label);
    setNavOrder((prev) => {
      const valid = prev.filter((l) => labels.includes(l));
      const missing = labels.filter((l) => !valid.includes(l));
      return [...valid, ...missing];
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.role]);
  useEffect(() => {
    window.localStorage.setItem(navOrderKey, JSON.stringify(navOrder));
  }, [navOrder, navOrderKey]);

  const orderedNav = useMemo(() => {
    const byLabel = new Map(nav.map((n) => [n.label, n]));
    return navOrder.map((l) => byLabel.get(l)).filter(Boolean) as NavItem[];
  }, [nav, navOrder]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    setNavOrder((items) => {
      const oldIndex = items.indexOf(String(active.id));
      const newIndex = items.indexOf(String(over.id));
      if (oldIndex < 0 || newIndex < 0) return items;
      return arrayMove(items, oldIndex, newIndex);
    });
  };

  useEffect(() => {
    window.localStorage.setItem(SIDEBAR_STORAGE_KEY, String(sidebarWidth));
  }, [sidebarWidth]);

  useEffect(() => {
    if (!isDeveloper) {
      setPendingEvalCount(0);
      return;
    }
    let cancelled = false;
    const refresh = async () => {
      const n = await countPendingDevEvaluations();
      if (!cancelled) setPendingEvalCount(n);
    };
    refresh();
    const channel = supabase
      .channel("pending-dev-evals")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "solicitacoes" },
        () => refresh(),
      )
      .subscribe();
    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [isDeveloper]);

  const startDrag = useCallback((e: React.PointerEvent) => {
    e.preventDefault();
    draggingRef.current = true;
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";

    const onMove = (ev: PointerEvent) => {
      if (!draggingRef.current) return;
      const next = Math.min(SIDEBAR_MAX, Math.max(SIDEBAR_MIN, ev.clientX));
      setSidebarWidth(next);
    };
    const onUp = () => {
      draggingRef.current = false;
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
  }, []);

  const onResizerKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowLeft") {
      e.preventDefault();
      setSidebarWidth((w) => Math.max(SIDEBAR_MIN, w - 16));
    } else if (e.key === "ArrowRight") {
      e.preventDefault();
      setSidebarWidth((w) => Math.min(SIDEBAR_MAX, w + 16));
    }
  };

  return (
    <div className="min-h-screen flex">
      {isMobile && mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/40 md:hidden"
          onClick={() => setMobileOpen(false)}
          aria-hidden="true"
        />
      )}
      {(isMobile ? mobileOpen : !sidebarHidden) && (
      <aside
        className={cn(
          "flex-col border-sidebar-border bg-sidebar shrink-0",
          isMobile
            ? "fixed inset-y-0 left-0 z-50 w-72 flex border-r shadow-xl"
            : "hidden md:flex relative border-r",
        )}
        style={isMobile ? undefined : { width: sidebarWidth }}
      >
        <div className="px-5 py-6 flex items-center gap-3 min-w-0">
          <img
            src={blocoLogo}
            alt="Bloco Construções"
            className="size-10 rounded-lg object-cover shrink-0"
          />
          <div className="min-w-0">
            <div className="text-sm font-brand font-bold truncate">Gestor de Automações</div>
          </div>
        </div>
        <nav className="flex-1 px-3 py-2 space-y-1 overflow-y-auto">
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={navOrder} strategy={verticalListSortingStrategy}>
              {orderedNav.map((item) => (
                <SortableSidebarNavItem
                  key={item.label}
                  item={item}
                  isDeveloper={isDeveloper}
                  pendingEvalCount={pendingEvalCount}
                />
              ))}
            </SortableContext>
          </DndContext>
        </nav>
        <div className="p-3 border-t border-sidebar-border">
          <button
            type="button"
            onClick={() => navigate("/perfil")}
            className="w-full flex items-center gap-2 px-2 py-1.5 mb-2 min-w-0 rounded-md hover:bg-sidebar-accent/60 transition-colors text-left"
            title="Editar meu perfil"
          >
            <span className="relative shrink-0">
              {user?.avatarUrl ? (
                <img
                  src={user.avatarUrl}
                  alt={user.nome}
                  className="h-8 w-8 rounded-full object-cover ring-1 ring-white"
                />
              ) : (
                <span className="h-8 w-8 rounded-full bg-slate-200 text-slate-800 flex items-center justify-center text-xs font-semibold">
                  {(user?.nome || "?")
                    .split(/\s+/)
                    .filter(Boolean)
                    .slice(0, 2)
                    .map((p) => p[0]?.toUpperCase())
                    .join("")}
                </span>
              )}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-medium truncate">{user?.nome}</span>
              <span className="block text-xs text-muted-foreground truncate">
                {roleLabel}
              </span>
            </span>
          </button>
          <div className="flex items-center justify-between gap-1 rounded-lg bg-sidebar-accent/40 px-1 py-1">
            <span data-tour="nav-notificacoes" className="inline-flex">
              <NotificacoesBell />
            </span>
            <Button
              variant="ghost"
              size="icon"
              data-tour="nav-tour"
              onClick={startTour}
              title="Refazer tour"
              aria-label="Refazer tour"
            >
              <Compass className="size-4" />
            </Button>
            <ThemeToggle />
            {isDual && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => navigate("/escolher-perfil")}
                title="Trocar perfil"
                aria-label="Trocar perfil"
              >
                <Repeat className="size-4" />
              </Button>
            )}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => {
                signOut();
                navigate("/auth");
              }}
              title="Sair"
              aria-label="Sair"
            >
              <LogOut className="size-4" />
            </Button>
          </div>
        </div>

        <div
          role="separator"
          aria-orientation="vertical"
          aria-label="Redimensionar barra lateral"
          tabIndex={0}
          onPointerDown={startDrag}
          onKeyDown={onResizerKeyDown}
          onDoubleClick={() => setSidebarWidth(SIDEBAR_DEFAULT)}
          className="hidden md:block absolute top-0 right-0 h-full w-1.5 -mr-0.5 cursor-col-resize bg-transparent hover:bg-accent/40 active:bg-accent/60 transition-colors focus-visible:outline-none focus-visible:bg-accent/60"
          title="Arraste para redimensionar (duplo clique para resetar)"
        />

        <button
          type="button"
          onClick={() => (isMobile ? setMobileOpen(false) : setSidebarHidden(true))}
          title={isMobile ? "Fechar menu" : "Esconder barra lateral"}
          aria-label={isMobile ? "Fechar menu" : "Esconder barra lateral"}
          className={cn(
            "absolute z-10 items-center justify-center rounded text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors flex",
            isMobile ? "top-3 right-3 size-8" : "top-2 right-1 size-5 text-muted-foreground/40",
          )}
        >
          {isMobile ? <X className="size-4" /> : <PanelLeftClose className="size-3.5" />}
        </button>
      </aside>
      )}

      <main className="flex-1 min-w-0 relative">
        {sidebarHidden && (
          <button
            type="button"
            onClick={() => setSidebarHidden(false)}
            title="Mostrar barra lateral"
            aria-label="Mostrar barra lateral"
            className="hidden md:flex fixed top-2 left-2 z-40 items-center justify-center size-7 rounded-md text-muted-foreground/50 hover:text-foreground hover:bg-muted/60 transition-colors"
          >
            <PanelLeftOpen className="size-3.5" />
          </button>
        )}
        <header className="md:hidden border-b border-border px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2 min-w-0">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setMobileOpen(true)}
              aria-label="Abrir menu"
              title="Abrir menu"
              className="shrink-0"
            >
              <Menu className="size-5" />
            </Button>
            <img
              src={blocoLogo}
              alt="Bloco Construções"
              className="size-7 rounded-md object-cover shrink-0"
            />
            <div className="min-w-0">
              <div className="text-sm font-brand font-bold truncate">Gestor de Automações</div>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <span data-tour="nav-notificacoes" className="inline-flex"><NotificacoesBell /></span>
            <Button
              variant="ghost"
              size="icon"
              data-tour="nav-tour"
              onClick={startTour}
              title="Refazer tour"
              aria-label="Refazer tour"
            >
              <Compass className="size-4" />
            </Button>
            
            <Button variant="ghost" size="sm" onClick={() => { signOut(); navigate("/auth"); }}>
              <LogOut className="size-4" />
            </Button>
          </div>
        </header>
        <div className="w-full min-w-0 p-4 md:p-8">
          <OnboardingTour />
          <Outlet />
        </div>
      </main>
    </div>
  );
}

function SidebarNavItem({
  item,
  isDeveloper,
  pendingEvalCount,
  dragHandleProps,
}: {
  item: NavItem;
  isDeveloper: boolean;
  pendingEvalCount: number;
  dragHandleProps?: Record<string, unknown>;
}) {
  const { pathname } = useLocation();
  const hasChildren = !!item.children?.length;

  // Pai está "ativo" se a rota atual cai sob seu prefixo
  const isParentActive = useMemo(() => {
    if (!item.matchPrefix) return false;
    return pathname === item.matchPrefix || pathname.startsWith(item.matchPrefix + "/");
  }, [pathname, item.matchPrefix]);

  const [open, setOpen] = useState<boolean>(isParentActive);
  useEffect(() => {
    if (isParentActive) setOpen(true);
  }, [isParentActive]);

  const showBadge =
    isDeveloper && item.matchPrefix === "/solicitacoes" && pendingEvalCount > 0;
  const dataTour = dataTourFor(item);

  if (!hasChildren) {
    return (
      <NavLink
        to={item.to!}
        end
        {...(dataTour ? { "data-tour": dataTour } : {})}
        {...(dragHandleProps as Record<string, unknown>)}
        className={({ isActive }) =>
          cn(
            "flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors min-w-0 cursor-grab active:cursor-grabbing touch-none",
            isActive
              ? "bg-sidebar-accent text-sidebar-accent-foreground border border-sidebar-border"
              : "text-sidebar-foreground hover:bg-sidebar-accent/60",
          )
        }
      >
        <item.icon className="size-4 shrink-0" />
        <span className="truncate flex-1">{item.label}</span>
      </NavLink>
    );
  }

  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        {...(dataTour ? { "data-tour": dataTour } : {})}
        {...dragHandleProps}
        className={cn(
          "w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors min-w-0 cursor-grab active:cursor-grabbing touch-none",
          isParentActive
            ? "text-sidebar-accent-foreground bg-sidebar-accent/40"
            : "text-sidebar-foreground hover:bg-sidebar-accent/60",
        )}
      >
        <item.icon className="size-4 shrink-0" />
        <span className="truncate flex-1 text-left">{item.label}</span>
        {showBadge && (
          <Badge
            variant="outline"
            className="text-[10px] py-0 px-1.5 h-5 border-dashed shrink-0"
            title="Solicitações aguardando avaliação técnica"
          >
            ⚙ {pendingEvalCount}
          </Badge>
        )}
        <ChevronDown
          className={cn("size-3.5 shrink-0 transition-transform text-muted-foreground", open && "rotate-180")}
        />
      </button>
      {open && (
        <div className="mt-1 ml-3 pl-3 border-l border-sidebar-border/60 space-y-0.5">
          {item.children!.map((child) => (
            <NavLink
              key={child.to}
              to={child.to!}
              end
              className={({ isActive }) =>
                cn(
                  "flex items-center gap-2 px-2.5 py-1.5 rounded-md text-xs transition-colors min-w-0",
                  isActive
                    ? "bg-sidebar-accent text-sidebar-accent-foreground"
                    : "text-muted-foreground hover:bg-sidebar-accent/40 hover:text-sidebar-foreground",
                )
              }
            >
              <child.icon className="size-3.5 shrink-0" />
              <span className="truncate">{child.label}</span>
            </NavLink>
          ))}
        </div>
      )}
    </div>
  );
}

function SortableSidebarNavItem({
  item,
  isDeveloper,
  pendingEvalCount,
}: {
  item: NavItem;
  isDeveloper: boolean;
  pendingEvalCount: number;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: item.label,
  });
  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.6 : undefined,
    zIndex: isDragging ? 10 : undefined,
    position: "relative",
  };
  return (
    <div ref={setNodeRef} style={style}>
      <SidebarNavItem
        item={item}
        isDeveloper={isDeveloper}
        pendingEvalCount={pendingEvalCount}
        dragHandleProps={{ ...attributes, ...listeners }}
      />
    </div>
  );
}
