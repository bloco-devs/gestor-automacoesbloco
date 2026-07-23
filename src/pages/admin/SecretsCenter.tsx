import { useMemo } from "react";
import { KeyRound } from "lucide-react";
import { PageShell, PageHeader, Section } from "@/design-system";
import { Badge } from "@/components/ui/badge";

type Status = "configured" | "missing" | "invalid";

interface Row {
  key: string;
  label: string;
  status: Status;
  hint: string;
}

const TONE: Record<Status, "default" | "secondary" | "destructive" | "outline"> = {
  configured: "default",
  missing: "destructive",
  invalid: "secondary",
};

const LABEL: Record<Status, string> = {
  configured: "Configurado",
  missing: "Ausente",
  invalid: "Inválido",
};

function has(name: string): Status {
  const env = (import.meta as unknown as { env?: Record<string, string | undefined> }).env ?? {};
  const v = env[name];
  if (!v) return "missing";
  if (v.length < 6) return "invalid";
  return "configured";
}

export default function SecretsCenterPage() {
  const rows = useMemo<Row[]>(
    () => [
      { key: "VITE_SUPABASE_URL", label: "Supabase URL", status: has("VITE_SUPABASE_URL"), hint: "Base URL do projeto Supabase" },
      { key: "VITE_SUPABASE_PUBLISHABLE_KEY", label: "Supabase Anon Key", status: has("VITE_SUPABASE_PUBLISHABLE_KEY"), hint: "Chave publicável" },
      { key: "OPENAI_API_KEY", label: "OpenAI", status: "missing", hint: "Backend somente (edge functions)" },
      { key: "ANTHROPIC_API_KEY", label: "Anthropic", status: "missing", hint: "Backend somente" },
      { key: "GOOGLE_API_KEY", label: "Google (Gemini)", status: "missing", hint: "Backend somente" },
      { key: "GITHUB_TOKEN", label: "GitHub", status: "missing", hint: "Opcional" },
      { key: "WEBHOOK_SIGNING_SECRET", label: "Webhook Signing", status: "missing", hint: "Backend somente" },
      { key: "SUPABASE_STORAGE_URL", label: "Storage", status: has("VITE_SUPABASE_URL"), hint: "Herdado do Supabase URL" },
      { key: "SUPABASE_REALTIME", label: "Realtime", status: has("VITE_SUPABASE_URL"), hint: "Herdado do Supabase URL" },
    ],
    [],
  );

  return (
    <PageShell>
      <PageHeader
        title="Secrets & Environment"
        subtitle="Somente leitura. Valores nunca são exibidos — apenas o status de configuração."
        icon={<KeyRound className="h-6 w-6" />}
      />

      <Section>
        <ul className="divide-y rounded-xl border bg-card">
          {rows.map((r) => (
            <li key={r.key} className="p-3 flex items-center gap-3">
              <div className="flex-1 min-w-0">
                <div className="font-mono text-sm truncate">{r.key}</div>
                <div className="text-xs text-muted-foreground">{r.label} · {r.hint}</div>
              </div>
              <Badge variant={TONE[r.status]}>{LABEL[r.status]}</Badge>
            </li>
          ))}
        </ul>
      </Section>
    </PageShell>
  );
}
