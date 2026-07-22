import type { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export function Toolbar({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("flex items-center justify-between gap-3 flex-wrap", className)}
      {...props}
    />
  );
}
