// SHA-256 utilitário (Deno / Web Crypto). Usado para file_hash de idempotência.

export async function sha256Hex(bytes: Uint8Array | ArrayBuffer): Promise<string> {
  const buf = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  const digest = await crypto.subtle.digest('SHA-256', buf);
  const arr = Array.from(new Uint8Array(digest));
  return arr.map((b) => b.toString(16).padStart(2, '0')).join('');
}

export async function sha256HexOfString(s: string): Promise<string> {
  return sha256Hex(new TextEncoder().encode(s));
}
