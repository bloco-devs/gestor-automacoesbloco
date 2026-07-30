import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Tag, X } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { LABEL_COLORS, labelColorClass, labelColorStyle } from "@/lib/atividades";
import {
  createEtiqueta,
  deleteEtiqueta,
  desvincularEtiqueta,
  listEtiquetas,
  listEtiquetasDoCard,
  vincularEtiqueta,
  type Etiqueta,
} from "@/lib/atividadesCardExtras";

/**
 * Etiquetas do cartão (`atividades_etiquetas` + `atividades_card_etiquetas`).
 * Exporta duas peças: o resumo (badges no topo do modal) e o botão da barra
 * lateral que abre o popover de seleção/criação.
 */

const chaveEtiquetas = (boardId: string) => ["atividades", "etiquetas", boardId] as const;
const chaveVinculos = (cardId: string) => ["atividades", "card-etiquetas", cardId] as const;

function useEtiquetas(cardId: string, boardId: string) {
  const qc = useQueryClient();
  const catalogo = useQuery({
    queryKey: chaveEtiquetas(boardId),
    queryFn: () => listEtiquetas(boardId),
    enabled: !!boardId,
  });
  const vinculos = useQuery({
    queryKey: chaveVinculos(cardId),
    queryFn: () => listEtiquetasDoCard(cardId),
    enabled: !!cardId,
  });
  const invalidar = () => {
    void qc.invalidateQueries({ queryKey: chaveVinculos(cardId) });
    void qc.invalidateQueries({ queryKey: chaveEtiquetas(boardId) });
  };
  return { catalogo, vinculos, invalidar };
}

export function CardLabelsResumo({ cardId, boardId }: { cardId: string; boardId: string }) {
  const { catalogo, vinculos } = useEtiquetas(cardId, boardId);
  const selecionadas = (catalogo.data ?? []).filter((e) => (vinculos.data ?? []).includes(e.id));
  if (selecionadas.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-1.5" aria-label="Etiquetas do cartão">
      {selecionadas.map((e) => (
        <Badge
          key={e.id}
          className={labelColorClass(e.cor)}
          style={labelColorStyle(e.cor)}
          variant="outline"
        >
          {e.nome || "Sem nome"}
        </Badge>
      ))}
    </div>
  );
}

export function CardLabelsBotao({ cardId, boardId }: { cardId: string; boardId: string }) {
  const { catalogo, vinculos, invalidar } = useEtiquetas(cardId, boardId);
  const [nome, setNome] = useState("");
  const [cor, setCor] = useState(LABEL_COLORS[0].key);

  const erro = (e: unknown, msg: string) => {
    console.error("[CardLabels]", msg, e);
    toast.error(msg);
  };

  const alternar = useMutation({
    mutationFn: async ({ etiqueta, marcada }: { etiqueta: Etiqueta; marcada: boolean }) =>
      marcada ? desvincularEtiqueta(cardId, etiqueta.id) : vincularEtiqueta(cardId, etiqueta.id),
    onSuccess: invalidar,
    onError: (e) => erro(e, "Não foi possível atualizar a etiqueta."),
  });

  const criar = useMutation({
    mutationFn: async () => {
      const nova = await createEtiqueta({ boardId, nome: nome.trim(), cor });
      await vincularEtiqueta(cardId, nova.id);
    },
    onSuccess: () => {
      setNome("");
      invalidar();
    },
    onError: (e) => erro(e, "Não foi possível criar a etiqueta."),
  });

  const excluir = useMutation({
    mutationFn: (id: string) => deleteEtiqueta(id),
    onSuccess: invalidar,
    onError: (e) => erro(e, "Não foi possível excluir a etiqueta."),
  });

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="w-full justify-start">
          <Tag className="mr-2 size-4" aria-hidden />
          Etiquetas
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-72 space-y-3">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Etiquetas
        </p>

        <ul className="max-h-48 space-y-1 overflow-y-auto">
          {(catalogo.data ?? []).map((e) => {
            const marcada = (vinculos.data ?? []).includes(e.id);
            return (
              <li key={e.id} className="flex items-center gap-2">
                <Checkbox
                  id={`etq-${e.id}`}
                  checked={marcada}
                  onCheckedChange={() => alternar.mutate({ etiqueta: e, marcada })}
                />
                <label
                  htmlFor={`etq-${e.id}`}
                  className="flex-1 cursor-pointer rounded px-2 py-1 text-sm"
                  style={labelColorStyle(e.cor)}
                >
                  {e.nome || "Sem nome"}
                </label>
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-7"
                  aria-label={`Excluir etiqueta ${e.nome ?? ""}`}
                  onClick={() => excluir.mutate(e.id)}
                >
                  <X className="size-3.5" aria-hidden />
                </Button>
              </li>
            );
          })}
          {catalogo.data?.length === 0 && (
            <li className="text-sm text-muted-foreground">Nenhuma etiqueta neste quadro.</li>
          )}
        </ul>

        <div className="space-y-2 border-t pt-3">
          <Input
            value={nome}
            onChange={(ev) => setNome(ev.target.value)}
            placeholder="Nova etiqueta…"
            aria-label="Nome da nova etiqueta"
            onKeyDown={(ev) => {
              if (ev.key === "Enter" && nome.trim()) criar.mutate();
            }}
          />
          <div className="flex flex-wrap gap-1.5">
            {LABEL_COLORS.map((c) => (
              <button
                key={c.key}
                type="button"
                aria-label={c.label}
                aria-pressed={cor === c.key}
                onClick={() => setCor(c.key)}
                className={`size-6 rounded ring-offset-2 ${cor === c.key ? "ring-2 ring-ring" : ""}`}
                style={labelColorStyle(c.key)}
              />
            ))}
          </div>
          <Button
            size="sm"
            className="w-full"
            disabled={!nome.trim() || criar.isPending}
            onClick={() => criar.mutate()}
          >
            Criar e aplicar
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
