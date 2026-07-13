import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CalendarIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

export function DatePrazoPopover({
  value,
  onChange,
}: {
  value: string | null;
  onChange: (v: string | null) => void;
}) {
  const date = value ? new Date(value) : undefined;
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button type="button" variant="outline" size="sm" className="h-8 gap-1 text-xs">
          <CalendarIcon className="size-3.5" />
          {date ? format(date, "dd/MM/yyyy", { locale: ptBR }) : "Prazo"}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-auto p-0">
        <Calendar
          mode="single"
          selected={date}
          onSelect={(d) => onChange(d ? d.toISOString() : null)}
          initialFocus
          className={cn("p-3 pointer-events-auto")}
        />
        {value && (
          <div className="p-2 border-t border-border">
            <Button
              variant="ghost"
              size="sm"
              className="w-full"
              onClick={() => onChange(null)}
            >
              Remover prazo
            </Button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
