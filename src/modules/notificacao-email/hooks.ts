import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  getPreferencias,
  listarFila,
  processarFilaAgora,
  reenviar,
  salvarPreferencias,
  type PreferenciasEmail,
  type SituacaoEnvio,
} from "./service";

const PREF_KEY = ["notificacao-email", "preferencias"] as const;
const FILA_KEY = ["notificacao-email", "fila"] as const;

export function usePreferenciasEmail() {
  return useQuery({ queryKey: PREF_KEY, queryFn: getPreferencias });
}

export function useSalvarPreferenciasEmail() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (patch: Partial<PreferenciasEmail>) => salvarPreferencias(patch),
    // Interruptor que só reage depois do servidor responder parece quebrado.
    onMutate: async (patch) => {
      await qc.cancelQueries({ queryKey: PREF_KEY });
      const anterior = qc.getQueryData<PreferenciasEmail>(PREF_KEY);
      if (anterior) qc.setQueryData(PREF_KEY, { ...anterior, ...patch });
      return { anterior };
    },
    onError: (err, _patch, ctx) => {
      if (ctx?.anterior) qc.setQueryData(PREF_KEY, ctx.anterior);
      toast.error(err instanceof Error ? err.message : "Não foi possível salvar");
    },
    onSettled: () => qc.invalidateQueries({ queryKey: PREF_KEY }),
  });
}

export function useFilaEmail(situacao?: SituacaoEnvio) {
  return useQuery({
    queryKey: [...FILA_KEY, situacao ?? "todas"],
    queryFn: () => listarFila(situacao),
  });
}

export function useReenviarEmail() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => reenviar(id),
    onSuccess: () => {
      toast.success("Voltou para a fila");
      qc.invalidateQueries({ queryKey: FILA_KEY });
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : "Falhou"),
  });
}

export function useProcessarFila() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: processarFilaAgora,
    onSuccess: (r) => {
      if (r.processados === 0) {
        toast.info("Nada pendente na fila");
      } else {
        toast.success(`${r.enviados} enviado(s), ${r.falhas} falha(s)`);
      }
      qc.invalidateQueries({ queryKey: FILA_KEY });
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : "Falhou"),
  });
}
