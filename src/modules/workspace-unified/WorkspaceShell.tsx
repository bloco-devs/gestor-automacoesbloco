import type { ReactNode } from "react";

/**
 * Shell do Workspace.
 *
 * O QUE ELE DEIXOU DE FAZER — e por quê
 *
 * 1. A barra de abas `Hoje · Demandas · Builder · DevTools`.
 *    Ela repetia, com os mesmos rótulos e os mesmos ícones, os quatro
 *    primeiros itens da sidebar — que fica 200px à esquerda, sempre visível.
 *    Eram 44px de altura gastos para mostrar ao usuário uma segunda cópia do
 *    menu. Navegação duplicada não é redundância útil: é uma pergunta a mais
 *    ("são a mesma coisa?") e um lugar a mais para divergirem.
 *
 * 2. O `WorkspaceCopilotPanel` de 340–380px.
 *    Era o segundo painel lateral. Em tela larga ele dividia a direita com o
 *    Copiloto analítico de Demandas, e ainda havia o dock flutuante por cima.
 *    Três coisas com o mesmo nome garantem que se clique na errada.
 *
 * O que sobrou é o mínimo honesto: uma caixa que ocupa a altura disponível
 * abaixo do header global e entrega tudo para a página. Manter o componente
 * (em vez de apagá-lo) preserva esse contrato de altura, do qual as quatro
 * páginas dependem para não criar rolagem dupla.
 */
export function WorkspaceShell({
  children,
}: {
  children: ReactNode;
  /** @deprecated O painel lateral saiu; a prop fica para não quebrar chamadas. */
  hideCopilot?: boolean;
}) {
  return (
    <div className="flex h-[calc(100vh-var(--app-header-h,2.5rem))] w-full min-h-0 flex-col">
      <main className="min-h-0 min-w-0 flex-1 overflow-hidden">{children}</main>
    </div>
  );
}
