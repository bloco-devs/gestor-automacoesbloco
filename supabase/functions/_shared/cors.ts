// CORS helper centralizado com allowlist por origem.
// Ecoa a Origin quando estiver na allowlist; caso contrário usa a origem de produção como padrão.

const PROD_ORIGIN = "https://gestor-automacoesbloco.lovable.app";

const ALLOWED_EXACT = new Set<string>([
  "https://gestor-automacoesbloco.lovable.app",
  "https://preview--gestor-automacoesbloco.lovable.app",
]);

// Padrões: subdomínios *.lovable.app, *.lovableproject.com e localhost para dev.
const ALLOWED_PATTERNS: RegExp[] = [
  /^https:\/\/[a-z0-9-]+\.lovable\.app$/i,
  /^https:\/\/[a-z0-9-]+\.lovableproject\.com$/i,
  /^http:\/\/localhost(:\d+)?$/i,
];

function isAllowed(origin: string | null): boolean {
  if (!origin) return false;
  if (ALLOWED_EXACT.has(origin)) return true;
  return ALLOWED_PATTERNS.some((re) => re.test(origin));
}

export function getCorsHeaders(req: Request): Record<string, string> {
  const origin = req.headers.get("Origin");
  const allowOrigin = isAllowed(origin) ? (origin as string) : PROD_ORIGIN;
  return {
    "Access-Control-Allow-Origin": allowOrigin,
    "Vary": "Origin",
    "Access-Control-Allow-Headers":
      "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
  };
}
