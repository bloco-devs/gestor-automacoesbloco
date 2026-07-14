import type { DetectedFile } from "@/lib/importador/types";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";

interface Props {
  detected: DetectedFile | null;
  selectedExternalId: string | null;
  onSelect: (id: string) => void;
}

export function StepBoardOrigem({ detected, selectedExternalId, onSelect }: Props) {
  if (!detected || detected.boards.length === 0) {
    return (
      <div className="text-sm text-muted-foreground">
        Não foi possível pré-listar quadros no arquivo. O adapter processará todos os quadros
        encontrados durante a análise (dry-run).
      </div>
    );
  }
  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">
        Foram detectados {detected.boards.length} quadros no arquivo. Escolha um.
      </p>
      <RadioGroup
        value={selectedExternalId ?? ""}
        onValueChange={onSelect}
        className="space-y-1 max-h-72 overflow-auto"
      >
        {detected.boards.map((b) => (
          <div
            key={b.external_id}
            className="flex items-center gap-3 border rounded-md px-3 py-2 hover:bg-muted/30"
          >
            <RadioGroupItem value={b.external_id} id={`b-${b.external_id}`} />
            <Label htmlFor={`b-${b.external_id}`} className="flex-1 cursor-pointer">
              <div className="text-sm font-medium">{b.nome}</div>
              <div className="text-xs text-muted-foreground">
                {typeof b.cards === "number" ? `${b.cards} cards` : "—"}
              </div>
            </Label>
          </div>
        ))}
      </RadioGroup>
    </div>
  );
}
