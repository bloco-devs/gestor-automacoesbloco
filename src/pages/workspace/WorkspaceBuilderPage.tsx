import { lazy, Suspense, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { Workflow, LayoutTemplate, Boxes, Store, Code2, Loader2 } from "lucide-react";
import { WorkspaceShell } from "@/modules/workspace-unified";
import { cn } from "@/lib/utils";

const WorkflowsPage = lazy(() => import("@/pages/admin/Workflows"));
const StudioPage = lazy(() => import("@/pages/Studio"));
const DevPlugins = lazy(() => import("@/pages/developer/Plugins"));
const MarketplacePage = lazy(() => import("@/plugins/marketplace/pages/MarketplacePage"));
const SdkSandbox = lazy(() => import("@/pages/admin/SdkSandbox"));

const TABS = [
  { id: "workflow", label: "Workflow", icon: Workflow },
  { id: "studio", label: "Studio", icon: LayoutTemplate },
  { id: "plugins", label: "Plugins", icon: Boxes },
  { id: "marketplace", label: "Marketplace", icon: Store },
  { id: "sdk", label: "SDK", icon: Code2 },
] as const;

type TabId = (typeof TABS)[number]["id"];

export default function WorkspaceBuilderPage() {
  const [params, setParams] = useSearchParams();
  const raw = params.get("tab") as TabId | null;
  const tab: TabId = useMemo(
    () => (TABS.some((t) => t.id === raw) ? (raw as TabId) : "workflow"),
    [raw],
  );

  const setTab = (id: TabId) => {
    const next = new URLSearchParams(params);
    next.set("tab", id);
    setParams(next, { replace: true });
  };

  return (
    <WorkspaceShell>
      <div className="flex h-full min-h-0 flex-col">
        <div className="flex items-center gap-1 border-b border-border bg-background/40 px-3 py-1.5">
          {TABS.map((t) => {
            const Icon = t.icon;
            const active = t.id === tab;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => setTab(t.id)}
                aria-pressed={active}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs transition",
                  active
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
        <div className="min-h-0 flex-1 overflow-auto">
          <Suspense
            fallback={
              <div className="flex h-full items-center justify-center">
                <Loader2 className="size-5 animate-spin text-muted-foreground" />
              </div>
            }
          >
            {tab === "workflow" && <WorkflowsPage />}
            {tab === "studio" && <StudioPage />}
            {tab === "plugins" && <DevPlugins />}
            {tab === "marketplace" && <MarketplacePage />}
            {tab === "sdk" && <SdkSandbox />}
          </Suspense>
        </div>
      </div>
    </WorkspaceShell>
  );
}
