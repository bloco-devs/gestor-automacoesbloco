import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { BLOCO_ID_LAUNCHER_URL } from "@/lib/bloco-id";

const LAUNCHER_URL = BLOCO_ID_LAUNCHER_URL;

export default function SsoCallback() {
  const [params] = useSearchParams();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const sso_token = params.get("sso_token");
    if (!sso_token) {
      setError("Token de SSO ausente.");
      return;
    }
    (async () => {
      try {
        const { data, error } = await supabase.functions.invoke("sso-login", {
          body: { sso_token },
        });
        if (error) throw error;
        if (!data?.ok || !data?.redirect_url) {
          throw new Error(data?.error ?? "Falha ao autenticar via Bloco ID.");
        }
        window.location.replace(data.redirect_url);
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Erro desconhecido";
        setError(msg);
      }
    })();
  }, [params]);

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="max-w-md text-center space-y-4">
        {!error ? (
          <>
            <div className="mx-auto size-10 rounded-full border-2 border-primary border-t-transparent animate-spin" />
            <p className="text-sm text-muted-foreground">Validando seu acesso pelo Bloco ID…</p>
          </>
        ) : (
          <>
            <h1 className="text-lg font-semibold">Não foi possível entrar</h1>
            <p className="text-sm text-muted-foreground">{error}</p>
            <a
              href={LAUNCHER_URL}
              className="inline-block text-sm text-primary hover:underline"
            >
              Voltar para o Bloco ID
            </a>
          </>
        )}
      </div>
    </div>
  );
}
