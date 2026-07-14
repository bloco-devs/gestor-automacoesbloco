import { useEffect, useMemo, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeSanitize from "rehype-sanitize";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  CalendarIcon,
  CheckCircle2,
  Circle,
  Eye,
  Flag,
  Link2,
  Pencil,
  Plus,
  Trash2,
} from "lucide-react";
import {
  coverColorClass,
  labelColorClass,
  prazoStatus,
  PRIORIDADE_META,
  type AtividadeCard,
  type AtividadeLabel,
  type AtividadePersona,
  type CardLink,
  type ChecklistItem,
  type Prioridade,
} from "@/lib/atividades";
import type { AssignableUser, Solucao } from "@/lib/types";
import { cn } from "@/lib/utils";
import { LabelsPopover } from "./dialog/LabelsPopover";
import { DatePrazoPopover } from "./dialog/DatePrazoPopover";
import { CoverPopover } from "./dialog/CoverPopover";
import { ComentariosSection } from "./dialog/ComentariosSection";
import { AtividadeTimeline } from "./dialog/AtividadeTimeline";
import { AnexosSection } from "./dialog/AnexosSection";

export interface CardDraftValues {
  titulo: string;
  descricao: string;
  responsavelIds: string[];
  responsavelPersonaIds: string[];
  solucaoId: string | null;
  checklist: ChecklistItem[];
  links: CardLink[];
  dataEntrega: string | null;
  prioridade: Prioridade | null;
  coverCor: string | null;
  labelIds: string[];
  concluido: boolean;
}

export interface CardDialogProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  initial?: AtividadeCard | null;
  defaultValues?: Partial<CardDraftValues> | null;
  boardId: string | null;
  responsaveis: AssignableUser[];
  personas: AtividadePersona[];
  solucoes: Solucao[];
  labels: AtividadeLabel[];
  onLabelCreated?: (l: AtividadeLabel) => void;
  onSubmit: (data: CardDraftValues) => Promise<void>;
  onDelete?: () => Promise<void>;
  onSaveDraft?: (data: CardDraftValues) => void;
  onDiscardDraft?: () => void;
}

const NONE = "__none__";

function uid() {
  return Math.random().toString(36).slice(2, 10);
}

