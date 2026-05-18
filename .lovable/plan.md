# Aba Configurações (somente devs)

Nova rota `/configuracoes` acessível somente para usuários com papel `developer` (admin). Estrutura em abas internas, entregue em fases.

## Arquitetura

- Rota: `/configuracoes` em `src/App.tsx`, dentro de `ProtectedRoute` exigindo `developer`.
- Item no sidebar (`AppLayout.tsx`) com ícone `Settings`, exibido apenas quando `effectiveRole === "developer"`.
- Página `src/pages/Configuracoes.tsx` usando `Tabs` shadcn com 4 abas internas: Acessos, Catálogos, Aparência, Auditoria.
- Subcomponentes em `src/components/configuracoes/`: `AcessosPanel.tsx`, `CatalogosPanel.tsx`, `AparenciaPanel.tsx`, `AuditoriaPanel.tsx`.

## Fase 1 — Gestão de Acessos (prioridade #1)

Objetivo: deixar de editar código para liberar/remover usuários e trocar papéis.

UI (`AcessosPanel.tsx`):
- Tabela com colunas: E-mail, Nome (do profile, se já logou), Papel atual (Desenvolvedor / Solicitante / Builder), Cadastrado em, Último acesso (opcional), Ações.
- Botão "Adicionar conta" → dialog com campos: e-mail (obrigatório, normalizado em lowercase), papel (select). Cria registro em `allowed_emails` e, se já existir `auth.user`, cria também a linha em `user_roles`.
- Por linha: trocar papel (select inline), botão "Remover" (confirmação) — remove de `allowed_emails` e `user_roles`.
- Filtro por papel e busca por e-mail.

Modelo de papéis:
- Enum `app_role` hoje tem `admin`. Adicionar `requester` e `builder` ao enum.
- Mapeamento de UI → enum: Desenvolvedor=`admin`, Solicitante=`requester`, Builder=`builder`.
- Refatorar `useAuth.tsx` para ler o papel da tabela `user_roles` (via `has_role`) em vez de derivar de `ALLOWED_ACCOUNTS` no código. Manter fallback durante a migração.
- Migrar a constante `ALLOWED_ACCOUNTS` atual para seeds em `allowed_emails` + `user_roles` (1 migration única).

Backend / segurança:
- Migration para adicionar valores ao enum `app_role`.
- Manter políticas existentes em `allowed_emails` e `user_roles` (já são admin-only).
- Atualizar `is_allowed_user()` se necessário (já valida via `allowed_emails`, então segue funcionando).
- Atualizar `ProtectedRoute` para usar o papel vindo do banco (Builder herda rotas de Solicitante, como já está).

## Fase 2 — Catálogos base

UI (`CatalogosPanel.tsx`) com sub-abas: Setores, Plataformas, Tipos de demanda.
- CRUD em `setores` e `plataformas` (tabelas já existem). Listar, criar, renomear, excluir (com confirmação e checagem de uso).
- Tipos de demanda hoje vivem em código (`tipo` em `solicitacoes`). Opção: criar tabela `tipos_demanda` (id, nome, ativo) e migrar o select de `NovaDemanda.tsx` para consumir do banco. **Decisão pendente — confirmar antes de implementar.**

## Fase 3 — Aparência + Auditoria/Export

Aparência (`AparenciaPanel.tsx`):
- Nome da organização, logo (upload no bucket `plataforma-icones` ou novo bucket `branding`), cor primária (color picker → atualiza variável CSS `--primary`).
- Persistência em nova tabela `app_settings` (singleton row) ou em `localStorage` para MVP. **Decisão pendente.**

Auditoria (`AuditoriaPanel.tsx`):
- Listar `activity_log` com filtros por usuário, entidade, período.
- Botão "Exportar CSV" das demandas (`solicitacoes`) e soluções (`demanda_solucoes`).

## Fora de escopo desta entrega

- Workflow/SLA, notificações por e-mail e integrações (webhook, Slack, GitHub) — ficam para iteração posterior.
- Convite automático por e-mail ao adicionar conta (o usuário ainda precisa se cadastrar pelo fluxo de auth atual; só fica pré-autorizado).

## Detalhes técnicos

- Tabelas afetadas:
  - `app_role` enum: adicionar `requester`, `builder`.
  - (Fase 2) opcional `tipos_demanda`.
  - (Fase 3) opcional `app_settings`.
- Arquivos novos:
  - `src/pages/Configuracoes.tsx`
  - `src/components/configuracoes/{Acessos,Catalogos,Aparencia,Auditoria}Panel.tsx`
  - `src/lib/configuracoes.ts` (helpers de CRUD de `allowed_emails` + `user_roles`)
- Arquivos editados:
  - `src/App.tsx` (rota), `src/components/AppLayout.tsx` (item de menu), `src/components/ProtectedRoute.tsx` (papel via banco), `src/hooks/useAuth.tsx` (papel via banco).

## Perguntas que ficaram em aberto

1. Tipos de demanda viram catálogo no banco ou continuam em código?
2. Aparência: persistir em `app_settings` (todos veem) ou só `localStorage` (por usuário)?
3. Quer entregar tudo de uma vez ou só a Fase 1 agora?
