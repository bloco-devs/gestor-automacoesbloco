import { memo } from "react";
import { cn } from "@/lib/utils";

const TAMANHOS = {
  sm: { wrapper: "w-[60px] h-[72px]" },
  md: { wrapper: "w-[100px] h-[120px]" },
  lg: { wrapper: "w-[160px] h-[192px]" },
} as const;

export const BlinkCarregando = memo(function BlinkCarregando({
  tamanho = "md",
  mensagem,
  nuvens = true,
  className,
}: {
  tamanho?: keyof typeof TAMANHOS;
  mensagem?: string;
  nuvens?: boolean;
  className?: string;
}) {
  const t = TAMANHOS[tamanho];

  return (
    <div
      className={cn("relative flex flex-col items-center justify-center w-full h-full min-h-[200px] overflow-hidden parachute-loader", className)}
      role="status"
      aria-live="polite"
    >
      {nuvens && (
        <>
          <div className="wind-line wind-1"></div>
          <div className="wind-line wind-2"></div>
          <div className="wind-line wind-3"></div>
          <div className="wind-line wind-4"></div>
          <div className="wind-line wind-5"></div>

          <div className="cloud cloud-1"></div>
          <div className="cloud cloud-2"></div>
        </>
      )}

      <div className={cn("parachutist-wrapper relative z-10", t.wrapper)}>
        <svg
          className="parachute-svg w-full h-full drop-shadow-md"
          viewBox="0 0 100 120"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Cords */}
          <line x1="10" y1="40" x2="45" y2="80" stroke="currentColor" strokeWidth="2" className="text-foreground/30"></line>
          <line x1="90" y1="40" x2="55" y2="80" stroke="currentColor" strokeWidth="2" className="text-foreground/30"></line>
          <line x1="50" y1="35" x2="50" y2="80" stroke="currentColor" strokeWidth="2" className="text-foreground/30"></line>

          {/* Canopy - Using primary brand color for the parachute */}
          <path d="M 10 40 Q 50 -10 90 40 Z" fill="hsl(var(--primary))"></path>
          <path d="M 30 28 Q 50 0 70 28 L 50 35 Z" fill="#FFFFFF" opacity="0.3"></path>

          {/* Parachutist */}
          <circle cx="50" cy="85" r="8" fill="hsl(var(--foreground))"></circle>
          <rect x="42" y="93" width="16" height="20" rx="5" fill="hsl(var(--foreground))"></rect>
          <path d="M 42 95 L 30 85" stroke="hsl(var(--foreground))" strokeWidth="3" strokeLinecap="round"></path>
          <path d="M 58 95 L 70 85" stroke="hsl(var(--foreground))" strokeWidth="3" strokeLinecap="round"></path>
          <path d="M 45 113 L 40 120" stroke="hsl(var(--foreground))" strokeWidth="3" strokeLinecap="round"></path>
          <path d="M 55 113 L 60 120" stroke="hsl(var(--foreground))" strokeWidth="3" strokeLinecap="round"></path>
        </svg>
      </div>

      {mensagem && (
        <div className="relative z-20 mt-6 max-w-xs text-center text-[14px] font-medium tracking-wide text-muted-foreground animate-pulse uppercase">
          {mensagem}
        </div>
      )}
      {!mensagem && <span className="sr-only">Carregando</span>}
    </div>
  );
});
