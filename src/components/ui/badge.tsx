import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

/**
 * DS 3.0 — Badge
 *
 * Badges deixaram de ser blocos de cor sólida. Agora usam tinta sutil
 * (fundo com baixa opacidade da cor semântica + texto na própria cor), no
 * padrão de GitHub Labels / Linear. Resultado: a cor continua comunicando
 * status, mas para de gritar e de competir com o conteúdo.
 *
 * Todas as variantes existentes continuam válidas — nenhum consumidor precisa
 * mudar. `solid` é a única adição, para o caso raro em que se quer o
 * contraste antigo de volta (ex.: contador sobre uma superfície escura).
 */
const badgeVariants = cva(
  "inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-xs font-medium transition-colors duration-fast ease-standard focus:outline-none focus-visible:ring-2 focus-visible:ring-ring/50",
  {
    variants: {
      variant: {
        default: "bg-muted text-muted-foreground",
        neutral: "bg-muted text-muted-foreground",
        primary: "bg-primary/15 text-foreground",
        secondary: "bg-secondary/15 text-secondary",
        success: "bg-success/12 text-success",
        warning: "bg-warning/15 text-warning",
        info: "bg-info/12 text-info",
        danger: "bg-destructive/12 text-destructive",
        destructive: "bg-destructive/12 text-destructive",
        outline: "border border-border/70 text-muted-foreground",
        solid: "bg-foreground text-background",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
