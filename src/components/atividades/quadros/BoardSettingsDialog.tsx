import { useEffect, useMemo, useRef, useState } from "react";
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
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
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
  Eye,
  Copy,
  ImageIcon,
  Lock,
  Globe,
  Building2,
  Search,
  Upload,
  X,
  Star,
  GripVertical,
  Mail,
  Filter,
} from "lucide-react";
import {
  DndContext,
  PointerSensor,
  KeyboardSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";


import {
  updateBoard,
  deleteBoard,
  listBoardMembros,
  addBoardMembro,
  removeBoardMembro,
  setBoardMembroRole,
  setBoardArquivado,
  criarColuna,
  renomearColuna,
  excluirColuna,
  arquivarColuna,
  duplicarColuna,
  reordenarColunas,
  upsertLabel,
  excluirLabel,
  listBoardHistorico,
  setColunaWip,
  setLabelFavorita,
  reorderLabels,
  countCardsByLabel,
  uploadCoverImage,
  removeCoverImage,
  getCoverDisplayUrl,
  validateCapa,
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
const BG_COLORS = [
  "",
  "#0ea5e9",
  "#6366f1",
  "#8b5cf6",
  "#ec4899",
  "#f97316",
  "#10b981",
  "#0f172a",
];
const ICONS = ["📋", "🚀", "🎯", "💡", "🛠️", "📊", "🧭", "🏗️"];
// Paleta Trello vívida (mantém consistência com labels/covers/colunas).
const LABEL_COLORS = [
  "#4bce97", // green
  "#f5cd47", // yellow
  "#fea362", // orange
  "#f87168", // red
  "#9f8fef", // purple
  "#579dff", // blue
  "#6cc3e0", // sky
  "#94c748", // lime
  "#e774bb", // pink
  "#8590a2", // slate
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

const VIS_META: Record<
  BoardVisibilidade,
  { label: string; desc: string; icon: typeof Lock }
> = {
  private: {
    label: "Privado",
    desc: "Apenas membros convidados podem acessar este quadro.",
    icon: Lock,
  },
  workspace: {
    label: "Workspace",
    desc: "Todos os usuários do Grupo Bloco podem visualizar este quadro.",
    icon: Building2,
  },
  public: {
    label: "Público",
    desc: "Qualquer usuário logado na plataforma pode acessar.",
    icon: Globe,
  },
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
              <TabsTrigger value="visibilidade" className="gap-1.5">
                <Eye className="h-3.5 w-3.5" /> Visibilidade
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

            <div className="flex-1 overflow-y-auto overscroll-contain">
              <div className="p-4">
                <TabsContent value="geral" className="m-0">
                  <GeralTab board={board} canAdmin={canAdmin} />
                </TabsContent>
                <TabsContent value="membros" className="m-0">
                  <MembrosTab board={board} canAdmin={canAdmin} />
                </TabsContent>
                <TabsContent value="visibilidade" className="m-0">
                  <VisibilidadeTab board={board} canAdmin={canAdmin} />
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
            </div>
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
  const [background, setBackground] = useState(board.background ?? "");
  const [coverUrl, setCoverUrl] = useState(board.coverUrl ?? "");
  const [coverPreview, setCoverPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const coverInputRef = useRef<HTMLInputElement | null>(null);
  const [saving, setSaving] = useState(false);
  const [archiving, setArchiving] = useState(false);

  useEffect(() => {
    let alive = true;
    (async () => {
      const url = await getCoverDisplayUrl(coverUrl || null);
      if (alive) setCoverPreview(url);
    })();
    return () => {
      alive = false;
    };
  }, [coverUrl]);


  useEffect(() => {
    setNome(board.nome);
    setDescricao(board.descricao ?? "");
    setCor(board.cor ?? COLORS[0]);
    setIcone(board.icone ?? ICONS[0]);
    setBackground(board.background ?? "");
    setCoverUrl(board.coverUrl ?? "");
  }, [board.id, board.nome, board.descricao, board.cor, board.icone, board.background, board.coverUrl]);

  function invalidateBoard() {
    qc.invalidateQueries({ queryKey: ["atividades", "board-resumo", board.id] });
    qc.invalidateQueries({ queryKey: ["atividades", "boards-resumo"] });
  }

  async function handleSave() {
    if (!nome.trim()) {
      toast.error("O nome é obrigatório");
      return;
    }
    // A capa pode ser uma URL http(s) OU um path do bucket enviado por upload.

    setSaving(true);
    try {
      await updateBoard(board.id, {
        nome: nome.trim(),
        descricao: descricao.trim(),
        cor,
        icone,
        background: background || null,
        coverUrl: coverUrl.trim() || null,
      });
      toast.success("Quadro atualizado");
      invalidateBoard();
    } catch (e) {
      console.error(e);
      toast.error("Não foi possível salvar as alterações");
    } finally {
      setSaving(false);
    }
  }

  async function handleUploadCover(file: File) {
    const err = validateCapa(file);
    if (err) {
      toast.error(err);
      return;
    }
    setUploading(true);
    try {
      const oldPath =
        coverUrl && !/^https?:\/\//i.test(coverUrl) ? coverUrl : null;
      const path = await uploadCoverImage(board.id, file);
      await updateBoard(board.id, { coverUrl: path });
      setCoverUrl(path);
      if (oldPath) {
        try {
          await removeCoverImage(oldPath);
        } catch {
          /* ignore */
        }
      }
      toast.success("Capa atualizada");
      invalidateBoard();
    } catch (e) {
      console.error(e);
      toast.error("Falha ao enviar imagem de capa");
    } finally {
      setUploading(false);
      if (coverInputRef.current) coverInputRef.current.value = "";
    }
  }

  async function handleRemoveCover() {
    if (!coverUrl) return;
    if (!confirm("Remover a imagem de capa?")) return;
    setUploading(true);
    try {
      const path =
        coverUrl && !/^https?:\/\//i.test(coverUrl) ? coverUrl : null;
      await updateBoard(board.id, { coverUrl: null });
      setCoverUrl("");
      if (path) {
        try {
          await removeCoverImage(path);
        } catch {
          /* ignore */
        }
      }
      toast.success("Capa removida");
      invalidateBoard();
    } catch {
      toast.error("Não foi possível remover a capa");
    } finally {
      setUploading(false);
    }
  }

  async function handleToggleArquivar() {

    setArchiving(true);
    try {
      await setBoardArquivado(board.id, !board.arquivado);
      toast.success(board.arquivado ? "Quadro restaurado" : "Quadro arquivado");
      invalidateBoard();
    } catch (e) {
      console.error(e);
      toast.error("Não foi possível atualizar o quadro");
    } finally {
      setArchiving(false);
    }
  }

  return (
    <div className="space-y-5">
      <fieldset disabled={!canAdmin} className="space-y-5 disabled:opacity-70">
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

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Cor de destaque</Label>
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
          <Label>Cor de fundo do quadro</Label>
          <div className="flex flex-wrap gap-1.5 items-center">
            {BG_COLORS.map((c) => (
              <button
                key={c || "none"}
                type="button"
                onClick={() => setBackground(c)}
                aria-label={c ? `Fundo ${c}` : "Sem fundo"}
                className={`h-7 w-7 rounded-md border-2 transition grid place-items-center text-[10px] text-muted-foreground ${background === c ? "border-foreground" : "border-transparent"}`}
                style={{ backgroundColor: c || "transparent" }}
              >
                {c ? "" : "—"}
              </button>
            ))}
            <Input
              value={background}
              onChange={(e) => setBackground(e.target.value)}
              placeholder="#hex ou hsl()"
              className="h-8 w-40"
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label className="flex items-center gap-2">
            <ImageIcon className="h-3.5 w-3.5" /> Imagem de capa
          </Label>
          <div className="flex flex-wrap items-center gap-2">
            <input
              ref={coverInputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp,image/gif"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleUploadCover(f);
              }}
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="gap-1.5"
              onClick={() => coverInputRef.current?.click()}
              disabled={!canAdmin || uploading}
            >
              <Upload className="h-4 w-4" />
              {uploading ? "Enviando..." : coverUrl ? "Trocar imagem" : "Enviar imagem"}
            </Button>
            {coverUrl && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="gap-1.5 text-destructive"
                onClick={handleRemoveCover}
                disabled={!canAdmin || uploading}
              >
                <X className="h-4 w-4" /> Remover
              </Button>
            )}
          </div>
          <div className="space-y-1">
            <Label htmlFor="q3-cover" className="text-xs text-muted-foreground">
              …ou cole uma URL pública
            </Label>
            <Input
              id="q3-cover"
              value={/^https?:\/\//i.test(coverUrl) ? coverUrl : ""}
              onChange={(e) => setCoverUrl(e.target.value)}
              placeholder="https://..."
              disabled={!canAdmin || uploading}
            />
            <p className="text-[11px] text-muted-foreground">
              PNG, JPG, WEBP ou GIF até 5&nbsp;MB. Imagens enviadas ficam privadas ao quadro.
            </p>
          </div>
          {coverPreview && (
            <div className="mt-2 rounded-lg border overflow-hidden max-h-40 bg-muted">
              <img
                src={coverPreview}
                alt="Prévia da capa"
                className="w-full h-40 object-cover"
                onError={(e) => {
                  (e.currentTarget as HTMLImageElement).style.display = "none";
                }}
              />
            </div>
          )}
        </div>


        <div className="pt-2 flex flex-wrap items-center gap-2">
          <Button onClick={handleSave} disabled={saving || !canAdmin}>
            {saving ? "Salvando..." : "Salvar alterações"}
          </Button>
          <Button
            variant="outline"
            onClick={handleToggleArquivar}
            disabled={archiving || !canAdmin}
            className="gap-1.5"
          >
            {board.arquivado ? (
              <>
                <ArchiveRestore className="h-4 w-4" />
                {archiving ? "Restaurando..." : "Restaurar quadro"}
              </>
            ) : (
              <>
                <Archive className="h-4 w-4" />
                {archiving ? "Arquivando..." : "Arquivar quadro"}
              </>
            )}
          </Button>
          {board.arquivado && (
            <Badge variant="secondary" className="ml-1">
              Arquivado
            </Badge>
          )}
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
  const [busca, setBusca] = useState("");
  const [busy, setBusy] = useState<string | null>(null);

  const membros = membrosQ.data ?? [];
  const membrosIds = useMemo(() => new Set(membros.map((m) => m.userId)), [membros]);
  const naoMembros = (usersQ.data ?? []).filter((u) => !membrosIds.has(u.id));

  const membrosFiltrados = useMemo(() => {
    const q = busca.trim().toLowerCase();
    if (!q) return membros;
    return membros.filter(
      (m) =>
        m.nome.toLowerCase().includes(q) ||
        m.email.toLowerCase().includes(q),
    );
  }, [membros, busca]);

  function invalidate() {
    qc.invalidateQueries({ queryKey: ["atividades", "board-membros", board.id] });
    qc.invalidateQueries({ queryKey: ["atividades", "board-membros-topo", board.id] });
    qc.invalidateQueries({ queryKey: ["atividades", "board-resumo", board.id] });
    qc.invalidateQueries({ queryKey: ["atividades", "board-historico", board.id] });
  }

  async function handleAdd() {
    if (!addUser) return;
    setBusy("add");
    try {
      await addBoardMembro(board.id, addUser, addRole);
      toast.success("Membro adicionado");
      setAddUser("");
      invalidate();
    } catch (e) {
      console.error(e);
      toast.error("Não foi possível adicionar o membro");
    } finally {
      setBusy(null);
    }
  }

  async function handleRemove(userId: string) {
    if (!confirm("Remover este membro do quadro?")) return;
    setBusy(userId);
    try {
      await removeBoardMembro(board.id, userId);
      toast.success("Membro removido");
      invalidate();
    } catch (e) {
      console.error(e);
      toast.error("Não foi possível remover o membro");
    } finally {
      setBusy(null);
    }
  }

  async function handleChangeRole(userId: string, role: BoardRole) {
    setBusy(userId);
    try {
      await setBoardMembroRole(board.id, userId, role);
      toast.success("Papel atualizado");
      invalidate();
    } catch (e) {
      console.error(e);
      toast.error("Não foi possível alterar o papel");
    } finally {
      setBusy(null);
    }
  }

  function initials(m: { nome: string; email: string }) {
    const base = (m.nome || m.email || "?").trim();
    return base
      .split(/\s+/)
      .map((p) => p[0])
      .filter(Boolean)
      .slice(0, 2)
      .join("")
      .toUpperCase();
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
            <Button
              onClick={handleAdd}
              disabled={!addUser || busy === "add"}
              size="sm"
              className="gap-1.5"
            >
              <UserPlus className="h-4 w-4" />
              {busy === "add" ? "Adicionando..." : "Adicionar"}
            </Button>
          </div>
          <div className="pt-2 border-t mt-1 flex flex-wrap items-center gap-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="gap-1.5 text-muted-foreground"
              disabled
              title="Envio de convites por e-mail chegará em uma próxima onda."
            >
              <Mail className="h-4 w-4" /> Convidar por e-mail
            </Button>
            <span className="text-[11px] text-muted-foreground">
              Em breve — hoje o usuário precisa existir na plataforma.
            </span>
          </div>
        </div>
      )}


      <div className="relative">
        <Search className="h-3.5 w-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Buscar membro..."
          className="pl-8"
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
        />
      </div>

      {membrosQ.isLoading ? (
        <div className="space-y-2">
          <Skeleton className="h-14 w-full" />
          <Skeleton className="h-14 w-full" />
          <Skeleton className="h-14 w-full" />
        </div>
      ) : membrosFiltrados.length === 0 ? (
        <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
          {busca ? "Nenhum membro encontrado para essa busca." : "Nenhum membro ainda."}
        </div>
      ) : (
        <ul className="divide-y rounded-lg border">
          {membrosFiltrados.map((m) => {
            const isOwner = m.role === "owner";
            const disabled = busy === m.userId;
            return (
              <li key={m.userId} className="flex items-center gap-3 p-3">
                <Avatar className="h-9 w-9">
                  {m.avatarUrl && <AvatarImage src={m.avatarUrl} alt={m.nome} />}
                  <AvatarFallback className="text-xs bg-slate-200 text-slate-800">{initials(m)}</AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate flex items-center gap-2">
                    {m.nome || "Sem nome"}
                    {isOwner && (
                      <Badge variant="outline" className="text-[10px]">
                        Proprietário
                      </Badge>
                    )}
                  </div>
                  <div className="text-xs text-muted-foreground truncate">{m.email}</div>
                </div>
                {canAdmin && !isOwner ? (
                  <Select
                    value={m.role}
                    onValueChange={(v) => handleChangeRole(m.userId, v as BoardRole)}
                    disabled={disabled}
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
                {canAdmin && !isOwner && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleRemove(m.userId)}
                    disabled={disabled}
                    aria-label="Remover"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </li>
            );
          })}
        </ul>
      )}

      <div className="text-xs text-muted-foreground space-y-1 rounded-lg border p-3 bg-muted/40">
        {(Object.keys(ROLE_LABELS) as BoardRole[]).map((r) => (
          <div key={r}>
            <strong>{ROLE_LABELS[r]}:</strong> {ROLE_DESCS[r]}
          </div>
        ))}
      </div>
    </div>
  );
}

// ---------------- Visibilidade ----------------
function VisibilidadeTab({
  board,
  canAdmin,
}: {
  board: BoardResumo;
  canAdmin: boolean;
}) {
  const qc = useQueryClient();
  const [value, setValue] = useState<BoardVisibilidade>(board.visibilidade);
  const [saving, setSaving] = useState(false);

  useEffect(() => setValue(board.visibilidade), [board.id, board.visibilidade]);

  async function handleSave() {
    if (value === board.visibilidade) return;
    setSaving(true);
    try {
      await updateBoard(board.id, { visibilidade: value });
      toast.success("Visibilidade atualizada");
      qc.invalidateQueries({ queryKey: ["atividades", "board-resumo", board.id] });
      qc.invalidateQueries({ queryKey: ["atividades", "boards-resumo"] });
      qc.invalidateQueries({ queryKey: ["atividades", "board-historico", board.id] });
    } catch (e) {
      console.error(e);
      toast.error("Não foi possível atualizar a visibilidade");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Defina quem pode acessar este quadro na plataforma.
      </p>
      <fieldset disabled={!canAdmin} className="disabled:opacity-70">
        <RadioGroup
          value={value}
          onValueChange={(v) => setValue(v as BoardVisibilidade)}
          className="space-y-2"
        >
          {(Object.keys(VIS_META) as BoardVisibilidade[]).map((k) => {
            const meta = VIS_META[k];
            const Icon = meta.icon;
            const selected = value === k;
            return (
              <label
                key={k}
                htmlFor={`vis-${k}`}
                className={`flex items-start gap-3 rounded-lg border p-3 cursor-pointer transition ${
                  selected ? "border-primary bg-primary/5" : "border-border"
                }`}
              >
                <RadioGroupItem id={`vis-${k}`} value={k} className="mt-1" />
                <Icon className="h-4 w-4 mt-0.5 text-muted-foreground" />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium">{meta.label}</div>
                  <p className="text-xs text-muted-foreground">{meta.desc}</p>
                </div>
                {board.visibilidade === k && (
                  <Badge variant="outline" className="text-[10px]">
                    Atual
                  </Badge>
                )}
              </label>
            );
          })}
        </RadioGroup>
        <div className="pt-4">
          <Button
            onClick={handleSave}
            disabled={saving || value === board.visibilidade || !canAdmin}
          >
            {saving ? "Salvando..." : "Salvar visibilidade"}
          </Button>
        </div>
      </fieldset>
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
  const [busy, setBusy] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  function invalidate() {
    qc.invalidateQueries({ queryKey: ["atividades", "colunas-admin", board.id] });
    qc.invalidateQueries({ queryKey: atividadesKeys.colunas(board.id) });
    qc.invalidateQueries({ queryKey: ["atividades", "board-historico", board.id] });
  }

  async function handleAdd() {
    if (!novo.trim()) return;
    setBusy("add");
    try {
      await criarColuna(board.id, novo.trim());
      setNovo("");
      toast.success("Coluna criada");
      invalidate();
    } catch {
      toast.error("Não foi possível criar a coluna");
    } finally {
      setBusy(null);
    }
  }
  async function handleRename() {
    if (!editing || !editing.nome.trim()) return;
    setBusy(editing.id);
    try {
      await renomearColuna(editing.id, editing.nome.trim());
      setEditing(null);
      toast.success("Coluna renomeada");
      invalidate();
    } catch {
      toast.error("Não foi possível renomear");
    } finally {
      setBusy(null);
    }
  }
  async function handleDuplicate(id: string) {
    setBusy(id);
    try {
      await duplicarColuna(id);
      toast.success("Coluna duplicada");
      invalidate();
    } catch {
      toast.error("Não foi possível duplicar");
    } finally {
      setBusy(null);
    }
  }
  async function handleArchive(id: string, arquivada: boolean) {
    setBusy(id);
    try {
      await arquivarColuna(id, arquivada);
      toast.success(arquivada ? "Coluna arquivada" : "Coluna restaurada");
      invalidate();
    } catch {
      toast.error("Não foi possível atualizar");
    } finally {
      setBusy(null);
    }
  }
  async function handleDelete(id: string) {
    if (!confirm("Excluir esta coluna? (a coluna precisa estar vazia)")) return;
    setBusy(id);
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
    } finally {
      setBusy(null);
    }
  }

  async function handleDragEnd(ev: DragEndEvent) {
    const { active, over } = ev;
    if (!over || active.id === over.id) return;
    const list = [...(colunasQ.data ?? [])];
    const from = list.findIndex((c) => c.id === active.id);
    const to = list.findIndex((c) => c.id === over.id);
    if (from < 0 || to < 0) return;
    const reordered = arrayMove(list, from, to);
    const items = reordered.map((c, i) => ({ id: c.id, ordem: i }));
    qc.setQueryData(["atividades", "colunas-admin", board.id], reordered);
    try {
      await reordenarColunas(board.id, items);
      invalidate();
    } catch {
      toast.error("Não foi possível reordenar");
      invalidate();
    }
  }

  async function handleWipChange(colId: string, raw: string) {
    const n = raw.trim() === "" ? null : Math.max(0, Math.min(999, parseInt(raw, 10) || 0));
    setBusy(colId);
    try {
      await setColunaWip(colId, n);
      invalidate();
    } catch {
      toast.error("Não foi possível atualizar o WIP");
    } finally {
      setBusy(null);
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
          <Button
            onClick={handleAdd}
            size="sm"
            disabled={busy === "add" || !novo.trim()}
            className="gap-1.5"
          >
            <Plus className="h-4 w-4" /> Adicionar
          </Button>
        </div>
      )}

      {colunasQ.isLoading ? (
        <div className="space-y-2">
          <Skeleton className="h-14 w-full" />
          <Skeleton className="h-14 w-full" />
          <Skeleton className="h-14 w-full" />
        </div>
      ) : colunas.length === 0 ? (
        <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
          Nenhuma coluna. Crie a primeira acima.
        </div>
      ) : (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={colunas.map((c) => c.id)} strategy={verticalListSortingStrategy}>
            <ul className="divide-y rounded-lg border">
              {colunas.map((c) => (
                <SortableColunaRow
                  key={c.id}
                  id={c.id}
                  canAdmin={canAdmin}
                  busy={busy === c.id}
                  isEditing={editing?.id === c.id}
                >
                  {editing?.id === c.id ? (
                    <>
                      <Input
                        value={editing.nome}
                        onChange={(e) => setEditing({ ...editing, nome: e.target.value })}
                        autoFocus
                        onKeyDown={(e) => e.key === "Enter" && handleRename()}
                      />
                      <Button size="sm" onClick={handleRename} disabled={busy === editing.id}>
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
                      <div className="flex items-center gap-1" title="Limite de WIP (0 = sem limite)">
                        <Label className="text-[10px] text-muted-foreground uppercase tracking-wide">
                          WIP
                        </Label>
                        <Input
                          type="number"
                          min={0}
                          max={999}
                          defaultValue={c.wipLimit ?? ""}
                          onBlur={(e) => {
                            const v = e.currentTarget.value;
                            const cur = c.wipLimit ?? null;
                            const nxt = v.trim() === "" ? null : parseInt(v, 10) || 0;
                            if ((nxt || null) !== cur) handleWipChange(c.id, v);
                          }}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") (e.currentTarget as HTMLInputElement).blur();
                          }}
                          className="h-7 w-16 text-xs"
                          disabled={!canAdmin || busy === c.id}
                        />
                      </div>
                      {canAdmin && (
                        <div className="flex items-center gap-0.5">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setEditing({ id: c.id, nome: c.nome })}
                            title="Renomear"
                            disabled={busy === c.id}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDuplicate(c.id)}
                            title="Duplicar"
                            disabled={busy === c.id}
                          >
                            <Copy className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleArchive(c.id, !c.arquivada)}
                            title={c.arquivada ? "Restaurar" : "Arquivar"}
                            disabled={busy === c.id}
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
                            disabled={busy === c.id}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      )}
                    </>
                  )}
                </SortableColunaRow>
              ))}
            </ul>
          </SortableContext>
        </DndContext>
      )}
      <p className="text-xs text-muted-foreground">
        Arraste pelo ícone <GripVertical className="h-3 w-3 inline align-text-bottom" /> para
        reordenar. WIP limita o número de cards ativos por coluna.
      </p>
    </div>
  );
}

