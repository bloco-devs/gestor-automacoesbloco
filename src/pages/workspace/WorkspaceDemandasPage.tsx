import { lazy, Suspense } from "react";
import { useParams } from "react-router-dom";
import { WorkspaceShell } from "@/modules/workspace-unified";
import { SelecaoDeProjetos } from "@/modules/workspace-demandas/components/SelecaoDeProjetos";
import { BlinkCarregando } from "@/components/blink/BlinkCarregando";

const WorkspaceDemandas = lazy(() => import("@/modules/workspace-demandas/WorkspaceDemandas"));

/**
 * O fluxo, em duas rotas: **Demandas → Projeto → Lente**.
 *
 *   /workspace/demandas             → a seleção de projetos
 *   /workspace/demandas/:projetoId  → as cinco lentes sobre o mesmo conjunto
 *
 * Antes havia um atalho: com um único projeto, a seleção se pulava sozinha.
 * Ele saiu de propósito. Pular a etapa esconde que "projeto" é um nível real
 * do produto — e o dia em que aparece o segundo projeto, o usuário descobre um
 * nível de navegação que ele nunca soube que existia.
 *
 * A troca rápida de projeto continua a um clique, no `⌄` do header.
 */
export default function WorkspaceDemandasPage() {
  const { projetoId } = useParams<{ projetoId: string }>();

  return (
    <WorkspaceShell>
      <Suspense
        fallback={
          <div className="flex h-full items-center justify-center py-16">
            <BlinkCarregando mensagem="Carregando…" />
          </div>
        }>
        {projetoId ? <WorkspaceDemandas /> : <SelecaoDeProjetos />}
      </Suspense>
    </WorkspaceShell>
  );
}
