# Avisos em tempo real de novas mensagens nas demandas

Hoje o sino só avisa criação, atribuição e mudança de status. Comentários novos passam em silêncio: nada no sino, nada de som, nada de toast. Quem está em outra tela perde a mensagem.

## O que muda para o usuário

- Quando alguém comenta numa demanda **ligada a você** (você criou, é o responsável, ou já comentou no fio), chega:
  - uma notificação persistente no **sino** (com o ponto/contador vermelho já existente), que sobrevive a recarregar a página;
  - um **toast** "Nova mensagem na demanda" com um trecho da mensagem — clicar leva direto ao fio da demanda;
  - um **som discreto** (silenciável, preferência guardada no navegador).
- Nunca avisa sobre o seu próprio comentário, nem sobre mensagens automáticas do sistema.
- Anti-repetição: várias mensagens no mesmo fio em poucos minutos não geram uma pilha de avisos (uma janela curta de agrupamento, igual à já usada em mudança de status).

## Como será feito

### 1. Banco (migração aditiva)

- Novo tipo de notificação `new_comment` aceito na coluna `type` de `notifications` (a coluna é texto; só o front tipa os valores — nada a alterar no schema além do gatilho).
- Nova função `public.trg_demand_comment_notify()` (`security definer`, `search_path = public`) + gatilho `AFTER INSERT ON public.demand_comments`.
  Lógica:
  - ignora comentários com `is_system = true` ou `is_ai = true`? Não — comentários da IA (Blink) **avisam**, comentários de sistema não. `is_internal = true` só avisa a equipe.
  - monta a lista de destinatários: `demands.created_by`, `demands.assigned_to`, e demais autores distintos de comentários do mesmo `demand_id`;
  - remove o autor (`NEW.user_id`) e `auth.uid()` da lista; remove `created_by` quando o comentário é interno;
  - insere uma linha por destinatário com `title = 'Nova mensagem na demanda'`, `message` = título da demanda + trecho da mensagem (~120 caracteres), `type = 'new_comment'`, `link_url = '/demandas/<id>'`, pulando quem já recebeu aviso do mesmo `link_url`/tipo nos últimos 10 minutos.
- Mesmo gatilho, mesma função, para `public.atividades_comentarios` (cartões de quadro), montando `link_url` `/demandas/<card_id>` — os cartões de quadro compartilham a mesma tela de detalhe.
- Ambas as tabelas já estão na publicação `supabase_realtime` e `notifications` também, então o sino atualiza sozinho pelo canal que já existe.

### 2. Front-end (modular, sem lógica de banco em componente visual)

- Novo módulo `src/modules/realtime-notifications/`:
  - `useRealtimeNotifications.ts` — assina `INSERT` em `public.notifications` filtrado por `user_id=eq.<meu id>` (canal com nome único por instância, `useEffect` com `removeChannel` na limpeza, como nos hooks já existentes). Ao receber uma linha de `type = 'new_comment'`: toca o som e dispara o toast com ação de navegação.
  - `som.ts` — `tocarAvisoDeMensagem()` com `new Audio('/notification.mp3')`, `volume` baixo, `play()` em `try/catch` + `.catch()` para o bloqueio de autoplay do navegador (falha silenciosa, nunca quebra a UI).
  - `preferencia.ts` — chave `app:somDeNotificacao` em `localStorage` (padrão ligado).
  - `index.ts` como barrel do módulo.
- `src/components/AppLayout.tsx`: chama `useRealtimeNotifications()` uma única vez (o layout é o único ponto global), usando `navigate` do react-router para o clique do toast. Nada de assinatura dentro de `NotificationsDrawer` (ele é renderizado duas vezes).
- `NotificationsDrawer.tsx`: apenas dois ajustes visuais — estilo de borda esquerda para o novo tipo `new_comment` e um item "Som dos avisos" no cabeçalho do popover para silenciar. O badge vermelho já existe e passa a contar os novos avisos automaticamente.
- Tipagem: `AppNotification["type"]` em `src/modules/notifications/service.ts` ganha `"new_comment"`; nenhum `any`.
- Áudio: será usado `/notification.mp3` em `public/`. Se o arquivo ainda não existir, o `catch` cobre e o aviso segue visual — o arquivo pode entrar depois sem mudar código.

### 3. Verificação

- Migração aplicada e conferida com uma consulta que simula um comentário e lê as linhas geradas em `notifications`.
- Checagem de tipos do projeto.
