import { useEffect, useMemo, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Trash2,
  Plus,
  UserPlus,
  Archive,
  ArchiveRestore,
  Pencil,
  History as HistoryIcon,
  Palette,
  Tag as TagIcon,
  Users,
  Shield,
  ListTree,
} from "lucide-react";
import {
  updateBoard,
  deleteBoard,
  listBoardMembros,
  addBoardMembro,
  removeBoardMembro,
  setBoardMembroRole,
  criarColuna,
  renomearColuna,
  excluirColuna,
  arquivarColuna,
  duplicarColuna,
  upsertLabel,
  excluirLabel,
  listBoardHistorico,
  type BoardResumo,
  type BoardRole,
  type BoardVisibilidade,
} from "@/lib/atividadesBoards";
import { listColunas, listLabels, type AtividadeLabel } from "@/lib/atividades";
import { listAssignableUsers } from "@/lib/supabaseData";
import { atividadesKeys } from "@/hooks/useAtividadesBoard";

const COLORS = [
  "hsl(215 82% 55%)",
  "hsl(160 65% 40%)",
  "hsl(280 55% 55%)",
  "hsl(20 85% 55%)",
  "hsl(0 70% 55%)",
  "hsl(45 90% 50%)",
  "hsl(200 15% 45%)",
];
const ICONS = ["📋", "🚀", "🎯", "💡", "🛠️", "📊", "🧭", "🏗️"];
const LABEL_COLORS = [
  "#ef4444",
  "#f59e0b",
  "#eab308",
  "#22c55e",
  "#14b8a6",
  "#3b82f6",
  "#8b5cf6",
  "#ec4899",
  "#64748b",
];

const ROLE_LABELS: Record<BoardRole, string> = {
  owner: "Proprietário",
  admin: "Administrador",
  member: "Membro",
  observer: "Observador",
};
const ROLE_DESCS: Record<BoardRole, string> = {
  owner: "Controle total do quadro.",
  admin: "Configura quadro, colunas, etiquetas e membros.",
  member: "Cria e edita cards.",
  observer: "Apenas visualiza o quadro.",
};

const VIS_DESCS: Record<BoardVisibilidade, string> = {
  private: "Apenas os membros convidados podem acessar.",
  workspace: "Todos os usuários do Grupo Bloco podem acessar.",
  public: "Qualquer usuário logado na plataforma pode acessar.",
};

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  board: BoardResumo | null;
  onDeleted?: () => void;
}

export function BoardSettingsDialog({ open, onOpenChange, board, onDeleted }: Props) {
  const [tab, setTab] = useState("geral");
  useEffect(() => {
    if (open) setTab("geral");
  }, [open]);

  const canAdmin = !!board && (board.meuPapel === "owner" || board.meuPapel === "admin");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl p-0 max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader className="p-4 pb-2 border-b">
          <DialogTitle>Configurações do quadro</DialogTitle>
          <DialogDescription>
            {board?.nome ?? ""}
            {!canAdmin && board ? " · você está em modo somente leitura" : ""}
          </DialogDescription>
        </DialogHeader>

        {!board ? (
          <div className="p-6 space-y-3">
            <Skeleton className="h-6 w-40" />
            <Skeleton className="h-24 w-full" />
          </div>
        ) : (
          <Tabs value={tab} onValueChange={setTab} className="flex-1 flex flex-col min-h-0">
            <TabsList className="mx-4 mt-3 justify-start flex-wrap h-auto">
              <TabsTrigger value="geral" className="gap-1.5">
                <Palette className="h-3.5 w-3.5" /> Geral
              </TabsTrigger>
              <TabsTrigger value="membros" className="gap-1.5">
                <Users className="h-3.5 w-3.5" /> Membros
              </TabsTrigger>
              <TabsTrigger value="colunas" className="gap-1.5">
                <ListTree className="h-3.5 w-3.5" /> Colunas
              </TabsTrigger>
              <TabsTrigger value="labels" className="gap-1.5">
                <TagIcon className="h-3.5 w-3.5" /> Etiquetas
              </TabsTrigger>
              <TabsTrigger value="historico" className="gap-1.5">
                <HistoryIcon className="h-3.5 w-3.5" /> Histórico
              </TabsTrigger>
              <TabsTrigger value="perigo" className="gap-1.5 text-destructive">
                <Shield className="h-3.5 w-3.5" /> Zona de risco
              </TabsTrigger>
            </TabsList>

            <ScrollArea className="flex-1">
              <div className="p-4">
                <TabsContent value="geral" className="m-0">
                  <GeralTab board={board} canAdmin={canAdmin} />
                </TabsContent>
                <TabsContent value="membros" className="m-0">
                  <MembrosTab board={board} canAdmin={canAdmin} />
                </TabsContent>
                <TabsContent value="colunas" className="m-0">
                  <ColunasTab board={board} canAdmin={canAdmin} />
                </TabsContent>
                <TabsContent value="labels" className="m-0">
                  <LabelsTab board={board} canAdmin={canAdmin} />
                </TabsContent>
                <TabsContent value="historico" className="m-0">
                  <HistoricoTab board={board} />
                </TabsContent>
                <TabsContent value="perigo" className="m-0">
                  <PerigoTab
                    board={board}
                    canAdmin={canAdmin}
                    onDeleted={() => {
                      onOpenChange(false);
                      onDeleted?.();
                    }}
                  />
                </TabsContent>
              </div>
            </ScrollArea>
          </Tabs>
        )}
      </DialogContent>
    </Dialog>
  );
}

