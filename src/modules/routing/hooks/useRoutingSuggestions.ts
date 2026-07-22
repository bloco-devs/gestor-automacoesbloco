import { useMemo } from "react";
import { rankCandidates, type RankOptions } from "../engine/ranker";
import type { DemandInput, Ranking } from "../types";
import { useTeamPool } from "./useTeamPool";

const EMPTY: Ranking = { top: null, alternatives: [], all: [], empty: true };

export function useRoutingSuggestions(
  demand: DemandInput | null,
  options: RankOptions = {},
): { ranking: Ranking; isLoading: boolean; error: Error | null } {
  const { data: pool, isLoading, error } = useTeamPool();
  const ranking = useMemo<Ranking>(() => {
    if (!demand || !pool) return EMPTY;
    return rankCandidates(demand, pool, options);
    // options is destructured plain object; recreate-safe
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [demand, pool, JSON.stringify(options)]);
  return { ranking, isLoading, error: error ?? null };
}
