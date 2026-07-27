import { memo, useState } from "react";
import { Plus, X } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ItemDaLista } from "@/modules/demand-access";

/**
 * A definição de pronto.
 *
 * POR QUE ELA FICA NA COLUNA DA ESQUERDA, ACIMA DE TUDO
 * Esta lista não é um detalhe da demanda: é o trabalho. Ela responde "o que
 * exatamente eu tenho que entregar para isto acabar" — a pergunta que sobra
 * depois do briefing responder "por onde começar". Enterrá-la embaixo de
 * status, prioridade e etiquetas seria dizer que o metadado importa mais que a
 * entrega.
 *
 * O QUE ELA FECHA
 * Estes itens são os critérios que a IA gerou a partir da conversa. Marcar o
 * último é o que habilita "Concluir" no copiloto. Sem isso, a IA escreveria a
 * definição de pronto de um lado e o trabalho aconteceria do outro, sem
 * ninguém conseguir dizer se terminou.
 *
 * O contador mostra `feitos/total` porque uma barra sem número obriga a
 * estimar, e aqui a diferença entre 4/5 e 5/5 é a diferença entre continuar e
 * entregar.
 */

interface Props {
  itens: ItemDaLista[];
  feitos: number;
  total: number;
  podeEditar: boolean;
  onMarcar: (id: string, feito: boolean) => void;
  onAcrescentar: (texto: string) => void;
  onRemover: (id: string) => void;
}

function ChecklistImpl({ itens, feitos, total, podeEditar, onMarcar, onAcrescentar, onRemover }: Props) {
  const [novo, setNovo] = useState("");
  const [abrindo, setAbrindo] = useState(false);

  if (total === 0 && !podeEditar) return null;

  return (
    <section aria-label="Definição de pronto" className="border-b border-border/50 px-4 py-3">
      <div className="flex items-baseline gap-2">
        <h3 className="text-[11px] uppercase tracking-wide text-muted-foreground">Pronto quando</h3>
        {total > 0 && (
          <span
            className={cn(
              "text-[11px] tabular-nums",
              feitos === total ? "text-success" : "text-muted-foreground",
            )}
          >
            {feitos}/{total}
          </span>
        )}
      </div>

      <ul className="mt-1.5 space-y-1">
        {itens.map((i) => (
          <li key={i.id} className="group flex items-start gap-2">
            <input
              type="checkbox"
              checked={i.feito}
              disabled={!podeEditar}
              onChange={(e) => onMarcar(i.id, e.target.checked)}
              aria-label={i.texto}
              className="mt-[3px] size-3.5 shrink-0 accent-current"
            />
            <span
              className={cn(
                "min-w-0 flex-1 text-[13px] leading-snug",
                i.feito && "text-muted-foreground line-through",
              )}
            >
              {i.texto}
            </span>
            {podeEditar && (
              <button
                type="button"
                onClick={() => onRemover(i.id)}
                aria-label={`Remover "${i.texto}"`}
                className="shrink-0 opacity-0 transition-opacity focus:opacity-100 group-hover:opacity-100"
              >
                <X className="size-3 text-muted-foreground hover:text-destructive" aria-hidden />
              </button>
            )}
          </li>
        ))}
      </ul>

      {podeEditar &&
        (abrindo ? (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const t = novo.trim();
              if (!t) return;
              onAcrescentar(t);
              setNovo("");
            }}
            className="mt-1.5"
          >
            <input
              autoFocus
              value={novo}
              onChange={(e) => setNovo(e.target.value)}
              onBlur={() => !novo.trim() && setAbrindo(false)}
              placeholder="O que mais precisa estar pronto?"
              aria-label="Novo critério"
              className="w-full rounded border border-border/60 bg-transparent px-2 py-1 text-[13px] focus:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
            />
          </form>
        ) : (
          <button
            type="button"
            onClick={() => setAbrindo(true)}
            className="mt-1.5 flex items-center gap-1 text-[12px] text-muted-foreground transition-colors hover:text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
          >
            <Plus className="size-3" aria-hidden />
            {/* Acrescentar aqui é mudar a definição de pronto depois do
                combinado. É legítimo, mas o rótulo diz o que está em jogo. */}
            Acrescentar critério
          </button>
        ))}
    </section>
  );
}

export const Checklist = memo(ChecklistImpl);
