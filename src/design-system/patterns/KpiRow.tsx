import type { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

/**
 * DS 3.0 — KpiRow
 *
 * Antes: até 6 colunas de widgets espremidos, cada um com sua caixa.
 * Agora: no máximo 4 colunas, com respiro horizontal generoso. Menos
 * densidade, mais leitura — um KPI que ninguém consegue ler não é um KPI.
 */
export function KpiRow({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "grid grid-cols-2 gap-x-8 gap-y-6 md:grid-cols-3 xl:grid-cols-4",
        className,
      )}
      {...props}
    />
  );
}
