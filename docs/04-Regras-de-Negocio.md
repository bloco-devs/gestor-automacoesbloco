# Regras de Negócio

## Índice
- [Score](#score)
- [Prioridade](#prioridade)
- [Status e pipeline](#status-e-pipeline)
- [Papéis e permissões](#papéis-e-permissões)
- [Triagem por IA](#triagem-por-ia)
- [Atividades / Kanban](#atividades--kanban)
- [Notificações](#notificações)
- [Importador Trello](#importador-trello)
- [Consolidação de demandas](#consolidação-de-demandas)

## Score
Fórmula implementada em `public.compute_scores` (trigger `BEFORE INSERT/UPDATE`):

```
f = clamp(frequencia, 0..10)
d = clamp(complexidade, 0..10)     -- percepção do solicitante
r = clamp(retorno, 0..10)
score_solicitante = ((f + d + r) / 30) * 100
score             = round(score_solicitante)
score_final       = score_solicitante * ((10 - complexidade_dev) / 10)
                    quando complexidade_dev IS NOT NULL
```

Regras:
- IA **nunca** altera o score. Ela sugere `frequencia`/`complexidade`/`retorno`; humano confirma; trigger calcula.
- `complexidade_dev`, `notas_tecnicas_complexidade`, `avaliado_por`, `avaliado_em`, `status` são **write-only** para `admin` — trigger `enforce_dev_only_columns` reverte alterações de solicitantes.
- Toda mudança em `complexidade_dev` / `notas_tecnicas_complexidade` gera linha em `solicitacoes_score_history`.

## Prioridade
Derivada de `score_final` (ou `score` quando ainda não avaliado). Ordenação padrão do Kanban do desenvolvedor.

## Status e pipeline
- `solicitacoes.status`: fluxo de pipeline (definido em migrations); só desenvolvedor/admin avança.
- `atividades_cards.concluido` + coluna `concluido-*` disparam `auto_conclude_on_coluna_change` (reabertura ao sair).

## Papéis e permissões
- `allowed_emails.role`: `requester | builder | developer | administrador`.
- `developer|administrador` → recebem `user_roles.role='admin'` via trigger `sync_allowed_email_admin`.
- `has_role(uid, 'admin')` é a checagem canônica em policies e RPCs.
- Sem entrada em `allowed_emails` → `is_allowed_user()` = false → acesso negado.

## Triagem por IA
- Endpoint: `triagem-demanda`.
- Entradas: título + descrição do solicitante.
- Saída: sugestão de `frequencia`, `complexidade`, `retorno`, categoria, impactos.
- Regra: **usuário confirma antes de gravar**.
- Rate limit: 20 req / 60s por usuário (`_shared/ia-gateway.ts`).
- Log: `ia_uso_log` (usuário, tokens, latência, função).

## Atividades / Kanban
- Board tem `visibilidade` ∈ `{private, workspace, public}`.
- Membros: `owner | admin | member | viewer` (`atividades_board_membros`).
- Só `admin de board` (ou admin global) pode: renomear board, criar/reordenar colunas, editar etiquetas, definir WIP, remover membros.
- Reorder de cards: RPC `atividades_reorder_cards(items jsonb)` com validação de escopo de board.
- WIP: `atividades_colunas.wip_limit` (0/NULL = sem limite).
- Anexos: máx 20 por card; mime types permitidos definidos em `validate_atividade_anexo`.
- Histórico automático de `card` e `anexo` via triggers `log_atividade_*` espelhando para `atividades_board_historico`.

## Notificações
- Trigger `notify_avaliacao_tecnica` cria `notificacoes` quando outro usuário altera avaliação técnica.
- Nunca notifica o próprio autor.

## Importador Trello
- Job em `atividades_import_jobs` com máquina de estado: `queued → running → (success|partial|failed|cancelled)`.
- Estados finais imutáveis (guard `atividades_import_jobs_guard`).
- `iniciado_em` e `concluido_em` são write-once.
- Mapeamento de membros persistido por usuário em `atividades_import_member_map`.

## Consolidação de demandas
- Edge functions `match-ecossistema`, `confirmar-atendimento-existente`, `reprocessar-matches` sugerem soluções existentes que já atendem a demanda.
- Confirmação humana obrigatória para vincular solução ↔ demanda.
