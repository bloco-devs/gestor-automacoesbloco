// Edge `rpa-evidencia-url` — projeto Gestor de Automacoes (cgbhpenkytibgiosksrb).
//
// Devolve URL assinada de UPLOAD no bucket privado `rpa-evidencias` (TTL 10 min).
// Nenhuma chave de Storage vive no VPS: o runner so recebe uma URL temporaria.
//
// O caminho e montado AQUI, no servidor, a partir de partes validadas. O runner
// nunca escolhe caminho — e isso que impede um manifesto malicioso ou com bug de
// escrever fora do prefixo do proprio robo.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.58.0";

const TOKEN_ESPERADO = Deno.env.get("HUB_RPA_TOKEN") ?? "";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const BUCKET = "rpa-evidencias";
const TTL_SEGUNDOS = 600;

const admin = createClient(SUPABASE_URL, SERVICE_ROLE, {
  auth: { persistSession: false },
});

function json(status: number, corpo: unknown): Response {
  return new Response(JSON.stringify(corpo), {
    status,
    headers: { "content-type": "application/json; charset=utf-8" },
  });
}

function tokenConfere(recebido: string): boolean {
  if (!TOKEN_ESPERADO || recebido.length !== TOKEN_ESPERADO.length) return false;
  let diferenca = 0;
  for (let i = 0; i < TOKEN_ESPERADO.length; i++) {
    diferenca |= recebido.charCodeAt(i) ^ TOKEN_ESPERADO.charCodeAt(i);
  }
  return diferenca === 0;
}

const SLUG = /^[a-z0-9][a-z0-9-]*$/;          // igual ao check de rpa_robos.slug
const RUN_ID = /^[0-9A-HJKMNP-TV-Z]{26}$/;    // ULID em Crockford base32
const ARQUIVO = /^[a-z0-9._-]+$/;             // sem "/", sem "..", sem acento

Deno.serve(async (req) => {
  if (req.method !== "POST") return json(405, { erro: "use POST" });

  let corpo: Record<string, unknown>;
  try {
    corpo = await req.json();
  } catch {
    return json(400, { erro: "corpo nao e JSON valido" });
  }

  if (!tokenConfere(String(corpo.token ?? ""))) {
    return json(401, { erro: "token invalido" });
  }

  const slug = String(corpo.slug ?? "");
  const runId = String(corpo.run_id ?? "");
  const arquivo = String(corpo.arquivo ?? "");

  if (!SLUG.test(slug)) return json(400, { erro: "slug invalido" });
  if (!RUN_ID.test(runId)) return json(400, { erro: "run_id nao e um ULID" });
  if (!ARQUIVO.test(arquivo) || arquivo.includes("..")) {
    return json(400, { erro: "nome de arquivo invalido", aceito: "[a-z0-9._-]" });
  }

  const mes = new Date().toISOString().slice(0, 7);      // AAAA-MM
  const caminho = `${slug}/${mes}/${runId}/${arquivo}`;

  const { data, error } = await admin.storage
    .from(BUCKET)
    .createSignedUploadUrl(caminho);

  if (error) {
    console.error("rpa-evidencia-url", caminho, error);
    return json(500, { erro: error.message });
  }

  return json(200, {
    ok: true,
    url: data.signedUrl,
    caminho,
    expira_em_s: TTL_SEGUNDOS,
  });
});
