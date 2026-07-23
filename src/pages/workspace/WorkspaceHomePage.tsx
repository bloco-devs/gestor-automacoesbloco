import { WorkspaceShell } from "@/modules/workspace-unified";
import DeveloperWorkspace from "@/pages/DeveloperWorkspace";

/**
 * Hoje — Home do desenvolvedor.
 * Reutiliza o layout de 3 colunas já existente (`DeveloperWorkspace`) como
 * "Hoje" dentro do shell unificado. Nenhuma lógica nova.
 * O Copilot embutido no shell substitui a coluna direita — para evitar
 * duplicidade, escondemos o painel lateral do shell aqui (o DeveloperWorkspace
 * já traz seu próprio painel inteligente).
 */
export default function WorkspaceHomePage() {
  return (
    <WorkspaceShell hideCopilot>
      <DeveloperWorkspace />
    </WorkspaceShell>
  );
}
