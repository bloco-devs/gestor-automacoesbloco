import { cn } from "@/lib/utils";

// DS 2.0 — radius alinhado a componentes (rounded-lg) e motion via token.
function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("animate-pulse rounded-md bg-muted/70", className)} {...props} />;
}

export { Skeleton };
