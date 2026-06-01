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

// Paleta de cores bem distintas entre si (inclui marrom, preto, branco, etc.).
// Usamos inline styles para não depender de classes Tailwind, garantindo cores
// fora do espectro padrão.
type CorDef = { bg: string; border: string; text: string };

const COR_DEFS: Record<string, CorDef> = {
  amarelo: { bg: "#fde68a", border: "#eab308", text: "#1f2937" },
  laranja: { bg: "#fdba74", border: "#ea580c", text: "#1f2937" },
  vermelho: { bg: "#fca5a5", border: "#dc2626", text: "#1f2937" },
  rosa: { bg: "#fbcfe8", border: "#db2777", text: "#1f2937" },
  magenta: { bg: "#f0abfc", border: "#c026d3", text: "#1f2937" },
  roxo: { bg: "#c4b5fd", border: "#7c3aed", text: "#1f2937" },
  azul: { bg: "#93c5fd", border: "#2563eb", text: "#1f2937" },
  ciano: { bg: "#a5f3fc", border: "#0891b2", text: "#1f2937" },
  turquesa: { bg: "#99f6e4", border: "#0d9488", text: "#1f2937" },
  verde: { bg: "#86efac", border: "#16a34a", text: "#1f2937" },
  lima: { bg: "#d9f99d", border: "#65a30d", text: "#1f2937" },
  oliva: { bg: "#bef264", border: "#4d7c0f", text: "#1f2937" },
  marrom: { bg: "#a16207", border: "#713f12", text: "#fafafa" },
  bege: { bg: "#f5e6c8", border: "#a8825a", text: "#1f2937" },
  cinza: { bg: "#d4d4d8", border: "#71717a", text: "#1f2937" },
  preto: { bg: "#1f2937", border: "#000000", text: "#fafafa" },
  branco: { bg: "#ffffff", border: "#9ca3af", text: "#1f2937" },
};

function getCorDef(cor: string): CorDef {
  return COR_DEFS[cor] ?? COR_DEFS.amarelo;
}

function StickyNoteNodeBase({ id, data, selected }: NodeProps) {
  const d = data as unknown as StickyNoteData;
  const c = getCorDef(d.cor);
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
        className="w-full h-full rounded-sm shadow-lg border flex flex-col"
        style={{ minWidth: 140, minHeight: 100, backgroundColor: c.bg, borderColor: c.border, color: c.text }}
      >
        <div className="flex items-center justify-between px-2 py-1 border-b nodrag-controls" style={{ borderColor: c.border }}>
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
                <div className="grid grid-cols-5 gap-1.5">
                  {CORES_NOTA.map((c) => (
                    <button
                      key={c}
                      type="button"
                      className={`size-5 rounded-full border ${
                        d.cor === c ? "ring-2 ring-primary" : ""
                      }`}
                      style={{ backgroundColor: getCorDef(c).bg, borderColor: getCorDef(c).border }}
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
