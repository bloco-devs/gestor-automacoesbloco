// Rate limiter simples baseado em contagem de linhas recentes em `ia_uso_log`.
// Deve ser chamado com um cliente Supabase usando SERVICE ROLE.

import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

export const DEFAULT_LIMITE = 20;
export const DEFAULT_JANELA_SEGUNDOS = 60;

export type RateLimitResult = { permitido: boolean; restante: number };

export async function checkRateLimit(
  supabaseService: SupabaseClient,
  userId: string | null | undefined,
  opts: { limite?: number; janelaSegundos?: number } = {},
): Promise<RateLimitResult> {
  const limite = opts.limite ?? DEFAULT_LIMITE;
  const janelaSegundos = opts.janelaSegundos ?? DEFAULT_JANELA_SEGUNDOS;

  // Sem usuário identificado: permite (a function pode ser chamada server-to-server).
  if (!userId) return { permitido: true, restante: limite };

  const desde = new Date(Date.now() - janelaSegundos * 1000).toISOString();

  try {
    const { count, error } = await supabaseService
      .from("ia_uso_log")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .gte("created_at", desde);

    if (error) {
      console.error("rate-limit: erro consultando ia_uso_log:", error.message);
      return { permitido: true, restante: limite };
    }

    const usados = count ?? 0;
    const restante = Math.max(0, limite - usados);
    return { permitido: usados < limite, restante };
  } catch (e) {
    console.error("rate-limit: exceção:", e instanceof Error ? e.message : String(e));
    return { permitido: true, restante: limite };
  }
}
