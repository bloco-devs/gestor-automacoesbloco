import { forwardRef, type HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export interface PageShellProps extends HTMLAttributes<HTMLDivElement> {
  /** Largura máxima do conteúdo. Default: screen-2xl */
  maxWidth?: "md" | "lg" | "xl" | "2xl" | "full";
}

const MAX_WIDTH: Record<NonNullable<PageShellProps["maxWidth"]>, string> = {
  md: "max-w-screen-md",
  lg: "max-w-screen-lg",
  xl: "max-w-screen-xl",
  "2xl": "max-w-screen-2xl",
  full: "max-w-full",
};

/**
 * PageShell — container padrão de página do DS 2.0.
 * Aplica escala de espaçamento e padding responsivo consistentes.
 */
export const PageShell = forwardRef<HTMLDivElement, PageShellProps>(function PageShell(
  { className, maxWidth = "2xl", ...props },
  ref,
) {
  return (
    <div
      ref={ref}
      className={cn(
        MAX_WIDTH[maxWidth],
        "mx-auto w-full px-5 py-6 md:px-8 md:py-8 lg:px-10 space-y-8",
        className,
      )}
      {...props}
    />
  );
});
