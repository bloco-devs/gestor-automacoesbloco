#!/usr/bin/env node
/**
 * Sobe os quadros do BLINK para o Storage — bucket público `blink`.
 *
 * COMO RODAR
 *
 *   SUPABASE_URL="https://<projeto>.supabase.co" \
 *   SUPABASE_SERVICE_ROLE_KEY="<service_role>" \
 *   node scripts/upload-blink-frames.mjs
 *
 * A service_role key entra só pelo ambiente. Ela NÃO vai para o `.env` deste
 * repositório — o `.env` daqui é versionado e só carrega chave publishable, que
 * é a que pode aparecer no bundle. Uma service_role no `.env` versionado seria
 * chave de administrador do banco publicada no git.
 *
 * Idempotente: `upsert` ligado, então rodar de novo só reescreve o que mudou.
 */

import { createClient } from "@supabase/supabase-js";
import { readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";

const BUCKET = "blink";
const PREFIXO = "frames";
const N_FRAMES = 240;
/** Um ano. Quadro de vídeo não muda de conteúdo sem mudar de nome. */
const CACHE = "31536000";
const CONCORRENCIA = 8;
const DIR = path.resolve(process.cwd(), "frames");

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !key) {
  console.error(
    "Faltou variável de ambiente.\n" +
      "  SUPABASE_URL=" + (url ? "ok" : "AUSENTE") + "\n" +
      "  SUPABASE_SERVICE_ROLE_KEY=" + (key ? "ok" : "AUSENTE") + "\n\n" +
      "A service_role key está em Dashboard → Project Settings → API.\n" +
      "Passe-a no comando, sem gravar em arquivo do repositório."
  );
  process.exit(1);
}

const nomes = Array.from(
  { length: N_FRAMES },
  (_, i) => `f${String(i + 1).padStart(3, "0")}.webp`
);

const faltando = nomes.filter((n) => !existsSync(path.join(DIR, n)));
if (faltando.length) {
  console.error(
    `Faltam ${faltando.length} quadro(s) em ${DIR} — o primeiro é ${faltando[0]}.\n` +
      "Rode a extração antes (ffmpeg, 24 fps, 240 quadros)."
  );
  process.exit(1);
}

const supabase = createClient(url, key, { auth: { persistSession: false } });

/* --------------------------------------------------------------------- bucket */

const { data: buckets, error: erroLista } = await supabase.storage.listBuckets();
if (erroLista) {
  console.error("Não deu para listar os buckets:", erroLista.message);
  process.exit(1);
}

if (buckets.some((b) => b.name === BUCKET)) {
  console.log(`bucket "${BUCKET}": já existe`);
} else {
  const { error } = await supabase.storage.createBucket(BUCKET, {
    public: true,
    fileSizeLimit: "5MB",
    allowedMimeTypes: ["image/webp"],
  });
  if (error) {
    console.error(`Não deu para criar o bucket "${BUCKET}":`, error.message);
    process.exit(1);
  }
  console.log(`bucket "${BUCKET}": criado (público)`);
}

/* --------------------------------------------------------------------- uploads */

let enviados = 0;
const falhas = [];
let proximo = 0;

async function worker() {
  while (proximo < nomes.length) {
    const nome = nomes[proximo++];
    const corpo = await readFile(path.join(DIR, nome));
    const { error } = await supabase.storage
      .from(BUCKET)
      .upload(`${PREFIXO}/${nome}`, corpo, {
        contentType: "image/webp",
        cacheControl: CACHE,
        upsert: true,
      });
    if (error) falhas.push({ nome, motivo: error.message });
    else enviados += 1;

    const feito = enviados + falhas.length;
    if (feito % 24 === 0 || feito === nomes.length) {
      process.stdout.write(`\rquadros: ${feito}/${nomes.length}`);
    }
  }
}

await Promise.all(Array.from({ length: CONCORRENCIA }, worker));
process.stdout.write("\n");

if (falhas.length) {
  console.error(`\n${falhas.length} falha(s):`);
  for (const f of falhas.slice(0, 10)) console.error(`  ${f.nome}: ${f.motivo}`);
  if (falhas.length > 10) console.error(`  … e outras ${falhas.length - 10}`);
  process.exit(1);
}

const base = `${url.replace(/\/+$/, "")}/storage/v1/object/public/${BUCKET}/${PREFIXO}`;
console.log(`\n${enviados} quadros no ar.`);
console.log(`\nURL base (é este valor que vai em BLINK_FRAMES_URL, sem barra final):\n${base}`);
