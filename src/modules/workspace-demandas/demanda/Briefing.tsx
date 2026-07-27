import { memo } from "react";
import { cn } from "@/lib/utils";
import type { Briefing as DadosDoBriefing } from "@/domain/demand";

/**
 * As quatro perguntas de quem vai executar.
 *
 * POR QUE ELE FICA NO TOPO DO FIO, E NÃO NUMA COLUNA
 * A métrica é: o desenvolvedor entende tudo em menos de trinta segundos. Ele
 * abre a demanda e o olho vai para o centro — é lá que está a conversa. Um
 * briefing na lateral seria lido depois das mensagens, e a essa altura os
 * trinta segundos já passaram.
 *
 * Ele fica acima da primeira mensagem e some quando não há nada a resumir: numa
 * demanda com duas mensagens, resumir é ruído.
 */

interface Props {
  briefing: DadosDoBriefing;
  /** Quantas falas existem. Abaixo do limiar o briefing não aparece. */
  falas: number;
}

function Secao({ rotulo, children }: { rotulo: string; children: React.ReactNode }) {
  return (
    <div className="flex gap-3 py-1">
      <span className="w-[92px] shrink-0 text-[12px] text-muted-foreground">{rotulo}</span>
      <div className="min-w-0 flex-1 text-[13px] leading-relaxed">{children}</div>
    </div>
  );
}

function BriefingImpl({ briefing: b, falas }: Props) {
  // Com poucas mensagens, ler é mais rápido que ler um resumo de ler.
  if (falas < 4) return null;

  return (
    <section
      aria-label="Resumo para quem vai executar"
      className="mb-3 rounded-lg border border-border/60 bg-muted/30 px-3 py-2.5"
    >
      <Secao rotulo="Pedem">{b.oQuePedem}</Secao>

      {b.anexos && <Secao rotulo="Anexado">{b.anexos}</Secao>}

      {b.jaExiste && <Secao rotulo="Já existe">{b.jaExiste}</Secao>}

      {b.jaTentado.length > 0 && (
        <Secao rotulo="Já foi dito">
          <ul className="space-y-0.5">
            {b.jaTentado.map((t, i) => (
              <li key={`${i}-${t.slice(0, 12)}`} className="text-muted-foreground">
                {t}
              </li>
            ))}
          </ul>
        </Secao>
      )}

      {b.travando.length > 0 && (
        <Secao rotulo="Travando">
          <ul className="space-y-0.5">
            {b.travando.map((t) => (
              <li key={t} className="flex items-baseline gap-2">
                <span aria-hidden className="size-1 shrink-0 translate-y-[-2px] rounded-full bg-destructive" />
                {t}
              </li>
            ))}
          </ul>
        </Secao>
      )}

      <Secao rotulo="Começar por">
        <span className={cn("font-medium")}>{b.porOndeComecar}</span>
      </Secao>
    </section>
  );
}

export const Briefing = memo(BriefingImpl);