// ---------------- Geral ----------------
function GeralTab({ board, canAdmin }: { board: BoardResumo; canAdmin: boolean }) {
  const qc = useQueryClient();
  const [nome, setNome] = useState(board.nome);
  const [descricao, setDescricao] = useState(board.descricao ?? "");
  const [cor, setCor] = useState(board.cor ?? COLORS[0]);
  const [icone, setIcone] = useState(board.icone ?? ICONS[0]);
  const [visibilidade, setVisibilidade] = useState<BoardVisibilidade>(board.visibilidade);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setNome(board.nome);
    setDescricao(board.descricao ?? "");
    setCor(board.cor ?? COLORS[0]);
    setIcone(board.icone ?? ICONS[0]);
    setVisibilidade(board.visibilidade);
  }, [board.id, board.nome, board.descricao, board.cor, board.icone, board.visibilidade]);

  async function handleSave() {
    if (!nome.trim()) {
      toast.error("O nome é obrigatório");
      return;
    }
    setSaving(true);
    try {
      await updateBoard(board.id, {
        nome: nome.trim(),
        descricao: descricao.trim(),
        cor,
        icone,
        visibilidade,
      });
      toast.success("Quadro atualizado");
      qc.invalidateQueries({ queryKey: ["atividades", "board-resumo", board.id] });
      qc.invalidateQueries({ queryKey: ["atividades", "boards-resumo"] });
    } catch (e) {
      console.error(e);
      toast.error("Não foi possível salvar as alterações");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      <fieldset disabled={!canAdmin} className="space-y-4 disabled:opacity-70">
        <div className="space-y-2">
          <Label htmlFor="q3-nome">Nome</Label>
          <Input
            id="q3-nome"
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            maxLength={80}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="q3-desc">Descrição</Label>
          <Textarea
            id="q3-desc"
            value={descricao}
            onChange={(e) => setDescricao(e.target.value)}
            rows={3}
            maxLength={500}
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Cor</Label>
            <div className="flex flex-wrap gap-1.5">
              {COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setCor(c)}
                  aria-label={`Cor ${c}`}
                  className={`h-7 w-7 rounded-md border-2 transition ${cor === c ? "border-foreground" : "border-transparent"}`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </div>
          <div className="space-y-2">
            <Label>Ícone</Label>
            <div className="flex flex-wrap gap-1">
              {ICONS.map((i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setIcone(i)}
                  className={`h-8 w-8 rounded-md border text-base ${icone === i ? "border-foreground bg-accent" : "border-border"}`}
                >
                  {i}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <Label>Visibilidade</Label>
          <Select
            value={visibilidade}
            onValueChange={(v) => setVisibilidade(v as BoardVisibilidade)}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="private">Privado</SelectItem>
              <SelectItem value="workspace">Workspace</SelectItem>
              <SelectItem value="public">Público</SelectItem>
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">{VIS_DESCS[visibilidade]}</p>
        </div>

        <div className="pt-2">
          <Button onClick={handleSave} disabled={saving || !canAdmin}>
            {saving ? "Salvando..." : "Salvar alterações"}
          </Button>
        </div>
      </fieldset>
    </div>
  );
}

// ---------------- Membros ----------------
function MembrosTab({ board, canAdmin }: { board: BoardResumo; canAdmin: boolean }) {
  const qc = useQueryClient();
  const membrosQ = useQuery({
    queryKey: ["atividades", "board-membros", board.id],
    queryFn: () => listBoardMembros(board.id),
  });
  const usersQ = useQuery({
    queryKey: ["atividades", "assignable-users"],
    queryFn: listAssignableUsers,
    staleTime: 5 * 60_000,
  });
  const [addUser, setAddUser] = useState<string>("");
  const [addRole, setAddRole] = useState<BoardRole>("member");

  const membros = membrosQ.data ?? [];
  const membrosIds = new Set(membros.map((m) => m.userId));
  const naoMembros = (usersQ.data ?? []).filter((u) => !membrosIds.has(u.id));

  async function handleAdd() {
    if (!addUser) return;
    try {
      await addBoardMembro(board.id, addUser, addRole);
      toast.success("Membro adicionado");
      setAddUser("");
      qc.invalidateQueries({ queryKey: ["atividades", "board-membros", board.id] });
      qc.invalidateQueries({ queryKey: ["atividades", "board-resumo", board.id] });
    } catch (e) {
      console.error(e);
      toast.error("Não foi possível adicionar o membro");
    }
  }

  async function handleRemove(userId: string) {
    if (!confirm("Remover este membro do quadro?")) return;
    try {
      await removeBoardMembro(board.id, userId);
      toast.success("Membro removido");
      qc.invalidateQueries({ queryKey: ["atividades", "board-membros", board.id] });
      qc.invalidateQueries({ queryKey: ["atividades", "board-resumo", board.id] });
    } catch (e) {
      console.error(e);
      toast.error("Não foi possível remover o membro");
    }
  }

  async function handleChangeRole(userId: string, role: BoardRole) {
    try {
      await setBoardMembroRole(board.id, userId, role);
      toast.success("Papel atualizado");
      qc.invalidateQueries({ queryKey: ["atividades", "board-membros", board.id] });
    } catch (e) {
      console.error(e);
      toast.error("Não foi possível alterar o papel");
    }
  }

  return (
    <div className="space-y-4">
      {canAdmin && (
        <div className="rounded-lg border p-3 space-y-2">
          <Label className="text-xs">Adicionar membro</Label>
          <div className="flex flex-wrap gap-2">
            <Select value={addUser} onValueChange={setAddUser}>
              <SelectTrigger className="flex-1 min-w-[200px]">
                <SelectValue placeholder="Selecionar usuário" />
              </SelectTrigger>
              <SelectContent>
                {naoMembros.map((u) => (
                  <SelectItem key={u.id} value={u.id}>
                    {u.nome} — {u.email}
                  </SelectItem>
                ))}
                {naoMembros.length === 0 && (
                  <div className="px-2 py-1.5 text-xs text-muted-foreground">
                    Todos os usuários já são membros.
                  </div>
                )}
              </SelectContent>
            </Select>
            <Select value={addRole} onValueChange={(v) => setAddRole(v as BoardRole)}>
              <SelectTrigger className="w-[160px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="admin">Administrador</SelectItem>
                <SelectItem value="member">Membro</SelectItem>
                <SelectItem value="observer">Observador</SelectItem>
              </SelectContent>
            </Select>
            <Button onClick={handleAdd} disabled={!addUser} size="sm" className="gap-1.5">
              <UserPlus className="h-4 w-4" /> Adicionar
            </Button>
          </div>
        </div>
      )}

      {membrosQ.isLoading ? (
        <Skeleton className="h-40 w-full" />
      ) : (
        <ul className="divide-y rounded-lg border">
          {membros.map((m) => (
            <li key={m.userId} className="flex items-center gap-3 p-3">
              <div className="h-8 w-8 rounded-full bg-primary/10 grid place-items-center text-sm font-medium">
                {(m.nome || "?").charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium truncate">{m.nome}</div>
                <div className="text-xs text-muted-foreground truncate">{m.email}</div>
              </div>
              {canAdmin && m.role !== "owner" ? (
                <Select
                  value={m.role}
                  onValueChange={(v) => handleChangeRole(m.userId, v as BoardRole)}
                >
                  <SelectTrigger className="w-[150px] h-8">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="admin">Administrador</SelectItem>
                    <SelectItem value="member">Membro</SelectItem>
                    <SelectItem value="observer">Observador</SelectItem>
                  </SelectContent>
                </Select>
              ) : (
                <Badge variant="secondary">{ROLE_LABELS[m.role]}</Badge>
              )}
              {canAdmin && m.role !== "owner" && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleRemove(m.userId)}
                  aria-label="Remover"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </li>
          ))}
          {membros.length === 0 && (
            <li className="p-4 text-sm text-muted-foreground text-center">
              Nenhum membro ainda.
            </li>
          )}
        </ul>
      )}
      <div className="text-xs text-muted-foreground space-y-1">
        {(Object.keys(ROLE_LABELS) as BoardRole[]).map((r) => (
          <div key={r}>
            <strong>{ROLE_LABELS[r]}:</strong> {ROLE_DESCS[r]}
          </div>
        ))}
      </div>
    </div>
  );
}

// ---------------- Colunas ----------------
function ColunasTab({ board, canAdmin }: { board: BoardResumo; canAdmin: boolean }) {
  const qc = useQueryClient();
  const colunasQ = useQuery({
    queryKey: ["atividades", "colunas-admin", board.id],
    queryFn: () => listColunas(board.id, { includeArquivadas: true }),
  });
  const [novo, setNovo] = useState("");
  const [editing, setEditing] = useState<{ id: string; nome: string } | null>(null);

  function invalidate() {
    qc.invalidateQueries({ queryKey: ["atividades", "colunas-admin", board.id] });
    qc.invalidateQueries({ queryKey: atividadesKeys.colunas(board.id) });
  }

  async function handleAdd() {
    if (!novo.trim()) return;
    try {
      await criarColuna(board.id, novo.trim());
      setNovo("");
      toast.success("Coluna criada");
      invalidate();
    } catch {
      toast.error("Não foi possível criar a coluna");
    }
  }
  async function handleRename() {
    if (!editing || !editing.nome.trim()) return;
    try {
      await renomearColuna(editing.id, editing.nome.trim());
      setEditing(null);
      toast.success("Coluna renomeada");
      invalidate();
    } catch {
      toast.error("Não foi possível renomear");
    }
  }
  async function handleDuplicate(id: string) {
    try {
      await duplicarColuna(id);
      toast.success("Coluna duplicada");
      invalidate();
    } catch {
      toast.error("Não foi possível duplicar");
    }
  }
  async function handleArchive(id: string, arquivada: boolean) {
    try {
      await arquivarColuna(id, arquivada);
      toast.success(arquivada ? "Coluna arquivada" : "Coluna restaurada");
      invalidate();
    } catch {
      toast.error("Não foi possível atualizar");
    }
  }
  async function handleDelete(id: string) {
    if (!confirm("Excluir esta coluna? (a coluna precisa estar vazia)")) return;
    try {
      await excluirColuna(id);
      toast.success("Coluna excluída");
      invalidate();
    } catch (e) {
      const msg =
        (e as { message?: string })?.message?.includes("coluna_nao_vazia") ||
        (e as { message?: string })?.message?.includes("possui cards")
          ? "A coluna possui cards. Mova-os antes de excluir."
          : "Não foi possível excluir";
      toast.error(msg);
    }
  }

  const colunas = colunasQ.data ?? [];

  return (
    <div className="space-y-4">
      {canAdmin && (
        <div className="flex gap-2">
          <Input
            placeholder="Nome da nova coluna"
            value={novo}
            onChange={(e) => setNovo(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleAdd()}
            maxLength={60}
          />
          <Button onClick={handleAdd} size="sm" className="gap-1.5">
            <Plus className="h-4 w-4" /> Adicionar
          </Button>
        </div>
      )}

      {colunasQ.isLoading ? (
        <Skeleton className="h-32 w-full" />
      ) : (
        <ul className="divide-y rounded-lg border">
          {colunas.map((c) => (
            <li key={c.id} className="flex items-center gap-2 p-3">
              {editing?.id === c.id ? (
                <>
                  <Input
                    value={editing.nome}
                    onChange={(e) => setEditing({ ...editing, nome: e.target.value })}
                    autoFocus
                    onKeyDown={(e) => e.key === "Enter" && handleRename()}
                  />
                  <Button size="sm" onClick={handleRename}>
                    Salvar
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => setEditing(null)}>
                    Cancelar
                  </Button>
                </>
              ) : (
                <>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate flex items-center gap-2">
                      {c.nome}
                      {c.arquivada && (
                        <Badge variant="secondary" className="text-[10px]">
                          Arquivada
                        </Badge>
                      )}
                    </div>
                  </div>
                  {canAdmin && (
                    <div className="flex items-center gap-0.5">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setEditing({ id: c.id, nome: c.nome })}
                        title="Editar"
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDuplicate(c.id)}
                        title="Duplicar"
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleArchive(c.id, !c.arquivada)}
                        title={c.arquivada ? "Restaurar" : "Arquivar"}
                      >
                        {c.arquivada ? (
                          <ArchiveRestore className="h-4 w-4" />
                        ) : (
                          <Archive className="h-4 w-4" />
                        )}
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(c.id)}
                        title="Excluir"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </>
              )}
            </li>
          ))}
          {colunas.length === 0 && (
            <li className="p-4 text-sm text-muted-foreground text-center">
              Nenhuma coluna. Crie a primeira acima.
            </li>
          )}
        </ul>
      )}
    </div>
  );
}

// ---------------- Labels ----------------
function LabelsTab({ board, canAdmin }: { board: BoardResumo; canAdmin: boolean }) {
  const qc = useQueryClient();
  const labelsQ = useQuery({
    queryKey: atividadesKeys.labels(board.id),
    queryFn: () => listLabels(board.id),
  });
  const [busca, setBusca] = useState("");
  const [novo, setNovo] = useState({ nome: "", cor: LABEL_COLORS[0] });
  const [editing, setEditing] = useState<{ id: string; nome: string; cor: string } | null>(
    null,
  );

  const filtered = useMemo(() => {
    const q = busca.trim().toLowerCase();
    const all = labelsQ.data ?? [];
    return q ? all.filter((l) => l.nome.toLowerCase().includes(q)) : all;
  }, [busca, labelsQ.data]);

  function invalidate() {
    qc.invalidateQueries({ queryKey: atividadesKeys.labels(board.id) });
  }
  async function handleCreate() {
    if (!novo.nome.trim()) return;
    try {
      await upsertLabel(board.id, { nome: novo.nome.trim(), cor: novo.cor });
      setNovo({ nome: "", cor: LABEL_COLORS[0] });
      toast.success("Etiqueta criada");
      invalidate();
    } catch {
      toast.error("Não foi possível criar");
    }
  }
  async function handleUpdate() {
    if (!editing || !editing.nome.trim()) return;
    try {
      await upsertLabel(board.id, {
        id: editing.id,
        nome: editing.nome.trim(),
        cor: editing.cor,
      });
      setEditing(null);
      toast.success("Etiqueta atualizada");
      invalidate();
    } catch {
      toast.error("Não foi possível salvar");
    }
  }
  async function handleDelete(l: AtividadeLabel) {
    if (!confirm(`Excluir a etiqueta "${l.nome}"?`)) return;
    try {
      await excluirLabel(l.id);
      toast.success("Etiqueta excluída");
      invalidate();
    } catch {
      toast.error("Não foi possível excluir");
    }
  }

  return (
    <div className="space-y-4">
      <Input
        placeholder="Buscar etiqueta..."
        value={busca}
        onChange={(e) => setBusca(e.target.value)}
      />
      {canAdmin && (
        <div className="rounded-lg border p-3 space-y-2">
          <Label className="text-xs">Nova etiqueta</Label>
          <div className="flex flex-wrap items-center gap-2">
            <Input
              placeholder="Nome"
              value={novo.nome}
              onChange={(e) => setNovo({ ...novo, nome: e.target.value })}
              maxLength={40}
              className="flex-1 min-w-[160px]"
            />
            <div className="flex gap-1">
              {LABEL_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setNovo({ ...novo, cor: c })}
                  className={`h-6 w-6 rounded border-2 ${novo.cor === c ? "border-foreground" : "border-transparent"}`}
                  style={{ backgroundColor: c }}
                  aria-label={c}
                />
              ))}
            </div>
            <Button size="sm" onClick={handleCreate} disabled={!novo.nome.trim()}>
              Criar
            </Button>
          </div>
        </div>
      )}

      {labelsQ.isLoading ? (
        <Skeleton className="h-24 w-full" />
      ) : (
        <ul className="divide-y rounded-lg border">
          {filtered.map((l) => (
            <li key={l.id} className="flex items-center gap-2 p-3">
              {editing?.id === l.id ? (
                <>
                  <Input
                    value={editing.nome}
                    onChange={(e) => setEditing({ ...editing, nome: e.target.value })}
                    className="flex-1"
                  />
                  <div className="flex gap-1">
                    {LABEL_COLORS.map((c) => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => setEditing({ ...editing, cor: c })}
                        className={`h-6 w-6 rounded border-2 ${editing.cor === c ? "border-foreground" : "border-transparent"}`}
                        style={{ backgroundColor: c }}
                      />
                    ))}
                  </div>
                  <Button size="sm" onClick={handleUpdate}>
                    Salvar
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => setEditing(null)}>
                    Cancelar
                  </Button>
                </>
              ) : (
                <>
                  <span
                    className="inline-block h-5 min-w-[80px] rounded px-2 text-xs font-medium text-white leading-5"
                    style={{ backgroundColor: l.cor }}
                  >
                    {l.nome}
                  </span>
                  <span className="flex-1" />
                  {canAdmin && (
                    <>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() =>
                          setEditing({ id: l.id, nome: l.nome, cor: l.cor })
                        }
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(l)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </>
                  )}
                </>
              )}
            </li>
          ))}
          {filtered.length === 0 && (
            <li className="p-4 text-sm text-muted-foreground text-center">
              Nenhuma etiqueta encontrada.
            </li>
          )}
        </ul>
      )}
    </div>
  );
}

