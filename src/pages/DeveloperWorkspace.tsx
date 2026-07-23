import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { PanelLeftClose, PanelRightClose, PanelLeftOpen, PanelRightOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useDemands } from "@/modules/demands/hooks";
import { DemandListPanel } from "@/components/workspace/DemandListPanel";
import { DemandDetailInline } from "@/components/workspace/DemandDetailInline";
import { IntelligencePanel } from "@/components/workspace/IntelligencePanel";
import { EspecialidadeCard } from "@/modules/routing";
import { useAuth } from "@/hooks/useAuth";

const LS_SELECTED = "workspace:selectedId:v1";
const LS_LEFT = "workspace:panels:left:v1";
const LS_RIGHT = "workspace:panels:right:v1";

function readBool(key: string, fallback: boolean): boolean {
  if (typeof window === "undefined") return fallback;
  const v = window.localStorage.getItem(key);
  return v == null ? fallback : v === "1";
}

export default function DeveloperWorkspace() {
  const { user } = useAuth();
  const { data: demands = [] } = useDemands();
  const [params, setParams] = useSearchParams();

  const [selectedId, setSelectedId] = useState<string | null>(() => {
    if (typeof window === "undefined") return null;
    return params.get("d") ?? window.localStorage.getItem(LS_SELECTED);
  });
  const [leftOpen, setLeftOpen] = useState<boolean>(() => readBool(LS_LEFT, true));
  const [rightOpen, setRightOpen] = useState<boolean>(() => readBool(LS_RIGHT, true));

  // Persistência
  useEffect(() => {
    if (selectedId) window.localStorage.setItem(LS_SELECTED, selectedId);
    if (selectedId && params.get("d") !== selectedId) {
      const next = new URLSearchParams(params);
      next.set("d", selectedId);
      setParams(next, { replace: true });
    }
  }, [selectedId, params, setParams]);

  useEffect(() => {
    window.localStorage.setItem(LS_LEFT, leftOpen ? "1" : "0");
  }, [leftOpen]);
  useEffect(() => {
    window.localStorage.setItem(LS_RIGHT, rightOpen ? "1" : "0");
  }, [rightOpen]);

  // Auto-selecionar primeira demanda quando lista carrega
  useEffect(() => {
    if (!selectedId && demands.length > 0) {
      setSelectedId(demands[0].id);
    } else if (selectedId && demands.length > 0 && !demands.find((d) => d.id === selectedId)) {
      setSelectedId(demands[0].id);
    }
  }, [demands, selectedId]);

  const selected = useMemo(
    () => demands.find((d) => d.id === selectedId) ?? null,
    [demands, selectedId],
  );

  return (
    <div className="flex h-[calc(100vh-var(--app-header-h,3.5rem))] w-full flex-col">
      <div className="flex items-center gap-1 border-b border-border bg-card/40 px-3 py-1.5">
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={() => setLeftOpen((v) => !v)}
          aria-label={leftOpen ? "Ocultar lista" : "Mostrar lista"}
          title={leftOpen ? "Ocultar lista" : "Mostrar lista"}
        >
          {leftOpen ? <PanelLeftClose className="size-4" /> : <PanelLeftOpen className="size-4" />}
        </Button>
        <span className="text-xs font-medium text-muted-foreground">Developer Workspace</span>
        <div className="ml-auto flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => setRightOpen((v) => !v)}
            aria-label={rightOpen ? "Ocultar painel inteligente" : "Mostrar painel inteligente"}
            title={rightOpen ? "Ocultar painel inteligente" : "Mostrar painel inteligente"}
          >
            {rightOpen ? (
              <PanelRightClose className="size-4" />
            ) : (
              <PanelRightOpen className="size-4" />
            )}
          </Button>
        </div>
      </div>

      <div className="grid min-h-0 flex-1 grid-cols-1 lg:grid-cols-[auto_1fr_auto]">
        {leftOpen && (
          <div className="min-h-0 lg:w-[320px] xl:w-[360px]">
            <DemandListPanel selectedId={selectedId} onSelect={setSelectedId} />
          </div>
        )}
        <div className="min-h-0 min-w-0">
          <DemandDetailInline demand={selected} />
        </div>
        {rightOpen && (
          <div className="min-h-0 hidden lg:flex lg:w-[340px] xl:w-[380px] flex-col gap-3 overflow-y-auto p-3">
            <EspecialidadeCard userId={user?.id ?? null} />
            <IntelligencePanel demand={selected} />
          </div>
        )}
      </div>
    </div>
  );
}
