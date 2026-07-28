import { cn } from "@/lib/utils";

/**
 * DS 4.0 — Skeleton
 *
 * Saiu o `animate-pulse` do Tailwind (oscilação de opacidade: a forma
 * inteira aparece e some, em loop). Numa tela com seis blocos carregando ao
 * mesmo tempo, aquilo vira um cintilar que o olho persegue — e que se lê como
 * "travando", não como "carregando".
 *
 * A varredura tem direção, e direção sugere progresso mesmo sem saber quanto
 * falta. É a situação exata de um carregamento: o sistema não sabe o tempo
 * restante, mas precisa comunicar que algo acontece e em que sentido.
 */
function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("carregando rounded-md", className)} {...props} />;
}

export { Skeleton };
