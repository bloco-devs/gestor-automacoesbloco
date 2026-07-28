import { memo, useMemo } from "react";
import { cn } from "@/lib/utils";
import { EmptyPanel } from "@/design-system";
import { RISCO_ROTULO, type Demanda } from "@/domain/demand";

/**
 * A lente de calendário.
 *
 * Mesmo conjunto de `Demanda`, projetado no tempo. O eixo é dimensionado pelos
 * dados — não por um mês fixo — porque um Gantt que mostra um mês vazio
 * enquanto o trabalho está em outro é decoração.
 *
 * Demandas sem prazo ficam listadas embaixo em vez de omitidas: num Gantt,
 * "não tem data" é justamente a informação que o gestor precisa ver.
 */

const DIA = 24 * 60 * 60 * 1000;

const COR_RISCO: Record<string, string> = {
  sla_estourado: "bg-destructive/70",
  atrasada: "bg-destructive/70",
  vence_hoje: "bg-warning/80",
  sla_atencao: "bg-warning/70",
  parada: "bg-warning/50",
  vence_em_breve: "bg-info/60",
};

interface Props {
  demandas: Demanda[];
  onAbrir: (id: string) => void;
}

function GanttLenteImpl({ demandas, onAbrir }: Props) {
  const comPrazo = useMemo(
    () => demandas.filter((d) => d.prazo).sort((a, b) => (a.prazo! < b.prazo! ? -1 : 1)),
    [demandas],
  );
  const semPrazo = useMemo(() => demandas.filter((d) => !d.prazo), [demandas]);

  const escala = useMemo(() => {
    if (comPrazo.length === 0) return null;
    const datas = comPrazo.map((d) => new Date(d.prazo!).getTime());
    const hoje = Date.now();
    const min = Math.min(...datas, hoje);
    const max = Math.max(...datas, hoje);
    const folga = Math.max((max - min) * 0.08, 3 * DIA);
    const inicio = min - folga;
    const fim = max + folga;
    const span = Math.max(fim - inicio, DIA);

    const marcos: { pos: number; rotulo: string }[] = [];
    const cursor = new Date(inicio);
    cursor.setDate(1);
    while (cursor.getTime() <= fim) {
      const pos = ((cursor.getTime() - inicio) / span) * 100;
      if (pos >= 0 && pos <= 100) {
        marcos.push({ pos, rotulo: cursor.toLocaleDateString("pt-BR", { month: "short" }).replace(".", "") });
      }
      cursor.setMonth(cursor.getMonth() + 1);
    }
    return { inicio, span, marcos, hojePos: ((hoje - inicio) / span) * 100 };
  }, [comPrazo]);

  if (demandas.length === 0) {
    return <EmptyPanel title="Nada por aqui" description="Nenhuma demanda corresponde a esta fila." />;
  }

  return (
    <div className="space-y-8">
      {escala && (
        <section>
          <div className="relative mb-2 h-4 border-b border-border/50">
            {escala.marcos.map((m) => (
              <span
                key={m.rotulo + m.pos}
                className="ds-caption absolute top-0 text-muted-foreground"
                style={{ left: `${m.pos}%` }}
              >
                {m.rotulo}
              </span>
            ))}
          </div>

          <div className="relative">
            {escala.hojePos >= 0 && escala.hojePos <= 100 && (
              <span
                aria-hidden
                className="absolute inset-y-0 z-10 w-px bg-foreground/25"
                style={{ left: `${escala.hojePos}%` }}
              />
            )}

            <div className="divide-y divide-border/40">
              {comPrazo.map((d) => {
                const pos = ((new Date(d.prazo!).getTime() - escala.inicio) / escala.span) * 100;
                return (
                  <button
                    key={d.id}
                    type="button"
                    onClick={() => onAbrir(d.id)}
                    aria-label={`Abrir demanda ${d.titulo}`}
                    className="group grid w-full grid-cols-[minmax(0,18rem)_1fr] items-center gap-4 rounded-md py-2 pr-2 text-left transition-colors duration-fast hover:bg-muted/40 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
                  >
                    <span className="flex min-w-0 flex-col">
                      <span className={cn("ds-body-strong truncate", d.concluida && "line-through opacity-60")}>
                        {d.titulo}
                      </span>
                      <span className="ds-caption truncate text-muted-foreground">
                        {d.status.rotulo}
                        {d.responsaveis[0] ? ` · ${d.responsaveis[0].nome}` : ""}
                      </span>
                    </span>
                    <span className="relative h-5">
                      <span
                        className={cn(
                          "absolute top-1/2 size-2 -translate-y-1/2 rounded-full transition-[height] duration-fast group-hover:h-2.5",
                          d.concluida ? "bg-success/50" : d.risco ? COR_RISCO[d.risco] : "bg-foreground/35",
                        )}
                        style={{ left: `${Math.max(0, Math.min(pos, 99))}%` }}
                        title={`${new Date(d.prazo!).toLocaleDateString("pt-BR")}${
                          d.risco ? ` · ${RISCO_ROTULO[d.risco]}` : ""
                        }`}
                      />
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {semPrazo.length > 0 && (
        <section>
          <h2 className="ds-label mb-1 text-muted-foreground">
            Sem prazo definido{" "}
            <span className="ds-caption tabular-nums text-muted-foreground/70">{semPrazo.length}</span>
          </h2>
          <div className="divide-y divide-border/40">
            {semPrazo.map((d) => (
              <button
                key={d.id}
                type="button"
                onClick={() => onAbrir(d.id)}
                aria-label={`Abrir demanda ${d.titulo}`}
                className="flex w-full items-center justify-between gap-4 rounded-md py-2 pr-2 text-left transition-colors duration-fast hover:bg-muted/40 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
              >
                <span className="ds-body-strong truncate">{d.titulo}</span>
                <span className="ds-caption shrink-0 text-muted-foreground">{d.status.rotulo}</span>
              </button>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

export const GanttLente = memo(GanttLenteImpl);