function SortableColunaRow({
  id,
  canAdmin,
  busy,
  isEditing,
  children,
}: {
  id: string;
  canAdmin: boolean;
  busy: boolean;
  isEditing: boolean;
  children: React.ReactNode;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id,
    disabled: !canAdmin || isEditing || busy,
  });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.6 : 1,
  };
  return (
    <li ref={setNodeRef} style={style} className="flex items-center gap-2 p-3 bg-background">
      {canAdmin && !isEditing && (
        <button
          type="button"
          className="cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground touch-none"
          aria-label="Arrastar para reordenar"
          {...attributes}
          {...listeners}
        >
          <GripVertical className="h-4 w-4" />
        </button>
      )}
      {children}
    </li>
  );
}


// ---------------- Labels ----------------
function LabelsTab({ board, canAdmin }: { board: BoardResumo; canAdmin: boolean }) {
  const qc = useQueryClient();
  const labelsQ = useQuery({
    queryKey: atividadesKeys.labels(board.id),
    queryFn: () => listLabels(board.id),
  });
  const countsQ = useQuery({
    queryKey: ["atividades", "labels-counts", board.id],
    queryFn: () => countCardsByLabel(board.id),
    staleTime: 60_000,
  });
  const [busca, setBusca] = useState("");
  const [novo, setNovo] = useState({ nome: "", cor: LABEL_COLORS[0] });
  const [editing, setEditing] = useState<{ id: string; nome: string; cor: string } | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const filtered = useMemo(() => {
    const q = busca.trim().toLowerCase();
    const all = labelsQ.data ?? [];
    return q ? all.filter((l) => l.nome.toLowerCase().includes(q)) : all;
  }, [busca, labelsQ.data]);

  function invalidate() {
    qc.invalidateQueries({ queryKey: atividadesKeys.labels(board.id) });
    qc.invalidateQueries({ queryKey: ["atividades", "labels-counts", board.id] });
    qc.invalidateQueries({ queryKey: ["atividades", "board-historico", board.id] });
  }
  async function handleCreate() {
    if (!novo.nome.trim()) return;
    setBusy("create");
    try {
      await upsertLabel(board.id, { nome: novo.nome.trim(), cor: novo.cor });
      setNovo({ nome: "", cor: LABEL_COLORS[0] });
      toast.success("Etiqueta criada");
      invalidate();
    } catch {
      toast.error("Não foi possível criar");
    } finally {
      setBusy(null);
    }
  }
  async function handleUpdate() {
    if (!editing || !editing.nome.trim()) return;
    setBusy(editing.id);
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
    } finally {
      setBusy(null);
    }
  }
  async function handleDelete(l: AtividadeLabel) {
    if (!confirm(`Excluir a etiqueta "${l.nome}"?`)) return;
    setBusy(l.id);
    try {
      await excluirLabel(l.id);
      toast.success("Etiqueta excluída");
      invalidate();
    } catch {
      toast.error("Não foi possível excluir");
    } finally {
      setBusy(null);
    }
  }
  async function handleToggleFav(l: AtividadeLabel) {
    setBusy(l.id);
    try {
      await setLabelFavorita(l.id, !l.favorita);
      invalidate();
    } catch {
      toast.error("Não foi possível atualizar favorita");
    } finally {
      setBusy(null);
    }
  }
  async function handleDragEnd(ev: DragEndEvent) {
    const { active, over } = ev;
    if (!over || active.id === over.id) return;
    // Só permite reordenar entre labels do mesmo grupo (favorita/não-favorita)
    const list = [...(labelsQ.data ?? [])];
    const from = list.findIndex((l) => l.id === active.id);
    const to = list.findIndex((l) => l.id === over.id);
    if (from < 0 || to < 0) return;
    if ((list[from].favorita ?? false) !== (list[to].favorita ?? false)) {
      toast.info("Não é possível trocar a ordem entre favoritas e comuns.");
      return;
    }
    const reordered = arrayMove(list, from, to);
    const items = reordered.map((l, i) => ({ id: l.id, ordem: i }));
    qc.setQueryData(atividadesKeys.labels(board.id), reordered);
    try {
      await reorderLabels(board.id, items);
      invalidate();
    } catch {
      toast.error("Não foi possível reordenar");
      invalidate();
    }
  }

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search className="h-3.5 w-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Buscar etiqueta..."
          className="pl-8"
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
        />
      </div>
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
            <Button
              size="sm"
              onClick={handleCreate}
              disabled={!novo.nome.trim() || busy === "create"}
            >
              {busy === "create" ? "Criando..." : "Criar"}
            </Button>
          </div>
        </div>
      )}

      {labelsQ.isLoading ? (
        <div className="space-y-2">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
          {busca ? "Nenhuma etiqueta encontrada." : "Ainda não há etiquetas neste quadro."}
        </div>
      ) : (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext
            items={filtered.map((l) => l.id)}
            strategy={verticalListSortingStrategy}
          >
            <ul className="divide-y rounded-lg border">
              {filtered.map((l) => {
                const count = countsQ.data?.get(l.id) ?? 0;
                const isEditing = editing?.id === l.id;
                return (
                  <SortableLabelRow
                    key={l.id}
                    id={l.id}
                    canAdmin={canAdmin && !busca}
                    busy={busy === l.id}
                    isEditing={isEditing}
                  >
                    {isEditing ? (
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
                        <Button size="sm" onClick={handleUpdate} disabled={busy === editing.id}>
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
                        <Badge
                          variant="outline"
                          className="text-[10px] tabular-nums"
                          title="Cards com esta etiqueta"
                        >
                          {count}
                        </Badge>
                        <span className="flex-1" />
                        {canAdmin && (
                          <>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleToggleFav(l)}
                              disabled={busy === l.id}
                              title={l.favorita ? "Remover dos favoritos" : "Marcar como favorita"}
                            >
                              <Star
                                className={`h-4 w-4 ${l.favorita ? "fill-amber-400 text-amber-400" : ""}`}
                              />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() =>
                                setEditing({ id: l.id, nome: l.nome, cor: l.cor })
                              }
                              disabled={busy === l.id}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDelete(l)}
                              disabled={busy === l.id}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </>
                        )}
                      </>
                    )}
                  </SortableLabelRow>
                );
              })}
            </ul>
          </SortableContext>
        </DndContext>
      )}
      {!busca && canAdmin && (
        <p className="text-xs text-muted-foreground">
          Arraste pelo ícone <GripVertical className="h-3 w-3 inline align-text-bottom" /> para
          reordenar. Favoritas aparecem primeiro nos menus.
        </p>
      )}
    </div>
  );
}

