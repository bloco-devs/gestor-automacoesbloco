import { Palette } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { LABEL_COLORS, coverColorClass, coverColorStyle } from "@/lib/atividades";
import { cn } from "@/lib/utils";

export function CoverPopover({
  value,
  onChange,
}: {
  value: string | null;
  onChange: (v: string | null) => void;
}) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button type="button" variant="outline" size="sm" className="h-8 gap-1 text-xs">
          <Palette className="size-3.5" /> Capa
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-56 p-2">
        <div className="text-xs font-medium text-muted-foreground px-1 py-1">Cor de capa</div>
        <div className="grid grid-cols-5 gap-1.5">
          <button
            type="button"
            onClick={() => onChange(null)}
            className={cn(
              "aspect-square rounded border-2 border-dashed border-border text-[10px] text-muted-foreground hover:border-accent transition-colors",
              value === null && "border-accent",
            )}
            title="Sem capa"
          >
            —
          </button>
          {LABEL_COLORS.map((c) => (
            <button
              key={c.key}
              type="button"
              onClick={() => onChange(c.key)}
              className={cn(
                "aspect-square rounded border-2 transition-all",
                coverColorClass(c.key),
                value === c.key
                  ? "border-foreground ring-2 ring-offset-1 ring-accent"
                  : "border-transparent hover:border-foreground/50",
              )}
              title={c.label}
            />
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}
