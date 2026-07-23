/**
 * Config runtime derivada de env. Não expõe segredos.
 */
function readEnv(key: string): string | undefined {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const env = (import.meta as any)?.env ?? {};
    return env[key];
  } catch {
    return undefined;
  }
}

export const runtimeConfig = {
  isDev: readEnv("MODE") === "development" || readEnv("DEV") === "true",
  supabaseProjectRef: "cgbhpenkytibgiosksrb",
  hubProjectRef: "yzuvwhszpyxchlejxsjd",
  appVersion: readEnv("VITE_APP_VERSION") ?? "26.5.0",
} as const;
