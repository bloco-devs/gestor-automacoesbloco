import { memo } from "react";
import { cn } from "@/lib/utils";
import { Blink } from "./Blink";

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
        <svg viewBox="0 0 200 300" className="w-full h-full drop-shadow-md z-10 relative" xmlns="http://www.w3.org/2000/svg">
          {/* CORDAS DO PARAQUEDAS */}
          <g id="parachute-cords" stroke="hsl(var(--foreground)/0.3)" strokeWidth="2">
            <line x1="40" y1="60" x2="85" y2="120" />
            <line x1="160" y1="60" x2="115" y2="120" />
            <line x1="100" y1="50" x2="100" y2="120" />
          </g>

          {/* CANOPY / PARAQUEDAS */}
          <path d="M 20 60 Q 100 -20 180 60 Z" fill="hsl(var(--primary))"></path>
          <path d="M 60 40 Q 100 -5 140 40 L 100 50 Z" fill="#FFFFFF" opacity="0.3"></path>

          {/* BRAÇO ESQUERDO */}
          <g id="arm-left" className="animate-swing-left" style={{ transformOrigin: '80px 130px' }}>
            <circle cx="80" cy="130" r="6" fill="#F2C230" /> {/* Ombro */}
            <rect x="50" y="126" width="30" height="8" rx="4" fill="#16171A" stroke="#F2C230" strokeWidth="1.5" transform="rotate(-45 80 130)" />
            <circle cx="57" cy="107" r="5" fill="#F2C230" /> {/* Mão */}
          </g>

          {/* BRAÇO DIREITO */}
          <g id="arm-right" className="animate-swing-right" style={{ transformOrigin: '120px 130px' }}>
            <circle cx="120" cy="130" r="6" fill="#F2C230" /> {/* Ombro */}
            <rect x="120" y="126" width="30" height="8" rx="4" fill="#16171A" stroke="#F2C230" strokeWidth="1.5" transform="rotate(45 120 130)" />
            <circle cx="143" cy="107" r="5" fill="#F2C230" /> {/* Mão */}
          </g>

          {/* PERNA ESQUERDA */}
          <g id="leg-left" className="animate-flail-left" style={{ transformOrigin: '85px 180px' }}>
            <circle cx="85" cy="180" r="6" fill="#F2C230" /> {/* Quadril */}
            <rect x="65" y="180" width="8" height="35" rx="4" fill="#16171A" stroke="#F2C230" strokeWidth="1.5" transform="rotate(20 85 180)" />
            <circle cx="73" cy="211" r="5.5" fill="#F2C230" /> {/* Pé */}
          </g>

          {/* PERNA DIREITA */}
          <g id="leg-right" className="animate-flail-right" style={{ transformOrigin: '115px 180px' }}>
            <circle cx="115" cy="180" r="6" fill="#F2C230" /> {/* Quadril */}
            <rect x="127" y="180" width="8" height="35" rx="4" fill="#16171A" stroke="#F2C230" strokeWidth="1.5" transform="rotate(-20 115 180)" />
            <circle cx="127" cy="211" r="5.5" fill="#F2C230" /> {/* Pé */}
          </g>

          {/* CHASSI / CORPO PRINCIPAL */}
          <g id="main-body">
            <rect x="75" y="120" width="50" height="65" rx="15" fill="#16171A" stroke="#F2C230" strokeWidth="2.5" />
            <rect x="85" y="175" width="30" height="10" rx="5" fill="#0B0C0E" /> {/* Detalhe inferior */}
          </g>

          {/* ROSTO DO BLINK INCORPORADO COMO SVG */}
          <Blink className="w-[66px] h-[66px]" x="67" y="112" />
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
