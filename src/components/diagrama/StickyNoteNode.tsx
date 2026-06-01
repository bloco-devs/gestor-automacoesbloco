import { memo, useState } from "react";
import { NodeResizer, type NodeProps } from "@xyflow/react";
import { Trash2, Palette } from "lucide-react";
import { CORES_NOTA, type CorNota } from "@/lib/diagrama";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

export type StickyNoteData = {
  texto: string;
  cor: string;
  onTextChange: (id: string, texto: string) => void;
  onColorChange: (id: string, cor: string) => void;
  onDelete: (id: string) => void;
};

const COR_CLASSES: Record<string, { bg: string; border: string; swatch: string }> = {
  amarelo: { bg: "bg-yellow-200 dark:bg-yellow-300/90", border: "border-yellow-400", swatch: "bg-yellow-300" },
  laranja: { bg: "bg-orange-200 dark:bg-orange-300/90", border: "border-orange-400", swatch: "bg-orange-300" },
  vermelho: { bg: "bg-red-200 dark:bg-red-300/90", border: "border-red-400", swatch: "bg-red-300" },
  rosa: { bg: "bg-pink-200 dark:bg-pink-300/90", border: "border-pink-400", swatch: "bg-pink-300" },
  roxo: { bg: "bg-violet-200 dark:bg-violet-300/90", border: "border-violet-400", swatch: "bg-violet-300" },
  azul: { bg: "bg-sky-200 dark:bg-sky-300/90", border: "border-sky-400", swatch: "bg-sky-300" },
  ciano: { bg: "bg-cyan-200 dark:bg-cyan-300/90", border: "border-cyan-400", swatch: "bg-cyan-300" },
  verde: { bg: "bg-green-200 dark:bg-green-300/90", border: "border-green-400", swatch: "bg-green-300" },
  lima: { bg: "bg-lime-200 dark:bg-lime-300/90", border: "border-lime-400", swatch: "bg-lime-300" },
  cinza: { bg: "bg-neutral-200 dark:bg-neutral-300/90", border: "border-neutral-400", swatch: "bg-neutral-300" },
};

function StickyNoteNodeBase({ id, data, selected }: NodeProps) {
  const d = data as unknown as StickyNoteData;
  const cls = COR_CLASSES[d.cor] ?? COR_CLASSES.amarelo;
  const [editing, setEditing] = useState(false);

  return (
    <>
      <NodeResizer
        isVisible={selected}
        minWidth={140}
        minHeight={100}
        lineClassName="!border-primary"
        handleClassName="!bg-primary !border-background"
      />
      <div
        className={`w-full h-full rounded-sm shadow-lg border ${cls.bg} ${cls.border} flex flex-col text-neutral-900`}
        style={{ minWidth: 140, minHeight: 100 }}
      >
        <div className="flex items-center justify-between px-2 py-1 border-b border-black/10 nodrag-controls">
          <span className="text-[10px] uppercase tracking-wide opacity-60 select-none">Nota</span>
          <div className="flex items-center gap-1">
            <Popover>
              <PopoverTrigger asChild>
                <button
                  type="button"
                  className="p-1 rounded hover:bg-black/10 nodrag"
                  title="Mudar cor"
                  onPointerDown={(e) => e.stopPropagation()}
                >
                  <Palette className="size-3" />
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-2" onPointerDown={(e) => e.stopPropagation()}>
                <div className="flex gap-1.5">
                  {CORES_NOTA.map((c) => (
                    <button
                      key={c}
                      type="button"
                      className={`size-5 rounded-full border border-border ${COR_CLASSES[c].swatch} ${
                        d.cor === c ? "ring-2 ring-primary" : ""
                      }`}
                      onClick={() => d.onColorChange(id, c)}
                      title={c}
                    />
                  ))}
                </div>
              </PopoverContent>
            </Popover>
            <button
              type="button"
              className="p-1 rounded hover:bg-black/10 nodrag"
              title="Remover nota"
              onPointerDown={(e) => e.stopPropagation()}
              onClick={() => d.onDelete(id)}
            >
              <Trash2 className="size-3" />
            </button>
          </div>
        </div>
        <textarea
          className={`flex-1 w-full bg-transparent p-2 text-xs leading-snug resize-none outline-none placeholder:text-neutral-500 ${
            editing ? "nodrag" : ""
          }`}
          value={d.texto}
          placeholder="Escreva sua anotação..."
          onFocus={() => setEditing(true)}
          onBlur={() => setEditing(false)}
          onPointerDown={(e) => e.stopPropagation()}
          onChange={(e) => d.onTextChange(id, e.target.value)}
        />
      </div>
    </>
  );
}

export const StickyNoteNode = memo(StickyNoteNodeBase);
