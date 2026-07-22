# Portal do Solicitante v4 — Experiência Premium (FEATURE 010)

Data: 2026-07-22
Escopo: **UX/UI apenas**. Zero migrations, zero edge functions, zero mudanças em engines (IA/Workflow/Routing/Knowledge/Context) ou hooks (`useAIWorkspace`).

## O que muda visualmente
| # | Item                                    | Onde                                           |
|---|-----------------------------------------|------------------------------------------------|
| 1 | Conversa mais humana                    | `ChatContainer` + `ConversationInput` (reuso) |
| 2 | Assistente pensando (animação stepped)  | `ThinkingSteps.tsx` — fase `processing`       |
| 3 | Confirmação rica (prioridade/categoria/responsável/tempo) | `RichConfirmation.tsx` — fase `submitting`    |
| 4 | Timeline cards (ícone/hora/responsável) | `RequestStepper.tsx` reescrito                |
| 5 | Histórico estilo ChatGPT (busca + favoritos) | `Portal.tsx` + `useFavoriteDemands.ts`  |
| 6 | Busca Universal (chamados + artigos)    | `UniversalSearch.tsx` no topo                 |
| 7 | Central de Soluções (categorias Notion) | Preservado da v3 (`Portal.tsx`)               |
| 8 | Responsividade mobile-first             | Grids 1→2→3, sem scroll horizontal            |
| 9 | Microinterações (`animate-fade-in`, `hover-scale`, hover elevation) | Vários     |
| 10 | Empty/success states humanizados       | Portal + RichConfirmation                     |

## Arquivos novos
- `src/components/portal/ThinkingSteps.tsx`
- `src/components/portal/RichConfirmation.tsx`
- `src/components/portal/UniversalSearch.tsx`
- `src/components/portal/useFavoriteDemands.ts` — favoritos em `localStorage` (`portal:favorites:v1`)

## Arquivos alterados
- `src/components/portal/RequestStepper.tsx` — cards com ícone, descrição, hora e responsável derivados do `Demand`.
- `src/pages/Portal.tsx` — integra as novidades acima, histórico com busca e toggle Recentes/Favoritos.
- `src/pages/portal/RequestDetailModal.tsx` — passa `assigned_to` e `updated_at` ao Stepper.

## Reutilização e integrações preservadas
- Fluxo conversacional continua em `useAIWorkspace` (fases welcome → chatting → processing → preview → submitting).
- `PreviewPanel`, `KnowledgeSuggestions`, `useDemands`, `DemandTimeline` e `LanguageProvider` intocados.
- Favoritos são puramente client-side; nenhum contrato novo com backend.
- `UniversalSearch` reusa `useDemands` e um `select` já autorizado em `knowledge_articles`.

## Como testar
1. `/portal` — hero + busca universal + caixa grande + exemplos.
2. Digitar algo → enviar → observar `ThinkingSteps` durante processamento.
3. Confirmar no `PreviewPanel` → ver a **Confirmação Rica** antes do redirect.
4. Voltar ao Portal → favoritar chamados na lista, alternar aba Favoritos, pesquisar.
5. Abrir uma solicitação no modal → conferir a **linha do tempo** com ícones/responsável/hora.

## Verificações
- `bunx tsgo --noEmit` → limpo.
- Vitest inalterado (nenhum teste dependia dos componentes tocados).
