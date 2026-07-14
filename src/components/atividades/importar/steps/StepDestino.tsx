import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Loader2 } from "lucide-react";
import type { ImportTarget } from "@/lib/importador/types";

interface BoardOption { id: string; nome: string }

interface Props {
  target: ImportTarget;
  onChange: (t: ImportTarget) => void;
}

export function StepDestino({ target, onChange }: Props) {
  const [boards, setBoards] = useState<BoardOption[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancel = false;
    if (target.mode !== "existing_board") return;
    setLoading(true);
    // Reusa a mesma view/tabela dos quadros — apenas leitura, sem RPC nova.
    supabase
      .from("atividades_boards")
      .select("id,nome,arquivado")
      .eq("arquivado", false)
      .order("nome", { ascending: true })
      .limit(200)
      .then(({ data, error }) => {
        if (cancel) return;
        setLoading(false);
        if (error) return;
        setBoards((data ?? []).map((b) => ({ id: b.id as string, nome: b.nome as string })));
      });
    return () => { cancel = true; };
  }, [target.mode]);

  return (
    <div className="space-y-4">
      <RadioGroup
        value={target.mode}
        onValueChange={(v) => onChange({ ...target, mode: v as ImportTarget["mode"] })}
        className="space-y-2"
      >
        <div className="flex items-start gap-3 border rounded-md p-3">
          <RadioGroupItem value="create_board" id="dst-new" className="mt-1" />
          <div className="flex-1 space-y-2">
            <Label htmlFor="dst-new" className="text-sm font-medium cursor-pointer">
              Criar novo quadro
            </Label>
            {target.mode === "create_board" ? (
              <Input
                placeholder="Nome do novo quadro (opcional — usa o nome do arquivo)"
                value={target.novo_board_nome ?? ""}
                onChange={(e) => onChange({ ...target, novo_board_nome: e.target.value })}
              />
            ) : null}
          </div>
        </div>
        <div className="flex items-start gap-3 border rounded-md p-3">
          <RadioGroupItem value="existing_board" id="dst-existing" className="mt-1" />
          <div className="flex-1 space-y-2">
            <Label htmlFor="dst-existing" className="text-sm font-medium cursor-pointer">
              Adicionar a um quadro existente
            </Label>
            {target.mode === "existing_board" ? (
              loading ? (
                <div className="text-xs text-muted-foreground flex items-center gap-1">
                  <Loader2 className="h-3 w-3 animate-spin" /> Carregando quadros...
                </div>
              ) : boards.length === 0 ? (
                <div className="text-xs text-muted-foreground">Nenhum quadro disponível.</div>
              ) : (
                <select
                  className="w-full h-9 rounded-md border bg-background px-2 text-sm"
                  value={target.board_id_local ?? ""}
                  onChange={(e) => onChange({ ...target, board_id_local: e.target.value || undefined })}
                >
                  <option value="">Selecione...</option>
                  {boards.map((b) => (
                    <option key={b.id} value={b.id}>{b.nome}</option>
                  ))}
                </select>
              )
            ) : null}
          </div>
        </div>
      </RadioGroup>
    </div>
  );
}
