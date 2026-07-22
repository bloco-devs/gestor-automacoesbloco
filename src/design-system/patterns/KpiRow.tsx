import type { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

/**
 * KpiRow — grid responsivo para linha de KPIs.
 * Densidade: 2 → 3 → 4 → 6 colunas.
 */
export function KpiRow({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3",
        className,
      )}
      {...props}
    />
  );
}
