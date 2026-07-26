import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

/**
 * DS 3.0 — Card
 *
 * A superfície deixou de ser decorativa. Por padrão o card é *flat*: borda
 * hairline, sem sombra e sem hover-lift. A profundidade vem do contraste de
 * superfície e do espaçamento, não de elevação — é o que separa um produto
 * (Linear, Vercel, GitHub) de um "dashboard genérico" cheio de caixas.
 *
 * A API é retrocompatível: `<Card className="..." />` continua funcionando
 * exatamente como antes. A prop `variant` é opcional e aditiva.
 *   - flat      (default) superfície em fluxo, borda sutil, sem sombra
 *   - outline   sem preenchimento, só o contorno — para agrupar sem pesar
 *   - ghost     sem borda e sem fundo — vira só um bloco com padding
 *   - elevated  o único com sombra, reservado a conteúdo realmente flutuante
 */
const cardVariants = cva("text-card-foreground transition-colors duration-base ease-standard", {
  variants: {
    variant: {
      flat: "rounded-lg border border-border/70 bg-card",
      outline: "rounded-lg border border-border/70 bg-transparent",
      ghost: "rounded-lg border-0 bg-transparent",
      elevated: "rounded-lg border border-border/60 bg-card shadow-elev-2",
    },
  },
  defaultVariants: {
    variant: "flat",
  },
});

export interface CardProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof cardVariants> {}

const Card = React.forwardRef<HTMLDivElement, CardProps>(({ className, variant, ...props }, ref) => (
  <div ref={ref} className={cn(cardVariants({ variant }), className)} {...props} />
));
Card.displayName = "Card";

const CardHeader = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn("flex flex-col space-y-1 p-5", className)} {...props} />
  ),
);
CardHeader.displayName = "CardHeader";

const CardTitle = React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLHeadingElement>>(
  ({ className, ...props }, ref) => (
    <h3 ref={ref} className={cn("ds-card-title", className)} {...props} />
  ),
);
CardTitle.displayName = "CardTitle";

const CardDescription = React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLParagraphElement>>(
  ({ className, ...props }, ref) => (
    <p ref={ref} className={cn("ds-caption text-muted-foreground", className)} {...props} />
  ),
);
CardDescription.displayName = "CardDescription";

const CardContent = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => <div ref={ref} className={cn("p-5 pt-0", className)} {...props} />,
);
CardContent.displayName = "CardContent";

const CardFooter = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn("flex items-center p-5 pt-0", className)} {...props} />
  ),
);
CardFooter.displayName = "CardFooter";

export { Card, CardHeader, CardFooter, CardTitle, CardDescription, CardContent, cardVariants };
