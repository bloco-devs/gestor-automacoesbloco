import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, Loader2, Users } from "lucide-react";
import { toast } from "sonner";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  desvincularMembro,
  iniciais,
  listEquipeUsuarios,
  listMembrosDoCard,
  vincularMembro,
  type EquipeUsuario,
} from "@/lib/atividadesCardMembros";

/**
 * Responsáveis do cartão (`atividades_card_membros`).
 * A elegibilidade (papéis `developer` / `administrador`) é resolvida no banco.
 */

const chaveMembros = (cardId: string) => ["atividades", "card", cardId, "membros"] as const;
const chaveEquipe = ["atividades", "equipe"] as const;

function useEquipe() {
  return useQuery({ queryKey: chaveEquipe, queryFn: listEquipeUsuarios, staleTime: 5 * 60_000 });
}

function useMembros(cardId: string) {
  return useQuery({ queryKey: chaveMembros(cardId), queryFn: () => listMembrosDoCard(cardId) });
}

export function CardMembersResumo({ cardId }: { cardId: string }) {
  const membros = useMembros(cardId);
  const equipe = useEquipe();
  const ids = membros.data ?? [];
  if (ids.length === 0) return null;
  const pessoas = (equipe.data ?? []).filter((u) => ids.includes(u.id));
  return (
    <div className="flex items-center gap-1" aria-label="Responsáveis do cartão">
      {pessoas.map((u) => (
        <Avatar key={u.id} className="size-6 border border-border" title={u.nome}>
          {u.avatarUrl && <AvatarImage src={u.avatarUrl} alt={u.nome} />}
          <AvatarFallback className="text-[10px]">{iniciais(u.nome)}</AvatarFallback>
        </Avatar>
      ))}
    </div>
  );
}

export function CardMembersBotao({ cardId }: { cardId: string }) {
  const qc = useQueryClient();
  const equipe = useEquipe();
  const membros = useMembros(cardId);
  const ids = membros.data ?? [];

  const alternar = useMutation({
    mutationFn: async (u: EquipeUsuario) =>
      ids.includes(u.id) ? desvincularMembro(cardId, u.id) : vincularMembro(cardId, u.id),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: chaveMembros(cardId) });
      // Sem isto os avatares só apareciam na capa do Kanban após um refetch:
      // a capa é lida em lote por uma chave diferente da do modal.
      void qc.invalidateQueries({ queryKey: ["atividades", "capas-dos-cards"] });
    },
    onError: (e) => {
      console.error("[CardMembers] falha ao alterar responsável", { cardId, e });
      toast.error("Não foi possível alterar o responsável.");
    },
  });

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="w-full justify-start">
          <Users className="mr-2 size-4" aria-hidden />
          Membros
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-72 p-2">
        <p className="px-1 pb-2 text-xs font-medium text-muted-foreground">
          Equipe técnica
        </p>
        {equipe.isLoading ? (
          <div className="flex justify-center py-4">
            <Loader2 className="size-4 animate-spin text-muted-foreground" aria-hidden />
          </div>
        ) : (equipe.data ?? []).length === 0 ? (
          <p className="px-1 py-2 text-sm text-muted-foreground">
            Nenhum desenvolvedor ou administrador disponível.
          </p>
        ) : (
          <ul className="max-h-64 space-y-1 overflow-y-auto">
            {(equipe.data ?? []).map((u) => {
              const marcado = ids.includes(u.id);
              return (
                <li key={u.id}>
                  <button
                    type="button"
                    disabled={alternar.isPending}
                    onClick={() => alternar.mutate(u)}
                    className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm hover:bg-accent"
                  >
                    <Avatar className="size-6">
                      {u.avatarUrl && <AvatarImage src={u.avatarUrl} alt={u.nome} />}
                      <AvatarFallback className="text-[10px]">{iniciais(u.nome)}</AvatarFallback>
                    </Avatar>
                    <span className="min-w-0 flex-1 truncate">{u.nome}</span>
                    {marcado && <Check className="size-4 text-primary" aria-hidden />}
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </PopoverContent>
    </Popover>
  );
}
