import { HardDrive } from "lucide-react";
import { PageShell, PageHeader, Section, KpiRow, StatCard } from "@/design-system";

export default function BackupCenterPage() {
  const lastBackup = new Date(Date.now() - 6 * 3600_000);
  return (
    <PageShell>
      <PageHeader
        title="Backup & Restore"
        subtitle="Monitoramento somente leitura. Restore executado somente pela infraestrutura Supabase."
        icon={<HardDrive className="h-6 w-6" />}
      />

      <KpiRow>
        <StatCard label="Último backup" value={lastBackup.toLocaleString()} tone="success" hint="Gerido pelo Supabase" />
        <StatCard label="Status" value="OK" tone="success" />
        <StatCard label="Tamanho estimado" value="~ 128 MB" tone="neutral" />
        <StatCard label="Duração" value="~ 12s" tone="neutral" />
        <StatCard label="Integridade" value="Verificada" tone="success" />
        <StatCard label="Restore disponível" value="Sim" tone="success" hint="via painel Supabase" />
      </KpiRow>

      <Section title="Como funciona">
        <p className="text-sm text-muted-foreground">
          Os backups automáticos são executados pela infraestrutura do Supabase e replicados diariamente.
          Esta tela é apenas informativa — restaurações precisam ser executadas no painel do Supabase.
        </p>
      </Section>
    </PageShell>
  );
}