// ---------------- Histórico ----------------
const EVENTO_LABEL: Record<string, string> = {
  board_criado: "Quadro criado",
  board_atualizado: "Quadro atualizado",
  board_arquivado: "Quadro arquivado",
  board_desarquivado: "Quadro restaurado",
  coluna_criada: "Coluna criada",
  coluna_renomeada: "Coluna renomeada",
  coluna_excluida: "Coluna excluída",
  coluna_arquivada: "Coluna arquivada",
  coluna_restaurada: "Coluna restaurada",
  colunas_reordenadas: "Colunas reordenadas",
  etiqueta_criada: "Etiqueta criada",
  etiqueta_atualizada: "Etiqueta atualizada",
  etiqueta_excluida: "Etiqueta excluída",
  membro_adicionado: "Membro adicionado",
  membro_removido: "Membro removido",
  membro_papel_alterado: "Papel de membro alterado",
};

function HistoricoTab({ board }: { board: BoardResumo }) {
  const histQ = useQuery({
    queryKey: ["atividades", "board-historico", board.id],
    queryFn: () => listBoardHistorico(board.id, 100),
  });
  if (histQ.isLoading) return <Skeleton className="h-40 w-full" />;
  const items = histQ.data ?? [];
  if (items.length === 0) {
    return (
      <p className="text-sm text-muted-foreground text-center py-8">
        Nenhuma atividade registrada ainda.
      </p>
    );
  }
  return (
    <ol className="relative border-l ml-3 space-y-4">
      {items.map((h) => (
        <li key={h.id} className="ml-4">
          <div className="absolute -left-1.5 mt-1 h-3 w-3 rounded-full bg-primary" />
          <div className="text-sm">
            <span className="font-medium">
              {EVENTO_LABEL[h.evento] ?? h.evento}
            </span>
            {h.userEmail && (
              <span className="text-muted-foreground"> · {h.userEmail}</span>
            )}
          </div>
          <div className="text-xs text-muted-foreground">
            {new Date(h.createdAt).toLocaleString()}
          </div>
        </li>
      ))}
    </ol>
  );
}

