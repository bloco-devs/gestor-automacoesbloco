import { memo } from "react";
import { cn } from "@/lib/utils";

/**
 * Blink — o rosto da IA do sistema.
 *
 * POR QUE UM DESENHO E NÃO UM ÍCONE
 * A conversa do portal é o primeiro contato de quem tem um problema e não
 * sabe descrevê-lo. Do outro lado havia um ícone genérico de robô, o mesmo
 * que qualquer aplicativo usa — nada ali dizia que existe alguém (algo)
 * específico ouvindo. Um rosto constante cria a única coisa que faltava:
 * saber com quem se está falando, e reconhecê-lo da próxima vez.
 *
 * NÃO É UM PERSONAGEM FALANTE
 * Blink não conta piada, não se apresenta e não fala de si. Ele é a
 * assinatura visual de um assistente que continua fazendo o mesmo trabalho
 * de sempre — perguntar o necessário e entregar a demanda pronta. O que
 * muda é o tom, não o método.
 *
 * SVG e não imagem: escala sem borrar em qualquer tamanho, herda cor quando
 * precisa, e não custa uma requisição de rede num ponto onde a pessoa está
 * esperando resposta.
 */
export const Blink = memo(function Blink({
  className,
  animado = false,
}: {
  className?: string;
  /** Flutua e pisca. Use só onde ele é figura, nunca em lista. */
  animado?: boolean;
}) {
  return (
    <svg
      viewBox="0 0 220 220"
      className={cn("shrink-0", className)}
      role="img"
      aria-label="Blink, o assistente"
    >
      <g className={animado ? "blink-flutua" : undefined} style={{ transformOrigin: "110px 200px" }}>
        <path d="M78 58 Q68 34 84 40 Q92 46 88 64 Z" fill="#F2C230" />
        <path d="M142 58 Q152 34 136 40 Q128 46 132 64 Z" fill="#F2C230" />
        <circle cx="110" cy="118" r="70" fill="#16171A" />
        <ellipse cx="42" cy="118" rx="11" ry="19" fill="#F2C230" />
        <ellipse cx="178" cy="118" rx="11" ry="19" fill="#F2C230" />
        <rect x="62" y="78" width="96" height="86" rx="30" fill="#0B0C0E" stroke="#F2C230" strokeWidth="3" />
        <rect
          x="80"
          y="104"
          width="24"
          height="24"
          rx="9"
          fill="#F2C230"
          className={animado ? "blink-olho-e" : undefined}
          style={{ transformOrigin: "92px 116px" }}
        />
        <rect
          x="116"
          y="104"
          width="24"
          height="24"
          rx="9"
          fill="#F2C230"
          className={animado ? "blink-olho-d" : undefined}
          style={{ transformOrigin: "128px 116px" }}
        />
        <path d="M92 144 Q110 156 128 144" stroke="#F2C230" strokeWidth="4" fill="none" strokeLinecap="round" />
      </g>
    </svg>
  );
});
