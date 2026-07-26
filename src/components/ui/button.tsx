import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

/**
 * DS 3.0 — Button
 *
 * Sem sombra em nenhuma variante em fluxo: um botão é definido por
 * preenchimento/contorno, não por elevação. Alturas mais compactas
 * (36/32/40) e radius menor, no padrão Linear/Vercel.
 *
 * A hierarquia real é: default (primária, uma por tela) → outline
 * (secundária) → ghost (terciária) → link. As demais variantes seguem
 * existindo para não quebrar consumidores.
 */
const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-[background-color,border-color,color,opacity] duration-fast ease-standard focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:ring-offset-1 disabled:pointer-events-none disabled:opacity-40 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/85",
        destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/90",
        outline: "border border-border bg-transparent hover:bg-muted/60 hover:border-border",
        secondary: "bg-muted text-foreground hover:bg-muted/70",
        ghost: "hover:bg-muted/60 text-foreground/80 hover:text-foreground",
        link: "text-foreground underline-offset-4 hover:underline",
        // Ação primária flutuante — única variante que mantém elevação, porque
        // ela realmente flutua sobre o conteúdo.
        fab: "rounded-full bg-primary text-primary-foreground shadow-elev-2 hover:shadow-elev-3 hover:bg-primary/90",
      },
      size: {
        default: "h-9 px-3.5 py-2",
        sm: "h-8 rounded-md px-2.5 text-xs",
        lg: "h-10 rounded-md px-5",
        icon: "h-9 w-9",
        "icon-sm": "h-8 w-8 rounded-md",
        "icon-lg": "h-10 w-10 rounded-md",
        fab: "h-14 w-14",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />;
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };
