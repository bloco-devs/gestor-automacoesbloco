import { useQuery } from "@tanstack/react-query";
import { buildCandidatePool } from "../services/routing-service";
import type { Candidate } from "../types";

const KEY = ["routing", "candidate-pool"] as const;

export function useTeamPool() {
  return useQuery<Candidate[], Error>({
    queryKey: KEY,
    queryFn: buildCandidatePool,
    staleTime: 5 * 60_000,
  });
}
