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
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({ senha: "", confirmar: "" });

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") setReady("ready");
    });
    // Caso já exista uma sessão de recovery quando o componente monta
    supabase.auth.getSession().then(({ data }) => {
      setReady((prev) => {
        if (prev === "ready") return prev;
        return data.session ? "ready" : "invalid";
      });
    });
    const t = setTimeout(() => {
      setReady((prev) => (prev === "checking" ? "invalid" : prev));
    }, 1500);
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
                  ? "Link inválido ou expirado."
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
              <Button variant="outline" className="w-full" onClick={() => navigate("/auth")}>
                Voltar para o login
              </Button>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
