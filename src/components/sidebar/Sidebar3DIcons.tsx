import React from "react";
import { cn } from "@/lib/utils";

interface Icon3DProps {
  className?: string;
  isActive?: boolean;
}

/**
 * 1. Início / Dashboard (Home 3D Claymorphism)
 * Casa estilizada 3D com cantos suaves, gradiente tátil, bisel de luz superior e sombra projetada.
 */
export function Home3DIcon({ className, isActive }: Icon3DProps) {
  return (
    <div
      className={cn(
        "relative flex size-5 shrink-0 items-center justify-center rounded-lg transition-transform duration-200 group-hover:scale-105",
        isActive
          ? "bg-gradient-to-br from-amber-400 via-yellow-500 to-amber-600 text-amber-950 shadow-[inset_0_1px_1px_rgba(255,255,255,0.6),0_3px_6px_rgba(245,158,11,0.35)]"
          : "bg-gradient-to-br from-slate-200 via-slate-300 to-slate-400 text-slate-700 dark:from-slate-700 dark:via-slate-800 dark:to-slate-900 dark:text-slate-300 shadow-[inset_0_1px_1px_rgba(255,255,255,0.2),0_2px_4px_rgba(0,0,0,0.2)]",
        className,
      )}
    >
      <svg
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="size-3.5 drop-shadow-[0_1px_1px_rgba(0,0,0,0.3)]"
      >
        <path
          d="M3.5 10.5L11.1 3.9C11.6 3.4 12.4 3.4 12.9 3.9L20.5 10.5C21 10.9 21.2 11.6 20.9 12.2C20.6 12.7 20 13 19.4 13H19V19C19 20.1 18.1 21 17 21H15V15H9V21H7C5.9 21 5 20.1 5 19V13H4.6C4 13 3.4 12.7 3.1 12.2C2.8 11.6 3 10.9 3.5 10.5Z"
          fill="currentColor"
          fillRule="evenodd"
          clipRule="evenodd"
        />
      </svg>
    </div>
  );
}

/**
 * 2. Automações / Fluxos (Atividades / Workflows 3D Isométrico)
 * Nós de conexão em camadas isométricas com esferas em relevo 3D e gradiente dinâmico.
 */
export function Automacoes3DIcon({ className, isActive }: Icon3DProps) {
  return (
    <div
      className={cn(
        "relative flex size-5 shrink-0 items-center justify-center rounded-lg transition-transform duration-200 group-hover:scale-105",
        isActive
          ? "bg-gradient-to-br from-amber-400 via-amber-500 to-yellow-600 text-amber-950 shadow-[inset_0_1px_1px_rgba(255,255,255,0.6),0_3px_6px_rgba(245,158,11,0.35)]"
          : "bg-gradient-to-br from-slate-200 via-slate-300 to-slate-400 text-slate-700 dark:from-slate-700 dark:via-slate-800 dark:to-slate-900 dark:text-slate-300 shadow-[inset_0_1px_1px_rgba(255,255,255,0.2),0_2px_4px_rgba(0,0,0,0.2)]",
        className,
      )}
    >
      <svg
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="size-3.5 drop-shadow-[0_1px_1px_rgba(0,0,0,0.3)]"
      >
        <path
          d="M7 8H13C15.2 8 17 9.8 17 12C17 14.2 15.2 16 13 16H9"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
        />
        <circle cx="6" cy="8" r="3" fill="currentColor" />
        <circle cx="17" cy="12" r="3" fill="currentColor" fillOpacity="0.85" />
        <circle cx="8" cy="16" r="3" fill="currentColor" />
      </svg>
    </div>
  );
}

/**
 * 3. Configurações / Ferramentas (Chave Inglesa 3D Matte/Clay)
 * Ferramenta mecânica estilizada 3D com volume fosco e sombra direcionada.
 */
export function Configuracoes3DIcon({ className, isActive }: Icon3DProps) {
  return (
    <div
      className={cn(
        "relative flex size-5 shrink-0 items-center justify-center rounded-lg transition-transform duration-200 group-hover:scale-105",
        isActive
          ? "bg-gradient-to-br from-amber-400 via-yellow-500 to-amber-600 text-amber-950 shadow-[inset_0_1px_1px_rgba(255,255,255,0.6),0_3px_6px_rgba(245,158,11,0.35)]"
          : "bg-gradient-to-br from-slate-200 via-slate-300 to-slate-400 text-slate-700 dark:from-slate-700 dark:via-slate-800 dark:to-slate-900 dark:text-slate-300 shadow-[inset_0_1px_1px_rgba(255,255,255,0.2),0_2px_4px_rgba(0,0,0,0.2)]",
        className,
      )}
    >
      <svg
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="size-3.5 drop-shadow-[0_1px_1px_rgba(0,0,0,0.3)]"
      >
        <path
          d="M14.7 3.3C13.2 3.8 12.2 5.1 12.3 6.7C12.4 8 13.2 9.2 14.5 9.7L6.8 17.4C6.2 18 5.3 18.3 4.4 18.1L3 17.7L2.3 19.1L4.9 21.7L6.3 21L5.9 19.6C5.7 18.7 6 17.8 6.6 17.2L14.3 9.5C14.8 10.8 16 11.6 17.3 11.7C18.9 11.8 20.2 10.8 20.7 9.3L17.5 7.5L14.7 3.3Z"
          fill="currentColor"
        />
      </svg>
    </div>
  );
}

/**
 * 4. Terminal / Logs / Código (>_ Glassmorphism Flutuante 3D)
 * Bloco em perspectiva 3D com efeito de vidro fosco, bisel interno e prompt >_.
 */
export function Terminal3DIcon({ className, isActive }: Icon3DProps) {
  return (
    <div
      className={cn(
        "relative flex size-5 shrink-0 items-center justify-center rounded-lg transition-transform duration-200 group-hover:scale-105",
        isActive
          ? "bg-gradient-to-br from-amber-400 via-yellow-500 to-amber-600 text-amber-950 shadow-[inset_0_1px_1px_rgba(255,255,255,0.6),0_3px_6px_rgba(245,158,11,0.35)]"
          : "bg-gradient-to-br from-slate-300/90 via-slate-400/80 to-slate-500/90 text-slate-800 dark:from-slate-700/80 dark:via-slate-800/80 dark:to-slate-900/90 dark:text-slate-200 backdrop-blur-xs shadow-[inset_0_1px_1px_rgba(255,255,255,0.3),0_2px_5px_rgba(0,0,0,0.25)]",
        className,
      )}
    >
      <svg
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="size-3.5 drop-shadow-[0_1px_1px_rgba(0,0,0,0.35)]"
      >
        <rect x="3" y="4" width="18" height="16" rx="3" fill="currentColor" fillOpacity="0.25" stroke="currentColor" strokeWidth="1.5" />
        <path d="M7 9L10 12L7 15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        <line x1="12" y1="15" x2="16" y2="15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      </svg>
    </div>
  );
}
