import { memo, useState } from "react";
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { EmptyPanel } from "@/design-system";
import type { Capacidades, Grupo, SinaisUteis } from "@/domain/demand";
import { DemandaRow } from "./DemandaRow";

/**
 * A lente de lista agrupada — usada por Lista, Sprint e Timeline.
 *
 * Este é o ponto onde a promessa "trocar de visão é trocar o ângulo da câmera"
 * deixa de ser retórica: as três lentes chamam este mesmo componente e mudam
 * apenas qual função de agrupamento produziu `grupos`. Não existe layout
 * alternativo para nenhuma delas.
 */

interface Props {
  grupos: Grupo[];
  capacidades: Capacidades;
  sinais: SinaisUteis;
  onAbrir: (id: string) => void;
  mostrarStatusNaLinha?: boolean;
  vazio?: { titulo: string; descricao?: string };
}

function Bloco({
  grupo,
  capacidades,
  sinais,
  onAbrir,
  mostrarStatusNaLinha,
}: {
  grupo: Grupo;
  capacidades: Capacidades;
  sinais: SinaisUteis;
  onAbrir: (id: string) => void;
  mostrarStatusNaLinha?: boolean;
}) {
  const [aberto, setAberto] = useState(true);
  const painelId = `grupo-${grupo.id}`;

  return (
    <section>
      <button
        type="button"
        onClick={() => setAberto((v) => !v)}
        aria-expanded={aberto}
        aria-controls={painelId}
        className="flex w-full items-center gap-2 rounded-md py-1.5 pr-2 text-left transition-colors duration-fast hover:bg-muted/30 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
      >
        <ChevronRight
          className={cn(
            "size-3.5 shrink-0 text-muted-foreground transition-transform duration-fast ease-standard",
            aberto && "rotate-90",
          )}
          aria-hidden
        />
        <h2 className="ds-label text-muted-foreground">{grupo.rotulo}</h2>
        <span className="ds-caption tabular-nums text-muted-foreground/70">{grupo.itens.length}</span>
        {grupo.ajuda && (
          <span className="ds-caption ml-1 hidden text-muted-foreground/60 md:inline">— {grupo.ajuda}</span>
        )}
      </button>

      {aberto && (
        <div id={painelId} className="mt-0.5 divide-y divide-border/40">
          {grupo.itens.map((d) => (
            <DemandaRow
              key={d.id}
              demanda={d}
              capacidades={capacidades}
              sinais={sinais}
              onAbrir={onAbrir}
              mostrarStatus={mostrarStatusNaLinha}
            />
          ))}
        </div>
      )}
    </section>
  );
}

function ListaLenteImpl({ grupos, capacidades, sinais, onAbrir, mostrarStatusNaLinha, vazio }: Props) {
  if (grupos.length === 0) {
    return (
      <EmptyPanel
        title={vazio?.titulo ?? "Nada por aqui"}
        description={vazio?.descricao ?? "Nenhuma demanda corresponde a esta fila."}
      />
    );
  }

  return (
    <div className="space-y-7">
      {grupos.map((g) => (
        <Bloco
          key={g.id}
          grupo={g}
          capacidades={capacidades}
          sinais={sinais}
          onAbrir={onAbrir}
          mostrarStatusNaLinha={mostrarStatusNaLinha}
        />
      ))}
    </div>
  );
}

export const ListaLente = memo(ListaLenteImpl);
