import { PortalShell, PortalDemandsList } from "@/modules/portal-unified";

export default function PortalDemandasPage() {
  return (
    <PortalShell>
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">Minhas Demandas</h1>
        <p className="text-sm text-muted-foreground">
          Acompanhe o andamento de tudo o que você abriu.
        </p>
      </header>
      <PortalDemandsList />
    </PortalShell>
  );
}
