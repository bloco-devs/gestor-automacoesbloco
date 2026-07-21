# Design System

## Índice
- [Paleta](#paleta)
- [Tipografia](#tipografia)
- [Tokens](#tokens)
- [Espaçamento](#espaçamento)
- [Componentes](#componentes)
- [Dark Mode](#dark-mode)
- [Boas práticas](#boas-práticas)

## Paleta
Cores oficiais Bloco:
| Cor | Hex | Uso |
| --- | --- | --- |
| Preto profundo | `#0C0C0C` | Texto principal, fundo dark |
| Areia clara | `#E5E3DF` | Fundo light |
| Marrom suave | `#8B796D` | Secundário |
| Amarelo | `#FFDA5B` | Destaque, CTA |

Todas expostas como tokens HSL em `src/index.css` (`--background`, `--foreground`, `--primary`, `--secondary`, ...).

Etiquetas do módulo Atividades usam paleta oficial **Trello** (`TRELLO_HEX` em `src/lib/atividades.ts`) com `readableTextOn` para contraste automático e `colunaAccent` para tons pastel opacos.

## Tipografia
- Fonte da marca: `NewBlackTypeface` (7 pesos: 200–800), aplicada via `.font-brand`.
- Fallback: `system-ui, sans-serif`.
- Corpo padrão: pesos 400/500; títulos: 600/700; hero: 800.

## Tokens
Semânticos, sempre via classes utilitárias Tailwind:
- Superfície: `bg-background`, `bg-card`, `bg-popover`, `bg-muted`, `bg-sidebar`.
- Texto: `text-foreground`, `text-muted-foreground`, `text-card-foreground`.
- Ação: `bg-primary`, `text-primary-foreground`, `bg-destructive`.
- Bordas/estados: `border`, `ring`, `input`.

**Nunca** usar cores literais (`bg-white`, `text-black`, `bg-[#...]`) fora dos tokens.

## Espaçamento
- Escala Tailwind padrão (4 px base).
- Cards de conteúdo com `rounded-2xl` + `shadow-sm`.
- Container principal com `container mx-auto px-4 md:px-6`.

## Componentes
- **shadcn/ui**: 48 componentes em `src/components/ui/` (accordion, alert, avatar, badge, breadcrumb, button, calendar, card, carousel, chart, checkbox, collapsible, command, context-menu, dialog, drawer, dropdown-menu, form, hover-card, input, input-otp, label, menubar, navigation-menu, pagination, popover, progress, radio-group, resizable, scroll-area, select, separator, sheet, sidebar, skeleton, slider, sonner, switch, table, tabs, textarea, toast, toaster, toggle, toggle-group, tooltip, aspect-ratio).
- **UX kit proprietário**: `DataSourceBadge`, `EmptyState`, `ListState`, `FieldHelp`, `ScorePill`, `StatusBadge`, `StatusTimeline`.

## Dark Mode
- Toggle via `ThemeToggle` (`next-themes`).
- Todas as cores mudam via classes `dark:` gerenciadas por tokens.
- Cards do Kanban têm fundo branco fixo (`#ffffff`) intencional para contraste sobre colunas coloridas.

## Boas práticas
- Componentes ≤ 300 linhas; extrair subcomponentes.
- Reaproveitar `EmptyState`/`ListState` para estados vazios/erro.
- Scrollbar global minimalista (10 px, thumb translúcido).
- Toasts via `sonner` para operações rápidas; `toaster` para diálogos ricos.
