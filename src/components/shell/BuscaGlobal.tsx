import { memo } from "react";
import { Search } from "lucide-react";
import { formatHotkey, useCommandPalette } from "@/modules/platform";
import { cn } from "@/lib/utils";

/**
 * O gatilho visível da paleta de comandos.
 *
 * POR QUE UM BOTÃO PARA ALGO QUE JÁ TEM ATALHO
 * A paleta existia e respondia a ⌘K desde antes desta onda — e ninguém usava,
 * porque um atalho que não aparece em lugar nenhum não existe do ponto de vista
 * do usuário. Enquanto isso, 69 itens ficavam no menu justamente porque a busca
 * era invisível.
 *
 * Este componente é a peça que torna o encolhimento do menu honesto: o usuário
 * vê onde procurar antes de sentir falta do que saiu.
 *
 * Ele mostra o atalho ao lado ("⌘K" no Mac, "Ctrl K" no resto) para ensinar o
 * caminho rápido na primeira vez — depois disso ninguém mais clica, que é
 * exatamente o objetivo.
 */
function BuscaGlobalImpl({ className }: { className?: string }) {
  const { openPalette } = useCommandPalette();

  return (
    <button
      type="button"
      onClick={openPalette}
      aria-label="Buscar em todo o sistema"
      className={cn(
        "group inline-flex h-7 items-center gap-2 rounded-md border border-border/60 bg-background/40 px-2.5",
        "ds-caption text-muted-foreground transition-colors duration-fast ease-standard",
        "hover:border-border hover:text-foreground",
        "focus:outline-none focus-visible:ring-2 focus-visible:ring-ring/50",
        className,
      )}
    >
      <Search className="size-3.5 shrink-0" aria-hidden />
      <span className="hidden sm:inline">Buscar</span>
      <kbd className="ml-1 hidden rounded border border-border/60 px-1 font-mono text-[10px] leading-4 text-muted-foreground/80 sm:inline">
        {formatHotkey("mod+k")}
      </kbd>
    </button>
  );
}

export const BuscaGlobal = memo(BuscaGlobalImpl);
