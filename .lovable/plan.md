# Notificações de avaliação técnica

Quando um dev cadastrar/alterar uma avaliação técnica em uma solicitação, o solicitante daquela demanda passa a ver uma notificação no app no próximo acesso, com indicador no sino do cabeçalho e link direto para a solicitação avaliada.

## Experiência do solicitante

- **Sino no header** (ao lado do toggle de tema): mostra um badge com a contagem de notificações não lidas.
- **Popover ao clicar**: lista as últimas notificações, mais recentes primeiro. Cada item mostra:
  - Título da solicitação avaliada
  - Quem avaliou (nome/email) e quando (ex.: "há 2 horas")
  - Resumo: "Sua solicitação recebeu uma avaliação técnica"
  - Estado visual diferente para lidas vs não lidas (ponto/cor)
- **Clicar no item**: marca como lida e navega para `/solicitacoes/:id`, rolando até a seção de avaliação técnica.
- **Ação "Marcar todas como lidas"** no rodapé do popover.
- **Realtime**: a contagem e a lista atualizam ao vivo via Supabase Realtime na tabela de notificações.

Devs/admins não recebem essas notificações (são eles que as geram). Builders só recebem como solicitantes das próprias demandas.

## Mudanças no banco

Nova tabela `public.notificacoes`:
- `user_id` (destinatário — o solicitante)
- `tipo` (`'avaliacao_tecnica'` inicialmente, deixando aberto para tipos futuros)
- `solicitacao_id` (referência à demanda)
- `titulo`, `mensagem` (texto pronto para exibir)
- `lida` (boolean, default false), `lida_em`
- `created_by` (uuid do dev que disparou), `created_by_email`
- `created_at`

RLS:
- Solicitante lê / atualiza (marcar como lida) / apaga apenas as próprias notificações.
- Admins veem todas (para suporte).
- INSERT só via trigger SECURITY DEFINER — sem policy de insert para usuários.

Trigger `notify_avaliacao_tecnica` em `public.solicitacoes` (AFTER UPDATE):
- Dispara quando `complexidade_dev` OU `notas_tecnicas_complexidade` muda (mesma condição do `log_score_history` já existente).
- Insere uma linha em `notificacoes` para `NEW.user_id`, desde que `NEW.user_id IS NOT NULL` e `NEW.user_id <> auth.uid()` (evita auto-notificar quando o próprio solicitante editar).
- `created_by` = `auth.uid()`, `created_by_email` resolvido via `auth.users`.

Índice em `(user_id, lida, created_at DESC)` para a query da lista.

## Mudanças no frontend

**Novo módulo `src/lib/notificacoes.ts`**: `listNotificacoes`, `countUnread`, `markAsRead(id)`, `markAllAsRead()`.

**Novo hook `src/hooks/useNotificacoes.ts`**: carrega lista + contagem do usuário atual, assina canal realtime de `notificacoes` filtrado por `user_id=eq.<id>`, expõe `unreadCount`, `items`, `markAsRead`, `markAllAsRead`.

**Novo componente `src/components/NotificacoesBell.tsx`**: ícone `Bell` (lucide) + badge de contagem + `Popover` com a lista. Item clicável navega para `/solicitacoes/:id?focus=avaliacao`.

**`src/components/AppLayout.tsx`**: renderiza `<NotificacoesBell />` no header, ao lado do `ThemeToggle`. Visível para todos os usuários autenticados (devs raramente terão notificações, então fica naturalmente vazio para eles).

**`src/pages/SolicitacaoDetail.tsx`**: lê `?focus=avaliacao` em `useSearchParams` e, se presente, faz `scrollIntoView` na seção "Notas da Avaliação Técnica" ao montar.

## Fora de escopo

- Notificações por e-mail (apenas in-app).
- Outros tipos de notificação (novas soluções, mudança de status, etc.) — a tabela já fica preparada para isso, mas não será implementado agora.
- Centro de notificações em página própria — só o popover.
