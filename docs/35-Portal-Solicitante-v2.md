# 35 — Portal do Solicitante v2 (Feature 010A)

Nova home do Portal em `/portal`, focada exclusivamente em usuários
**Solicitantes** (RH, Financeiro, Comercial, colaboradores em geral).

## Princípios

- Zero jargão técnico: nada de sprint, kanban, backlog, SLA, workflow, IA.
- Uma pergunta na tela: **"Como podemos ajudar você hoje?"**.
- A caixa de conversa é o herói absoluto — tudo mais é secundário.
- Sugestões e histórico existem, mas nunca competem com a conversa.
- Muito ar, tipografia grande, poucos cliques, cards arredondados.
  Inspirado em Linear/Notion/Apple/Stripe — sem copiar layouts.

## Hierarquia

1. **Boas-vindas** — saudação com o primeiro nome.
2. **Grande caixa de conversa** — textarea de 4 linhas, mic + anexo + enviar.
3. **Sugestões rápidas** — 4 cards grandes:
   Reportar um problema · Sugerir uma melhoria · Tirar uma dúvida · Pedir uma automação.
   Clicar apenas pré-preenche a caixa; a conversa segue igual.
4. **Minhas últimas solicitações** — máximo 5 itens, sem gráficos nem KPIs.
5. **Central de soluções** — busca + últimos artigos + chips de categorias,
   no rodapé. Link "Explorar tudo" leva a `/portal/central`.

## Componentes reutilizados

Nenhum recurso novo de backend, edge function, tabela ou RPC.

| Camada | Recurso |
|---|---|
| Conversa | `useAIWorkspace`, `ChatContainer`, `ConversationInput`, `ConversationFooter`, `PreviewPanel` |
| Sugestões passivas | `KnowledgeSuggestions` (módulo Knowledge) |
| Histórico | `useDemands` + `STATUS_COLUMNS` (módulo Demands) |
| Base de conhecimento | tabela `knowledge_articles` (read-only) |
| Voz | Web Speech API (fallback silencioso) |

## Experiência

- **Etapa 1 — Home:** caixa central + sugestões + histórico + KB.
  Enter envia, Shift+Enter quebra linha. Focus automático na textarea.
- **Etapa 2 — Conversa:** entra no fluxo do AI Workspace já existente
  (`phase !== "welcome"`). Mesma classificação, mesmo preview, mesmo submit.
- **Etapa 3 — Preview:** `PreviewPanel` inalterado, com revisão e confirmação.

## Acessibilidade

- Fonte grande (`text-4xl`/`sm:text-5xl` no título).
- Focus rings visíveis (`ring-ring/40`), navegação por teclado completa.
- `aria-label`/`aria-pressed` no mic, anexo e envio.
- Contraste WCAG AA via tokens do DS 2.0.

## Fora do escopo

Não altera: AI Workspace, Intent Engine, Context Engine, Workflow Builder/Engine,
Smart Routing, Knowledge Admin, Inbox, Operações, Demandas, banco, RLS,
Edge Functions ou rotas.
