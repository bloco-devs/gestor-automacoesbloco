# Portal do Solicitante v3 — Experiência Completa (FEATURE 010)

Data: 2026-07-22
Escopo: **UX/UI apenas**. Sem alterações em banco, edge functions, engines de IA/Workflow/Routing ou hooks (`useAIWorkspace`, `intent`, `context`, `knowledge`).

## Objetivo
Transformar `/portal` em uma experiência estilo ChatGPT: o usuário apenas conversa e o resto acontece automaticamente. Zero jargão técnico, zero dashboards, zero tabelas.

## Arquivos alterados
- `src/pages/Portal.tsx` — Home reescrita (hero grande, caixa enorme com drag-and-drop, exemplos, histórico simplificado, categorias tipo Notion). A fase pós-envio (`submitting`) agora mostra a tela **"Perfeito."** antes do redirect.
- `src/pages/portal/RequestDetailModal.tsx` — Inclui a nova **Linha do tempo** visual antes das mensagens.

## Arquivos novos
- `src/components/portal/RequestStepper.tsx` — Timeline visual bonita (Solicitação → IA analisou → Responsável → Em desenvolvimento → Em testes → Concluído). Derivado do `status` da demanda.

## Blocos entregues (contra o brief)
| # | Item                                | Onde                                                 |
|---|-------------------------------------|------------------------------------------------------|
| 1 | Hero grande estilo ChatGPT          | `Portal.tsx` — header + textarea 160px, saudação    |
| 2 | Histórico simplificado ("Continue de onde parou") | `Portal.tsx` — status humanizado + bolinha color |
| 3 | Timeline bonita                     | `RequestStepper.tsx` no modal                        |
| 4 | Cards de solução grandes            | `Portal.tsx` — grid de artigos com CTA "Resolver agora" |
| 5 | Upload drag & drop grande           | `Portal.tsx` — dropzone + botão anexar              |
| 6 | Conversa (bolhas / streaming)       | Reutiliza `ChatContainer` / `ConversationInput`     |
| 7 | Pós envio "Perfeito."               | `Portal.tsx` — bloco durante `phase === 'submitting'` |
| 8 | Central de Soluções tipo Notion     | `Portal.tsx` — categorias em cards com ícone + tone |
| 9 | Empty states humanizados            | "Você ainda não possui solicitações. …conversar comigo. 😊" |
| 10 | Mobile OK                          | Grids 1→2→3 col, sem overflow horizontal            |

## Integrações preservadas
- `useAIWorkspace` continua sendo a única fonte da conversa (fases, mensagens, preview, confirm).
- `KnowledgeSuggestions` mantido no fluxo principal para deflexão.
- `useDemands` continua alimentando o histórico (RLS respeitado).
- Modal detalhado continua usando `DemandTimeline` (comentários/notas com regras atuais).

## Notas
- A saudação (`Bom dia`/`Boa tarde`/`Boa noite`) é derivada localmente de `new Date().getHours()`.
- O bloco "Perfeito." aparece antes do redirect implementado dentro do hook (`navigate("/minhas-solicitacoes")` continua o comportamento oficial).
- Categorias da Central são **rótulos visuais** de UX: clicar aplica o texto na busca de artigos, sem contrato novo.

## Verificações
- Typecheck limpo (`bun run typecheck`).
- Vitest suite existente (`bun run test`) verde — nada relacionado ao Portal foi tocado do lado de negócio.
