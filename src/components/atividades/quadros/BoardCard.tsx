import { Link } from "react-router-dom";
import { Star, Users, Layers, Archive } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { BoardResumo } from "@/lib/atividadesBoards";

function formatRelative(iso: string | null): string {
  if (!iso) return "sem atividade";
  const d = new Date(iso).getTime();
  const diff = Date.now() - d;
  const min = Math.floor(diff / 60_000);
  if (min < 1) return "agora";
  if (min < 60) return `há ${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `há ${h} h`;
  const dias = Math.floor(h / 24);
  if (dias < 30) return `há ${dias} d`;
  const meses = Math.floor(dias / 30);
  if (meses < 12) return `há ${meses} mes${meses > 1 ? "es" : ""}`;
  return new Date(iso).toLocaleDateString();
}

interface Props {
  board: BoardResumo;
  onToggleFavorito: (b: BoardResumo) => void;
}

const VISIBILIDADE_LABEL: Record<BoardResumo["visibilidade"], string> = {
  private: "Privado",
  workspace: "Workspace",
  public: "Público",
};

export function BoardCard({ board, onToggleFavorito }: Props) {
  const coverColor = board.background || board.cor || "hsl(var(--muted))";
  return (
    <div className="group relative rounded-xl border bg-card overflow-hidden hover:shadow-md transition-shadow flex flex-col">
      <Link
        to={`/atividades/${board.id}`}
        className="block h-20 relative"
        style={{ backgroundColor: coverColor }}
        aria-label={`Abrir quadro ${board.nome}`}
      >
        {board.icone ? (
          <span className="absolute top-2 left-3 text-lg" aria-hidden>
            {board.icone}
          </span>
        ) : null}
        {board.arquivado ? (
          <span className="absolute top-2 right-2 text-[10px] uppercase font-semibold px-2 py-0.5 rounded-full bg-background/80 text-muted-foreground flex items-center gap-1">
            <Archive className="h-3 w-3" />
            Arquivado
          </span>
        ) : null}
      </Link>

      <div className="p-3 flex-1 flex flex-col gap-2">
        <div className="flex items-start justify-between gap-2">
          <Link
            to={`/atividades/${board.id}`}
            className="font-medium leading-snug hover:underline line-clamp-2 flex-1"
          >
            {board.nome}
          </Link>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 shrink-0"
            onClick={(e) => {
              e.preventDefault();
              onToggleFavorito(board);
            }}
            aria-label={board.favorito ? "Desfavoritar" : "Favoritar"}
          >
            <Star
              className={`h-4 w-4 ${board.favorito ? "fill-amber-400 text-amber-400" : "text-muted-foreground"}`}
            />
          </Button>
        </div>

        {board.descricao ? (
          <p className="text-xs text-muted-foreground line-clamp-2">{board.descricao}</p>
        ) : null}

        <div className="mt-auto flex items-center justify-between gap-2 text-[11px] text-muted-foreground pt-2">
          <div className="flex items-center gap-2.5">
            <span className="flex items-center gap-1" title="Cards abertos / total">
              <Layers className="h-3 w-3" />
              {board.cardsAbertos}/{board.totalCards}
            </span>
            <span className="flex items-center gap-1" title="Membros">
              <Users className="h-3 w-3" />
              {board.totalMembros}
            </span>
          </div>
          <span title={board.ultimaAtividade ?? ""}>{formatRelative(board.ultimaAtividade)}</span>
        </div>

        <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
          <span className="px-1.5 py-0.5 rounded bg-muted">
            {VISIBILIDADE_LABEL[board.visibilidade]}
          </span>
          {board.meuPapel ? (
            <span className="px-1.5 py-0.5 rounded bg-muted capitalize">{board.meuPapel}</span>
          ) : null}
        </div>
      </div>
    </div>
  );
}
