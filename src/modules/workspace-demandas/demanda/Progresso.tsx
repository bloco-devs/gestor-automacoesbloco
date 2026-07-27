import { memo } from "react";
import { cn } from "@/lib/utils";
import type { Etapa, Progressao } from "@/domain/demand";

/**
 * A linha do tempo da demanda.
 *
 * O QUE A SEPARA DE UM WIZARD
 * Wizard mostra passos idênticos e sugere que o trabalho anda sempre para
 * frente. Esta linha mostra três coisas que um wizard esconde, e são elas que a
 * deixam viva:
 *
 *   TEMPO       cada etapa cumprida carrega quantos dias levou, e a atual
 *               carrega há quantos dias está. "Em desenvolvimento" é um
 *               rótulo; "Em desenvolvimento há 19 dias" é uma decisão.
 *   PULO        etapa que a demanda atravessou sem passar aparece vazada, não
 *               verde. Pintar de verde o que ninguém fez é a mentira mais cara
 *               que essa tela poderia contar — some com "ninguém testou".
 *   RETRABALHO  voltas aparecem como fato, não como barra andando para trás.
 *
 * A ETAPA ATUAL É A ÚNICA COM RÓTULO SEMPRE VISÍVEL
 * As outras aparecem em texto menor e apagado. Em menos de um segundo o olho
 * precisa achar *onde está* — dar o mesmo peso a seis rótulos obriga a ler os
 * seis para descobrir qual importa.
 *
 * Tudo vem da auditoria que já está no banco: nenhuma chamada de IA.
 */

function tempo(dias: number | null): string | null {
  if (dias === null) return null;
  if (dias < 1) return "hoje";
  if (dias === 1) return "1 dia";
  if (dias < 30) return `${dias} dias`;
  const meses = Math.floor(dias / 30);
  return `${meses} ${meses === 1 ? "mês" : "meses"}`;
}

function Marca({ etapa }: { etapa: Etapa }) {
  if (etapa.estado === "atual") {
    return (
      <span className="relative flex size-2.5 shrink-0 items-center justify-center" aria-hidden>
        <span className="absolute size-2.5 animate-ping rounded-full bg-primary/40" />
        <span className="size-2.5 rounded-full bg-primary" />
      </span>
    );
  }
  if (etapa.estado === "concluida") {
    return <span aria-hidden className="size-2.5 shrink-0 rounded-full bg-foreground/40" />;
  }
  if (etapa.estado === "pulada") {
    // Vazada com traço: cumprida e pulada não podem parecer a mesma coisa.
    return (
      <span
        aria-hidden
        className="flex size-2.5 shrink-0 items-center justify-center rounded-full border border-dashed border-border"
      >
        <span className="h-px w-1.5 bg-border" />
      </span>
    );
  }
  return <span aria-hidden className="size-2.5 shrink-0 rounded-full border border-border" />;
}

function ProgressoImpl({ progressao: p, className }: { progressao: Progressao; className?: string }) {
  if (p.etapas.length < 2) return null;

  const rotuloDoEstado: Record<Etapa["estado"], string> = {
    concluida: "cumprida",
    atual: "etapa atual",
    futura: "ainda não",
    pulada: "pulada",
  };

  return (
    <div className={cn("flex flex-col gap-1", className)}>
      <ol className="flex items-center gap-0" aria-label="Andamento da demanda">
        {p.etapas.map((e, i) => {
          const legenda = tempo(e.dias);
          return (
            <li
              key={e.id}
              className={cn("flex min-w-0 items-center", e.estado === "atual" ? "shrink-0" : "min-w-0 flex-1")}
              aria-current={e.estado === "atual" ? "step" : undefined}
            >
              <span
                className="flex shrink-0 items-center gap-1.5"
                title={`${e.rotulo} — ${rotuloDoEstado[e.estado]}${legenda ? `, ${legenda}` : ""}`}
              >
                <Marca etapa={e} />
                <span
                  className={cn(
                    "truncate text-[12px] leading-none",
                    e.estado === "atual" && "font-medium text-foreground",
                    e.estado === "concluida" && "text-muted-foreground",
                    e.estado === "futura" && "text-muted-foreground/50",
                    e.estado === "pulada" && "text-muted-foreground/50 line-through",
                  )}
                >
                  {e.rotulo}
                </span>
                {e.estado === "atual" && legenda && (
                  <span className="shrink-0 rounded bg-primary/10 px-1.5 py-0.5 text-[11px] leading-none text-primary">
                    {legenda}
                  </span>
                )}
              </span>
              {i < p.etapas.length - 1 && (
                <span
                  aria-hidden
                  className={cn(
                    "mx-2 h-px min-w-3 flex-1",
                    e.estado === "concluida" || e.estado === "atual" ? "bg-border" : "bg-border/40",
                  )}
                />
              )}
            </li>
          );
        })}
      </ol>

      {p.retrabalho > 0 && (
        <p className="text-[11px] text-muted-foreground">
          {/* Voltar é um fato do projeto, não um detalhe de interface. Três
              voltas costumam significar requisito mal entendido. */}
          Voltou {p.retrabalho} {p.retrabalho === 1 ? "vez" : "vezes"} para uma etapa anterior.
        </p>
      )}
    </div>
  );
}

export const Progresso = memo(ProgressoImpl);
