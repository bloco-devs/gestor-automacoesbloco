import { supabase } from "@/integrations/supabase/client";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const sb = supabase as any;

export const BUCKET = "atividades-anexos";
export const MAX_SIZE = 15 * 1024 * 1024; // 15 MB
export const MAX_PER_CARD = 20;

export const ALLOWED_MIME = new Set<string>([
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/gif",
  "image/svg+xml",
  "application/pdf",
  "text/plain",
  "text/csv",
  "text/markdown",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "application/msword",
  "application/vnd.ms-excel",
  "application/vnd.ms-powerpoint",
  "application/zip",
]);

const DANGEROUS_EXT = /\.(exe|js|mjs|cjs|html?|sh|bat|cmd|ps1|vbs|jar|com|scr)$/i;

export interface AtividadeAnexo {
  id: string;
  cardId: string;
  boardId: string;
  storagePath: string;
  filename: string;
  mimeType: string;
  sizeBytes: number;
  uploadedBy: string;
  uploadedByEmail: string | null;
  createdAt: string;
}

export function sanitizeFilename(name: string): string {
  return name
    .replace(/[^a-zA-Z0-9._-]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 120) || "arquivo";
}

export function validateFile(file: File): string | null {
  if (file.size <= 0) return "Arquivo vazio.";
  if (file.size > MAX_SIZE) return `Arquivo excede 15 MB (${(file.size / 1024 / 1024).toFixed(1)} MB).`;
  if (DANGEROUS_EXT.test(file.name)) return "Extensão de arquivo não permitida.";
  if (!ALLOWED_MIME.has(file.type)) return `Tipo de arquivo não permitido (${file.type || "desconhecido"}).`;
  return null;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapAnexo(r: any): AtividadeAnexo {
  return {
    id: r.id,
    cardId: r.card_id,
    boardId: r.board_id,
    storagePath: r.storage_path,
    filename: r.filename,
    mimeType: r.mime_type,
    sizeBytes: Number(r.size_bytes ?? 0),
    uploadedBy: r.uploaded_by,
    uploadedByEmail: r.uploaded_by_email ?? null,
    createdAt: r.created_at,
  };
}

export async function listAnexos(cardId: string): Promise<AtividadeAnexo[]> {
  const { data, error } = await sb
    .from("atividades_anexos")
    .select("*")
    .eq("card_id", cardId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []).map(mapAnexo);
}

export async function countAnexosByBoard(boardId: string): Promise<Map<string, number>> {
  const map = new Map<string, number>();
  if (!boardId) return map;
  const { data, error } = await sb
    .from("atividades_anexos")
    .select("card_id")
    .eq("board_id", boardId);
  if (error) throw error;
  for (const row of data ?? []) {
    map.set(row.card_id, (map.get(row.card_id) ?? 0) + 1);
  }
  return map;
}

export async function uploadAnexo(params: {
  cardId: string;
  boardId: string;
  file: File;
}): Promise<AtividadeAnexo> {
  const err = validateFile(params.file);
  if (err) throw new Error(err);

  const { data: userData } = await supabase.auth.getUser();
  const userId = userData.user?.id;
  if (!userId) throw new Error("Sessão expirada. Faça login novamente.");

  const anexoId = crypto.randomUUID();
  const clean = sanitizeFilename(params.file.name);
  const storagePath = `${params.boardId}/${params.cardId}/${anexoId}-${clean}`;

  const { error: upErr } = await supabase.storage
    .from(BUCKET)
    .upload(storagePath, params.file, {
      contentType: params.file.type,
      upsert: false,
    });
  if (upErr) throw upErr;

  const { data, error } = await sb
    .from("atividades_anexos")
    .insert({
      id: anexoId,
      card_id: params.cardId,
      board_id: params.boardId,
      storage_path: storagePath,
      filename: params.file.name.slice(0, 200),
      mime_type: params.file.type,
      size_bytes: params.file.size,
      uploaded_by: userId,
    })
    .select("*")
    .single();

  if (error) {
    // rollback objeto órfão
    await supabase.storage.from(BUCKET).remove([storagePath]).catch(() => {});
    throw error;
  }
  return mapAnexo(data);
}

export async function deleteAnexo(anexo: AtividadeAnexo): Promise<void> {
  await supabase.storage.from(BUCKET).remove([anexo.storagePath]).catch((e) => {
    console.warn("[anexos] falha ao remover objeto:", e);
  });
  const { error } = await sb.from("atividades_anexos").delete().eq("id", anexo.id);
  if (error) throw error;
}

/** Remove todos os objetos de um card antes do delete (CASCADE apaga as linhas). */
export async function purgeAnexosDoCard(cardId: string): Promise<void> {
  const anexos = await listAnexos(cardId).catch(() => [] as AtividadeAnexo[]);
  if (anexos.length === 0) return;
  const paths = anexos.map((a) => a.storagePath);
  await supabase.storage.from(BUCKET).remove(paths).catch((e) => {
    console.warn("[anexos] purge falhou:", e);
  });
}

export async function getDownloadUrl(anexo: AtividadeAnexo): Promise<string> {
  const { data, error } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(anexo.storagePath, 60, { download: anexo.filename });
  if (error) throw error;
  return data.signedUrl;
}
