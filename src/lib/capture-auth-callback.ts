import { markPasswordRecoveryIntent } from "@/lib/auth-recovery";

const NON_RECOVERY_AUTH_TYPES = new Set([
  "signup",
  "magiclink",
  "email",
  "email_change",
  "invite",
]);

function shouldMarkRecovery(type: string | null): boolean {
  if (type === "recovery" || type === null) return true;
  return !NON_RECOVERY_AUTH_TYPES.has(type);
}

/** Runs before Supabase/React so recovery tokens in the URL are not lost. */
export function captureAuthCallbackFromUrl(): void {
  if (typeof window === "undefined") return;

  const hash = window.location.hash;
  if (hash) {
    const params = new URLSearchParams(hash.replace(/^#/, ""));
    const hasTokens = params.has("access_token") && params.has("refresh_token");
    if (hasTokens && shouldMarkRecovery(params.get("type"))) {
      markPasswordRecoveryIntent();
      return;
    }
    if (params.get("type") === "recovery") {
      markPasswordRecoveryIntent();
      return;
    }
  }

  const search = new URLSearchParams(window.location.search);
  if (search.get("type") === "recovery") {
    markPasswordRecoveryIntent();
    return;
  }
  const code = search.get("code");
  if (code && window.location.pathname.includes("/redefinir-senha")) {
    markPasswordRecoveryIntent();
  }
}

captureAuthCallbackFromUrl();
