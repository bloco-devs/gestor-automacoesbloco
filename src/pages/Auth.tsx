import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { z } from "zod";
import { useAuth } from "@/hooks/useAuth";
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

const signInSchema = z.object({
  email: z.string().trim().email("Email inválido").max(255),
  senha: z.string().min(6, "Mínimo 6 caracteres").max(128),
});

export default function Auth() {
  const { signIn } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({ email: "", senha: "" });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      const v = signInSchema.parse({ email: form.email, senha: form.senha });
      const u = await signIn(v.email, v.senha);
      navigate(u.role === "developer" ? "/dashboard" : "/minhas-demandas");
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
            <p className="text-xs text-muted-foreground font-brand font-light">Gestão interna de demandas</p>
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
                <Label htmlFor="senha">Senha</Label>
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
    </div>
  );
}