function SortableLabelRow({
  id,
  canAdmin,
  busy,
  isEditing,
  children,
}: {
  id: string;
  canAdmin: boolean;
  busy: boolean;
  isEditing: boolean;
  children: React.ReactNode;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id,
    disabled: !canAdmin || isEditing || busy,
  });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.6 : 1,
  };
  return (
    <li ref={setNodeRef} style={style} className="flex items-center gap-2 p-3 bg-background">
      {canAdmin && !isEditing && (
        <button
          type="button"
          className="cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground touch-none"
          aria-label="Arrastar para reordenar"
          {...attributes}
          {...listeners}
        >
          <GripVertical className="h-4 w-4" />
        </button>
      )}
      {children}
    </li>
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
  coluna_duplicada: "Coluna duplicada",
  colunas_reordenadas: "Colunas reordenadas",
  etiqueta_criada: "Etiqueta criada",
  etiqueta_atualizada: "Etiqueta atualizada",
  etiqueta_excluida: "Etiqueta excluída",
  membro_adicionado: "Membro adicionado",
  membro_removido: "Membro removido",
  membro_papel_alterado: "Papel de membro alterado",
};

const HIST_CATEGORIAS: Array<{ id: string; label: string; match: (ev: string) => boolean }> = [
  { id: "board", label: "Quadro", match: (e) => e.startsWith("board_") },
  { id: "coluna", label: "Colunas", match: (e) => e.startsWith("coluna") },
  { id: "etiqueta", label: "Etiquetas", match: (e) => e.startsWith("etiqueta_") },
  { id: "membro", label: "Membros", match: (e) => e.startsWith("membro_") },
];

