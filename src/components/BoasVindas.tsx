import { memo } from "react";
import { cn } from "@/lib/utils";
import { BlinkCarregando } from "@/components/blink/BlinkCarregando";

/**
 * A TELA DE ENTRADA DO SISTEMA
 *
 * O que existia neste ponto: nada, ou um círculo girando. Quem chega do Bloco
 * ID via um spinner genérico sobre fundo vazio — nenhuma informação de onde
 * acabou de entrar, e em conexão lenta a impressão de que travou.
 *
 * COMO ELA É CONSTRUÍDA, DO FUNDO PARA A FRENTE
 *
 *   1. Malha quadriculada, quase invisível, com máscara radial que a apaga
 *      nas bordas. Sozinha ela não é vista; o que ela faz é tirar a chapa do
 *      fundo, que é o que separa "tela de sistema" de "tela em branco".
 *   2. Brilho radial na cor da marca, baixo o bastante para ser atmosfera e
 *      não mancha. Fica atrás do Blink e dá para onde olhar.
 *   3. O conteúdo.
 *
 * As três camadas usam token (`--foreground`, `--primary`, `--background`), o
 * que faz os dois temas saírem do mesmo código. Nada de cor fixa — foi
 * exatamente assim que a sombra do Blink saiu branca no tema escuro na
 * primeira versão disto.
 *
 * HIERARQUIA
 * Marca (contexto) → nome do sistema (identidade) → uma linha do que ele faz
 * → o Blink saltando → o estado atual, miúdo. O movimento fica ABAIXO do
 * texto de propósito: acima, ele roubaria a leitura do nome do sistema no
 * primeiro instante, que é o que esta tela tem para dizer.
 *
 * `font-brand` (NewBlackTypeface) é reservada no design system a branding
 * real — logo e telas institucionais — e proibida em heading de tela comum.
 * Esta é uma das poucas em que ela cabe: não há conteúdo aqui, só identidade.
 *
 * MOVIMENTO
 * Só o Blink e o ponto do estado se mexem, e os dois param com
 * `prefers-reduced-motion`. Fundo animado numa tela que aparece em toda
 * entrada seria custo permanente por um efeito que ninguém pediu.
 */
export const BoasVindas = memo(function BoasVindas({
  estado,
  className,
}: {
  /** O que está acontecendo agora. Uma linha, sem ponto final. */
  estado?: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "relative flex min-h-dvh flex-col items-center justify-center overflow-hidden bg-background px-6 py-12",
        className,
      )}
    >
      {/* 1. Malha. `mask-image` apaga as bordas para não virar moldura. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.55]"
        style={{
          backgroundImage:
            "linear-gradient(to right, hsl(var(--foreground) / 0.05) 1px, transparent 1px), linear-gradient(to bottom, hsl(var(--foreground) / 0.05) 1px, transparent 1px)",
          backgroundSize: "56px 56px",
          maskImage: "radial-gradient(ellipse 70% 55% at 50% 45%, #000 30%, transparent 75%)",
          WebkitMaskImage:
            "radial-gradient(ellipse 70% 55% at 50% 45%, #000 30%, transparent 75%)",
        }}
      />

      {/* 2. Brilho da marca. Amarelo #FFDA5B nos dois temas, em opacidade que
             o torna luz e não superfície. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 55% 45% at 50% 52%, hsl(var(--primary) / 0.16), transparent 70%)",
        }}
      />

      {/* 3. Conteúdo */}
      <div className="relative flex flex-col items-center gap-9">
        <div className="flex flex-col items-center gap-3 text-center">
          <span className="text-[11px] font-semibold uppercase tracking-[0.24em] text-muted-foreground">
            Grupo Bloco
          </span>

          {/* `text-balance` evita a linha órfã em tela estreita — num título
              curto é a diferença entre parecer composto e parecer quebrado. */}
          <h1 className="font-brand text-balance text-4xl font-semibold tracking-tight text-foreground sm:text-5xl">
            Gestor de Automações
          </h1>
        </div>

        <BlinkCarregando tamanho="lg" nuvens />

        {estado && (
          <div
            className="flex items-center gap-2 text-[13px] text-muted-foreground"
            role="status"
            aria-live="polite"
          >
            {/* O ponto pulsando informa "ainda acontecendo" quando o texto
                fica parado por vários segundos. `motion-reduce:animate-none`
                porque é movimento, mesmo sendo pequeno. */}
            <span
              aria-hidden
              className="size-1.5 animate-pulse rounded-full bg-primary motion-reduce:animate-none"
            />
            {estado}
          </div>
        )}
      </div>
    </div>
  );
});
