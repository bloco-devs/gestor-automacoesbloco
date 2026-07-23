import { useCallback, useEffect, useRef, useState } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import {
  Compass,
  LogOut,
  Menu,
  PanelLeftClose,
  PanelLeftOpen,
  Repeat,
  X,
} from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";

import { NotificacoesBell } from "@/components/NotificacoesBell";
import { NotificationsDrawer } from "@/components/NotificationsDrawer";
import { ThemeToggle } from "@/components/ThemeToggle";
import { cn } from "@/lib/utils";
import { countPendingDevEvaluations } from "@/lib/supabaseData";
import { supabase } from "@/integrations/supabase/client";
import { OnboardingTour, useOnboardingTour } from "@/components/OnboardingTour";
import blocoLogo from "@/assets/bloco-logo.png";
import { SidebarGroupsNav } from "@/components/sidebar/SidebarGroupsNav";
import { SidebarBreadcrumb } from "@/components/sidebar/SidebarBreadcrumb";
import { builderGroups, devGroups, requesterGroups } from "@/components/sidebar/navGroups";
import { CopilotDock } from "@/modules/copilot/CopilotDock";
import { useEcossistemaAutoSync } from "@/modules/ecossistema";

const SIDEBAR_MIN = 160;
const SIDEBAR_MAX = 480;
const SIDEBAR_DEFAULT = 256;
const SIDEBAR_STORAGE_KEY = "app:sidebarWidth";

export default function AppLayout() {
  const { user, signOut, isDual } = useAuth();
  const navigate = useNavigate();
  const { start: startTour } = useOnboardingTour();

  const isDeveloperEffective = user?.role === "developer" || !!user?.isAdministrador;
  const isBuilderRole = user?.role === "builder";
  const groups = isDeveloperEffective ? devGroups : isBuilderRole ? builderGroups : requesterGroups;
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

  useEffect(() => {
    if (isMobile) setMobileOpen(false);
  }, [pathname, isMobile]);
  useEffect(() => {
    window.localStorage.setItem("app:sidebarHidden", sidebarHidden ? "1" : "0");
  }, [sidebarHidden]);
  useEffect(() => {
    const onToggle = () => setSidebarHidden((v) => !v);
    window.addEventListener("platform:toggle-sidebar", onToggle);
    return () => window.removeEventListener("platform:toggle-sidebar", onToggle);
  }, []);
  const draggingRef = useRef(false);
  const isDeveloper = isDeveloperEffective;
  const [pendingEvalCount, setPendingEvalCount] = useState<number>(0);

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
          aria-label="Navegação principal"
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
          <nav className="flex-1 px-3 py-2 overflow-y-auto" aria-label="Menu">
            <SidebarGroupsNav
              groups={groups}
              isDeveloper={isDeveloper}
              pendingEvalCount={pendingEvalCount}
            />
          </nav>
          <div className="p-3 border-t border-sidebar-border">
            <button
              type="button"
              onClick={() => navigate("/perfil")}
              className="w-full flex items-center gap-2 px-2 py-1.5 mb-2 min-w-0 rounded-md hover:bg-sidebar-accent/60 transition-colors text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60"
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
                <span className="block text-xs text-muted-foreground truncate">{roleLabel}</span>
              </span>
            </button>
            <div className="flex items-center justify-between gap-1 rounded-lg bg-sidebar-accent/40 px-1 py-1">
              <span data-tour="nav-notificacoes" className="inline-flex">
                <NotificacoesBell />
              </span>
              <NotificationsDrawer />
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
              isMobile
                ? "top-3 right-3 size-8"
                : "top-2 right-1 size-5 text-muted-foreground/40",
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

        {/* Header desktop: breadcrumb automático + trigger de sidebar */}
        <header className="hidden md:flex sticky top-0 z-30 h-11 items-center gap-3 border-b border-border/60 bg-background/80 backdrop-blur px-4">
          {sidebarHidden && <span className="w-6" aria-hidden="true" />}
          <div className="flex-1 min-w-0 text-xs">
            <SidebarBreadcrumb groups={groups} />
          </div>
        </header>

        {/* Header mobile */}
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
            <span data-tour="nav-notificacoes" className="inline-flex">
              <NotificacoesBell />
            </span>
            <NotificationsDrawer />
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
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                signOut();
                navigate("/auth");
              }}
            >
              <LogOut className="size-4" />
            </Button>
          </div>
        </header>
        <div className="w-full min-w-0 p-4 md:p-8">
          <OnboardingTour />
          <Outlet />
        </div>
        <CopilotDock />
      </main>
    </div>
  );
}
