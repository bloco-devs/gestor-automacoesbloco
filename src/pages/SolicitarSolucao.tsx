import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { z } from "zod";
import { ArrowLeft, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { SiteHeader } from "@/components/SiteHeader";
import { useAuth } from "@/hooks/useAuth";
import { submitPublicSolicitacao } from "@/lib/supabaseData";

const schema = z.object({
  nome: z
    .string()
    .trim()
    .min(2, "Informe seu nome completo")
    .max(120, "Nome muito longo"),
  email: z
    .string()
    .trim()
    .email("E-mail inválido")
    .max(255, "E-mail muito longo"),
  telefone: z
    .string()
    .trim()
    .min(8, "Telefone inválido")
    .max(20, "Telefone muito longo")
    .regex(/^[0-9()+\-\s]+$/, "Use apenas números e ( ) + -"),
  descricao: z
    .string()
    .trim()
    .min(20, "Descreva o projeto com mais detalhes (mín. 20 caracteres)")
    .max(2000, "Descrição muito longa"),
});

type FormState = z.infer<typeof schema>;

const initialState: FormState = {
  nome: "",
  email: "",
  telefone: "",
  descricao: "",
};

export default function SolicitarSolucao() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { session, loading } = useAuth();
  const [form, setForm] = useState<FormState>(initialState);
  const [errors, setErrors] = useState<Partial<Record<keyof FormState, string>>>({});
  const [submitting, setSubmitting] = useState(false);

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((s) => ({ ...s, [key]: value }));
    if (errors[key]) setErrors((e) => ({ ...e, [key]: undefined }));
  }

  function maskTelefone(v: string) {
    const digits = v.replace(/\D/g, "").slice(0, 11);
    if (digits.length <= 10) {
      return digits
        .replace(/(\d{2})(\d)/, "($1) $2")
        .replace(/(\d{4})(\d)/, "$1-$2");
    }
    return digits
      .replace(/(\d{2})(\d)/, "($1) $2")
      .replace(/(\d{5})(\d)/, "$1-$2");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!session) {
      toast({
        title: "Faça login para continuar",
        description: "Assim sua solicitação fica vinculada à sua conta com segurança.",
        variant: "destructive",
      });
      navigate("/auth");
      return;
    }

    const result = schema.safeParse(form);
    if (!result.success) {
      const fieldErrors: Partial<Record<keyof FormState, string>> = {};
      for (const issue of result.error.issues) {
        const key = issue.path[0] as keyof FormState;
        if (!fieldErrors[key]) fieldErrors[key] = issue.message;
      }
      setErrors(fieldErrors);
      toast({
        title: "Verifique os campos",
        description: "Alguns dados precisam de atenção.",
        variant: "destructive",
      });
      return;
    }

    try {
      setSubmitting(true);
      await submitPublicSolicitacao(result.data);
      toast({
        title: "Solicitação enviada",
        description: "Recebemos seu pedido. A equipe Bloco Construções entrará em contato em breve.",
      });
      setForm(initialState);
    } catch {
      toast({
        title: "Não foi possível enviar",
        description: "Tente novamente em instantes.",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="min-h-screen bg-background text-foreground">
      <SiteHeader />
      <div className="mx-auto max-w-2xl px-4 pt-24 pb-10 sm:pt-28 sm:pb-16">
        <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="mb-6">
          <ArrowLeft className="size-4" /> Voltar
        </Button>

        <header className="mb-8">
          <p className="text-xs uppercase tracking-[0.18em] text-accent font-medium">
            Bloco Construções
          </p>
          <h1 className="mt-2 text-3xl sm:text-4xl font-semibold text-balance">
            Solicite uma solução para o seu projeto
          </h1>
          <p className="mt-3 text-sm text-muted-foreground">
            Conte-nos sobre a sua necessidade. Nossa equipe avaliará e retornará com a melhor proposta.
          </p>
        </header>

        <Card className="surface-1">
          <CardHeader>
            <CardTitle className="text-base">Dados do solicitante</CardTitle>
            <CardDescription>
              Preencha os campos abaixo. Todas as informações são confidenciais.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-5" noValidate>
              <div className="space-y-2">
                <Label htmlFor="nome">Nome completo</Label>
                <Input
                  id="nome"
                  autoComplete="name"
                  value={form.nome}
                  onChange={(e) => update("nome", e.target.value)}
                  placeholder="Seu nome"
                  aria-invalid={!!errors.nome}
                />
                {errors.nome && <p className="text-xs text-destructive">{errors.nome}</p>}
              </div>

              <div className="grid gap-5 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="email">E-mail</Label>
                  <Input
                    id="email"
                    type="email"
                    autoComplete="email"
                    value={form.email}
                    onChange={(e) => update("email", e.target.value)}
                    placeholder="voce@empresa.com"
                    aria-invalid={!!errors.email}
                  />
                  {errors.email && <p className="text-xs text-destructive">{errors.email}</p>}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="telefone">Telefone</Label>
                  <Input
                    id="telefone"
                    type="tel"
                    inputMode="tel"
                    autoComplete="tel"
                    value={form.telefone}
                    onChange={(e) => update("telefone", maskTelefone(e.target.value))}
                    placeholder="(11) 90000-0000"
                    aria-invalid={!!errors.telefone}
                  />
                  {errors.telefone && (
                    <p className="text-xs text-destructive">{errors.telefone}</p>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="descricao">Descrição do projeto</Label>
                <Textarea
                  id="descricao"
                  rows={6}
                  value={form.descricao}
                  onChange={(e) => update("descricao", e.target.value)}
                  placeholder="Descreva o escopo, objetivos, prazos e qualquer detalhe relevante."
                  aria-invalid={!!errors.descricao}
                />
                <div className="flex items-center justify-between">
                  {errors.descricao ? (
                    <p className="text-xs text-destructive">{errors.descricao}</p>
                  ) : (
                    <p className="text-xs text-muted-foreground">
                      Quanto mais detalhes, melhor a proposta.
                    </p>
                  )}
                  <span className="text-xs tabular-nums text-muted-foreground">
                    {form.descricao.length}/2000
                  </span>
                </div>
              </div>

              <Button type="submit" className="w-full" disabled={submitting || loading}>
                <Send className="size-4" />
                {submitting ? "Enviando..." : "Enviar solicitação"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
