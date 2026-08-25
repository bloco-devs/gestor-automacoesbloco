import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { BLOCO_ID_LAUNCHER_URL } from "@/lib/bloco-id";
import { BoasVindas } from "@/components/BoasVindas";

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
        if (!data?.ok) {
          throw new Error(data?.error ?? "Falha ao autenticar via Bloco ID.");
        }
        if (data.token_hash) {
          const { error: vErr } = await supabase.auth.verifyOtp({ type: "magiclink", token_hash: data.token_hash });
          if (vErr) throw vErr;
          window.location.replace("/");
        } else if (data.redirect_url) {
          window.location.replace(data.redirect_url);
        } else {
          throw new Error("Sem credencial de login.");
        }
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Erro desconhecido";
        setError(msg);
      }
    })();
  }, [params]);

  /**
   * A chegada pelo Bloco ID era um círculo girando sobre fundo vazio: nenhuma
   * informação de onde a pessoa acabou de entrar, e em conexão lenta a
   * impressão de que travou.
   *
   * O `return` sai antes em vez de aninhar: `BoasVindas` já ocupa a tela
   * inteira, e ficaria espremida dentro do `max-w-md` que existe para a
   * mensagem de erro.
   */
  if (!error) {
    return <BoasVindas estado="Validando seu acesso pelo Bloco ID…" />;
  }

  return (
    <div className="flex min-h-dvh items-center justify-center bg-background p-4">
      <div className="max-w-md space-y-4 text-center">
        <h1 className="text-lg font-semibold">Não foi possível entrar</h1>
        <p className="text-sm text-muted-foreground">{error}</p>
        <a href={LAUNCHER_URL} className="inline-block text-sm text-primary hover:underline">
          Voltar para o Bloco ID
        </a>
      </div>
    </div>
  );
}
