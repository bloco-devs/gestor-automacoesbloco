import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Eye, EyeOff } from "lucide-react";
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

const passwordSchema = z
  .string()
  .min(8, "Mínimo 8 caracteres")
  .max(128, "Máximo 128 caracteres")
  .regex(/[A-Z]/, "Inclua ao menos 1 letra maiúscula")
  .regex(/[a-z]/, "Inclua ao menos 1 letra minúscula")
  .regex(/[0-9]/, "Inclua ao menos 1 número")
  .regex(/[^A-Za-z0-9]/, "Inclua ao menos 1 caractere especial");

const schema = z
  .object({
    senha: passwordSchema,
    confirmar: z.string(),
  })
  .refine((d) => d.senha === d.confirmar, {
    message: "As senhas não coincidem",
    path: ["confirmar"],
  });

type ReadyState =
  | { kind: "checking" }
  | { kind: "ready" }
  | { kind: "invalid"; message: string; email?: string };

function parseHash(hash: string): Record<string, string> {
  const out: Record<string, string> = {};
  const h = hash.startsWith("#") ? hash.slice(1) : hash;
  if (!h) return out;
  for (const part of h.split("&")) {
    const [k, v] = part.split("=");
    if (k) out[decodeURIComponent(k)] = decodeURIComponent(v ?? "");
  }
  return out;
}

function strengthScore(pw: string): number {
  let s = 0;
  if (pw.length >= 8) s++;
  if (pw.length >= 12) s++;
  if (/[A-Z]/.test(pw) && /[a-z]/.test(pw)) s++;
  if (/[0-9]/.test(pw)) s++;
  if (/[^A-Za-z0-9]/.test(pw)) s++;
  return Math.min(s, 4);
}

const strengthLabels = ["Muito fraca", "Fraca", "Média", "Boa", "Forte"];
const strengthColors = [
  "bg-destructive",
  "bg-destructive",
  "bg-yellow-500",
  "bg-emerald-500",
  "bg-emerald-600",
];

