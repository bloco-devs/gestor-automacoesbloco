import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { knowledgeAdminService } from "../services/admin-service";

export function useArticleVersions(articleId: string | null) {
  return useQuery({
    queryKey: ["knowledge-admin", "versions", articleId],
    queryFn: () =>
      articleId ? knowledgeAdminService.listVersions(articleId) : Promise.resolve([]),
    enabled: !!articleId,
    staleTime: 15_000,
  });
}

export function useRestoreVersion() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (v: { articleId: string; versionId: string }) =>
      knowledgeAdminService.restoreVersion(v.articleId, v.versionId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["knowledge-admin"] }),
  });
}
