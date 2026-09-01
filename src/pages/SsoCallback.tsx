import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { BLOCO_ID_LAUNCHER_URL } from "@/lib/bloco-id";
import { BlinkCarregando } from "@/components/blink/BlinkCarregando";

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
   * A ESPERA DA TROCA DE TOKEN — e por que NÃO é o `BoasVindas` aqui.
   *
   * O `BoasVindas` é montado pelo `App` como splash de boot, e o `App` envolve
   * esta rota. Renderizá-lo aqui também montava DOIS ao mesmo tempo: dois
   * canvas, dois laços de `requestAnimationFrame` e dois carregamentos dos 240
   * quadros em 1920×1080. O sintoma era a barra de carregamento aparecendo
   * duas vezes — uma sem o BLINK, outra com — e a tela lagando.
   *
   * Esta rota termina em `window.location.replace("/")`, então o splash de
   * verdade vem depois da recarga, uma vez só. Aqui basta a espera leve.
   */
  if (!error) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-[#16323e]">
        <BlinkCarregando mensagem="Validando seu acesso pelo Bloco ID…" />
      </div>
    );
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
