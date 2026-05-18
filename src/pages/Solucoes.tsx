import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  Plus,
  Search,
} from "lucide-react";
import { useSupabaseData } from "@/hooks/useSupabaseData";
import {
  createSolucao,
  listSolicitacoes,
  listSolucoes,
} from "@/lib/supabaseData";
import type { Solucao } from "@/lib/types";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

type SortKey = "titulo" | "solicitação" | "createdAt";
type SortDir = "asc" | "desc";

const PAGE_SIZE_OPTIONS = [10, 25, 50];

export default function Solucoes() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  const solucoes = useSupabaseData(() => listSolucoes(), []);
  const solicitacoes = useSupabaseData(() => listSolicitacoes(), []);

  const solicitacaoTituloById = useMemo(() => {
    const map = new Map<string, string>();
    solicitacoes.forEach((s) => map.set(s.id, s.titulo));
    return map;
  }, [solicitacoes]);

  const [novoTitulo, setNovoTitulo] = useState("");
  const [novoDescricao, setNovoDescricao] = useState("");
  const [novoLink, setNovoLink] = useState("");
  const [novoSolicitacaoId, setNovoSolicitacaoId] = useState<string>("none");
  const [salvando, setSalvando] = useState(false);
  const [popoverOpen, setPopoverOpen] = useState(false);

  const [search, setSearch] = useState("");
  const [vinculoFilter, setVinculoFilter] = useState<string>("all");
  const [sortKey, setSortKey] = useState<SortKey>("createdAt");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return solucoes.filter((s) => {
      if (vinculoFilter === "linked" && !s.solicitacaoId) return false;
      if (vinculoFilter === "unlinked" && s.solicitacaoId) return false;
      if (!q) return true;
      const solicitação = s.solicitacaoId ? solicitacaoTituloById.get(s.solicitacaoId) ?? "" : "";
      return (
        s.titulo.toLowerCase().includes(q) ||
        s.descricao.toLowerCase().includes(q) ||
        solicitação.toLowerCase().includes(q)
      );
    });
  }, [solucoes, search, vinculoFilter, solicitacaoTituloById]);

  const sorted = useMemo(() => {
    const arr = [...filtered];
    arr.sort((a, b) => {
      const va = readSortable(a, sortKey, solicitacaoTituloById);
      const vb = readSortable(b, sortKey, solicitacaoTituloById);
      if (va < vb) return sortDir === "asc" ? -1 : 1;
      if (va > vb) return sortDir === "asc" ? 1 : -1;
      return 0;
    });
    return arr;
  }, [filtered, sortKey, sortDir, solicitacaoTituloById]);

  const totalPages = Math.max(1, Math.ceil(sorted.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const pageItems = useMemo(
    () => sorted.slice((currentPage - 1) * pageSize, currentPage * pageSize),
    [sorted, currentPage, pageSize],
  );

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir(key === "createdAt" ? "desc" : "asc");
    }
    setPage(1);
  }

  const handleCriarSolucao = async () => {
    if (!novoTitulo.trim()) {
      toast({ title: "Informe um título", variant: "destructive" });
      return;
    }
    setSalvando(true);
    try {
      await createSolucao({
        titulo: novoTitulo.trim(),
        descricao: novoDescricao.trim(),
        link: novoLink.trim() || null,
        createdBy: user?.id,
        solicitacaoId: novoSolicitacaoId === "none" ? null : novoSolicitacaoId,
      });
      setNovoTitulo("");
      setNovoDescricao("");
      setNovoLink("");
      setNovoSolicitacaoId("none");
      setPopoverOpen(false);
      toast({ title: "Solução cadastrada" });
    } catch (err) {
      toast({
        title: "Erro ao cadastrar",
        description: err instanceof Error ? err.message : "Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setSalvando(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Todas as soluções</h1>
          <p className="text-sm text-muted-foreground">
            Lista completa com ordenação e paginação.
          </p>
        </div>
        <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm">
              <Plus className="size-4" /> Cadastrar solução
            </Button>
          </PopoverTrigger>
          <PopoverContent align="end" className="w-80 space-y-3">
            <div>
              <p className="text-sm font-medium">Cadastrar solução</p>
              <p className="text-xs text-muted-foreground">Vincule a uma solicitação existente, se desejar.</p>
            </div>
            <Input
              placeholder="Título da solução"
              value={novoTitulo}
              onChange={(e) => setNovoTitulo(e.target.value)}
            />
            <Textarea
              placeholder="Descrição (opcional)"
              value={novoDescricao}
              onChange={(e) => setNovoDescricao(e.target.value)}
              rows={3}
            />
            <Input
              placeholder="Link (opcional, ex: https://...)"
              value={novoLink}
              onChange={(e) => setNovoLink(e.target.value)}
            />
            <Select value={novoSolicitacaoId} onValueChange={setNovoSolicitacaoId}>
              <SelectTrigger>
                <SelectValue placeholder="Vincular a uma solicitação (opcional)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Sem vínculo</SelectItem>
                {solicitacoes.map((s) => (
                  <SelectItem key={s.id} value={s.id}>{s.titulo}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="flex justify-end">
              <Button size="sm" onClick={handleCriarSolucao} disabled={salvando}>
                {salvando ? "Salvando..." : "Cadastrar"}
              </Button>
            </div>
          </PopoverContent>
        </Popover>
      </div>

      <Card className="surface-1">
        <CardContent className="p-3 grid gap-3 md:grid-cols-[1fr_220px]">
          <div className="relative">
            <Search className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="pl-9"
            />
          </div>
          <Select
            value={vinculoFilter}
            onValueChange={(v) => {
              setVinculoFilter(v);
              setPage(1);
            }}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os vínculos</SelectItem>
              <SelectItem value="linked">Com solicitação vinculada</SelectItem>
              <SelectItem value="unlinked">Sem vínculo</SelectItem>
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      <Card className="surface-1">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <SortableHead label="Solução" k="titulo" sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} />
                  <SortableHead label="Solicitação vinculada" k="solicitação" sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} />
                  <SortableHead label="Data" k="createdAt" sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} />
                </TableRow>
              </TableHeader>
              <TableBody>
                {pageItems.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center py-12 text-muted-foreground">
                      Nenhuma solução encontrada.
                    </TableCell>
                  </TableRow>
                ) : (
                  pageItems.map((s) => {
                    const solicitação = s.solicitacaoId ? solicitacaoTituloById.get(s.solicitacaoId) : undefined;
                    return (
                      <TableRow
                        key={s.id}
                        onClick={() => navigate(`/solucoes/${s.id}`)}
                        className="cursor-pointer hover:bg-muted/40"
                      >
                        <TableCell>
                          <div className="font-medium">{s.titulo}</div>
                          {s.descricao && (
                            <div className="text-xs text-muted-foreground line-clamp-1">{s.descricao}</div>
                          )}
                        </TableCell>
                        <TableCell className="text-sm">
                          {solicitação ?? <span className="text-muted-foreground">—</span>}
                        </TableCell>
                        <TableCell className="text-sm tabular-nums">
                          {formatDate(s.createdAt)}
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 border-t border-border text-sm">
            <div className="text-muted-foreground">
              {sorted.length === 0 ? 0 : (currentPage - 1) * pageSize + 1}–
              {Math.min(currentPage * pageSize, sorted.length)} de {sorted.length}
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground text-xs">Por página</span>
                <Select
                  value={String(pageSize)}
                  onValueChange={(v) => {
                    setPageSize(Number(v));
                    setPage(1);
                  }}
                >
                  <SelectTrigger className="h-8 w-[80px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PAGE_SIZE_OPTIONS.map((n) => (
                      <SelectItem key={n} value={String(n)}>
                        {n}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-1">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage <= 1}
                >
                  <ChevronLeft className="size-4" />
                </Button>
                <span className="text-xs tabular-nums px-2">
                  {currentPage} / {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage >= totalPages}
                >
                  <ChevronRight className="size-4" />
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function SortableHead({
  label,
  k,
  sortKey,
  sortDir,
  onSort,
  className,
}: {
  label: string;
  k: SortKey;
  sortKey: SortKey;
  sortDir: SortDir;
  onSort: (k: SortKey) => void;
  className?: string;
}) {
  const active = sortKey === k;
  const Icon = !active ? ArrowUpDown : sortDir === "asc" ? ArrowUp : ArrowDown;
  return (
    <TableHead className={className}>
      <button
        type="button"
        onClick={() => onSort(k)}
        className={cn(
          "inline-flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide transition-colors",
          active ? "text-foreground" : "text-muted-foreground hover:text-foreground",
        )}
      >
        {label}
        <Icon className={cn("size-3.5", active ? "opacity-100" : "opacity-50")} />
      </button>
    </TableHead>
  );
}

function readSortable(s: Solucao, key: SortKey, solicitacaoMap: Map<string, string>): string | number {
  switch (key) {
    case "titulo":
      return s.titulo.toLowerCase();
    case "solicitação":
      return (s.solicitacaoId ? solicitacaoMap.get(s.solicitacaoId) ?? "" : "").toLowerCase();
    case "createdAt":
      return new Date(s.createdAt).getTime();
  }
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}
