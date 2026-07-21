import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  addAttachment,
  assignDemand,
  autoRespondDemand,
  createDemand,
  createTask,
  deleteTask,
  generateAIPlan,
  getProfilesByIds,
  getUserWorkloads,
  listAttachments,
  listDemands,
  listTasks,
  recordDeflection,
  softDeleteDemand,
  toggleTask,
  triageDemand,
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
    mutationFn: (input: CreateDemandInput & { assigned_to?: string | null }) => createDemand(input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEY });
      qc.invalidateQueries({ queryKey: ["user-workloads"] });
    },
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
    onSettled: () => {
      qc.invalidateQueries({ queryKey: KEY });
      qc.invalidateQueries({ queryKey: ["user-workloads"] });
    },
  });
}

export function useAssignDemand() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, assigned_to }: { id: string; assigned_to: string | null }) =>
      assignDemand(id, assigned_to),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEY });
      qc.invalidateQueries({ queryKey: ["user-workloads"] });
    },
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

// ---------- Tasks ----------
export function useDemandTasks(demandId: string | null) {
  return useQuery({
    queryKey: ["demand-tasks", demandId],
    queryFn: () => listTasks(demandId!),
    enabled: !!demandId,
  });
}

export function useCreateDemandTask(demandId: string | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (title: string) => createTask(demandId!, title),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["demand-tasks", demandId] }),
  });
}

export function useToggleDemandTask(demandId: string | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (v: { id: string; completed: boolean }) => toggleTask(v.id, v.completed),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["demand-tasks", demandId] }),
  });
}

export function useDeleteDemandTask(demandId: string | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteTask(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["demand-tasks", demandId] }),
  });
}

// ---------- Attachments ----------
export function useDemandAttachments(demandId: string | null) {
  return useQuery({
    queryKey: ["demand-attachments", demandId],
    queryFn: () => listAttachments(demandId!),
    enabled: !!demandId,
  });
}

// ---------- Profiles ----------
export function useDemandProfiles(demands: Demand[] | undefined) {
  const ids = useMemo(() => {
    const s = new Set<string>();
    for (const d of demands ?? []) {
      if (d.created_by) s.add(d.created_by);
      if (d.assigned_to) s.add(d.assigned_to);
    }
    return Array.from(s);
  }, [demands]);
  return useQuery({
    queryKey: ["demand-profiles", ids.join(",")],
    queryFn: () => getProfilesByIds(ids),
    enabled: ids.length > 0,
  });
}

// ---------- Workloads ----------
export function useUserWorkloads(enabled = true) {
  return useQuery({
    queryKey: ["user-workloads"],
    queryFn: getUserWorkloads,
    enabled,
    staleTime: 30_000,
  });
}

// ---------- AI ----------
export function useGenerateAIPlan(demandId: string | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (demand: Demand) => generateAIPlan(demand),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["demand-tasks", demandId] }),
  });
}

export function useTriageDemand() {
  return useMutation({
    mutationFn: (input: { title: string; description: string }) => triageDemand(input),
  });
}

// ---------- Agente Autônomo Nível 1 ----------
export function useAutoRespondDemand() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (demandId: string) => autoRespondDemand(demandId),
    onSuccess: (_, demandId) => {
      qc.invalidateQueries({ queryKey: KEY });
      qc.invalidateQueries({ queryKey: ["demand-comments", demandId] });
    },
  });
}

// ---------- Deflexão ----------
export function useRecordDeflection() {
  return useMutation({
    mutationFn: (input: { articleId?: string | null; queryText: string; origin?: string }) =>
      recordDeflection(input),
  });
}

