import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { Plus, Search, Star, Clock, Archive, Grid3x3, Download } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import {
  listBoardsResumo,
  createBoard,
  toggleFavoritoBoard,
  type BoardResumo,
} from "@/lib/atividadesBoards";
import { BoardCard } from "@/components/atividades/quadros/BoardCard";
import { NovoQuadroDialog } from "@/components/atividades/quadros/NovoQuadroDialog";
import { EmptyState } from "@/components/EmptyState";

type Tab = "recentes" | "meus" | "favoritos" | "arquivados";

const TABS: { key: Tab; label: string; icon: typeof Star }[] = [
  { key: "recentes", label: "Recentes", icon: Clock },
  { key: "meus", label: "Meus projetos", icon: Grid3x3 },
  { key: "favoritos", label: "Favoritos", icon: Star },
  { key: "arquivados", label: "Arquivados", icon: Archive },
];

interface AtividadesProps {
  /** Quando embutido no Workspace de Demandas, os quadros abrem dentro dele. */
  hrefBase?: string;
}

export default function Atividades({ hrefBase = "/atividades" }: AtividadesProps = {}) {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [tab, setTab] = useState<Tab>("recentes");
  const [busca, setBusca] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);

  const boardsQ = useQuery({
    queryKey: ["atividades", "boards-resumo"],
    queryFn: listBoardsResumo,
    staleTime: 60_000,
  });

  const boards = boardsQ.data ?? [];

  const filtrados = useMemo(() => {
    const q = busca.trim().toLowerCase();
    let list = boards.slice();
    if (tab === "arquivados") {
      list = list.filter((b) => b.arquivado);
    } else {
      list = list.filter((b) => !b.arquivado);
      if (tab === "favoritos") list = list.filter((b) => b.favorito);
      if (tab === "meus") list = list.filter((b) => b.meuPapel !== null);
    }
    if (q) {
      list = list.filter(
        (b) =>
          b.nome.toLowerCase().includes(q) ||
          (b.descricao ?? "").toLowerCase().includes(q),
      );
    }
    if (tab === "recentes") {
      list.sort((a, b) => {
        const at = a.ultimaAtividade ?? a.updatedAt;
        const bt = b.ultimaAtividade ?? b.updatedAt;
        return new Date(bt).getTime() - new Date(at).getTime();
      });
    } else {
      list.sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));
    }
    return list;
  }, [boards, busca, tab]);

  const favoritos = useMemo(
    () => boards.filter((b) => b.favorito && !b.arquivado),
    [boards],
  );

  const createMut = useMutation({
    mutationFn: async (input: {
      nome: string;
      descricao?: string;
      cor?: string;
      icone?: string;
      visibilidade: "private" | "workspace" | "public";
      favoritar: boolean;
    }) => {
      const id = await createBoard({
        nome: input.nome,
        descricao: input.descricao,
        cor: input.cor,
        icone: input.icone,
        visibilidade: input.visibilidade,
      });
      if (input.favoritar) {
        try {
          await toggleFavoritoBoard(id);
        } catch (e) {
          console.warn("[atividades] falha ao favoritar novo quadro", e);
        }
      }
      return id;
    },
    onSuccess: (id) => {
      toast.success("Projeto criado");
      qc.invalidateQueries({ queryKey: ["atividades", "boards-resumo"] });
      setDialogOpen(false);
      navigate(`${hrefBase}/${id}`);
    },
    onError: (e: unknown) => {
      const msg = e instanceof Error ? e.message : "Erro ao criar projeto";
      toast.error(msg);
    },
  });

  const favMut = useMutation({
    mutationFn: (b: BoardResumo) => toggleFavoritoBoard(b.id),
    onMutate: async (b) => {
      await qc.cancelQueries({ queryKey: ["atividades", "boards-resumo"] });
      const prev = qc.getQueryData<BoardResumo[]>(["atividades", "boards-resumo"]);
      qc.setQueryData<BoardResumo[]>(
        ["atividades", "boards-resumo"],
        (list) => list?.map((x) => (x.id === b.id ? { ...x, favorito: !x.favorito } : x)) ?? [],
      );
      return { prev };
    },
    onError: (_e, _b, ctx) => {
      if (ctx?.prev) qc.setQueryData(["atividades", "boards-resumo"], ctx.prev);
      toast.error("Não foi possível atualizar favorito");
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ["atividades", "boards-resumo"] });
    },
  });

  return (
    <div className="space-y-6">
      <nav className="ds-caption text-muted-foreground">
        <span className="font-medium text-foreground">Demandas</span>
        <span aria-hidden className="mx-1.5">›</span>
        <span>Projetos</span>
      </nav>

      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="ds-h1">Projetos</h1>
          <p className="text-sm text-muted-foreground">
            Workspace <span className="font-medium text-foreground">Grupo Bloco</span>
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => navigate("/atividades/importar")}>
            <Download className="size-4 mr-1.5" />
            Importar projeto
          </Button>
          <Button onClick={() => setDialogOpen(true)}>
            <Plus className="size-4 mr-1.5" />
            Novo projeto
          </Button>
        </div>
      </div>

      {favoritos.length > 0 && tab === "recentes" && !busca ? (
        <section className="space-y-2">
          <h2 className="text-xs font-semibold uppercase text-muted-foreground tracking-wider flex items-center gap-1.5">
            <Star className="size-3.5 fill-amber-400 text-amber-400" />
            Favoritos
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
            {favoritos.map((b) => (
              <BoardCard key={b.id} board={b} hrefBase={hrefBase} onToggleFavorito={(x) => favMut.mutate(x)} />
            ))}
          </div>
        </section>
      ) : null}

      <div className="flex items-center gap-2 border-b overflow-x-auto">
        {TABS.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`flex items-center gap-1.5 px-3 py-2 text-sm border-b-2 -mb-px transition ${
              tab === key
                ? "border-primary text-foreground font-medium"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <Icon className="size-3.5" />
            {label}
          </button>
        ))}
        <div className="ml-auto py-1.5 min-w-[200px]">
          <div className="relative">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
            <Input
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Buscar projetos…"
              className="pl-7 h-8 text-sm"
            />
          </div>
        </div>
      </div>

      {boardsQ.isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-40 rounded-xl" />
          ))}
        </div>
      ) : boardsQ.isError ? (
        <div className="text-sm text-destructive">
          Não foi possível carregar os projetos. Tente recarregar a página.
        </div>
      ) : filtrados.length === 0 ? (
        <EmptyState
          icon={Grid3x3}
          title={busca ? "Nenhum projeto encontrado" : "Nenhum projeto por aqui"}
          description={
            busca
              ? "Tente outro termo de busca."
              : tab === "arquivados"
                ? "Você ainda não arquivou nenhum projeto."
                : "Crie o primeiro projeto para começar a organizar as demandas."
          }
          action={
            !busca && tab !== "arquivados" ? (
              <Button onClick={() => setDialogOpen(true)} size="sm">
                <Plus className="size-4 mr-1.5" />
                Criar projeto
              </Button>
            ) : null
          }
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
          {filtrados.map((b) => (
            <BoardCard key={b.id} board={b} hrefBase={hrefBase} onToggleFavorito={(x) => favMut.mutate(x)} />
          ))}
        </div>
      )}

      <NovoQuadroDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        submitting={createMut.isPending}
        onSubmit={async (data) => {
          await createMut.mutateAsync(data);
        }}

      />
    </div>
  );
}
