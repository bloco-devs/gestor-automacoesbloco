import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { knowledgeAdminService } from "../services/admin-service";
import type { ArticleInsert, ArticleStatus, ArticleUpdate } from "../types";

const KEY = ["knowledge-admin", "articles"] as const;

export function useAdminArticles(includeDeleted = false) {
  return useQuery({
    queryKey: [...KEY, { includeDeleted }],
    queryFn: () => knowledgeAdminService.list(includeDeleted),
    staleTime: 30_000,
  });
}

export function useAdminArticleMutations() {
  const qc = useQueryClient();
  const invalidate = () => qc.invalidateQueries({ queryKey: KEY });

  const create = useMutation({
    mutationFn: (p: ArticleInsert) => knowledgeAdminService.create(p),
    onSuccess: invalidate,
  });
  const update = useMutation({
    mutationFn: (v: { id: string; patch: ArticleUpdate }) =>
      knowledgeAdminService.update(v.id, v.patch),
    onSuccess: invalidate,
  });
  const setStatus = useMutation({
    mutationFn: (v: { id: string; status: ArticleStatus }) =>
      knowledgeAdminService.setStatus(v.id, v.status),
    onSuccess: invalidate,
  });
  const softDelete = useMutation({
    mutationFn: (id: string) => knowledgeAdminService.softDelete(id),
    onSuccess: invalidate,
  });
  const restore = useMutation({
    mutationFn: (id: string) => knowledgeAdminService.restore(id),
    onSuccess: invalidate,
  });
  const duplicate = useMutation({
    mutationFn: (id: string) => knowledgeAdminService.duplicate(id),
    onSuccess: invalidate,
  });

  return { create, update, setStatus, softDelete, restore, duplicate };
}