// ---------------- Perigo ----------------
function PerigoTab({
  board,
  canAdmin,
  onDeleted,
}: {
  board: BoardResumo;
  canAdmin: boolean;
  onDeleted: () => void;
}) {
  const qc = useQueryClient();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  async function handleDelete() {
    setBusy(true);
    try {
      await deleteBoard(board.id);
      toast.success("Quadro excluído");
      qc.invalidateQueries({ queryKey: ["atividades", "boards-resumo"] });
      onDeleted();
    } catch (e) {
      console.error(e);
      toast.error("Não foi possível excluir");
    } finally {
      setBusy(false);
      setConfirmOpen(false);
    }
  }

  if (!canAdmin) {
    return (
      <p className="text-sm text-muted-foreground">
        Apenas administradores do quadro podem executar ações destrutivas.
      </p>
    );
  }
  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-destructive/40 p-4">
        <h4 className="font-medium text-destructive">Excluir quadro</h4>
        <p className="text-sm text-muted-foreground mt-1">
          Esta ação é permanente. Todos os cards, colunas, etiquetas e anexos deste
          quadro serão perdidos.
        </p>
        <Button
          variant="destructive"
          size="sm"
          className="mt-3"
          onClick={() => setConfirmOpen(true)}
        >
          Excluir quadro
        </Button>
      </div>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir quadro?</AlertDialogTitle>
            <AlertDialogDescription>
              Você está prestes a excluir permanentemente <strong>{board.nome}</strong>.
              Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={busy}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={busy}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {busy ? "Excluindo..." : "Excluir permanentemente"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
