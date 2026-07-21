# AI Workspace — Nova experiência de abertura de demandas

## Índice
- [Objetivo](#objetivo)
- [Fluxo conversacional](#fluxo-conversacional)
- [Quick Actions](#quick-actions)
- [Preview](#preview)
- [Componentes](#componentes)
- [Rotas](#rotas)

## Objetivo
Substituir o formulário tradicional de "Nova Solicitação" por uma experiência conversacional. O usuário descreve a demanda naturalmente; a IA já existente (assistente-demanda, triagem-demanda, demandas-similares) estrutura título, resumo, categoria, sistema-alvo, impacto, complexidade, tags e similares. O formulário passa a existir apenas no preview de confirmação.

Esta task é **exclusivamente UX + orquestração**. Não há novas edge functions, novos prompts, novas tabelas nem novas migrations — toda a inteligência reutiliza a infraestrutura documentada em [08-IA](08-IA.md).

## Fluxo conversacional

```mermaid
graph TD
  W[Welcome + Quick Actions] --> C[Chat com IA]
  C -->|até 2 respostas do usuário| C
  C --> P[Processing: generate_description + triagem-demanda + demandas-similares]
  P --> V[Preview editável]
  V -->|Confirmar| S[createSolicitacao + match-ecossistema em background]
  V -->|Voltar à conversa| C
  V -->|Cancelar| W
  S --> M[/minhas-solicitacoes]
```

- **Máximo de 2 perguntas** de IA (`MAX_USER_TURNS = 2` em `useAIWorkspace`). O backend limita a 4 como cinto de segurança.
- **Fallbacks**: 429/402 do gateway são propagados como toast amigável; falha na busca de similares degrada silenciosamente para lista vazia.
- **Título** é derivado no cliente a partir da 1ª sentença da descrição (heurística leve, editável no preview).

## Quick Actions
5 cartões iniciais que apenas semeiam a primeira mensagem do usuário:

| Emoji | Ação |
| --- | --- |
| 🐞 | Relatar um problema |
| 💡 | Sugerir uma melhoria |
| ⚙️ | Solicitar uma automação |
| ✨ | Nova funcionalidade |
| 📚 | Tirar uma dúvida |

Definidos em `src/components/ai-workspace/QuickActions.tsx` (`QUICK_ACTIONS`). `SuggestionCards` é apenas um alias semântico do mesmo componente.

## Preview
Painel de confirmação com:
- Título, Resumo, Sistema, Categoria (tipo_demanda), Setor.
- Prioridade estimada (score server-authoritative), Impacto, Complexidade.
- Tags (categoria + sistema + setor).
- Demandas semelhantes (link para `/solicitacao/:id`).
- Responsável sugerido (placeholder — a triagem humana definirá).
- Justificativa da IA.

Botões: **Editar** (toggle inline), **Cancelar**, **Voltar à conversa**, **Confirmar solicitação**. Somente a confirmação chama `createSolicitacao`; o `match-ecossistema` roda em background como no fluxo clássico.

## Componentes
Todos em `src/components/ai-workspace/`:

| Componente | Responsabilidade |
| --- | --- |
| `WelcomeSection` | Saudação e chip "AI Workspace". |
| `QuickActions` / `SuggestionCards` | Cartões de ações rápidas. |
| `ChatContainer` | Área rolável do histórico + estado vazio + indicador. |
| `ConversationMessage` | Bolha individual (usuário/assistente). |
| `TypingIndicator` | Bolhas pulsantes durante o "pensando". |
| `ConversationInput` | Textarea com Enter=enviar / Shift+Enter=quebra. |
| `ConversationHeader` | Cabeçalho da conversa + botão "Nova conversa". |
| `ConversationFooter` | Contador de turnos e dicas de teclado. |
| `EmptyConversation` | Placeholder inicial do chat. |
| `PreviewPanel` | Preview + edição inline + confirmação. |
| `ConfirmDialog` | AlertDialog reutilizável para descarte. |

Orquestração em `src/hooks/useAIWorkspace.ts` (state machine `welcome → chatting → processing → preview → submitting`). O hook **não** contém prompts nem lógica de IA — apenas invoca as edge functions existentes.

## Rotas
- `/nova-solicitacao` — nova experiência (`AIWorkspace`), porta principal.
- `/nova-solicitacao/classico` — mantém o formulário tradicional (`NovaSolicitacao`) para compatibilidade e diagnóstico.

Todas as rotas continuam protegidas por `ProtectedRoute role="requester"`.
