import { memo } from "react";
import type { CardDraftValues } from "@/components/atividades/CardDialog";

export interface Draft {
  id: string;
  colunaId: string;
  data: CardDraftValues;
}

function DraftCardImpl({
  draft,
  onOpen,
  onDelete,
}: {
  draft: Draft;
  onOpen: () => void;
  onDelete: () => void;
}) {
  const { titulo, descricao, checklist } = draft.data;
  return (
    <div
      onClick={onOpen}
      className="group relative rounded-xl border border-dashed border-accent/40 bg-accent/5 p-3 cursor-pointer opacity-70 hover:opacity-100 transition-opacity"
      title="Rascunho — clique para continuar editando"
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-[10px] uppercase tracking-wide text-accent font-medium">
          Rascunho
        </span>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          className="text-[10px] text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
        >
          Descartar
        </button>
      </div>
      <div className="mt-1 text-sm font-medium leading-snug line-clamp-2">
        {titulo || <span className="italic text-muted-foreground">Sem título</span>}
      </div>
      {descricao && (
        <p className="mt-1 text-xs text-muted-foreground line-clamp-2">{descricao}</p>
      )}
      {checklist.length > 0 && (
        <div className="mt-1.5 text-[10px] text-muted-foreground">
          {checklist.filter((c) => c.concluido).length}/{checklist.length} itens
        </div>
      )}
    </div>
  );
}

export const DraftCard = memo(DraftCardImpl);
