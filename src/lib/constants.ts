/**
 * Constantes de infraestrutura que o front precisa saber de cor.
 *
 * Nada de segredo aqui: só endereço público. O que exige chave fica no
 * `src/integrations/supabase/client.ts`.
 */

/**
 * Quadros do BLINK da tela de abertura — bucket público `blink` no Storage.
 *
 * Sem barra final: o `BlinkLoader` concatena `/fNNN.webp`. Quem sobe os quadros
 * é `scripts/upload-blink-frames.mjs`, e é ele que imprime esta URL.
 */
export const BLINK_FRAMES_URL =
  "https://cgbhpenkytibgiosksrb.supabase.co/storage/v1/object/public/blink/frames";
