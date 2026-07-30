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
  if (!dataEntrega) return null;
  return (
    <Badge variant="secondary" className="gap-1.5">
      <CalendarDays className="size-3.5" aria-hidden />
      {format(new Date(dataEntrega), "dd 'de' MMM, yyyy", { locale: ptBR })}
      <button
        type="button"
        aria-label="Remover data de entrega"
        className="ml-1 rounded hover:text-destructive"
        onClick={() => salvar.mutate(null)}
      >
        <X className="size-3" aria-hidden />
      </button>
    </Badge>
  );
}

export function CardDueDateBotao({ cardId, boardId, dataEntrega, onSalvo }: Props) {
  const salvar = useSalvarData({ cardId, boardId, onSalvo });
  const selecionada = dataEntrega ? new Date(dataEntrega) : undefined;

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
          locale={ptBR}
          selected={selecionada}
          onSelect={(d) => salvar.mutate(d ? d.toISOString() : null)}
          initialFocus
        />
      </PopoverContent>
    </Popover>
  );
}
