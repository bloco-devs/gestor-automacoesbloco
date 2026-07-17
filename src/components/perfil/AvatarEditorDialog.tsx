import { useEffect, useRef, useState, useCallback } from "react";
import { Loader2, ZoomIn, ZoomOut, RotateCcw } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";

interface Props {
  open: boolean;
  file: File | null;
  onCancel: () => void;
  onConfirm: (dataUrl: string) => Promise<void> | void;
}

const OUTPUT_SIZE = 256;
const PREVIEW_SIZE = 320; // círculo visível

export default function AvatarEditorDialog({ open, file, onCancel, onConfirm }: Props) {
  const [imgUrl, setImgUrl] = useState<string | null>(null);
  const [img, setImg] = useState<HTMLImageElement | null>(null);
  const [zoom, setZoom] = useState(1); // multiplicador sobre o "fit"
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [saving, setSaving] = useState(false);
  const draggingRef = useRef<{ x: number; y: number } | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Carrega o arquivo
  useEffect(() => {
    if (!file) return;
    const url = URL.createObjectURL(file);
    setImgUrl(url);
    const image = new Image();
    image.onload = () => {
      setImg(image);
      setZoom(1);
      setOffset({ x: 0, y: 0 });
    };
    image.src = url;
    return () => URL.revokeObjectURL(url);
  }, [file]);

  // Escala base: preenche o círculo (cover)
  const baseScale = img ? PREVIEW_SIZE / Math.min(img.width, img.height) : 1;
  const drawScale = baseScale * zoom;
  const drawW = img ? img.width * drawScale : 0;
  const drawH = img ? img.height * drawScale : 0;

  // Limita offset para a imagem sempre cobrir o círculo
  const clamp = useCallback(
    (x: number, y: number) => {
      const maxX = Math.max(0, (drawW - PREVIEW_SIZE) / 2);
      const maxY = Math.max(0, (drawH - PREVIEW_SIZE) / 2);
      return {
        x: Math.min(maxX, Math.max(-maxX, x)),
        y: Math.min(maxY, Math.max(-maxY, y)),
      };
    },
    [drawW, drawH]
  );

  useEffect(() => {
    setOffset((o) => clamp(o.x, o.y));
  }, [clamp]);

  const onPointerDown = (e: React.PointerEvent) => {
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    draggingRef.current = { x: e.clientX - offset.x, y: e.clientY - offset.y };
  };
  const onPointerMove = (e: React.PointerEvent) => {
    if (!draggingRef.current) return;
    const nx = e.clientX - draggingRef.current.x;
    const ny = e.clientY - draggingRef.current.y;
    setOffset(clamp(nx, ny));
  };
  const onPointerUp = () => {
    draggingRef.current = null;
  };

  const onWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const delta = -e.deltaY * 0.0015;
    setZoom((z) => Math.min(4, Math.max(1, z + delta)));
  };

  const handleConfirm = async () => {
    if (!img) return;
    setSaving(true);
    try {
      const canvas = document.createElement("canvas");
      canvas.width = OUTPUT_SIZE;
      canvas.height = OUTPUT_SIZE;
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("Canvas indisponível");
      ctx.imageSmoothingQuality = "high";

      // Converte a área visível do círculo em coordenadas da imagem original
      const scale = drawScale; // px de preview por px da imagem
      const cropSizeSrc = PREVIEW_SIZE / scale;
      const centerXSrc = img.width / 2 - offset.x / scale;
      const centerYSrc = img.height / 2 - offset.y / scale;
      const sx = centerXSrc - cropSizeSrc / 2;
      const sy = centerYSrc - cropSizeSrc / 2;

      ctx.drawImage(img, sx, sy, cropSizeSrc, cropSizeSrc, 0, 0, OUTPUT_SIZE, OUTPUT_SIZE);
      const dataUrl = canvas.toDataURL("image/jpeg", 0.9);
      await onConfirm(dataUrl);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && !saving && onCancel()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Ajustar foto do perfil</DialogTitle>
          <DialogDescription>
            Arraste para reposicionar e use o zoom para enquadrar o rosto no círculo.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col items-center gap-4 py-2">
          <div
            ref={containerRef}
            className="relative overflow-hidden rounded-full bg-slate-100 select-none touch-none cursor-grab active:cursor-grabbing"
            style={{ width: PREVIEW_SIZE, height: PREVIEW_SIZE }}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerUp}
            onWheel={onWheel}
          >
            {imgUrl && img && (
              <img
                src={imgUrl}
                alt=""
                draggable={false}
                style={{
                  position: "absolute",
                  left: "50%",
                  top: "50%",
                  width: drawW,
                  height: drawH,
                  transform: `translate(calc(-50% + ${offset.x}px), calc(-50% + ${offset.y}px))`,
                  maxWidth: "none",
                  pointerEvents: "none",
                }}
              />
            )}
            {/* Anel */}
            <div className="pointer-events-none absolute inset-0 rounded-full ring-2 ring-white/70 shadow-[inset_0_0_0_9999px_rgba(0,0,0,0.15)]" />
          </div>

          <div className="flex items-center gap-3 w-full max-w-xs">
            <ZoomOut className="size-4 text-muted-foreground" />
            <Slider
              value={[zoom]}
              min={1}
              max={4}
              step={0.01}
              onValueChange={([v]) => setZoom(v)}
              className="flex-1"
            />
            <ZoomIn className="size-4 text-muted-foreground" />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => {
                setZoom(1);
                setOffset({ x: 0, y: 0 });
              }}
              title="Centralizar"
            >
              <RotateCcw className="size-4" />
            </Button>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onCancel} disabled={saving}>
            Cancelar
          </Button>
          <Button onClick={handleConfirm} disabled={saving || !img}>
            {saving ? <Loader2 className="size-4 animate-spin mr-2" /> : null}
            Salvar foto
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
