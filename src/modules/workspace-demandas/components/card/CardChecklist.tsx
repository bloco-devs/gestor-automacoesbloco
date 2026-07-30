import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckSquare, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import {
  createChecklist,
  createChecklistItem,
  deleteChecklist,
  deleteChecklistItem,
  listChecklists,
  toggleChecklistItem,
  type ChecklistRow,
} from "@/lib/atividadesCardExtras";

/**
 * Checklists do cartão (`atividades_checklists` + `atividades_checklist_items`).
 * Exporta o botão da barra lateral (cria uma nova lista) e o corpo que renderiza
 * as listas com itens e progresso.
 */

const chave = (cardId: string) => ["atividades", "checklists", cardId] as const;

function useChecklists(cardId: string) {
  const qc = useQueryClient();
  const query = useQuery({
    queryKey: chave(cardId),
    queryFn: () => listChecklists(cardId),
    enabled: !!cardId,
  });
  const invalidar = () => void qc.invalidateQueries({ queryKey: chave(cardId) });
  return { query, invalidar };
}

const aviso = (e: unknown, msg: string) => {
  console.error("[CardChecklist]", msg, e);
  toast.error(msg);
};

export function CardChecklistBotao({ cardId }: { cardId: string }) {
  const { query, invalidar } = useChecklists(cardId);
  const criar = useMutation({
    mutationFn: () =>
      createChecklist({
        cardId,
        titulo: "Checklist",
        ordem: query.data?.length ?? 0,
      }),
    onSuccess: invalidar,
    onError: (e) => aviso(e, "Não foi possível criar a checklist."),
  });

  return (
    <Button
      variant="outline"
      size="sm"
      className="w-full justify-start"
      disabled={criar.isPending}
      onClick={() => criar.mutate()}
    >
      <CheckSquare className="mr-2 size-4" aria-hidden />
      Checklist
    </Button>
  );
}

function ListaDeChecklist({ lista, onMudou }: { lista: ChecklistRow; onMudou: () => void }) {
  const [texto, setTexto] = useState("");

  const adicionar = useMutation({
    mutationFn: () =>
      createChecklistItem({
        checklistId: lista.id,
        nome: texto.trim(),
        ordem: lista.itens.length,
      }),
    onSuccess: () => {
      setTexto("");
      onMudou();
    },
    onError: (e) => aviso(e, "Não foi possível adicionar o item."),
  });

  const alternar = useMutation({
    mutationFn: (v: { id: string; concluido: boolean }) => toggleChecklistItem(v.id, v.concluido),
    onSuccess: onMudou,
    onError: (e) => aviso(e, "Não foi possível atualizar o item."),
  });

  const removerItem = useMutation({
    mutationFn: (id: string) => deleteChecklistItem(id),
    onSuccess: onMudou,
    onError: (e) => aviso(e, "Não foi possível remover o item."),
  });

  const removerLista = useMutation({
    mutationFn: () => deleteChecklist(lista.id),
    onSuccess: onMudou,
    onError: (e) => aviso(e, "Não foi possível remover a checklist."),
  });

  const total = lista.itens.length;
  const feitos = lista.itens.filter((i) => i.concluido).length;
  const pct = total === 0 ? 0 : Math.round((feitos / total) * 100);

  return (
    <div className="space-y-2 rounded-lg border p-3">
      <div className="flex items-center justify-between gap-2">
        <h4 className="text-sm font-medium">{lista.titulo}</h4>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">
            {feitos}/{total}
          </span>
          <Button
            variant="ghost"
            size="icon"
            className="size-7"
            aria-label="Remover checklist"
            onClick={() => removerLista.mutate()}
          >
            <Trash2 className="size-3.5" aria-hidden />
          </Button>
        </div>
      </div>

      <Progress value={pct} aria-label={`${pct}% concluído`} />

      <ul className="space-y-1">
        {lista.itens.map((item) => (
          <li key={item.id} className="group flex items-center gap-2">
            <Checkbox
              id={`chk-${item.id}`}
              checked={item.concluido}
              onCheckedChange={(v) => alternar.mutate({ id: item.id, concluido: !!v })}
            />
            <label
              htmlFor={`chk-${item.id}`}
              className={`flex-1 cursor-pointer text-sm ${item.concluido ? "text-muted-foreground line-through" : ""}`}
            >
              {item.nome}
            </label>
            <Button
              variant="ghost"
              size="icon"
              className="size-7 opacity-0 group-hover:opacity-100"
              aria-label={`Remover item ${item.nome}`}
              onClick={() => removerItem.mutate(item.id)}
            >
              <Trash2 className="size-3.5" aria-hidden />
            </Button>
          </li>
        ))}
      </ul>

      <Input
        value={texto}
        onChange={(e) => setTexto(e.target.value)}
        placeholder="Adicionar um item…"
        aria-label="Novo item da checklist"
        onKeyDown={(e) => {
          if (e.key === "Enter" && texto.trim()) adicionar.mutate();
        }}
      />
    </div>
  );
}

export function CardChecklistCorpo({ cardId }: { cardId: string }) {
  const { query, invalidar } = useChecklists(cardId);
  if (!query.data || query.data.length === 0) return null;
  return (
    <section className="space-y-3">
      <h3 className="text-sm font-medium">Checklists</h3>
      {query.data.map((lista) => (
        <ListaDeChecklist key={lista.id} lista={lista} onMudou={invalidar} />
      ))}
    </section>
  );
}
