# Plano — Papel "Builder"

Com base nas respostas:
- **Soluções**: só quem criou a solução (+ Devs) edita/exclui.
- **Visibilidade**: Builder vê apenas as próprias demandas (igual Solicitante).
- **Edição da demanda**: mesmos campos do Solicitante.
- **Dashboard**: o mesmo do Solicitante.

Ou seja, **Builder = Solicitante + permissão de cadastrar/editar/excluir soluções nas suas próprias demandas**. Nada mais.

## O que já existe
- Enum `Role` inclui `builder`; `useAuth` lê o papel via `get_my_role`.
- `ProtectedRoute` trata Builder como Requester (rotas/dashboard).
- `DemandaDetail` libera o painel de soluções quando `isBuilder && isOwner`.
- AcessosPanel permite cadastrar e-mails como Builder.

## O que falta ajustar

### 1. Banco — visibilidade igual à do Solicitante
Hoje a policy `"Allowed users can view ..."` em várias tabelas dá acesso de leitura a **todos** os e-mails permitidos (inclui Builders). Isso deixa Builder enxergando demandas de terceiros. Vamos restringir essa policy a Devs (admin) e manter as policies "owner" para Builders/Solicitantes.

Tabelas afetadas:
- `solicitacoes` — trocar `"Allowed users can view solicitacoes"` por uma policy só de admin (a policy `"Owners can view their solicitacoes"` já cobre Builder/Solicitante).
- `demanda_solucoes` — idem (`"Owners can view own solucoes"` já existe via join).
- `solicitacoes_score_history` — idem (`"Owners can view own score history"` já existe).
- `demanda_melhorias` — criar policy "owner via solução → solicitação" e restringir a leitura geral a admin.
- `demanda_tasks` / `solucao_tasks` — manter leitura ampla só para admin; Builder lê via policies "owner".

Catálogos (`setores`, `plataformas`, `tipos_demanda`, `solucoes`, `criterios_solucoes`) **permanecem** com `is_allowed_user()` — Builder precisa consultá-los para preencher formulários.

### 2. Banco — escrita em soluções restrita ao autor
Hoje qualquer `is_allowed_user()` pode `UPDATE`/`DELETE` em `demanda_solucoes`. Ajustar:
- `UPDATE` / `DELETE` em `demanda_solucoes`: permitir se `has_role(admin)` **ou** `created_by = auth.uid()`.
- `INSERT` continua exigindo `is_allowed_user() AND created_by = auth.uid()`, mais a regra de que a `solicitacao_id` pertence ao próprio Builder (validação via trigger ou policy com EXISTS).
- Garantir que `created_by` seja preenchido automaticamente (default `auth.uid()` ou trigger) — hoje depende do cliente enviar.

### 3. Frontend — `DemandaDetail`
- Botões "Editar/Excluir solução": exibir apenas para Dev ou para o Builder que criou aquela solução (`solucao.created_by === user.id`).
- Botão "Adicionar solução": continua disponível para Dev e para Builder dono da demanda.
- Mensagem clara quando o Builder vê uma solução de outro autor (somente leitura).

### 4. Frontend — dashboard e listas
- Nenhuma mudança na tela inicial (Builder usa RequesterDashboard).
- Conferir que listagens/consultas no app não assumem que `is_allowed_user` enxerga tudo (ex.: telas que listam todas as solicitações ficam vazias para Builder — comportamento desejado, mas precisa revisar para não quebrar UI).

### 5. AcessosPanel
- Garantir que a opção "Builder" aparece no seletor de papel e que o label exibido é "Builder".
- Texto de ajuda curto explicando: "Pode cadastrar soluções nas próprias demandas".

## Detalhes técnicos
- Migrações: uma para reescrever as policies de SELECT (`solicitacoes`, `demanda_solucoes`, `solicitacoes_score_history`, `demanda_melhorias`, `*_tasks`) e outra para as policies de UPDATE/DELETE de `demanda_solucoes` + default/trigger de `created_by`.
- Sem alterações em `auth.*`. Mantém `is_allowed_user()` e `has_role()` como estão.
- Tipagem do front: usar `created_by` já presente em `demanda_solucoes` para checagem do botão.

## Fora de escopo
- Convidar colaboradores para uma demanda.
- Builder editar status/score técnico ou tasks da solução.
- Notificações por e-mail.

## Perguntas ainda em aberto (opcional)
1. Quando um Dev exclui uma solução criada por um Builder, queremos notificar/avisar o Builder? (sugiro: não, fica no `activity_log`).
2. Builder pode reabrir/encerrar a própria demanda (mudar `status`)? Hoje Solicitante não pode — confirma manter assim?
