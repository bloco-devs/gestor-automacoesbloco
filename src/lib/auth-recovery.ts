export const PASSWORD_RECOVERY_KEY = "bloco:password-recovery";

function parseHash(hash: string): URLSearchParams {
  return new URLSearchParams(hash.replace(/^#/, ""));
}

export function hasAuthTokensInHash(hash: string): boolean {
  const params = parseHash(hash);
  return params.has("access_token") && params.has("refresh_token");
}

export function hasAuthCodeInSearch(search: string): boolean {
  return new URLSearchParams(search).has("code");
}

export function isRecoveryTypeInUrl(hash: string, search: string): boolean {
  const hashParams = parseHash(hash);
  const searchParams = new URLSearchParams(search);
  return hashParams.get("type") === "recovery" || searchParams.get("type") === "recovery";
}

export function markPasswordRecoveryIntent(): void {
  try {
    sessionStorage.setItem(PASSWORD_RECOVERY_KEY, "1");
  } catch {
    // ignore
  }
}

export function clearPasswordRecoveryIntent(): void {
  try {
    sessionStorage.removeItem(PASSWORD_RECOVERY_KEY);
  } catch {
    // ignore
  }
}

export function getAuthCallbackError(hash: string, search: string): string | null {
  const hashParams = parseHash(hash);
  const searchParams = new URLSearchParams(search);
  const error = hashParams.get("error") ?? searchParams.get("error");
  const errorCode = hashParams.get("error_code") ?? searchParams.get("error_code");

  if (!error && !errorCode) return null;
  if (error !== "access_denied" && errorCode !== "otp_expired" && !error) {
    return null;
  }

  return (
    hashParams.get("error_description") ??
    searchParams.get("error_description") ??
    "Link expirado ou inválido."
  );
}

const NON_RECOVERY_AUTH_TYPES = new Set([
  "signup",
  "magiclink",
  "email",
  "email_change",
  "invite",
]);

function isRecoveryTokenHash(hash: string): boolean {
  if (!hasAuthTokensInHash(hash)) return false;
  const type = parseHash(hash).get("type");
  if (type === "recovery" || type === null) return true;
  return !NON_RECOVERY_AUTH_TYPES.has(type);
}

export function isPasswordRecoveryIntent(opts?: {
  pathname?: string;
  hash?: string;
  search?: string;
}): boolean {
  if (typeof window === "undefined") return false;
  const pathname = opts?.pathname ?? window.location.pathname;
  const hash = opts?.hash ?? window.location.hash;
  const search = opts?.search ?? window.location.search;

  try {
    if (sessionStorage.getItem(PASSWORD_RECOVERY_KEY) === "1") return true;
  } catch {
    // ignore
  }
  if (isRecoveryTypeInUrl(hash, search)) return true;

  const onResetPassword = pathname.includes("/redefinir-senha");
  if (onResetPassword && (hasAuthTokensInHash(hash) || hasAuthCodeInSearch(search))) {
    return true;
  }

  if (isRecoveryTokenHash(hash)) return true;

  return false;
}
