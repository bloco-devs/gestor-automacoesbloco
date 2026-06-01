import { memo, useState } from "react";
import { NodeResizer, type NodeProps } from "@xyflow/react";
import { Trash2, Palette, Eye, Pencil } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { HexColorPicker, HexColorInput } from "react-colorful";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

export type StickyNoteData = {
  texto: string;
  cabecalho: string;
  cor: string;
  onTextChange: (id: string, texto: string) => void;
  onHeaderChange: (id: string, cabecalho: string) => void;
  onColorChange: (id: string, cor: string) => void;
  onDelete: (id: string) => void;
};

const PRESETS_NOMEADOS: Record<string, string> = {
  amarelo: "#fde68a",
  laranja: "#fdba74",
  vermelho: "#fca5a5",
  rosa: "#fbcfe8",
  magenta: "#f0abfc",
  roxo: "#c4b5fd",
  azul: "#93c5fd",
  ciano: "#a5f3fc",
  turquesa: "#99f6e4",
  verde: "#86efac",
  lima: "#d9f99d",
  oliva: "#bef264",
  marrom: "#a16207",
  bege: "#f5e6c8",
  cinza: "#d4d4d8",
  preto: "#1f2937",
  branco: "#ffffff",
};

function normalizeHex(cor: string): string {
  if (!cor) return "#fde68a";
  if (cor.startsWith("#")) return cor;
  return PRESETS_NOMEADOS[cor] ?? "#fde68a";
}

function hexToRgb(hex: string) {
  let h = hex.replace("#", "");
  if (h.length === 3) h = h.split("").map((c) => c + c).join("");
  const n = parseInt(h, 16);
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}

function rgbToHex(r: number, g: number, b: number) {
  const to = (v: number) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, "0");
  return `#${to(r)}${to(g)}${to(b)}`;
}

function darken(hex: string, amount = 0.35) {
  const { r, g, b } = hexToRgb(hex);
  return rgbToHex(r * (1 - amount), g * (1 - amount), b * (1 - amount));
}

function readableText(hex: string) {
  const { r, g, b } = hexToRgb(hex);
  const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return lum > 0.6 ? "#1f2937" : "#fafafa";
}

function StickyNoteNodeBase({ id, data, selected }: NodeProps) {
  const d = data as unknown as StickyNoteData;
  const bg = normalizeHex(d.cor);
  const border = darken(bg, 0.4);
  const text = readableText(bg);
  const [editing, setEditing] = useState(false);
  const [preview, setPreview] = useState(false);

  return (
    <>
      <NodeResizer
        isVisible={selected}
        minWidth={160}
        minHeight={120}
        lineClassName="!border-primary"
        handleClassName="!bg-primary !border-background"
      />
      <div
        className="w-full h-full rounded-sm shadow-lg border flex flex-col"
        style={{ minWidth: 160, minHeight: 120, backgroundColor: bg, borderColor: border, color: text }}
      >
        <div
          className="flex items-center gap-1 px-2 py-1 border-b nodrag-controls"
          style={{ borderColor: border }}
        >
          <input
            type="text"
            value={d.cabecalho ?? ""}
            placeholder="Cabeçalho..."
            onPointerDown={(e) => e.stopPropagation()}
            onChange={(e) => d.onHeaderChange(id, e.target.value)}
            className="nodrag flex-1 min-w-0 bg-transparent text-xs font-semibold uppercase tracking-wide outline-none placeholder:opacity-50"
            style={{ color: text }}
          />
          <button
            type="button"
            className="p-1 rounded hover:bg-black/10 nodrag"
            title={preview ? "Editar markdown" : "Visualizar markdown"}
            onPointerDown={(e) => e.stopPropagation()}
            onClick={() => setPreview((p) => !p)}
          >
            {preview ? <Pencil className="size-3" /> : <Eye className="size-3" />}
          </button>
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
            <PopoverContent
              className="w-auto p-3 space-y-3"
              onPointerDown={(e) => e.stopPropagation()}
            >
              <HexColorPicker color={bg} onChange={(c) => d.onColorChange(id, c)} />
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">Hex</span>
                <HexColorInput
                  color={bg}
                  onChange={(c) => d.onColorChange(id, c)}
                  prefixed
                  className="h-7 w-24 rounded border bg-background px-2 text-xs font-mono uppercase"
                />
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

        {preview ? (
          <div
            className="nodrag flex-1 w-full overflow-auto p-2 text-xs leading-snug sticky-note-md"
            style={{ color: text }}
            onPointerDown={(e) => e.stopPropagation()}
            onDoubleClick={() => setPreview(false)}
          >
            {d.texto?.trim() ? (
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{d.texto}</ReactMarkdown>
            ) : (
              <span className="opacity-50">Sem conteúdo. Clique no lápis para editar.</span>
            )}
          </div>
        ) : (
          <textarea
            className={`flex-1 w-full bg-transparent p-2 text-xs leading-snug resize-none outline-none placeholder:opacity-50 font-mono ${
              editing ? "nodrag" : ""
            }`}
            style={{ color: text }}
            value={d.texto}
            placeholder="Escreva em **Markdown**..."
            onFocus={() => setEditing(true)}
            onBlur={() => setEditing(false)}
            onPointerDown={(e) => e.stopPropagation()}
            onChange={(e) => d.onTextChange(id, e.target.value)}
          />
        )}
      </div>
    </>
  );
}

export const StickyNoteNode = memo(StickyNoteNodeBase);