export function CardDialog({
  open,
  onOpenChange,
  initial,
  defaultValues,
  boardId,
  responsaveis,
  personas,
  solucoes,
  labels,
  onLabelCreated,
  onSubmit,
  onDelete,
  onSaveDraft,
  onDiscardDraft,
}: CardDialogProps) {
  const [titulo, setTitulo] = useState("");
  const [descricao, setDescricao] = useState("");
  const [descPreview, setDescPreview] = useState(false);
  const [responsavelIds, setResponsavelIds] = useState<string[]>([]);
  const [responsavelPersonaIds, setResponsavelPersonaIds] = useState<string[]>([]);
  const [solucaoId, setSolucaoId] = useState<string>(NONE);
  const [checklist, setChecklist] = useState<ChecklistItem[]>([]);
  const [links, setLinks] = useState<CardLink[]>([]);
  const [novoItem, setNovoItem] = useState("");
  const [saving, setSaving] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [dataEntrega, setDataEntrega] = useState<string | null>(null);
  const [prioridade, setPrioridade] = useState<Prioridade | null>(null);
  const [coverCor, setCoverCor] = useState<string | null>(null);
  const [labelIds, setLabelIds] = useState<string[]>([]);
  const [concluido, setConcluido] = useState(false);

  const personasByUser = useMemo(() => {
    const m = new Map<string, AtividadePersona[]>();
    for (const p of personas) {
      const arr = m.get(p.userId) ?? [];
      arr.push(p);
      m.set(p.userId, arr);
    }
    return m;
  }, [personas]);

  const baseline = useMemo<CardDraftValues>(() => {
    if (initial) {
      return {
        titulo: initial.titulo,
        descricao: initial.descricao,
        responsavelIds: initial.responsavelIds,
        responsavelPersonaIds: initial.responsavelPersonaIds,
        solucaoId: initial.solucaoId,
        checklist: initial.checklist,
        links: initial.links,
        dataEntrega: initial.dataEntrega,
        prioridade: initial.prioridade,
        coverCor: initial.coverCor,
        labelIds: initial.labelIds,
        concluido: initial.concluido,
      };
    }
    return {
      titulo: defaultValues?.titulo ?? "",
      descricao: defaultValues?.descricao ?? "",
      responsavelIds: defaultValues?.responsavelIds ?? [],
      responsavelPersonaIds: defaultValues?.responsavelPersonaIds ?? [],
      solucaoId: defaultValues?.solucaoId ?? null,
      checklist: defaultValues?.checklist ?? [],
      links: defaultValues?.links ?? [],
      dataEntrega: defaultValues?.dataEntrega ?? null,
      prioridade: defaultValues?.prioridade ?? null,
      coverCor: defaultValues?.coverCor ?? null,
      labelIds: defaultValues?.labelIds ?? [],
      concluido: defaultValues?.concluido ?? false,
    };
  }, [initial, defaultValues]);

  useEffect(() => {
    if (open) {
      setTitulo(baseline.titulo);
      setDescricao(baseline.descricao);
      setDescPreview(false);
      setResponsavelIds(baseline.responsavelIds);
      setResponsavelPersonaIds(baseline.responsavelPersonaIds);
      setSolucaoId(baseline.solucaoId ?? NONE);
      setChecklist(baseline.checklist);
      setLinks(baseline.links);
      setNovoItem("");
      setDataEntrega(baseline.dataEntrega);
      setPrioridade(baseline.prioridade);
      setCoverCor(baseline.coverCor);
      setLabelIds(baseline.labelIds);
      setConcluido(baseline.concluido);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  function currentData(): CardDraftValues {
    const direct = responsavelIds.filter((id) => {
      const ps = personasByUser.get(id);
      return !ps || ps.length === 0;
    });
    const fromPersonas = responsavelPersonaIds
      .map((pid) => personas.find((p) => p.id === pid)?.userId)
      .filter((x): x is string => !!x);
    const allUserIds = Array.from(new Set<string>([...direct, ...fromPersonas]));
    return {
      titulo: titulo.trim(),
      descricao: descricao.trim(),
      responsavelIds: allUserIds,
      responsavelPersonaIds,
      solucaoId: solucaoId === NONE ? null : solucaoId,
      checklist,
      links: links
        .map((l) => ({ ...l, label: l.label.trim(), url: l.url.trim() }))
        .filter((l) => l.url),
      dataEntrega,
      prioridade,
      coverCor,
      labelIds,
      concluido,
    };
  }

  function toggleUser(id: string) {
    setResponsavelIds((arr) =>
      arr.includes(id) ? arr.filter((x) => x !== id) : [...arr, id],
    );
  }
  function togglePersona(personaId: string) {
    setResponsavelPersonaIds((arr) =>
      arr.includes(personaId) ? arr.filter((x) => x !== personaId) : [...arr, personaId],
    );
  }
  function toggleLabel(id: string) {
    setLabelIds((arr) => (arr.includes(id) ? arr.filter((x) => x !== id) : [...arr, id]));
  }

  function isDirty(): boolean {
    const cur = currentData();
    return (
      cur.titulo !== baseline.titulo.trim() ||
      cur.descricao !== baseline.descricao.trim() ||
      JSON.stringify([...cur.responsavelIds].sort()) !==
        JSON.stringify([...baseline.responsavelIds].sort()) ||
      JSON.stringify([...cur.responsavelPersonaIds].sort()) !==
        JSON.stringify([...baseline.responsavelPersonaIds].sort()) ||
      cur.solucaoId !== (baseline.solucaoId ?? null) ||
      JSON.stringify(cur.checklist) !== JSON.stringify(baseline.checklist) ||
      JSON.stringify(cur.links) !== JSON.stringify(baseline.links) ||
      cur.dataEntrega !== baseline.dataEntrega ||
      cur.prioridade !== baseline.prioridade ||
      cur.coverCor !== baseline.coverCor ||
      cur.concluido !== baseline.concluido ||
      JSON.stringify([...cur.labelIds].sort()) !==
        JSON.stringify([...baseline.labelIds].sort())
    );
  }

  function addChecklistItem() {
    const t = novoItem.trim();
    if (!t) return;
    setChecklist((c) => [...c, { id: uid(), texto: t, concluido: false }]);
    setNovoItem("");
  }
  function addLink() {
    setLinks((l) => [...l, { id: uid(), label: "", url: "" }]);
  }

  async function handleSave() {
    if (!titulo.trim()) return;
    setSaving(true);
    try {
      await onSubmit(currentData());
      onOpenChange(false);
    } finally {
      setSaving(false);
    }
  }

  function attemptClose() {
    if (!isDirty()) {
      onOpenChange(false);
      return;
    }
    setConfirmOpen(true);
  }
  function handleDialogOpenChange(v: boolean) {
    if (v) {
      onOpenChange(true);
      return;
    }
    attemptClose();
  }
  function handleSaveDraft() {
    onSaveDraft?.(currentData());
    setConfirmOpen(false);
    onOpenChange(false);
  }
  async function handleConfirmSave() {
    if (!titulo.trim()) return;
    setConfirmOpen(false);
    await handleSave();
  }
  function handleDiscard() {
    onDiscardDraft?.();
    setConfirmOpen(false);
    onOpenChange(false);
  }

  const concluidosCount = checklist.filter((c) => c.concluido).length;
  const progressPct =
    checklist.length > 0 ? Math.round((concluidosCount / checklist.length) * 100) : 0;
  const status = prazoStatus({ dataEntrega, concluido });
  const selectedLabels = labels.filter((l) => labelIds.includes(l.id));

  return (
    <>
      <Dialog open={open} onOpenChange={handleDialogOpenChange}>
        <DialogContent className="max-w-4xl w-[95vw] max-h-[92vh] overflow-y-auto sm:p-0 p-0 gap-0">
          {coverCor && <div className={cn("h-8 rounded-t-lg", coverColorClass(coverCor))} />}
          <div className="p-6 sm:p-8 pb-0">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                {concluido && <CheckCircle2 className="size-5 text-emerald-500" />}
                {initial ? "Editar card" : "Novo card"}
              </DialogTitle>
            </DialogHeader>
          </div>

          <Tabs defaultValue="detalhes" className="px-6 sm:px-8 pb-6 sm:pb-8">
            <TabsList className="mt-4">
              <TabsTrigger value="detalhes">Detalhes</TabsTrigger>
              {initial && <TabsTrigger value="anexos">Anexos</TabsTrigger>}
              {initial && <TabsTrigger value="atividade">Atividade</TabsTrigger>}
            </TabsList>

            <TabsContent value="detalhes" className="space-y-4 mt-4">
              {(selectedLabels.length > 0 || dataEntrega || prioridade) && (
                <div className="flex flex-wrap gap-1.5">
                  {selectedLabels.map((l) => (
                    <span
                      key={l.id}
                      className={cn(
                        "px-2 py-0.5 rounded text-[11px] font-medium border",
                        labelColorClass(l.cor),
                      )}
                    >
                      {l.nome}
                    </span>
                  ))}
                  {dataEntrega && (
                    <span
                      className={cn(
                        "px-2 py-0.5 rounded text-[11px] font-medium border flex items-center gap-1",
                        status === "atrasado" &&
                          "bg-red-500/15 text-red-700 dark:text-red-300 border-red-500/40",
                        status === "hoje" &&
                          "bg-yellow-500/15 text-yellow-700 dark:text-yellow-300 border-yellow-500/40",
                        status === "em-breve" &&
                          "bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-500/30",
                        status === "no-prazo" && "bg-muted text-foreground border-border",
                        status === "concluido" &&
                          "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/40",
                      )}
                    >
                      <CalendarIcon className="size-3" />
                      {format(new Date(dataEntrega), "dd MMM", { locale: ptBR })}
                    </span>
                  )}
                  {prioridade && (
                    <span
                      className={cn(
                        "px-2 py-0.5 rounded text-[11px] font-medium border border-border flex items-center gap-1",
                        PRIORIDADE_META[prioridade].className,
                      )}
                    >
                      <span
                        className={cn(
                          "size-1.5 rounded-full",
                          PRIORIDADE_META[prioridade].dot,
                        )}
                      />
                      {PRIORIDADE_META[prioridade].label}
                    </span>
                  )}
                </div>
              )}

              <div className="space-y-1.5">
                <Label htmlFor="card-titulo">Título</Label>
                <Input
                  id="card-titulo"
                  value={titulo}
                  onChange={(e) => setTitulo(e.target.value)}
                  placeholder="Ex: Ajustar fluxo de cadastro"
                  className="h-11 text-base"
                />
              </div>

              <div className="flex flex-wrap gap-1.5">
                <LabelsPopover
                  labels={labels}
                  selected={labelIds}
                  boardId={boardId}
                  onToggle={toggleLabel}
                  onCreated={(l) => {
                    onLabelCreated?.(l);
                    setLabelIds((arr) => [...arr, l.id]);
                  }}
                />
                <DatePrazoPopover value={dataEntrega} onChange={setDataEntrega} />
                <Select
                  value={prioridade ?? NONE}
                  onValueChange={(v) =>
                    setPrioridade(v === NONE ? null : (v as Prioridade))
                  }
                >
                  <SelectTrigger className="h-8 w-auto gap-1 text-xs">
                    <Flag className="size-3.5" />
                    <SelectValue placeholder="Prioridade" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NONE}>Sem prioridade</SelectItem>
                    {(["baixa", "media", "alta", "urgente"] as Prioridade[]).map((p) => (
                      <SelectItem key={p} value={p}>
                        {PRIORIDADE_META[p].label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <CoverPopover value={coverCor} onChange={setCoverCor} />
                <Button
                  type="button"
                  variant={concluido ? "default" : "outline"}
                  size="sm"
                  className="h-8"
                  onClick={() => setConcluido((v) => !v)}
                >
                  {concluido ? (
                    <CheckCircle2 className="size-3.5" />
                  ) : (
                    <Circle className="size-3.5" />
                  )}
                  {concluido ? "Concluído" : "Marcar como concluído"}
                </Button>
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label htmlFor="card-desc">Descrição</Label>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-7 text-xs"
                    onClick={() => setDescPreview((v) => !v)}
                  >
                    {descPreview ? (
                      <>
                        <Pencil className="size-3.5" /> Editar
                      </>
                    ) : (
                      <>
                        <Eye className="size-3.5" /> Visualizar
                      </>
                    )}
                  </Button>
                </div>
                {descPreview ? (
                  <div className="rounded-md border border-border bg-muted/30 p-3 min-h-[8rem] prose prose-sm dark:prose-invert max-w-none">
                    {descricao.trim() ? (
                      <ReactMarkdown
                        remarkPlugins={[remarkGfm]}
                        rehypePlugins={[rehypeSanitize]}
                      >
                        {descricao}
                      </ReactMarkdown>
                    ) : (
                      <p className="text-muted-foreground text-sm italic">Sem descrição.</p>
                    )}
                  </div>
                ) : (
                  <Textarea
                    id="card-desc"
                    value={descricao}
                    onChange={(e) => setDescricao(e.target.value)}
                    rows={6}
                    placeholder="Detalhe a atividade... (aceita Markdown: **negrito**, listas, links, tabelas)"
                    className="text-base font-mono text-sm"
                  />
                )}
              </div>

              <div className="space-y-1.5">
                <Label>Responsáveis</Label>
                <div className="rounded-md border border-border p-2 max-h-60 overflow-y-auto space-y-2">
                  {responsaveis.length === 0 && (
                    <p className="text-xs text-muted-foreground px-1 py-0.5">
                      Nenhum responsável disponível.
                    </p>
                  )}
                  {responsaveis.map((u) => {
                    const userPersonas = personasByUser.get(u.id) ?? [];
                    if (userPersonas.length === 0) {
                      const checked = responsavelIds.includes(u.id);
                      return (
                        <label
                          key={u.id}
                          className="flex items-center gap-2 px-1 py-1 rounded hover:bg-muted cursor-pointer"
                        >
                          <Checkbox
                            checked={checked}
                            onCheckedChange={() => toggleUser(u.id)}
                          />
                          <span className="text-sm">{u.nome}</span>
                        </label>
                      );
                    }
                    return (
                      <div key={u.id} className="space-y-0.5">
                        <div className="px-1 text-[10px] uppercase tracking-wide text-muted-foreground">
                          {u.nome}
                        </div>
                        {userPersonas.map((p) => {
                          const checked = responsavelPersonaIds.includes(p.id);
                          return (
                            <label
                              key={p.id}
                              className="flex items-center gap-2 px-1 py-1 rounded hover:bg-muted cursor-pointer"
                            >
                              <Checkbox
                                checked={checked}
                                onCheckedChange={() => togglePersona(p.id)}
                              />
                              <span className="text-sm">{p.nome}</span>
                            </label>
                          );
                        })}
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="space-y-1.5">
                <Label>Solução vinculada (opcional)</Label>
                <Select value={solucaoId} onValueChange={setSolucaoId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Sem vínculo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NONE}>Sem vínculo</SelectItem>
                    {solucoes.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.titulo}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2 rounded-md border border-border p-3">
                <div className="flex items-center justify-between">
                  <Label className="text-sm">Checklist</Label>
                  {checklist.length > 0 && (
                    <span className="text-xs text-muted-foreground tabular-nums">
                      {concluidosCount}/{checklist.length} · {progressPct}%
                    </span>
                  )}
                </div>
                {checklist.length > 0 && <Progress value={progressPct} className="h-1.5" />}
                <div className="space-y-1.5">
                  {checklist.map((item) => (
                    <div key={item.id} className="flex items-center gap-2">
                      <Checkbox
                        checked={item.concluido}
                        onCheckedChange={(v) =>
                          setChecklist((c) =>
                            c.map((i) =>
                              i.id === item.id ? { ...i, concluido: v === true } : i,
                            ),
                          )
                        }
                      />
                      <Input
                        value={item.texto}
                        onChange={(e) =>
                          setChecklist((c) =>
                            c.map((i) =>
                              i.id === item.id ? { ...i, texto: e.target.value } : i,
                            ),
                          )
                        }
                        className={cn(
                          "h-8 flex-1",
                          item.concluido && "line-through text-muted-foreground",
                        )}
                      />
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-8"
                        onClick={() =>
                          setChecklist((c) => c.filter((i) => i.id !== item.id))
                        }
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </div>
                  ))}
                </div>
                <div className="flex gap-2">
                  <Input
                    value={novoItem}
                    onChange={(e) => setNovoItem(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        addChecklistItem();
                      }
                    }}
                    placeholder="Adicionar item..."
                    className="h-8"
                  />
                  <Button type="button" variant="outline" size="sm" onClick={addChecklistItem}>
                    <Plus className="size-4" />
                  </Button>
                </div>
              </div>

              <div className="space-y-2 rounded-md border border-border p-3">
                <div className="flex items-center justify-between">
                  <Label className="text-sm">Links / Botões</Label>
                  <Button type="button" variant="outline" size="sm" onClick={addLink}>
                    <Plus className="size-4 mr-1" /> Adicionar
                  </Button>
                </div>
                <div className="space-y-1.5">
                  {links.map((link) => (
                    <div key={link.id} className="flex items-center gap-2">
                      <Link2 className="size-4 text-muted-foreground shrink-0" />
                      <Input
                        value={link.label}
                        onChange={(e) =>
                          setLinks((ls) =>
                            ls.map((l) =>
                              l.id === link.id ? { ...l, label: e.target.value } : l,
                            ),
                          )
                        }
                        placeholder="Rótulo"
                        className="h-8 w-32"
                      />
                      <Input
                        value={link.url}
                        onChange={(e) =>
                          setLinks((ls) =>
                            ls.map((l) =>
                              l.id === link.id ? { ...l, url: e.target.value } : l,
                            ),
                          )
                        }
                        placeholder="https://..."
                        className="h-8 flex-1"
                      />
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-8"
                        onClick={() => setLinks((ls) => ls.filter((l) => l.id !== link.id))}
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </div>
                  ))}
                  {links.length === 0 && (
                    <p className="text-xs text-muted-foreground">Nenhum link adicionado.</p>
                  )}
                </div>
              </div>

              {initial && (
                <ComentariosSection cardId={initial.id} responsaveis={responsaveis} />
              )}
            </TabsContent>

            {initial && (
              <TabsContent value="atividade" className="mt-4">
                <AtividadeTimeline cardId={initial.id} responsaveis={responsaveis} />
              </TabsContent>
            )}
          </Tabs>

          <DialogFooter className="gap-2 sm:gap-2 px-6 sm:px-8 pb-6 sm:pb-8">
            {initial && onDelete && (
              <Button
                variant="destructive"
                onClick={async () => {
                  await onDelete();
                  onOpenChange(false);
                }}
                className="mr-auto"
              >
                Excluir
              </Button>
            )}
            <Button variant="outline" onClick={attemptClose}>
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={saving || !titulo.trim()}>
              {saving ? "Salvando..." : "Salvar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {initial ? "Sair sem salvar?" : "Cancelar criação do card?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {initial
                ? "Você tem alterações não salvas neste card. O que deseja fazer?"
                : "Você tem alterações não salvas. Deseja realmente cancelar ou prefere guardar um rascunho na coluna para continuar mais tarde?"}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2 sm:gap-2 flex-wrap">
            <AlertDialogCancel>Continuar editando</AlertDialogCancel>
            {initial ? (
              <Button onClick={handleConfirmSave} disabled={!titulo.trim() || saving}>
                Salvar alterações
              </Button>
            ) : (
              onSaveDraft && (
                <Button variant="outline" onClick={handleSaveDraft}>
                  Salvar rascunho
                </Button>
              )
            )}
            <AlertDialogAction
              onClick={handleDiscard}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Descartar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
