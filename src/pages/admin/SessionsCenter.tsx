import { useMemo } from "react";
import { Users } from "lucide-react";
import { PageShell, PageHeader, Section, EmptyPanel, KpiRow, StatCard } from "@/design-system";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/useAuth";

function detectOS(): string {
  if (typeof navigator === "undefined") return "—";
  const ua = navigator.userAgent;
  if (/Windows/i.test(ua)) return "Windows";
  if (/Mac OS/i.test(ua)) return "macOS";
  if (/Linux/i.test(ua)) return "Linux";
  if (/Android/i.test(ua)) return "Android";
  if (/iPhone|iPad|iOS/i.test(ua)) return "iOS";
  return "Desconhecido";
}

function detectBrowser(): string {
  if (typeof navigator === "undefined") return "—";
  const ua = navigator.userAgent;
  if (/Edg\//.test(ua)) return "Edge";
  if (/Chrome\//.test(ua)) return "Chrome";
  if (/Firefox\//.test(ua)) return "Firefox";
  if (/Safari\//.test(ua)) return "Safari";
  return "Outro";
}

export default function SessionsCenterPage() {
  const { user, session } = useAuth();
  const startedAt = useMemo(() => (session ? new Date().toISOString() : null), [session]);

  return (
    <PageShell>
      <PageHeader
        title="Session Center"
        subtitle="Sessão ativa do usuário — visão somente leitura no navegador atual."
        icon={<Users className="h-6 w-6" />}
      />

      <KpiRow>
        <StatCard label="Sessões locais" value={session ? "1" : "0"} tone="neutral" />
        <StatCard label="Browser" value={detectBrowser()} tone="neutral" />
        <StatCard label="Sistema" value={detectOS()} tone="neutral" />
        <StatCard label="IP" value="•••.•••.•••.•••" hint="mascarado" tone="neutral" />
      </KpiRow>

      <Section title="Sessão atual">
        {!user ? (
          <EmptyPanel title="Sem sessão" description="Nenhum usuário autenticado neste navegador." />
        ) : (
          <ul className="divide-y rounded-xl border bg-card">
            <li className="p-3 flex items-center gap-3">
              <div className="flex-1 min-w-0">
                <div className="font-medium truncate">{user.email ?? user.id}</div>
                <div className="text-xs text-muted-foreground">
                  Iniciada em {startedAt ? new Date(startedAt).toLocaleString() : "—"}
                </div>
              </div>
              <Badge variant="outline" className="text-[10px]">{user.role ?? "sem papel"}</Badge>
            </li>
          </ul>
        )}
        <p className="text-xs text-muted-foreground mt-2">
          Logout remoto e timeout são geridos pelo Supabase Auth — sem alteração de backend nesta feature.
        </p>
      </Section>
    </PageShell>
  );
}
