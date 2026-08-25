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
 * → o Blink descendo → o estado atual, miúdo. O movimento fica ABAIXO do
 * texto de propósito: acima, ele roubaria a leitura do nome do sistema no
 * primeiro instante, que é o que esta tela tem para dizer.
 *
 * `font-brand` (NewBlackTypeface) é reservada no design system a branding
 * real — logo e telas institucionais — e proibida em heading de tela comum.
 * Esta é uma das poucas em que ela cabe: não há conteúdo aqui, só identidade.
 *
 * MOVIMENTO
 * Só o carregador e o ponto do estado se mexem, e os dois param com
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

          {/* Descrição do sistema, não slogan.
              As versões anteriores falavam com o leitor em segunda pessoa
              ("você pede", "peça o que atrapalha") — tom de material de
              divulgação, não de ferramenta interna. Quem lê esta tela já
              trabalha aqui e já sabe o que veio fazer; o que ela precisa
              dizer é o que este sistema é, em uma linha. */}
          <p className="max-w-md text-balance text-[15px] leading-relaxed text-muted-foreground">
            Demandas, automações e acompanhamento de entregas.
          </p>
        </div>

        {/* O MESMO CARREGADOR DE TODO O SISTEMA.
            Usava o salto, que o André descreveu como "bater numa parede
            invisível" — e era mesmo: o ápice do pulo encostava no topo da
            caixa e o `overflow-hidden` cortava. Um carregamento não tem
            impacto, tem continuidade; e ter dois mascotes diferentes,
            um na entrada e outro nas telas, é o tipo de inconsistência
            que faz parecer que uma das duas está quebrada. */}
        <div className="h-[340px] w-full max-w-2xl">
          <BlinkCarregando nuvens />
        </div>

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
