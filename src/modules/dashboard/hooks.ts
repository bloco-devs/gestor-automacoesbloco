import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo } from "react";
import {
  computeMetrics,
  fetchDeflectionStats,
  fetchDemandsForMetrics,
  listSlaPolicies,
  updateSlaPolicy,
} from "./service";

export function useDemandMetrics() {
  const q = useQuery({ queryKey: ["demand-metrics"], queryFn: fetchDemandsForMetrics });
  const defl = useQuery({
    queryKey: ["deflection-stats"],
    queryFn: fetchDeflectionStats,
    staleTime: 60_000,
  });
  const metrics = useMemo(
    () => (q.data ? computeMetrics(q.data, defl.data) : null),
    [q.data, defl.data],
  );
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
