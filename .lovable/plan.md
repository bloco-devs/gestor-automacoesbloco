## Problema
No `AppLayout.tsx`, os botões de ocultar/mostrar a sidebar (`PanelLeftClose` dentro da `aside` e `PanelLeftOpen` flutuante no `main`) estão com a classe `hidden md:flex`, ou seja, só aparecem em telas ≥ 768px. No mobile (<768px), a `aside` já está oculta (`hidden md:flex`) e existe um header próprio (`md:hidden`), mas nada permite alternar a navegação lateral — o usuário só vê a barra horizontal de chips.

## Plano (apenas UI, sem mexer em lógica)
Editar `src/components/AppLayout.tsx`:

1. **Adicionar botão hambúrguer no header mobile** (`<header className="md:hidden ...">`), ao lado do logo, que alterna `sidebarHidden`.
2. **Quando `!sidebarHidden` em mobile**, renderizar a `aside` como **drawer/overlay**:
   - Remover o `hidden md:flex` fixo; usar classe condicional para mobile: posição `fixed inset-y-0 left-0 z-50 w-72` com `flex` quando aberta, `hidden` quando fechada.
   - Em desktop (`md:`) manter o comportamento atual (sidebar fixa com largura redimensionável, controlada pelo botão `PanelLeftClose`).
   - Adicionar backdrop (`fixed inset-0 bg-black/40 z-40 md:hidden`) clicável que fecha a sidebar.
3. **Estado inicial em mobile**: manter `sidebarHidden` como hoje, mas garantir que ao navegar (clicar num `NavLink`) a sidebar feche automaticamente em telas <768px (usar `useIsMobile` que já existe em `src/hooks/use-mobile.tsx`).
4. **Botão de fechar dentro da sidebar mobile**: reaproveitar o `PanelLeftClose` no canto superior direito, trocando `hidden md:flex` por `flex` (visível em ambos), só mudando ícone/comportamento mínimo.
5. Manter a barra de chips horizontal `md:hidden` como fallback secundário (ou removê-la? — proponho **mantê-la**, pois é navegação rápida e não conflita).

## Arquivos
- `src/components/AppLayout.tsx` (única alteração).

## Pergunta rápida
Prefere que no mobile a sidebar abra como **drawer sobreposto com backdrop** (recomendado, padrão de apps) ou que simplesmente **empurre o conteúdo** como no desktop?
