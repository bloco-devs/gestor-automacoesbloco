import { supabase } from "@/integrations/supabase/client";

export type IaUsageRow = {
  acao: string | null;
  modelo: string | null;
  tokens_in: number | null;
  tokens_out: number | null;
  status: string | null;
  user_id: string | null;
  created_at: string;
};

export type IaUsageAggregates = {
  totalCalls: number;
  totalTokensIn: number;
  totalTokensOut: number;
  errorCount: number;
  limitCount: number;
  okCount: number;
  errorRate: number; // 0..1 (erro+limite)
  byAcao: Array<{ key: string; count: number; tokensIn: number; tokensOut: number }>;
  byModelo: Array<{ key: string; count: number; tokensIn: number; tokensOut: number }>;
  byStatus: Array<{ key: string; count: number; tokensIn: number; tokensOut: number }>;
};

export async function fetchIaUsage(opts: {
  sinceIso: string;
  limit?: number;
}): Promise<IaUsageRow[]> {
  const limit = Math.min(Math.max(opts.limit ?? 1000, 1), 1000);
  const { data, error } = await supabase
    .from("ia_uso_log")
    .select("acao, modelo, tokens_in, tokens_out, status, user_id, created_at")
    .gte("created_at", opts.sinceIso)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data ?? []) as IaUsageRow[];
}

function groupBy(
  rows: IaUsageRow[],
  field: keyof Pick<IaUsageRow, "acao" | "modelo" | "status">,
) {
  const map = new Map<string, { count: number; tokensIn: number; tokensOut: number }>();
  for (const r of rows) {
    const key = (r[field] as string | null) || "—";
    const acc = map.get(key) ?? { count: 0, tokensIn: 0, tokensOut: 0 };
    acc.count += 1;
    acc.tokensIn += Number(r.tokens_in ?? 0);
    acc.tokensOut += Number(r.tokens_out ?? 0);
    map.set(key, acc);
  }
  return Array.from(map.entries())
    .map(([key, v]) => ({ key, ...v }))
    .sort((a, b) => b.count - a.count);
}

export function aggregateIaUsage(rows: IaUsageRow[]): IaUsageAggregates {
  let totalTokensIn = 0;
  let totalTokensOut = 0;
  let errorCount = 0;
  let limitCount = 0;
  let okCount = 0;
  for (const r of rows) {
    totalTokensIn += Number(r.tokens_in ?? 0);
    totalTokensOut += Number(r.tokens_out ?? 0);
    const s = (r.status || "").toLowerCase();
    if (s === "erro" || s === "error") errorCount += 1;
    else if (s === "limite" || s === "limit" || s === "rate_limit") limitCount += 1;
    else if (s === "ok" || s === "sucesso" || s === "success") okCount += 1;
  }
  const total = rows.length;
  return {
    totalCalls: total,
    totalTokensIn,
    totalTokensOut,
    errorCount,
    limitCount,
    okCount,
    errorRate: total ? (errorCount + limitCount) / total : 0,
    byAcao: groupBy(rows, "acao"),
    byModelo: groupBy(rows, "modelo"),
    byStatus: groupBy(rows, "status"),
  };
}

export function periodToSinceIso(period: "24h" | "7d" | "30d"): string {
  const now = Date.now();
  const ms =
    period === "24h" ? 24 * 3600_000 : period === "30d" ? 30 * 86400_000 : 7 * 86400_000;
  return new Date(now - ms).toISOString();
}
