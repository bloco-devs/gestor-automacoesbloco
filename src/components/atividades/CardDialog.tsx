import { useEffect, useMemo, useState } from "react";
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
import {
  listComentarios,
  createComentario,
  updateComentario,
  deleteComentario,
  type CardComentario,
} from "@/lib/atividades";
import { useAuth } from "@/hooks/useAuth";

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
import { Plus, Trash2, Link2 } from "lucide-react";
import type { AtividadeCard, ChecklistItem, CardLink, AtividadePersona } from "@/lib/atividades";
import type { AssignableUser, Solucao } from "@/lib/types";

export interface CardDraftValues {
  titulo: string;
  descricao: string;
  responsavelIds: string[];
  responsavelPersonaIds: string[];
  solucaoId: string | null;
  checklist: ChecklistItem[];
  links: CardLink[];
}


export interface CardDialogProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  initial?: AtividadeCard | null;
  defaultValues?: Partial<CardDraftValues> | null;
  responsaveis: AssignableUser[];
  personas: AtividadePersona[];
  solucoes: Solucao[];
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
  responsaveis,
  personas,
  solucoes,
  onSubmit,
  onDelete,
  onSaveDraft,
  onDiscardDraft,
}: CardDialogProps) {
  const [titulo, setTitulo] = useState("");
  const [descricao, setDescricao] = useState("");
  const [responsavelIds, setResponsavelIds] = useState<string[]>([]);
  const [responsavelPersonaIds, setResponsavelPersonaIds] = useState<string[]>([]);
  const [solucaoId, setSolucaoId] = useState<string>(NONE);
  const [checklist, setChecklist] = useState<ChecklistItem[]>([]);
  const [links, setLinks] = useState<CardLink[]>([]);
  const [novoItem, setNovoItem] = useState("");
  const [saving, setSaving] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  // Personas agrupadas por usuário
  const personasByUser = useMemo(() => {
    const m = new Map<string, AtividadePersona[]>();
    for (const p of personas) {
      const arr = m.get(p.userId) ?? [];
      arr.push(p);
      m.set(p.userId, arr);
    }
    return m;
  }, [personas]);

  // Baseline used to detect "dirty" state
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
    };
  }, [initial, defaultValues]);

  useEffect(() => {
    if (open) {
      setTitulo(baseline.titulo);
      setDescricao(baseline.descricao);
      setResponsavelIds(baseline.responsavelIds);
      setResponsavelPersonaIds(baseline.responsavelPersonaIds);
      setSolucaoId(baseline.solucaoId ?? NONE);
      setChecklist(baseline.checklist);
      setLinks(baseline.links);
      setNovoItem("");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  function currentData(): CardDraftValues {
    // Derive responsavelIds = direct user_ids (sem personas) ∪ user_ids das personas selecionadas
    const direct = responsavelIds.filter((uid) => {
      const ps = personasByUser.get(uid);
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
      JSON.stringify(cur.links) !== JSON.stringify(baseline.links)
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

  // Intercepta fechamento (clique fora / Esc / botão Cancelar)
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

  const concluidos = checklist.filter((c) => c.concluido).length;

  return (
    <>
      <Dialog open={open} onOpenChange={handleDialogOpenChange}>
        <DialogContent className="max-w-4xl w-[95vw] max-h-[92vh] overflow-y-auto sm:p-8">
          <DialogHeader>
            <DialogTitle>{initial ? "Editar card" : "Novo card"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
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
            <div className="space-y-1.5">
              <Label htmlFor="card-desc">Descrição</Label>
              <Textarea
                id="card-desc"
                value={descricao}
                onChange={(e) => setDescricao(e.target.value)}
                rows={6}
                placeholder="Detalhe a atividade..."
                className="text-base"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Responsáveis</Label>
              <div className="rounded-md border border-border p-2 max-h-60 overflow-y-auto space-y-1">

                {responsaveis.length === 0 && (
                  <p className="text-xs text-muted-foreground px-1 py-0.5">
                    Nenhum responsável disponível.
                  </p>
                )}
                {responsaveis.map((u) => {
                  const checked = responsavelIds.includes(u.id);
                  return (
                    <label
                      key={u.id}
                      className="flex items-center gap-2 px-1 py-1 rounded hover:bg-muted cursor-pointer"
                    >
                      <Checkbox
                        checked={checked}
                        onCheckedChange={() => toggleResponsavel(u.id)}
                      />
                      <span className="text-sm">{u.nome}</span>
                    </label>
                  );
                })}
              </div>
              {responsavelIds.length > 0 && (
                <p className="text-xs text-muted-foreground">
                  {responsavelIds.length} selecionado(s)
                </p>
              )}
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
                    {concluidos}/{checklist.length}
                  </span>
                )}
              </div>
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
                      className="h-8 flex-1"
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
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addChecklistItem}
                >
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
                  <p className="text-xs text-muted-foreground">
                    Nenhum link adicionado.
                  </p>
                )}
              </div>
            </div>

            {initial && (
              <ComentariosSection cardId={initial.id} responsaveis={responsaveis} />
            )}
          </div>

          <DialogFooter className="gap-2 sm:gap-2">
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

function formatDateTime(iso: string) {
  try {
    return new Date(iso).toLocaleString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

function ComentariosSection({
  cardId,
  responsaveis,
}: {
  cardId: string;
  responsaveis: AssignableUser[];
}) {
  const { user } = useAuth();
  const [items, setItems] = useState<CardComentario[]>([]);
  const [loading, setLoading] = useState(true);
  const [novo, setNovo] = useState("");
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState("");

  const nomeMap = useMemo(
    () => new Map(responsaveis.map((u) => [u.id, u.nome])),
    [responsaveis],
  );

  useEffect(() => {
    let alive = true;
    setLoading(true);
    listComentarios(cardId)
      .then((data) => {
        if (alive) setItems(data);
      })
      .catch((e) => console.error(e))
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [cardId]);

  async function handleAdd() {
    const texto = novo.trim();
    if (!texto || !user?.id) return;
    setSaving(true);
    try {
      const created = await createComentario({ cardId, userId: user.id, texto });
      setItems((arr) => [...arr, created]);
      setNovo("");
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  }

  async function handleSaveEdit(id: string) {
    const texto = editingText.trim();
    if (!texto) return;
    try {
      await updateComentario(id, texto);
      setItems((arr) =>
        arr.map((c) =>
          c.id === id ? { ...c, texto, updatedAt: new Date().toISOString() } : c,
        ),
      );
      setEditingId(null);
      setEditingText("");
    } catch (e) {
      console.error(e);
    }
  }

  async function handleDelete(id: string) {
    try {
      await deleteComentario(id);
      setItems((arr) => arr.filter((c) => c.id !== id));
    } catch (e) {
      console.error(e);
    }
  }

  return (
    <div className="space-y-2 rounded-md border border-border p-3">
      <div className="flex items-center justify-between">
        <Label className="text-sm">Comentários</Label>
        {items.length > 0 && (
          <span className="text-xs text-muted-foreground tabular-nums">
            {items.length}
          </span>
        )}
      </div>

      <div className="space-y-2">
        {loading && (
          <p className="text-xs text-muted-foreground">Carregando...</p>
        )}
        {!loading && items.length === 0 && (
          <p className="text-xs text-muted-foreground">
            Nenhum comentário ainda.
          </p>
        )}
        {items.map((c) => {
          const nome =
            (c.userId && nomeMap.get(c.userId)) ||
            (c.userId === user?.id ? "Você" : "Usuário");
          const isMine = c.userId && c.userId === user?.id;
          const isEditing = editingId === c.id;
          return (
            <div
              key={c.id}
              className="rounded-md border border-border/60 bg-muted/30 p-2 text-sm"
            >
              <div className="flex items-center justify-between gap-2 mb-1">
                <div className="text-xs font-medium">
                  {nome}{" "}
                  <span className="font-normal text-muted-foreground">
                    · {formatDateTime(c.createdAt)}
                    {c.updatedAt !== c.createdAt && " (editado)"}
                  </span>
                </div>
                {isMine && !isEditing && (
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => {
                        setEditingId(c.id);
                        setEditingText(c.texto);
                      }}
                      className="text-[11px] text-muted-foreground hover:text-foreground"
                    >
                      Editar
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(c.id)}
                      className="text-[11px] text-muted-foreground hover:text-destructive"
                    >
                      Excluir
                    </button>
                  </div>
                )}
              </div>
              {isEditing ? (
                <div className="space-y-1.5">
                  <Textarea
                    value={editingText}
                    onChange={(e) => setEditingText(e.target.value)}
                    rows={2}
                  />
                  <div className="flex justify-end gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setEditingId(null);
                        setEditingText("");
                      }}
                    >
                      Cancelar
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => handleSaveEdit(c.id)}
                      disabled={!editingText.trim()}
                    >
                      Salvar
                    </Button>
                  </div>
                </div>
              ) : (
                <p className="whitespace-pre-wrap leading-snug">{c.texto}</p>
              )}
            </div>
          );
        })}
      </div>

      <div className="space-y-1.5">
        <Textarea
          value={novo}
          onChange={(e) => setNovo(e.target.value)}
          placeholder="Escreva um comentário..."
          rows={3}

        />
        <div className="flex justify-end">
          <Button
            size="sm"
            onClick={handleAdd}
            disabled={saving || !novo.trim()}
          >
            {saving ? "Enviando..." : "Comentar"}
          </Button>
        </div>
      </div>
    </div>
  );
}
