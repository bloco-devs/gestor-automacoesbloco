import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { getWhatsapp, salvarWhatsapp } from "./service";

const KEY = ["notificacao-whatsapp", "preferencia"] as const;

export function useWhatsapp() {
  return useQuery({ queryKey: KEY, queryFn: getWhatsapp });
}

export function useSalvarWhatsapp() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: salvarWhatsapp,
    onError: (err) => toast.error(err instanceof Error ? err.message : "Não foi possível salvar"),
    onSettled: () => qc.invalidateQueries({ queryKey: KEY }),
  });
}
