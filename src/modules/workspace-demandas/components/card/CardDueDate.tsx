import { useMutation, useQueryClient } from "@tanstack/react-query";
import { CalendarDays, X } from "lucide-react";
import { ptBR } from "date-fns/locale";
import { format } from "date-fns";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { updateCard } from "@/lib/atividades";

/**
 * Data de entrega do cartão (`atividades_cards.data_entrega`).
 * Resumo = badge abaixo do título; Botão = popover com o Calendar.
 */

interface Props {
  cardId: string;
  boardId: string | null;
  dataEntrega: string | null;
  onSalvo?: () => void;
}

function useSalvarData({ cardId, boardId, onSalvo }: Omit<Props, "dataEntrega">) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (dataEntrega: string | null) => updateCard(cardId, { dataEntrega }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["atividades", "card", cardId] });
      if (boardId) void qc.invalidateQueries({ queryKey: ["atividades", "cards", boardId] });
      onSalvo?.();
    },
    onError: (e) => {
      console.error("[CardDueDate] falha ao salvar data", { cardId, e });
      toast.error("Não foi possível salvar a data.");
    },
  });
}

export function CardDueDateResumo({ cardId, boardId, dataEntrega, onSalvo }: Props) {
  const salvar = useSalvarData({ cardId, boardId, onSalvo });
  const selecionada: Date | undefined = dataEntrega ? new Date(dataEntrega) : undefined;
  if (!dataEntrega) return null;
  return (
    <div className="flex items-center gap-1">
      <Popover>
        <PopoverTrigger asChild>
          <button
            type="button"
            aria-label="Alterar data de entrega"
            className="inline-flex cursor-pointer items-center gap-1.5 rounded bg-muted px-2 py-1 text-xs font-medium text-foreground transition-colors duration-300 ease-in-out hover:bg-muted/60"
          >
            <CalendarDays className="size-3.5" aria-hidden />
            {format(new Date(dataEntrega), "dd 'de' MMM, yyyy", { locale: ptBR })}
          </button>
        </PopoverTrigger>
        <PopoverContent align="start" className="w-auto p-0">
          <Calendar
            mode="single"
            required={false}
            locale={ptBR}
            selected={selecionada}
            defaultMonth={selecionada}
            onSelect={(d: Date | undefined) => {
              if (!d) {
                salvar.mutate(null);
                return;
              }
              const normalizada = new Date(
                d.getFullYear(),
                d.getMonth(),
                d.getDate(),
                12,
                0,
                0,
                0,
              );
              salvar.mutate(normalizada.toISOString());
            }}
            modifiersClassNames={{ today: "" }}
            initialFocus
            className="pointer-events-auto p-3"
          />
        </PopoverContent>
      </Popover>
      <button
        type="button"
        aria-label="Remover data de entrega"
        className="rounded p-1 text-muted-foreground transition-colors duration-300 ease-in-out hover:text-destructive"
        onClick={() => salvar.mutate(null)}
      >
        <X className="size-3" aria-hidden />
      </button>
    </div>
  );
}


export function CardDueDateBotao({ cardId, boardId, dataEntrega, onSalvo }: Props) {
  const salvar = useSalvarData({ cardId, boardId, onSalvo });
  const selecionada: Date | undefined = dataEntrega ? new Date(dataEntrega) : undefined;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="w-full justify-start">
          <CalendarDays className="mr-2 size-4" aria-hidden />
          Datas
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-auto p-0">
        <Calendar
          mode="single"
          required={false}
          locale={ptBR}
          selected={selecionada}
          defaultMonth={selecionada}
          onSelect={(d: Date | undefined) => {
            if (!d) {
              salvar.mutate(null);
              return;
            }
            // Fixa meio-dia local: evita o deslocamento de fuso que fazia a data
            // salva cair no dia anterior/posterior ao clicado.
            const normalizada = new Date(
              d.getFullYear(),
              d.getMonth(),
              d.getDate(),
              12,
              0,
              0,
              0,
            );
            salvar.mutate(normalizada.toISOString());
          }}
          modifiersClassNames={{ today: "" }}
          initialFocus
          className="p-3 pointer-events-auto"
        />
      </PopoverContent>
    </Popover>
  );
}

