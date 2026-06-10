import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import blocoLogo from "@/assets/bloco-logo.png";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import {
  clearPasswordRecoveryIntent,
  getAuthCallbackError,
  isPasswordRecoveryIntent,
  markPasswordRecoveryIntent,
} from "@/lib/auth-recovery";

const schema = z
  .object({
    senha: z.string().min(6, "Mínimo 6 caracteres").max(128),
    confirmar: z.string().min(6, "Mínimo 6 caracteres").max(128),
  })
  .refine((d) => d.senha === d.confirmar, {
    message: "As senhas não coincidem",
    path: ["confirmar"],
  });

export default function RedefinirSenha() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [ready, setReady] = useState<"checking" | "ready" | "invalid">("checking");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({ senha: "", confirmar: "" });

  useEffect(() => {
    // Mensagem de erro vinda do provedor (link expirado etc.)
    const callbackError = getAuthCallbackError(window.location.hash, window.location.search);
    if (callbackError) {
      setErrorMessage(callbackError);
      setReady("invalid");
      clearPasswordRecoveryIntent();
      return;
    }

    // Se já temos intent registrado, marcar pronto assim que houver sessão
    if (isPasswordRecoveryIntent()) {
      markPasswordRecoveryIntent();
    }

    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "PASSWORD_RECOVERY") {
        markPasswordRecoveryIntent();
        setReady("ready");
        return;
      }
      if (event === "SIGNED_IN" && isPasswordRecoveryIntent()) {
        setReady("ready");
      }
      if (event === "SIGNED_OUT" && !session) {
        // mantém estado
      }
    });

    supabase.auth.getSession().then(({ data }) => {
      setReady((prev) => {
        if (prev !== "checking") return prev;
        if (data.session && isPasswordRecoveryIntent()) return "ready";
        return prev;
      });
    });

    const t = setTimeout(() => {
      setReady((prev) => {
        if (prev !== "checking") return prev;
        setErrorMessage("Link inválido ou expirado.");
        return "invalid";
      });
    }, 3000);

    return () => {
      sub.subscription.unsubscribe();
      clearTimeout(t);
    };
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      const v = schema.parse(form);
      const { error } = await supabase.auth.updateUser({ password: v.senha });
      if (error) throw error;
      clearPasswordRecoveryIntent();
      await supabase.auth.signOut();
      toast({ title: "Senha atualizada", description: "Faça login com a nova senha." });
      navigate("/auth");
    } catch (err) {
      const msg =
        err instanceof z.ZodError
          ? err.issues[0].message
          : err instanceof Error
            ? err.message
            : "Erro";
      toast({ title: "Não foi possível atualizar", description: msg, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  }

  async function handleBackToLogin() {
    clearPasswordRecoveryIntent();
    await supabase.auth.signOut().catch(() => undefined);
    navigate("/auth");
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative">
      <div className="absolute top-4 right-4">
        <ThemeToggle />
      </div>
      <div className="w-full max-w-md">
        <div className="flex items-center gap-3 mb-8 justify-center">
          <img src={blocoLogo} alt="Bloco Construções" className="size-10 rounded-lg object-cover" />
          <h1 className="text-base font-brand font-bold whitespace-nowrap">Gestor de Automações</h1>
        </div>

        <Card className="surface-1">
          <CardHeader>
            <CardTitle className="text-lg">Redefinir senha</CardTitle>
            <CardDescription>
              {ready === "ready"
                ? "Defina sua nova senha de acesso."
                : ready === "invalid"
                  ? errorMessage ?? "Link inválido ou expirado."
                  : "Validando link..."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {ready === "ready" && (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label htmlFor="senha">Nova senha</Label>
                  <Input
                    id="senha"
                    type="password"
                    value={form.senha}
                    onChange={(e) => setForm({ ...form, senha: e.target.value })}
                    autoComplete="new-password"
                  />
                </div>
                <div>
                  <Label htmlFor="confirmar">Confirmar senha</Label>
                  <Input
                    id="confirmar"
                    type="password"
                    value={form.confirmar}
                    onChange={(e) => setForm({ ...form, confirmar: e.target.value })}
                    autoComplete="new-password"
                  />
                </div>
                <Button type="submit" className="w-full" disabled={submitting}>
                  {submitting ? "Aguarde..." : "Atualizar senha"}
                </Button>
              </form>
            )}
            {ready === "invalid" && (
              <Button variant="outline" className="w-full" onClick={handleBackToLogin}>
                Voltar para o login
              </Button>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
