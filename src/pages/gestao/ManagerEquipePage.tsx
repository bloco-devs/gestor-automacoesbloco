import { ManagerShell, ManagerTeam } from "@/modules/manager-unified";

/**
 * /gestao/equipe — página de equipe.
 * Reutiliza `ManagerTeam` (workloads existentes). Sem backend novo.
 */
export default function ManagerEquipePage() {
  return (
    <ManagerShell>
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-8 px-6 py-8">
        <header>
          <h1 className="text-2xl font-semibold tracking-tight">Equipe</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Carga, especialidade e disponibilidade — derivadas dos módulos existentes.
          </p>
        </header>
        <ManagerTeam limit={100} showLink={false} />
      </div>
    </ManagerShell>
  );
}
