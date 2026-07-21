import { useMemo, useState } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MoreHorizontal, Pencil, Copy, Archive, ArchiveRestore, Send, Undo2, Trash2 } from "lucide-react";
import { StatusPill } from "./StatusPill";
import { ARTICLE_STATUSES, ARTICLE_TYPES, type ArticleRow, type ArticleStatus, type ArticleType } from "../types";
import { useAdminArticleMutations } from "../hooks/useAdminArticles";
import { useToast } from "@/hooks/use-toast";

const PAGE_SIZE = 15;

export function ArticlesTable({
  articles,
  onEdit,
}: {
  articles: ArticleRow[];
  onEdit: (a: ArticleRow) => void;
}) {
  const { setStatus, softDelete, restore, duplicate } = useAdminArticleMutations();
  const [search, setSearch] = useState("");
  const [status, setStatusFilter] = useState<ArticleStatus | "todos">("todos");
  const [tipo, setTipo] = useState<ArticleType | "todos">("todos");
  const [page, setPage] = useState(1);
  const { toast } = useToast();

  const filtered = useMemo(() => {
    const s = search.trim().toLowerCase();
    return articles.filter((a) => {
      if (status !== "todos" && a.status !== status) return false;
      if (tipo !== "todos" && a.tipo !== tipo) return false;
      if (!s) return true;
      return (
        a.titulo?.toLowerCase().includes(s) ||
        a.resumo?.toLowerCase().includes(s) ||
        a.categoria?.toLowerCase().includes(s) ||
        a.autor_email?.toLowerCase().includes(s)
      );
    });
  }, [articles, search, status, tipo]);

  const total = filtered.length;
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const pageSafe = Math.min(page, pages);
  const rows = filtered.slice((pageSafe - 1) * PAGE_SIZE, pageSafe * PAGE_SIZE);

  async function actionWithToast<T>(p: Promise<T>, msg: string) {
    try {
      await p;
      toast({ title: msg });
    } catch (e) {
      toast({
        title: "Erro",
        description: e instanceof Error ? e.message : "Tente novamente.",
        variant: "destructive",
      });
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <Input
          placeholder="Buscar por título, resumo, categoria ou autor…"
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          className="max-w-md"
        />
        <Select value={status} onValueChange={(v) => { setStatusFilter(v as typeof status); setPage(1); }}>
          <SelectTrigger className="w-[160px]"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos os status</SelectItem>
            {ARTICLE_STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={tipo} onValueChange={(v) => { setTipo(v as typeof tipo); setPage(1); }}>
          <SelectTrigger className="w-[160px]"><SelectValue placeholder="Tipo" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos os tipos</SelectItem>
            {ARTICLE_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
          </SelectContent>
        </Select>
        <div className="ml-auto text-xs text-muted-foreground">
          {total} artigo(s)
        </div>
      </div>

      <div className="rounded-md border overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Título</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Categoria</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Autor</TableHead>
              <TableHead>Atualizado</TableHead>
              <TableHead className="text-right">Views</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 && (
              <TableRow>
                <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                  Nenhum artigo encontrado.
                </TableCell>
              </TableRow>
            )}
            {rows.map((a) => (
              <TableRow key={a.id} className={a.deleted_at ? "opacity-60" : ""}>
                <TableCell className="max-w-[280px]">
                  <button
                    type="button"
                    className="text-left hover:underline font-medium"
                    onClick={() => onEdit(a)}
                  >
                    {a.titulo}
                  </button>
                  {a.resumo && (
                    <div className="text-xs text-muted-foreground truncate">{a.resumo}</div>
                  )}
                </TableCell>
                <TableCell><span className="text-xs">{a.tipo}</span></TableCell>
                <TableCell><span className="text-xs">{a.categoria ?? "—"}</span></TableCell>
                <TableCell><StatusPill status={a.status} /></TableCell>
                <TableCell><span className="text-xs">{a.autor_email ?? "—"}</span></TableCell>
                <TableCell>
                  <span className="text-xs">
                    {format(new Date(a.updated_at), "dd/MM/yy HH:mm", { locale: ptBR })}
                  </span>
                </TableCell>
                <TableCell className="text-right text-xs">{a.views}</TableCell>
                <TableCell className="w-8">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon"><MoreHorizontal className="size-4" /></Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => onEdit(a)}>
                        <Pencil className="size-3 mr-2" /> Editar
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => actionWithToast(duplicate.mutateAsync(a.id), "Artigo duplicado")}>
                        <Copy className="size-3 mr-2" /> Duplicar
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      {a.status !== "publicado" && (
                        <DropdownMenuItem onClick={() => actionWithToast(setStatus.mutateAsync({ id: a.id, status: "publicado" }), "Publicado")}>
                          <Send className="size-3 mr-2" /> Publicar
                        </DropdownMenuItem>
                      )}
                      {a.status === "publicado" && (
                        <DropdownMenuItem onClick={() => actionWithToast(setStatus.mutateAsync({ id: a.id, status: "rascunho" }), "Despublicado")}>
                          <Undo2 className="size-3 mr-2" /> Despublicar
                        </DropdownMenuItem>
                      )}
                      {a.status !== "arquivado" && !a.deleted_at && (
                        <DropdownMenuItem onClick={() => actionWithToast(setStatus.mutateAsync({ id: a.id, status: "arquivado" }), "Arquivado")}>
                          <Archive className="size-3 mr-2" /> Arquivar
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuSeparator />
                      {a.deleted_at ? (
                        <DropdownMenuItem onClick={() => actionWithToast(restore.mutateAsync(a.id), "Restaurado")}>
                          <ArchiveRestore className="size-3 mr-2" /> Restaurar
                        </DropdownMenuItem>
                      ) : (
                        <DropdownMenuItem
                          className="text-destructive"
                          onClick={() => {
                            if (confirm(`Excluir "${a.titulo}"? Pode ser restaurado depois.`)) {
                              actionWithToast(softDelete.mutateAsync(a.id), "Excluído");
                            }
                          }}
                        >
                          <Trash2 className="size-3 mr-2" /> Excluir
                        </DropdownMenuItem>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {pages > 1 && (
        <div className="flex items-center justify-end gap-2">
          <Button variant="outline" size="sm" disabled={pageSafe <= 1} onClick={() => setPage((p) => p - 1)}>
            Anterior
          </Button>
          <span className="text-xs text-muted-foreground">
            Página {pageSafe} de {pages}
          </span>
          <Button variant="outline" size="sm" disabled={pageSafe >= pages} onClick={() => setPage((p) => p + 1)}>
            Próxima
          </Button>
        </div>
      )}
    </div>
  );
}
