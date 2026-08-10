import { memo } from "react";
import { Check, Minus } from "lucide-react";
import { cn } from "@/lib/utils";
import { tomDaEtapa, type Etapa, type Progressao } from "@/domain/demand";
import { PALETA } from "../components/KanbanCard";

/**
 * A linha do tempo da demanda — em forma de stepper.
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
 * POR QUE A COR DA ETAPA ATUAL NÃO É SEMPRE A PRIMÁRIA
 * O pulso usa o TOM da etapa — a mesma tinta que o cabeçalho da coluna já usa
 * no quadro. Assim "em testes" tem a mesma cor aqui e lá, e a cor continua
 * significando estado em vez de decorar o componente da vez.
 *
 * OS RÓTULOS SÃO OS DA FONTE
 * Nada é renomeado aqui: o nome da coluna (ou do status) é o que a pessoa vê no
 * quadro, e traduzir só nesta tela criaria dois vocabulários para o mesmo fato.
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

/** A marca do passo: tamanho legível, e um símbolo por estado. */
function Marca({ etapa, tinta }: { etapa: Etapa; tinta: (typeof PALETA)[keyof typeof PALETA] }) {
  if (etapa.estado === "atual") {
    return (
      <span className="relative flex size-5 shrink-0 items-center justify-center" aria-hidden>
        {/* Anel externo pulsando na cor da etapa: chama o olho sem piscar texto. */}
        <span className={cn("absolute size-5 animate-ping rounded-full opacity-60", tinta.regua)} />
        <span
          className={cn(
            "flex size-5 items-center justify-center rounded-full border-2 bg-background",
            tinta.texto.replace("text-", "border-"),
          )}
        >
          <span className={cn("size-2 rounded-full", tinta.regua)} />
        </span>
      </span>
    );
  }
  if (etapa.estado === "concluida") {
    return (
      <span
        aria-hidden
        className="flex size-5 shrink-0 items-center justify-center rounded-full bg-success/15 text-success"
      >
        <Check className="size-3" strokeWidth={3} />
      </span>
    );
  }
  if (etapa.estado === "pulada") {
    // Vazada com traço: cumprida e pulada não podem parecer a mesma coisa.
    return (
      <span
        aria-hidden
        className="flex size-5 shrink-0 items-center justify-center rounded-full border border-dashed border-border text-muted-foreground/60"
      >
        <Minus className="size-3" />
      </span>
    );
  }
  return (
    <span
      aria-hidden
      className="flex size-5 shrink-0 items-center justify-center rounded-full border border-border bg-background"
    >
      <span className="size-1.5 rounded-full bg-border" />
    </span>
  );
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
    <div className={cn("flex flex-col gap-1.5", className)}>
      <ol className="flex items-center gap-0" aria-label="Andamento da demanda">
        {p.etapas.map((e, i) => {
          const legenda = tempo(e.dias);
          const tinta = PALETA[tomDaEtapa(e.rotulo)];
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
                <Marca etapa={e} tinta={tinta} />
                <span
                  className={cn(
                    "truncate text-[12px] leading-none",
                    e.estado === "atual" && cn("font-semibold", tinta.texto),
                    e.estado === "concluida" && "text-muted-foreground",
                    e.estado === "futura" && "text-muted-foreground/50",
                    e.estado === "pulada" && "text-muted-foreground/50 line-through",
                  )}
                >
                  {e.rotulo}
                </span>
                {e.estado === "atual" && legenda && (
                  <span
                    className={cn(
                      "shrink-0 rounded px-1.5 py-0.5 text-[11px] leading-none",
                      tinta.pastilha,
                    )}
                  >
                    {legenda}
                  </span>
                )}
              </span>
              {i < p.etapas.length - 1 && (
                // A ligação é sólida até a etapa atual e apagada depois dela:
                // é o que faz "onde estou" aparecer sem ler nenhum rótulo.
                <span
                  aria-hidden
                  className={cn(
                    "mx-2 h-0.5 min-w-3 flex-1 rounded-full",
                    e.estado === "concluida" || e.estado === "atual"
                      ? "bg-border"
                      : "bg-border/40",
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
