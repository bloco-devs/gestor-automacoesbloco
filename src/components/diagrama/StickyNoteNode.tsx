import { memo, useState } from "react";
import { NodeResizer, type NodeProps } from "@xyflow/react";
import { Trash2, Palette } from "lucide-react";
import { HexColorPicker, HexColorInput } from "react-colorful";
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

// Presets nomeados (mantidos para compatibilidade com notas antigas e como
// atalhos rápidos). O valor real armazenado em `cor` agora pode ser qualquer
// hex (#rrggbb), permitindo a roda de cores completa.
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

const PRESETS_HEX: string[] = [
  "#fde68a", "#fdba74", "#fca5a5", "#fbcfe8", "#f0abfc",
  "#c4b5fd", "#93c5fd", "#a5f3fc", "#99f6e4", "#86efac",
  "#d9f99d", "#bef264", "#a16207", "#f5e6c8", "#d4d4d8",
  "#1f2937", "#ffffff",
];

function normalizeHex(cor: string): string {
  if (!cor) return "#fde68a";
  if (cor.startsWith("#")) return cor;
  return PRESETS_NOMEADOS[cor] ?? "#fde68a";
}

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  let h = hex.replace("#", "");
  if (h.length === 3) h = h.split("").map((c) => c + c).join("");
  const n = parseInt(h, 16);
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}

function rgbToHex(r: number, g: number, b: number): string {
  const to = (v: number) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, "0");
  return `#${to(r)}${to(g)}${to(b)}`;
}

function darken(hex: string, amount = 0.35): string {
  const { r, g, b } = hexToRgb(hex);
  return rgbToHex(r * (1 - amount), g * (1 - amount), b * (1 - amount));
}

function readableText(hex: string): string {
  const { r, g, b } = hexToRgb(hex);
  // Luminância relativa simples
  const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return lum > 0.6 ? "#1f2937" : "#fafafa";
}

function StickyNoteNodeBase({ id, data, selected }: NodeProps) {
  const d = data as unknown as StickyNoteData;
  const bg = normalizeHex(d.cor);
  const border = darken(bg, 0.4);
  const text = readableText(bg);
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
        style={{ minWidth: 140, minHeight: 100, backgroundColor: bg, borderColor: border, color: text }}
      >
        <div className="flex items-center justify-between px-2 py-1 border-b nodrag-controls" style={{ borderColor: border }}>
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
              <PopoverContent
                className="w-auto p-3 space-y-3"
                onPointerDown={(e) => e.stopPropagation()}
              >
                <HexColorPicker
                  color={bg}
                  onChange={(c) => d.onColorChange(id, c)}
                />
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
        </div>
        <textarea
          className={`flex-1 w-full bg-transparent p-2 text-xs leading-snug resize-none outline-none placeholder:opacity-50 ${
            editing ? "nodrag" : ""
          }`}
          style={{ color: text }}
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
