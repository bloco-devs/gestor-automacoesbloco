import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  addAttachment,
  createDemand,
  listDemands,
  softDeleteDemand,
  updateDemandStatus,
} from "./service";
import type { CreateDemandInput, Demand, DemandStatus } from "./types";

const KEY = ["demands"] as const;

export function useDemands() {
  const qc = useQueryClient();
  const query = useQuery({ queryKey: KEY, queryFn: listDemands });

  useEffect(() => {
    const channel = supabase
      .channel(`demands-${crypto.randomUUID()}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "demands" },
        () => qc.invalidateQueries({ queryKey: KEY }),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [qc]);

  return query;
}

export function useCreateDemand() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateDemandInput) => createDemand(input),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });
}

export function useUpdateDemandStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: DemandStatus }) =>
      updateDemandStatus(id, status),
    onMutate: async ({ id, status }) => {
      await qc.cancelQueries({ queryKey: KEY });
      const prev = qc.getQueryData<Demand[]>(KEY);
      qc.setQueryData<Demand[]>(KEY, (curr) =>
        curr?.map((d) => (d.id === id ? { ...d, status } : d)),
      );
      return { prev };
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.prev) qc.setQueryData(KEY, ctx.prev);
    },
    onSettled: () => qc.invalidateQueries({ queryKey: KEY }),
  });
}

export function useDeleteDemand() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => softDeleteDemand(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });
}

export function useAddAttachment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (v: {
      demandId: string;
      file_url: string;
      file_type: string | null;
      file_name: string | null;
    }) =>
      addAttachment(v.demandId, {
        file_url: v.file_url,
        file_type: v.file_type,
        file_name: v.file_name,
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });
}
