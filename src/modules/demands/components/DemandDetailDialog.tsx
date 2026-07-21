import { useMemo, useState } from "react";
import ReactMarkdown from "react-markdown";
import {
  ExternalLink,
  Loader2,
  Paperclip,
  Plus,
  Sparkles,
  Trash2,
  User as UserIcon,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { getAttachmentSignedUrl } from "../service";
import {
  useAssignDemand,
  useCreateDemandTask,
  useDeleteDemandTask,
  useDemandAttachments,
  useDemandProfiles,
  useDemandTasks,
  useGenerateAIPlan,
  useToggleDemandTask,
  useUpdateDemandStatus,
  useUserWorkloads,
} from "../hooks";
import {
  COMPLEXITY_META,
  PRIORITY_META,
  STATUS_COLUMNS,
  TYPE_META,
  type Demand,
  type DemandStatus,
} from "../types";
import { cn } from "@/lib/utils";
import { SLAIndicator } from "./SLAIndicator";
import { DemandTimeline } from "./DemandTimeline";
import { MessageSquare, Wand2 } from "lucide-react";

interface Props {
  demand: Demand | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function initialsFrom(profile?: { nome: string | null; email: string | null } | null, fallbackId?: string | null) {
  const base = profile?.nome || profile?.email || fallbackId || "?";
  return base.slice(0, 2).toUpperCase();
}

export function DemandDetailDialog({ demand, open, onOpenChange }: Props) {
  const { toast } = useToast();
  const demandId = demand?.id ?? null;

  const { data: tasks = [], isLoading: tasksLoading } = useDemandTasks(demandId);
  const { data: attachments = [], isLoading: attachLoading } = useDemandAttachments(demandId);
  const { data: profilesMap } = useDemandProfiles(demand ? [demand] : []);

  const createTask = useCreateDemandTask(demandId);
  const toggleTask = useToggleDemandTask(demandId);
  const removeTask = useDeleteDemandTask(demandId);
  const updateStatus = useUpdateDemandStatus();
  const assign = useAssignDemand();
  const { data: workloads = [] } = useUserWorkloads(open);
  const aiPlan = useGenerateAIPlan(demandId);

  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [aiResult, setAiResult] = useState<{
    diagnostico: string;
    sugestao: string;
    subtarefas: string[];
  } | null>(null);

  const done = tasks.filter((t) => t.completed).length;
  const total = tasks.length;
  const percent = total ? Math.round((done / total) * 100) : 0;

  const createdByProfile = demand?.created_by ? profilesMap?.get(demand.created_by) : null;
  const assignedProfile = demand?.assigned_to ? profilesMap?.get(demand.assigned_to) : null;

  const handleAddTask = async () => {
    const title = newTaskTitle.trim();
    if (!title) return;
    try {
      await createTask.mutateAsync(title);
      setNewTaskTitle("");
    } catch (e) {
      toast({
        title: "Erro ao adicionar",
        description: e instanceof Error ? e.message : "Falha",
        variant: "destructive",
      });
    }
  };

  const handleGeneratePlan = async () => {
    if (!demand) return;
    setAiResult(null);
    try {
      const res = await aiPlan.mutateAsync(demand);
      setAiResult({
        diagnostico: res.diagnostico,
        sugestao: res.sugestao,
        subtarefas: res.subtarefas,
      });
      toast({
        title: "Plano gerado pela IA",
        description: `${res.inserted_count} subtarefa(s) adicionada(s).`,
      });
    } catch (e) {
      toast({
        title: "Erro ao gerar plano",
        description: e instanceof Error ? e.message : "Falha",
        variant: "destructive",
      });
    }
  };

  const handleOpenAttachment = async (path: string) => {
    const url = await getAttachmentSignedUrl(path);
    if (!url) {
      toast({ title: "Não foi possível abrir o anexo", variant: "destructive" });
      return;
    }
    window.open(url, "_blank", "noopener,noreferrer");
  };

  const priority = demand ? PRIORITY_META[demand.priority] : null;
  const type = demand ? TYPE_META[demand.type] : null;
  const complexity = demand ? COMPLEXITY_META[demand.complexity] : null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[92vh] flex flex-col p-0 gap-0">
        {demand && (
          <>
            <DialogHeader className="p-6 pb-3 border-b border-border/60">
              <DialogTitle className="text-xl leading-tight pr-6">{demand.title}</DialogTitle>
              <div className="flex flex-wrap items-center gap-2 pt-2">
                {priority && (
                  <Badge variant="outline" className={cn("text-xs", priority.className)}>
                    {priority.label}
                  </Badge>
                )}
                {type && (
                  <Badge variant="outline" className={cn("text-xs", type.className)}>
                    {type.label}
                  </Badge>
                )}
                {complexity && (
                  <Badge variant="outline" className="text-xs">
                    Complexidade: {complexity.label}
                  </Badge>
                )}
                <SLAIndicator
                  slaDueAt={demand.sla_due_at}
                  slaStatus={demand.sla_status}
                  demandStatus={demand.status}
                  createdAt={demand.created_at}
                  size="md"
                />
                <Select
                  value={demand.status}
                  onValueChange={(v) =>
                    updateStatus.mutate({ id: demand.id, status: v as DemandStatus })
                  }
                >
                  <SelectTrigger className="h-7 w-44 text-xs ml-auto">
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
              </div>
            </DialogHeader>

            <Tabs defaultValue="detalhes" className="flex-1 flex flex-col overflow-hidden">
              <TabsList className="mx-6 mt-3 self-start">
                <TabsTrigger value="detalhes">Detalhes</TabsTrigger>
                <TabsTrigger value="subtarefas">
                  Subtarefas {total > 0 && `(${done}/${total})`}
                </TabsTrigger>
                <TabsTrigger value="anexos">
                  Anexos {attachments.length > 0 && `(${attachments.length})`}
                </TabsTrigger>
                <TabsTrigger value="historico" className="gap-1">
                  <MessageSquare className="size-3.5" /> Histórico
                </TabsTrigger>
                <TabsTrigger value="ia" className="gap-1">
                  <Sparkles className="size-3.5" /> IA
                </TabsTrigger>
              </TabsList>

              <ScrollArea className="flex-1">
                <div className="px-6 py-4">
                  <TabsContent value="detalhes" className="mt-0 space-y-4">
                    <section>
                      <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1.5">
                        Descrição
                      </h3>
                      {demand.description ? (
                        <div className="prose prose-sm max-w-none dark:prose-invert">
                          <ReactMarkdown>{demand.description}</ReactMarkdown>
                        </div>
                      ) : (
                        <p className="text-sm text-muted-foreground italic">Sem descrição.</p>
                      )}
                    </section>

                    <section className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-border/60">
                      <ProfileBlock
                        label="Criado por"
                        name={createdByProfile?.nome || createdByProfile?.email || demand.created_by}
                        avatar={createdByProfile?.avatar_url ?? null}
                        initials={initialsFrom(createdByProfile, demand.created_by)}
                      />
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1.5">
                          Responsável
                        </p>
                        <div className="flex items-center gap-2">
                          <Select
                            value={demand.assigned_to ?? "__none__"}
                            onValueChange={(v) =>
                              assign.mutate({ id: demand.id, assigned_to: v === "__none__" ? null : v })
                            }
                          >
                            <SelectTrigger className="h-8 text-xs flex-1">
                              <SelectValue placeholder="Não atribuído" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="__none__" className="text-xs">Não atribuído</SelectItem>
                              {workloads.map((w) => (
                                <SelectItem key={w.user_id} value={w.user_id} className="text-xs">
                                  <span className="flex items-center gap-2">
                                    <span className="truncate">{w.nome || w.email}</span>
                                    <Badge variant="secondary" className="h-4 px-1.5 text-[10px]">
                                      {w.active_count} {w.active_count === 1 ? "ativa" : "ativas"}
                                    </Badge>
                                  </span>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="h-8 gap-1.5 shrink-0"
                            disabled={workloads.length === 0 || assign.isPending}
                            onClick={() => {
                              const sorted = [...workloads].sort((a, b) => a.active_count - b.active_count);
                              const pick = sorted[0]?.user_id;
                              if (pick) assign.mutate({ id: demand.id, assigned_to: pick });
                            }}
                            title="Atribuir ao membro com menos demandas ativas"
                          >
                            <Wand2 className="size-3.5" /> Auto
                          </Button>
                        </div>
                        {assignedProfile && (
                          <p className="text-xs text-muted-foreground mt-1.5 truncate">
                            {assignedProfile.nome || assignedProfile.email}
                          </p>
                        )}
                      </div>
                    </section>
                  </TabsContent>

                  <TabsContent value="subtarefas" className="mt-0 space-y-3">
                    {total > 0 && (
                      <div className="space-y-1">
                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                          <span>Progresso</span>
                          <span className="tabular-nums">{done}/{total} · {percent}%</span>
                        </div>
                        <Progress value={percent} className="h-2" />
                      </div>
                    )}

                    {tasksLoading && <Skeleton className="h-16 w-full" />}
                    {!tasksLoading && tasks.length === 0 && (
                      <p className="text-sm text-muted-foreground italic">Nenhuma subtarefa.</p>
                    )}

                    <ul className="space-y-1.5">
                      {tasks.map((t) => (
                        <li
                          key={t.id}
                          className="flex items-center gap-2 rounded-md border border-border/60 px-2.5 py-1.5 group"
                        >
                          <Checkbox
                            checked={t.completed}
                            onCheckedChange={(v) =>
                              toggleTask.mutate({ id: t.id, completed: !!v })
                            }
                          />
                          <span
                            className={cn(
                              "flex-1 text-sm",
                              t.completed && "line-through text-muted-foreground",
                            )}
                          >
                            {t.title}
                          </span>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="size-6 opacity-0 group-hover:opacity-100"
                            onClick={() => removeTask.mutate(t.id)}
                            aria-label="Remover subtarefa"
                          >
                            <Trash2 className="size-3.5" />
                          </Button>
                        </li>
                      ))}
                    </ul>

                    <div className="flex gap-2 pt-1">
                      <Input
                        value={newTaskTitle}
                        onChange={(e) => setNewTaskTitle(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            handleAddTask();
                          }
                        }}
                        placeholder="Nova subtarefa…"
                        className="h-8 text-sm"
                      />
                      <Button
                        size="sm"
                        onClick={handleAddTask}
                        disabled={!newTaskTitle.trim() || createTask.isPending}
                      >
                        <Plus className="size-3.5 mr-1" /> Adicionar
                      </Button>
                    </div>
                  </TabsContent>

                  <TabsContent value="anexos" className="mt-0 space-y-2">
                    {attachLoading && <Skeleton className="h-16 w-full" />}
                    {!attachLoading && attachments.length === 0 && (
                      <p className="text-sm text-muted-foreground italic">Sem anexos.</p>
                    )}
                    <ul className="space-y-1.5">
                      {attachments.map((a) => (
                        <li
                          key={a.id}
                          className="flex items-center gap-2 rounded-md border border-border/60 px-2.5 py-1.5 text-sm"
                        >
                          <Paperclip className="size-3.5 text-muted-foreground shrink-0" />
                          <span className="flex-1 truncate">{a.file_name ?? a.file_url}</span>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 gap-1"
                            onClick={() => handleOpenAttachment(a.file_url)}
                          >
                            <ExternalLink className="size-3.5" /> Abrir
                          </Button>
                        </li>
                      ))}
                    </ul>
                  </TabsContent>

                  <TabsContent value="historico" className="mt-0">
                    <DemandTimeline demandId={demand.id} />
                  </TabsContent>

                  <TabsContent value="ia" className="mt-0 space-y-4">
                    <div className="flex items-start justify-between gap-3">
                      <p className="text-sm text-muted-foreground">
                        A IA analisa esta demanda e gera diagnóstico, sugestão de resolução e
                        subtarefas acionáveis (que são adicionadas ao checklist).
                      </p>
                      <Button
                        onClick={handleGeneratePlan}
                        disabled={aiPlan.isPending}
                        className="shrink-0 gap-1.5"
                      >
                        {aiPlan.isPending ? (
                          <Loader2 className="size-4 animate-spin" />
                        ) : (
                          <Sparkles className="size-4" />
                        )}
                        {aiPlan.isPending ? "Analisando…" : "Analisar e Gerar Plano"}
                      </Button>
                    </div>

                    {aiPlan.isPending && (
                      <div className="space-y-2">
                        <Skeleton className="h-4 w-1/3" />
                        <Skeleton className="h-24 w-full" />
                        <Skeleton className="h-4 w-1/3" />
                        <Skeleton className="h-32 w-full" />
                      </div>
                    )}

                    {aiResult && !aiPlan.isPending && (
                      <div className="space-y-4">
                        <section>
                          <h4 className="text-sm font-semibold mb-1">Diagnóstico</h4>
                          <div className="prose prose-sm max-w-none dark:prose-invert">
                            <ReactMarkdown>{aiResult.diagnostico}</ReactMarkdown>
                          </div>
                        </section>
                        <section>
                          <h4 className="text-sm font-semibold mb-1">Sugestão de Resolução</h4>
                          <div className="prose prose-sm max-w-none dark:prose-invert">
                            <ReactMarkdown>{aiResult.sugestao}</ReactMarkdown>
                          </div>
                        </section>
                        {aiResult.subtarefas.length > 0 && (
                          <section>
                            <h4 className="text-sm font-semibold mb-1">
                              Subtarefas geradas ({aiResult.subtarefas.length})
                            </h4>
                            <ul className="list-disc pl-5 space-y-0.5 text-sm text-muted-foreground">
                              {aiResult.subtarefas.map((s, i) => (
                                <li key={i}>{s}</li>
                              ))}
                            </ul>
                            <p className="text-xs text-muted-foreground mt-2">
                              Já adicionadas à aba <strong>Subtarefas</strong>.
                            </p>
                          </section>
                        )}
                      </div>
                    )}
                  </TabsContent>
                </div>
              </ScrollArea>
            </Tabs>

            <DialogFooter className="px-6 py-3 border-t border-border/60">
              <span className="text-xs text-muted-foreground mr-auto">
                Criada em {new Date(demand.created_at).toLocaleString("pt-BR")}
              </span>
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Fechar
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

function ProfileBlock({
  label,
  name,
  avatar,
  initials,
  muted,
}: {
  label: string;
  name: string;
  avatar: string | null;
  initials: string;
  muted?: boolean;
}) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1.5">
        {label}
      </p>
      <div className="flex items-center gap-2">
        <Avatar className="size-8">
          {avatar && <AvatarImage src={avatar} alt={name} />}
          <AvatarFallback className="text-xs">
            {muted ? <UserIcon className="size-3.5" /> : initials}
          </AvatarFallback>
        </Avatar>
        <span className={cn("text-sm truncate", muted && "text-muted-foreground italic")}>
          {name}
        </span>
      </div>
    </div>
  );
}
