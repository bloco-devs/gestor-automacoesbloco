import {
  ManagerShell,
  ManagerOverview,
  ManagerQueue,
  ManagerTeam,
  ManagerRisks,
} from "@/modules/manager-unified";

/**
 * /gestao/panorama — Home única do Gestor.
 * Responde: "O que precisa da minha atenção agora?"
 * Zero KPI grid, zero dashboard. Composição de 4 seções essenciais.
 */
export default function ManagerPanoramaPage() {
  return (
    <ManagerShell>
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-8 px-6 py-8">
        <header>
          <h1 className="text-2xl font-semibold tracking-tight">Panorama</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Sua operação em uma visão. Foque no que precisa de atenção agora.
          </p>
        </header>

        <ManagerOverview />
        <ManagerQueue />
        <ManagerTeam />
        <ManagerRisks />
      </div>
    </ManagerShell>
  );
}
