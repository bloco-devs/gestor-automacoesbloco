import { memo, useCallback, useMemo, useState } from "react";
import ReactMarkdown from "react-markdown";
import { ExternalLink, Layers, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import {
  COMPLEXITY_META,
  PRIORITY_META,
  STATUS_COLUMNS,
  TYPE_META,
  type Demand,
  type DemandStatus,
} from "@/modules/demands/types";
import {
  useDemandProfiles,
  useUpdateDemandStatus,
} from "@/modules/demands/hooks";
import { SLAIndicator } from "@/modules/demands/components/SLAIndicator";
import { DemandTimeline } from "@/modules/demands/components/DemandTimeline";
import { DemandWorkflowsTab } from "@/modules/demands/components/DemandWorkflowsTab";
import { DemandDetailDialog } from "@/modules/demands/components/DemandDetailDialog";
import { useDemandQuickActions } from "@/modules/platform";

interface Props {
  demand: Demand | null;
}

export const DemandDetailInline = memo(function DemandDetailInline({ demand }: Props) {
  const { toast } = useToast();
  const updateStatus = useUpdateDemandStatus();
  const { data: profilesMap } = useDemandProfiles(demand ? [demand] : []);
  const [fullOpen, setFullOpen] = useState(false);
  const [tab, setTab] = useState<"timeline" | "descricao" | "workflow">("timeline");

  const handlers = useMemo(
    () => ({
      onComment: () => setTab("timeline"),
      onWorkflow: () => setTab("workflow"),
      onKnowledge: () => {
        if (typeof window !== "undefined")
          window.dispatchEvent(new CustomEvent("workspace:focus-panel", { detail: "knowledge" }));
      },
      onRouting: () => {
        if (typeof window !== "undefined")
          window.dispatchEvent(new CustomEvent("workspace:focus-panel", { detail: "routing" }));
      },
      onAssign: () => setFullOpen(true),
      onPriority: () => setFullOpen(true),
      onStatus: () => setFullOpen(true),
    }),
    [],
  );
  useDemandQuickActions(!!demand && !fullOpen, handlers);

  const openFull = useCallback(() => setFullOpen(true), []);

  if (!demand) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 p-10 text-center text-muted-foreground">
        <Layers className="size-8 opacity-50" />
        <p className="text-sm">Selecione uma demanda na lista à esquerda.</p>
      </div>
    );
  }

  const pri = PRIORITY_META[demand.priority];
  const type = TYPE_META[demand.type];
  const cpx = COMPLEXITY_META[demand.complexity];
  const assigned = demand.assigned_to ? profilesMap?.get(demand.assigned_to) : null;
  const createdBy = profilesMap?.get(demand.created_by);

  return (
    <div className="flex h-full min-h-0 flex-col">
      <header className="border-b border-border/60 bg-card/40 px-6 py-4">
        <div className="mb-2 flex items-center justify-between gap-3">
          <p className="text-[11px] font-mono uppercase tracking-wider text-muted-foreground">
            #{demand.id.slice(0, 8)}
          </p>
          <Button variant="ghost" size="sm" className="gap-1" onClick={() => setFullOpen(true)}>
            <ExternalLink className="size-3.5" /> Detalhes completos
          </Button>
        </div>
        <h1 className="text-xl font-semibold leading-tight tracking-tight">{demand.title}</h1>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <Badge variant="outline" className={cn("text-xs", pri.className)}>
            {pri.label}
          </Badge>
          <Badge variant="outline" className={cn("text-xs", type.className)}>
            {type.label}
          </Badge>
          <Badge variant="outline" className="text-xs">
            {cpx.label}
          </Badge>
          <SLAIndicator
            slaDueAt={demand.sla_due_at}
            slaStatus={demand.sla_status}
            demandStatus={demand.status}
            createdAt={demand.created_at}
            size="sm"
          />
          <div className="ml-auto flex items-center gap-2">
            <Select
              value={demand.status}
              onValueChange={async (v) => {
                try {
                  await updateStatus.mutateAsync({ id: demand.id, status: v as DemandStatus });
                } catch (e) {
                  toast({
                    title: "Erro ao atualizar",
                    description: e instanceof Error ? e.message : "Falha",
                    variant: "destructive",
                  });
                }
              }}
            >
              <SelectTrigger className="h-8 w-[190px] text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {STATUS_COLUMNS.map((s) => (
                  <SelectItem key={s.id} value={s.id} className="text-xs">
                    {s.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {updateStatus.isPending && <Loader2 className="size-4 animate-spin text-muted-foreground" />}
          </div>
        </div>
        <div className="mt-2 text-xs text-muted-foreground">
          Aberta por{" "}
          <span className="font-medium text-foreground">
            {createdBy?.nome || createdBy?.email || "—"}
          </span>
          {" · "}
          Responsável:{" "}
          <span className="font-medium text-foreground">
            {assigned?.nome || assigned?.email || "Não atribuído"}
          </span>
        </div>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto p-6">
        <Tabs value={tab} onValueChange={(v) => setTab(v as typeof tab)} className="flex h-full flex-col">
          <TabsList className="w-fit">
            <TabsTrigger value="timeline">Timeline & Comentários</TabsTrigger>
            <TabsTrigger value="descricao">Descrição</TabsTrigger>
            <TabsTrigger value="workflow">Automações</TabsTrigger>
          </TabsList>

          <TabsContent value="timeline" className="mt-4 flex-1">
            <DemandTimeline demandId={demand.id} />
          </TabsContent>

          <TabsContent value="descricao" className="mt-4">
            <Card className="p-5">
              {demand.description ? (
                <div className="prose prose-sm dark:prose-invert max-w-none">
                  <ReactMarkdown>{demand.description}</ReactMarkdown>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">Sem descrição.</p>
              )}
            </Card>
          </TabsContent>

          <TabsContent value="workflow" className="mt-4">
            <DemandWorkflowsTab demandId={demand.id} />
          </TabsContent>
        </Tabs>
      </div>

      <DemandDetailDialog demand={demand} open={fullOpen} onOpenChange={setFullOpen} />
    </div>
  );
});