function HistoricoTab({ board }: { board: BoardResumo }) {
  const histQ = useQuery({
    queryKey: ["atividades", "board-historico", board.id],
    queryFn: () => listBoardHistorico(board.id, 100),
    refetchOnWindowFocus: true,
  });
  const [busca, setBusca] = useState("");
  const [cats, setCats] = useState<Set<string>>(new Set());

  const items = histQ.data ?? [];
  const filtered = useMemo(() => {
    const q = busca.trim().toLowerCase();
    return items.filter((h) => {
      if (cats.size > 0) {
        const match = HIST_CATEGORIAS.some((c) => cats.has(c.id) && c.match(h.evento));
        if (!match) return false;
      }
      if (!q) return true;
      const label = (EVENTO_LABEL[h.evento] ?? h.evento).toLowerCase();
      return (
        label.includes(q) ||
        (h.userEmail ?? "").toLowerCase().includes(q) ||
        JSON.stringify(h.payload ?? {}).toLowerCase().includes(q)
      );
    });
  }, [items, busca, cats]);

  function toggleCat(id: string) {
    setCats((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="h-3.5 w-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar no histórico..."
            className="pl-8"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-1 flex-wrap">
          <Filter className="h-3.5 w-3.5 text-muted-foreground mr-1" />
          {HIST_CATEGORIAS.map((c) => {
            const on = cats.has(c.id);
            return (
              <button
                key={c.id}
                type="button"
                onClick={() => toggleCat(c.id)}
                className={`text-xs rounded-full border px-2.5 py-0.5 transition ${
                  on
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-background text-muted-foreground hover:text-foreground"
                }`}
              >
                {c.label}
              </button>
            );
          })}
          {cats.size > 0 && (
            <button
              type="button"
              onClick={() => setCats(new Set())}
              className="text-xs text-muted-foreground underline underline-offset-2 ml-1"
            >
              limpar
            </button>
          )}
        </div>
      </div>

      {histQ.isLoading ? (
        <div className="space-y-2">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
          {items.length === 0
            ? "Nenhuma atividade registrada ainda."
            : "Nenhum evento com os filtros atuais."}
        </div>
      ) : (
        <ol className="relative border-l ml-3 space-y-4">
          {filtered.map((h) => (
            <li key={h.id} className="ml-4 relative">
              <span className="absolute -left-[22px] top-1.5 h-3 w-3 rounded-full bg-primary ring-4 ring-background" />
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
      )}
    </div>
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
  const [confirmText, setConfirmText] = useState("");
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
      setConfirmText("");
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
              Digite <strong>EXCLUIR</strong> para confirmar. Esta ação não pode ser
              desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <Input
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value)}
            placeholder="Digite EXCLUIR"
            autoFocus
          />
          <AlertDialogFooter>
            <AlertDialogCancel disabled={busy}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={busy || confirmText.trim().toUpperCase() !== "EXCLUIR"}
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
