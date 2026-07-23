import { lazy, Suspense, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { Loader2, LayoutDashboard, Activity, Sparkles, ShieldCheck, Radar, Server, Lock } from "lucide-react";
import { cn } from "@/lib/utils";

// Reutiliza páginas existentes como conteúdo de aba. Nenhuma reimplementação.
const AnalyticsPage = lazy(() => import("@/pages/admin/Analytics"));
const OperationsPage = lazy(() =>
  import("@/modules/operations").then((m) => ({ default: m.OperationsPage })),
);
const ObservabilidadeIA = lazy(() => import("@/pages/ObservabilidadeIA"));
const GovernancePage = lazy(() => import("@/modules/governance/GovernancePage"));
const ObservabilityCenter = lazy(() => import("@/pages/admin/ObservabilityCenter"));
const PlatformHealth = lazy(() => import("@/pages/admin/PlatformHealth"));
const SecurityCenter = lazy(() => import("@/pages/admin/SecurityCenter"));

const TABS = [
  { id: "resumo", label: "Resumo", icon: LayoutDashboard, Comp: AnalyticsPage },
  { id: "operacao", label: "Operação", icon: Activity, Comp: OperationsPage },
  { id: "ia", label: "IA", icon: Sparkles, Comp: ObservabilidadeIA },
  { id: "qualidade", label: "Qualidade", icon: ShieldCheck, Comp: GovernancePage },
  { id: "observabilidade", label: "Observabilidade", icon: Radar, Comp: ObservabilityCenter },
  { id: "plataforma", label: "Plataforma", icon: Server, Comp: PlatformHealth },
  { id: "seguranca", label: "Segurança", icon: Lock, Comp: SecurityCenter },
] as const;

type TabId = (typeof TABS)[number]["id"];

/**
 * Unifica Analytics, Operação, IA, Qualidade, Observabilidade, Plataforma e Segurança
 * como abas de uma única página `/gestao/insights`. Cada aba renderiza a página já
 * existente — nenhuma tela duplicada.
 */
export function InsightsTabs() {
  const [params, setParams] = useSearchParams();
  const raw = params.get("tab") as TabId | null;
  const active: TabId = useMemo(
    () => (TABS.some((t) => t.id === raw) ? (raw as TabId) : "resumo"),
    [raw],
  );

  const setActive = (id: TabId) => {
    const next = new URLSearchParams(params);
    next.set("tab", id);
    setParams(next, { replace: true });
  };

  const ActiveComp = TABS.find((t) => t.id === active)!.Comp;

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div
        role="tablist"
        aria-label="Insights"
        className="flex flex-wrap items-center gap-1 border-b border-border bg-background/40 px-3 py-1.5"
      >
        {TABS.map((t) => {
          const Icon = t.icon;
          const isActive = t.id === active;
          return (
            <button
              key={t.id}
              role="tab"
              type="button"
              aria-selected={isActive}
              onClick={() => setActive(t.id)}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs transition",
                isActive
                  ? "bg-muted font-medium text-foreground"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              <Icon className="size-3.5" aria-hidden />
              {t.label}
            </button>
          );
        })}
      </div>
      <div role="tabpanel" className="min-h-0 flex-1 overflow-auto">
        <Suspense
          fallback={
            <div className="flex h-full items-center justify-center">
              <Loader2 className="size-5 animate-spin text-muted-foreground" />
            </div>
          }
        >
          <ActiveComp />
        </Suspense>
      </div>
    </div>
  );
}

export const INSIGHTS_TAB_IDS = TABS.map((t) => t.id);
