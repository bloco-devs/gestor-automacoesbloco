import { Link } from "react-router-dom";
import {
  Activity,
  BarChart3,
  BookOpen,
  Boxes,
  Cog,
  FileWarning,
  Inbox,
  LayoutDashboard,
  ListChecks,
  Radar,
  ShieldCheck,
  Sparkles,
  Users,
  Webhook,
  Workflow,
} from "lucide-react";
import { PageShell, PageHeader, Section } from "@/design-system";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useFeatureFlags, ALL_FLAGS } from "@/hooks/useFeatureFlags";

type Group = {
  title: string;
  items: Array<{
    label: string;
    description: string;
    href: string;
    icon: typeof Cog;
    badge?: string;
  }>;
};

const GROUPS: Group[] = [
  {
    title: "Operação",
    items: [
      { label: "Dashboard Admin", description: "Visão consolidada de tickets e SLA.", href: "/admin/dashboard", icon: LayoutDashboard },
      { label: "Board de Demandas", description: "Kanban gerencial em tempo real.", href: "/admin/demandas", icon: Inbox },
      { label: "Command Center", description: "Sala de operações central.", href: "/command-center", icon: Radar, badge: "Live" },
    ],
  },
  {
    title: "Insights",
    items: [
      { label: "Centro de Saúde", description: "Status de todas as camadas.", href: "/admin/saude", icon: Activity, badge: "Novo" },
      { label: "Analytics", description: "Volumes, SLA e tendências.", href: "/admin/analytics", icon: BarChart3, badge: "Novo" },
      { label: "Observabilidade IA", description: "Uso, custo e erros da IA.", href: "/observabilidade-ia", icon: Sparkles },
    ],
  },
  {
    title: "Automação",
    items: [
      { label: "Workflows", description: "Editor visual de automações.", href: "/admin/workflows", icon: Workflow },
      { label: "Execuções", description: "Logs de execução do runtime.", href: "/admin/workflows/execucoes", icon: ListChecks },
      { label: "Webhooks", description: "Integrações de saída.", href: "/admin/configuracoes/webhooks", icon: Webhook },
    ],
  },
  {
    title: "Configuração",
    items: [
      { label: "SLA", description: "Políticas de tempo de atendimento.", href: "/admin/configuracoes/sla", icon: ShieldCheck },
      { label: "Base de Conhecimento", description: "Artigos e deflexão.", href: "/admin/base-conhecimento", icon: BookOpen },
      { label: "Ecossistema", description: "Catálogo de sistemas.", href: "/ecossistema", icon: Boxes, badge: "Novo" },
      { label: "Configurações", description: "Plataformas, setores, personas.", href: "/configuracoes", icon: Cog },
      { label: "Perfis & Papéis", description: "Gestão de acesso.", href: "/configuracoes#perfis", icon: Users },
      { label: "Consolidação", description: "Duplicatas e mesclagem.", href: "/consolidacao", icon: FileWarning },
    ],
  },
];

export default function AdminHub() {
  const { flags, setFlag } = useFeatureFlags();

  return (
    <PageShell>
      <PageHeader
        title="Centro Administrativo"
        subtitle="Ponto único para operação, insights, automação e configuração."
      />

      {GROUPS.map((g) => (
        <Section key={g.title} title={g.title}>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {g.items.map((it) => {
              const Icon = it.icon;
              return (
                <Card key={it.href} className="surface-1 hover:shadow-md transition-shadow">
                  <Link to={it.href} className="block h-full">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium flex items-center justify-between gap-2">
                        <span className="flex items-center gap-2">
                          <Icon className="h-4 w-4 text-primary" aria-hidden />
                          {it.label}
                        </span>
                        {it.badge && <Badge variant="secondary" className="text-[10px]">{it.badge}</Badge>}
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-xs text-muted-foreground">{it.description}</p>
                    </CardContent>
                  </Link>
                </Card>
              );
            })}
          </div>
        </Section>
      ))}

      <Section title="Feature flags" description="Controles locais (por navegador). Não afetam outros usuários.">
        <Card className="surface-1">
          <CardContent className="pt-6 grid gap-4 sm:grid-cols-2">
            {ALL_FLAGS.map((f) => (
              <div key={f.key} className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <Label htmlFor={`flag-${f.key}`} className="text-sm font-medium">{f.label}</Label>
                  <p className="text-xs text-muted-foreground mt-0.5">{f.description}</p>
                </div>
                <Switch
                  id={`flag-${f.key}`}
                  checked={flags[f.key] ?? f.defaultValue}
                  onCheckedChange={(v) => setFlag(f.key, v)}
                />
              </div>
            ))}
          </CardContent>
        </Card>
      </Section>
    </PageShell>
  );
}
