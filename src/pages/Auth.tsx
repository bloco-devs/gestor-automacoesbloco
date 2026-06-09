import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { z } from "zod";
import { useAuth } from "@/hooks/useAuth";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";

const signInSchema = z.object({
  email: z.string().trim().email("Email inválido").max(255),
  senha: z.string().min(6, "Mínimo 6 caracteres").max(128),
});

const resetSchema = z.object({
  email: z.string().trim().email("Email inválido").max(255),
});

export default function Auth() {
  const { signIn } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({ email: "", senha: "" });

  const [resetOpen, setResetOpen] = useState(false);
  const [resetEmail, setResetEmail] = useState("");
  const [resetSubmitting, setResetSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      const v = signInSchema.parse({ email: form.email, senha: form.senha });
      localStorage.removeItem("viewAsRole");
      const u = await signIn(v.email, v.senha);
      const dual = v.email.trim().toLowerCase() === "riccellycivil@gmail.com";
      if (dual) {
        navigate("/escolher-perfil");
      } else {
        navigate(u.role === "developer" ? "/dashboard" : "/minhas-solicitacoes");
      }
    } catch (err) {
      const msg =
        err instanceof z.ZodError
          ? err.issues[0].message
          : err instanceof Error
            ? err.message
            : "Erro";
      toast({
        title: "Não foi possível continuar",
        description: msg,
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  }

  async function handleReset(e: React.FormEvent) {
    e.preventDefault();
    setResetSubmitting(true);
    try {
      const v = resetSchema.parse({ email: resetEmail });
      const normalized = v.email.trim().toLowerCase();
      // allowlist check removed; reset only sends if user exists in auth
      const { error } = await supabase.auth.resetPasswordForEmail(normalized, {
        redirectTo: `${window.location.origin}/redefinir-senha`,
      });
      if (error) throw error;
      toast({
        title: "Verifique seu email",
        description: "Se o email for válido, enviaremos um link de recuperação.",
      });
      setResetOpen(false);
      setResetEmail("");
    } catch (err) {
      const msg =
        err instanceof z.ZodError
          ? err.issues[0].message
          : err instanceof Error
            ? err.message
            : "Erro";
      toast({ title: "Não foi possível enviar", description: msg, variant: "destructive" });
    } finally {
      setResetSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative">
      <div className="absolute top-4 right-4">
        <ThemeToggle />
      </div>
      <div className="w-full max-w-md">
        <div className="flex items-center gap-3 mb-8 justify-center">
          <img
            src={blocoLogo}
            alt="Bloco Construções"
            className="size-10 rounded-lg object-cover"
          />
          <div>
            <h1 className="text-base font-brand font-bold whitespace-nowrap">Gestor de Automações</h1>
          </div>
        </div>

        <Card className="surface-1">
          <CardHeader>
            <CardTitle className="text-lg">Acesse sua conta</CardTitle>
            <CardDescription>
              Entre com o login autorizado de desenvolvedor ou solicitante.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  autoComplete="email"
                />
              </div>
              <div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="senha">Senha</Label>
                  <button
                    type="button"
                    onClick={() => {
                      setResetEmail(form.email);
                      setResetOpen(true);
                    }}
                    className="text-xs text-primary hover:underline"
                  >
                    Esqueci minha senha
                  </button>
                </div>
                <Input
                  id="senha"
                  type="password"
                  value={form.senha}
                  onChange={(e) => setForm({ ...form, senha: e.target.value })}
                  autoComplete="current-password"
                />
              </div>
              <Button type="submit" className="w-full" disabled={submitting}>
                {submitting ? "Aguarde..." : "Entrar"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>

      <Dialog open={resetOpen} onOpenChange={setResetOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Recuperar senha</DialogTitle>
            <DialogDescription>
              Informe seu email autorizado e enviaremos um link para redefinir a senha.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleReset} className="space-y-4">
            <div>
              <Label htmlFor="reset-email">Email</Label>
              <Input
                id="reset-email"
                type="email"
                value={resetEmail}
                onChange={(e) => setResetEmail(e.target.value)}
                autoComplete="email"
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setResetOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={resetSubmitting}>
                {resetSubmitting ? "Enviando..." : "Enviar link"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