export default function RedefinirSenha() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [state, setState] = useState<ReadyState>({ kind: "checking" });
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({ senha: "", confirmar: "" });
  const [showSenha, setShowSenha] = useState(false);
  const [showConfirmar, setShowConfirmar] = useState(false);
  const [recoveryEmail, setRecoveryEmail] = useState<string | undefined>();

  useEffect(() => {
    let cancelled = false;

    const sub = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "PASSWORD_RECOVERY" && session) {
        if (!cancelled) {
          setRecoveryEmail(session.user.email ?? undefined);
          setState({ kind: "ready" });
        }
      }
    });

    async function run() {
      const url = new URL(window.location.href);
      const code = url.searchParams.get("code");
      const errorParam = url.searchParams.get("error") || url.searchParams.get("error_code");
      const errorDescription = url.searchParams.get("error_description");

      // Erro vindo do Supabase (link expirado, já usado, etc.)
      if (errorParam) {
        if (!cancelled) {
          setState({
            kind: "invalid",
            message:
              errorDescription?.replace(/\+/g, " ") ||
              "O link de recuperação é inválido ou expirou.",
          });
        }
        return;
      }

      // Fluxo PKCE: ?code=...
      if (code) {
        const { data, error } = await supabase.auth.exchangeCodeForSession(code);
        // Limpa a URL para evitar reprocessamento
        window.history.replaceState({}, "", url.pathname);
        if (cancelled) return;
        if (error || !data.session) {
          setState({
            kind: "invalid",
            message:
              error?.message ||
              "Não foi possível validar o link de recuperação. Ele pode ter expirado ou já ter sido usado.",
          });
          return;
        }
        setRecoveryEmail(data.session.user.email ?? undefined);
        setState({ kind: "ready" });
        return;
      }

      // Fluxo implícito legado: #access_token=...&type=recovery
      const hash = parseHash(window.location.hash);
      if (hash.access_token && hash.type === "recovery") {
        const { data, error } = await supabase.auth.setSession({
          access_token: hash.access_token,
          refresh_token: hash.refresh_token ?? "",
        });
        window.history.replaceState({}, "", url.pathname);
        if (cancelled) return;
        if (error || !data.session) {
          setState({
            kind: "invalid",
            message:
              error?.message ||
              "Link de recuperação inválido. Solicite um novo e-mail.",
          });
          return;
        }
        setRecoveryEmail(data.session.user.email ?? undefined);
        setState({ kind: "ready" });
        return;
      }

      // Sem code/hash: pode ser que o evento PASSWORD_RECOVERY ainda vá chegar.
      // Aguarda brevemente; se nada acontecer, marca como inválido.
      const { data } = await supabase.auth.getSession();
      if (cancelled) return;
      if (data.session) {
        // Já há sessão — provavelmente recovery em andamento
        setRecoveryEmail(data.session.user.email ?? undefined);
        setState({ kind: "ready" });
        return;
      }
      setTimeout(() => {
        if (cancelled) return;
        setState((prev) =>
          prev.kind === "checking"
            ? {
                kind: "invalid",
                message:
                  "Link de recuperação inválido ou expirado. Solicite um novo e-mail.",
              }
            : prev,
        );
      }, 2500);
    }

    run();

    return () => {
      cancelled = true;
      sub.data.subscription.unsubscribe();
    };
  }, []);

  const score = useMemo(() => strengthScore(form.senha), [form.senha]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      const v = schema.parse(form);
      const { error } = await supabase.auth.updateUser({ password: v.senha });
      if (error) throw error;
      await supabase.auth.signOut();
      toast({
        title: "Senha atualizada",
        description: "Use sua nova senha para entrar.",
      });
      navigate("/auth", { replace: true });
    } catch (err) {
      const msg =
        err instanceof z.ZodError
          ? err.issues[0].message
          : err instanceof Error
            ? err.message
            : "Erro ao atualizar a senha.";
      toast({
        title: "Não foi possível atualizar",
        description: msg,
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  }

  function reenviar() {
    const email = recoveryEmail || (state.kind === "invalid" ? state.email : undefined);
    const qs = new URLSearchParams({ recover: "1" });
    if (email) qs.set("email", email);
    navigate(`/auth?${qs.toString()}`, { replace: true });
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
              {state.kind === "ready"
                ? recoveryEmail
                  ? `Defina uma nova senha para ${recoveryEmail}.`
                  : "Defina sua nova senha de acesso."
                : state.kind === "invalid"
                  ? state.message
                  : "Validando link de recuperação..."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {state.kind === "ready" && (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label htmlFor="senha">Nova senha</Label>
                  <div className="relative">
                    <Input
                      id="senha"
                      type={showSenha ? "text" : "password"}
                      value={form.senha}
                      onChange={(e) => setForm({ ...form, senha: e.target.value })}
                      autoComplete="new-password"
                      className="pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowSenha((v) => !v)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      aria-label={showSenha ? "Ocultar senha" : "Mostrar senha"}
                    >
                      {showSenha ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                    </button>
                  </div>
                  {form.senha && (
                    <div className="mt-2 space-y-1">
                      <div className="flex gap-1">
                        {[0, 1, 2, 3].map((i) => (
                          <div
                            key={i}
                            className={`h-1 flex-1 rounded ${
                              i < score ? strengthColors[score] : "bg-muted"
                            }`}
                          />
                        ))}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Força: {strengthLabels[score]}
                      </p>
                    </div>
                  )}
                  <p className="mt-2 text-xs text-muted-foreground">
                    Mín. 8 caracteres, com maiúscula, minúscula, número e símbolo.
                  </p>
                </div>
                <div>
                  <Label htmlFor="confirmar">Confirmar senha</Label>
                  <div className="relative">
                    <Input
                      id="confirmar"
                      type={showConfirmar ? "text" : "password"}
                      value={form.confirmar}
                      onChange={(e) => setForm({ ...form, confirmar: e.target.value })}
                      autoComplete="new-password"
                      className="pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmar((v) => !v)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      aria-label={showConfirmar ? "Ocultar senha" : "Mostrar senha"}
                    >
                      {showConfirmar ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                    </button>
                  </div>
                </div>
                <Button type="submit" className="w-full" disabled={submitting}>
                  {submitting ? "Aguarde..." : "Atualizar senha"}
                </Button>
              </form>
            )}
            {state.kind === "invalid" && (
              <div className="space-y-3">
                <Button className="w-full" onClick={reenviar}>
                  Solicitar novo link
                </Button>
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => navigate("/auth", { replace: true })}
                >
                  Voltar para o login
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
