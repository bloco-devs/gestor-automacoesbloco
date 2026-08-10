import { useRef, useState } from "react";
import { ImagePlus, Image as ImageIcon, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { uploadBoardBackground } from "@/lib/atividadesBoards";
import { useAuth } from "@/hooks/useAuth";
import { FUNDOS, thumb } from "./fundos";


/**
 * O seletor de fundo, fora do diálogo de criação.
 *
 * O mesmo catálogo que aparece ao criar um quadro precisa aparecer depois, com
 * a tela já montada — na Caixa de Entrada, por exemplo, onde não existe
 * "criação" nenhuma. Popover em vez de diálogo porque escolher fundo é uma
 * decisão de um clique, reversível, que se avalia olhando a tela atrás dela.
 */
export function SeletorDeFundo({
  valor,
  onEscolher,
  className,
}: {
  valor: string | null;
  onEscolher: (url: string | null) => void;
  className?: string;
}) {
  const { user } = useAuth();
  const arquivoRef = useRef<HTMLInputElement>(null);
  const [enviando, setEnviando] = useState(false);

  async function enviar(file: File) {
    if (!user?.id) return;
    setEnviando(true);
    try {
      const url = await uploadBoardBackground(file, user.id);
      onEscolher(url);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Não foi possível enviar a imagem.");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <Popover>
      <PopoverTrigger
        className={cn(
          "inline-flex shrink-0 items-center gap-1.5 rounded-md px-2 py-1 text-xs",
          "text-muted-foreground transition-colors hover:text-foreground",
          "focus:outline-none focus-visible:ring-2 focus-visible:ring-ring/50",
          className,
        )}
        title="Alterar o fundo"
        aria-label="Alterar o fundo"
      >
        <ImageIcon className="size-3.5" aria-hidden />
        <span className="hidden sm:inline">Fundo</span>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-72">
        <p className="ds-caption mb-2 text-muted-foreground">Fundo</p>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => onEscolher(null)}
            aria-label="Sem imagem de fundo"
            aria-pressed={valor === null}
            className={cn(
              "h-12 w-16 shrink-0 rounded-md border-2 bg-muted text-[10px] text-muted-foreground",
              valor === null ? "border-foreground" : "border-transparent",
              "transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ring/50",
            )}
          >
            Nenhum
          </button>

          {FUNDOS.map((f) => (
            <button
              key={f.url}
              type="button"
              onClick={() => onEscolher(f.url)}
              aria-label={`Usar o fundo ${f.label}`}
              aria-pressed={valor === f.url}
              className={cn(
                "h-12 w-16 shrink-0 overflow-hidden rounded-md border-2",
                valor === f.url ? "border-foreground" : "border-transparent",
                "transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ring/50",
              )}
            >
              <img src={thumb(f.url)} alt={f.label} loading="lazy" className="size-full object-cover" />
            </button>
          ))}

          {/* Um fundo enviado antes continua selecionado e visível como opção. */}
          {valor && !FUNDOS.some((f) => f.url === valor) && (
            <button
              type="button"
              aria-label="Imagem enviada, em uso"
              aria-pressed
              className="h-12 w-16 shrink-0 overflow-hidden rounded-md border-2 border-foreground"
            >
              <img src={valor} alt="Imagem enviada" className="size-full object-cover" />
            </button>
          )}

          <button
            type="button"
            onClick={() => arquivoRef.current?.click()}
            disabled={enviando || !user?.id}
            aria-label="Enviar imagem de fundo"
            title="Enviar imagem de fundo"
            className={cn(
              "flex h-12 w-16 shrink-0 items-center justify-center rounded-md border-2 border-dashed border-border",
              "text-muted-foreground transition-colors hover:border-foreground hover:text-foreground",
              "focus:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 disabled:cursor-progress",
            )}
          >
            {enviando ? (
              <Loader2 className="size-4 animate-spin" aria-hidden />
            ) : (
              <ImagePlus className="size-4" aria-hidden />
            )}
          </button>
          <input
            ref={arquivoRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              e.target.value = "";
              if (file) void enviar(file);
            }}
          />
        </div>
      </PopoverContent>
    </Popover>
  );
}
