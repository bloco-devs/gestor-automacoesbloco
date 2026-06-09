# Plano: usar Lovable Emails para resolver o rate-limit de recuperação de senha

Em vez de configurar Resend/SendGrid manualmente, vou usar o **Lovable Emails** — a infraestrutura nativa do Lovable que eu consigo provisionar sozinho. Você só faz uma coisa: aprovar o domínio no diálogo que vai aparecer no chat.

## Por que isso resolve o problema

- O SMTP padrão do Supabase tem limite de ~2 e-mails/hora (causa do erro atual).
- Lovable Emails substitui esse SMTP por uma infraestrutura própria com limite muito maior (~120 e-mails/min) e fila com retry automático.
- Os e-mails passam a sair de um remetente da sua marca (ex.: `nao-responda@notify.seudominio.com`) em vez do remetente genérico do Supabase, melhorando entregabilidade.
- Eu cuido de DNS, templates, edge function e fila — você não toca em painel do Supabase.

## O que você precisa fazer

**Apenas 1 passo:** quando eu abrir o diálogo "Set up email domain", escolher uma das duas opções:

- **Opção A — Subdomínio gerenciado pelo Lovable** (mais fácil): Lovable provisiona um subdomínio próprio automaticamente. Zero configuração de DNS da sua parte. Recomendado se você só quer que funcione rápido.
- **Opção B — Seu próprio domínio** (ex.: `notify.bloco.com.br`): você cola 2 registros NS no seu provedor de DNS uma única vez; o Lovable gerencia SPF/DKIM/DMARC sozinho dentro desse subdomínio. Recomendado se você quer remetente com sua marca.

Depois disso, é só esperar o DNS verificar (alguns minutos a poucas horas) e testar.

## O que eu vou fazer sozinho

1. **Abrir o diálogo de setup do domínio de e-mail** para você escolher A ou B.
2. **Provisionar a infraestrutura de e-mail** (filas pgmq, tabelas de log, cron job de envio, secrets — tudo no Supabase, automaticamente).
3. **Criar os templates de auth e-mail customizados** com a marca Bloco Construções:
   - Recovery (recuperação de senha) — o que você precisa agora
   - Signup confirmation
   - Magic link
   - Invite
   - Email change
   - Reauthentication
4. **Aplicar a identidade visual** (cores, tipografia, logo) lendo o `src/index.css` e `src/assets/bloco-logo.png` para que o e-mail tenha cara do app.
5. **Deploy do edge function `auth-email-hook`** que intercepta os e-mails do Supabase e manda pela fila do Lovable.
6. **Validar** que o template de recuperação está correto antes de te entregar.

## O que NÃO muda no código existente

- `src/pages/RedefinirSenha.tsx` continua igual — o fluxo PKCE que já implementamos funciona.
- `src/pages/Auth.tsx` continua igual — o `resetPasswordForEmail` continua sendo chamado da mesma forma.
- O usuário final não percebe nenhuma diferença além do e-mail chegar mais rápido, com marca Bloco, e sem bloqueio por rate-limit.

## Detalhes técnicos

- A chamada `supabase.auth.resetPasswordForEmail()` dispara o webhook nativo do Supabase Auth → o edge function `auth-email-hook` recebe → renderiza o template React Email com os dados (`confirmationUrl`, `recipient`, etc.) → enfileira em `pgmq.auth_emails` → o cron job `process-email-queue` envia em lote a cada 5s.
- Retry automático em caso de falha 5xx, dead-letter queue após 5 tentativas, TTL de 15 min para auth e-mails.
- Tudo monitorável em `Cloud → Emails` (logs de envio, taxa de entrega, supressões por bounce).
- Não usa Resend/SendGrid e não precisa de API key externa — autenticação interna via `LOVABLE_API_KEY` (já existe no projeto).

## Fluxo da resposta após você aprovar este plano

1. Eu mostro o botão "Set up email domain" — você clica e escolhe A ou B.
2. Eu rodo `setup_email_infra` e `scaffold_auth_email_templates` em sequência.
3. Eu customizo os 6 templates com identidade Bloco.
4. Eu faço deploy do `auth-email-hook`.
5. Eu te aviso que está pronto e deixo botão para abrir `Cloud → Emails` e acompanhar a verificação de DNS (se opção B).
6. Você testa o "Esqueci minha senha" assim que o DNS verificar.

## Fora do escopo

- Migração de outros e-mails do sistema (notificações in-app etc.) para Lovable Emails — pode ser feito depois se quiser.
- Reaproveitar Resend já configurado — você não tem, então não se aplica.