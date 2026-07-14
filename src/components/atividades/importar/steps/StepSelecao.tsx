import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import type { CardConflictStrategy, ImportSelection } from "@/lib/importador/types";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

interface Props {
  selection: ImportSelection;
  onSelection: (s: ImportSelection) => void;
  cardConflict: CardConflictStrategy;
  onCardConflict: (c: CardConflictStrategy) => void;
}

const ITEMS: { key: keyof ImportSelection; label: string; hint?: string }[] = [
  { key: "colunas", label: "Colunas" },
  { key: "cards", label: "Cards" },
  { key: "etiquetas", label: "Etiquetas" },
  { key: "checklists", label: "Checklists" },
  { key: "comentarios", label: "Comentários" },
  { key: "anexos", label: "Anexos", hint: "Pode aumentar tempo e uso de armazenamento" },
  { key: "arquivados", label: "Arquivados" },
  { key: "membros", label: "Membros (mapeamento)" },
];

export function StepSelecao({ selection, onSelection, cardConflict, onCardConflict }: Props) {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h3 className="text-sm font-medium">O que importar</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {ITEMS.map((it) => (
            <div key={it.key} className="flex items-start gap-2 border rounded-md p-2.5">
              <Checkbox
                id={`sel-${it.key}`}
                checked={selection[it.key]}
                onCheckedChange={(v) => onSelection({ ...selection, [it.key]: !!v })}
              />
              <div className="flex-1">
                <Label htmlFor={`sel-${it.key}`} className="text-sm cursor-pointer">{it.label}</Label>
                {it.hint ? <div className="text-[11px] text-muted-foreground">{it.hint}</div> : null}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <h3 className="text-sm font-medium">Conflito de cards</h3>
        <RadioGroup value={cardConflict} onValueChange={(v) => onCardConflict(v as CardConflictStrategy)}>
          {[
            { v: "import_all", l: "Importar tudo", h: "Padrão. Não checa duplicidade." },
            { v: "skip_same_title_same_column", l: "Pular duplicados", h: "Ignora cards com mesmo título na mesma coluna." },
            { v: "force_import", l: "Forçar importação", h: "Cria mesmo se um similar existir." },
          ].map((o) => (
            <div key={o.v} className="flex items-start gap-2 border rounded-md p-2.5">
              <RadioGroupItem value={o.v} id={`cc-${o.v}`} className="mt-0.5" />
              <div>
                <Label htmlFor={`cc-${o.v}`} className="text-sm cursor-pointer">{o.l}</Label>
                <div className="text-[11px] text-muted-foreground">{o.h}</div>
              </div>
            </div>
          ))}
        </RadioGroup>
      </div>
    </div>
  );
}
