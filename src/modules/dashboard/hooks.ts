import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo } from "react";
import { computeMetrics, fetchDemandsForMetrics, listSlaPolicies, updateSlaPolicy } from "./service";

export function useDemandMetrics() {
  const q = useQuery({ queryKey: ["demand-metrics"], queryFn: fetchDemandsForMetrics });
  const metrics = useMemo(() => (q.data ? computeMetrics(q.data) : null), [q.data]);
  return { ...q, metrics };
}

export function useSlaPolicies() {
  return useQuery({ queryKey: ["sla-policies"], queryFn: listSlaPolicies });
}

export function useUpdateSlaPolicy() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, hours }: { id: string; hours: number }) => updateSlaPolicy(id, hours),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["sla-policies"] }),
  });
}
