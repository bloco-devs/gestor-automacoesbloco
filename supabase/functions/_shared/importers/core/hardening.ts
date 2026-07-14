// Hardening compartilhado do importador (pré-Fase 5).
// - sniffContentKind: valida a assinatura real de bytes (não confia em extensão/MIME do cliente).
// - cleanupOldObjects: TTL best-effort no bucket temporário (>24h por padrão).
// - newRequestId: gera um id curto para correlação de logs por chamada.

import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

export type ContentKind = "json" | "zip" | "unknown";

/** Sniff nos primeiros bytes. */
export function sniffContentKind(bytes: Uint8Array): ContentKind {
  if (bytes.length >= 4 &&
      bytes[0] === 0x50 && bytes[1] === 0x4b &&
      bytes[2] === 0x03 && bytes[3] === 0x04) {
    return "zip";
  }
  // JSON: primeiro byte não-whitespace deve ser { ou [
  for (let i = 0; i < Math.min(bytes.length, 64); i++) {
    const c = bytes[i];
    if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d || c === 0xef || c === 0xbb || c === 0xbf) continue;
    if (c === 0x7b || c === 0x5b) return "json"; // { or [
    return "unknown";
  }
  return "unknown";
}

/** Gera um request id curto (16 hex chars). */
export function newRequestId(): string {
  const buf = new Uint8Array(8);
  crypto.getRandomValues(buf);
  return Array.from(buf, (b) => b.toString(16).padStart(2, "0")).join("");
}

/**
 * Remove objetos do bucket temporário mais antigos que `ttlHours`.
 * Best-effort: silencia erros de I/O — o objetivo é evitar acumulação, não bloquear fluxo.
 * Escopa a limpeza ao prefixo do próprio usuário.
 */
export async function cleanupOldObjects(
  svc: SupabaseClient,
  bucket: string,
  userPrefix: string,
  ttlHours = 24,
): Promise<{ scanned: number; removed: number }> {
  const cutoff = Date.now() - ttlHours * 3600 * 1000;
  let scanned = 0;
  let removed = 0;
  try {
    const { data: jobDirs } = await svc.storage.from(bucket).list(userPrefix, { limit: 100 });
    for (const dir of jobDirs ?? []) {
      if (!dir.name) continue;
      const jobPath = `${userPrefix}/${dir.name}`;
      const { data: files } = await svc.storage.from(bucket).list(jobPath, { limit: 50 });
      const toRemove: string[] = [];
      for (const f of files ?? []) {
        scanned++;
        const createdAt = f.created_at ? Date.parse(f.created_at) : 0;
        if (createdAt && createdAt < cutoff) {
          toRemove.push(`${jobPath}/${f.name}`);
        }
      }
      if (toRemove.length > 0) {
        const { data: rm } = await svc.storage.from(bucket).remove(toRemove);
        removed += rm?.length ?? 0;
      }
    }
  } catch {
    // ignore — best effort
  }
  return { scanned, removed };
}

/** Remove todos os arquivos de um job (usado ao finalizar). Best-effort. */
export async function removeJobObjects(
  svc: SupabaseClient,
  bucket: string,
  jobPrefix: string,
): Promise<number> {
  try {
    const { data: files } = await svc.storage.from(bucket).list(jobPrefix, { limit: 50 });
    if (!files || files.length === 0) return 0;
    const paths = files.filter((f) => f.name).map((f) => `${jobPrefix}/${f.name}`);
    if (paths.length === 0) return 0;
    const { data: rm } = await svc.storage.from(bucket).remove(paths);
    return rm?.length ?? 0;
  } catch {
    return 0;
  }
}
