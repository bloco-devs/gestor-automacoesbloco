# Backend

## Índice
- [Supabase](#supabase)
- [Edge Functions](#edge-functions)
- [RPCs principais](#rpcs-principais)
- [Triggers](#triggers)
- [Realtime](#realtime)
- [Storage](#storage)
- [Segredos](#segredos)

## Supabase
- Projeto externo: `cgbhpenkytibgiosksrb`.
- 39 tabelas em `public`.
- 99 migrations aditivas (versionadas em `supabase/migrations/`).
- Event trigger `rls_auto_enable` liga RLS automaticamente em novas tabelas de `public`.

## Edge Functions
Todas em `supabase/functions/`, Deno runtime, deploy automático.

| Função | JWT | Sumário |
| --- | --- | --- |
| `sso-login` | não | Início do fluxo SSO Bloco ID |
| `provision-user` | não | Provisiona `profiles` / roles após login |
| `bloco-connect` | não | Callback / handshake HUB |
| `bulk-create-requesters` | — | Cria requesters em lote (admin) |
| `assistente-demanda` | sim | Melhora descrição da demanda |
| `triagem-demanda` | sim | Sugere insumos de score |
| `demandas-similares` | sim | Detecta duplicidade |
| `resumo-pipeline` | sim | Resumo executivo do backlog |
| `mapa-narrativa` | sim | Narrativa dos riscos do ecossistema |
| `ecossistema-mapa` | sim | Lê catálogo HUB (com fallback seed) |
| `match-ecossistema` | sim | Match demanda ↔ solução |
| `confirmar-atendimento-existente` | sim | Vincula solução existente |
| `reprocessar-matches` | sim | Reexecuta matches |
| `importer-upload` | sim | Recebe arquivo Trello e cria job |
| `importer-run` | sim | Executa job (adapter + executor) |

## RPCs principais
Auth/roles: `has_role`, `is_allowed_user`, `get_my_role`, `admin_list_accounts`.

Atividades: `atividades_can_view_board`, `atividades_can_edit_board`, `atividades_can_admin_board`, `atividades_board_role`, `atividades_board_add_member`, `atividades_board_remove_member`, `atividades_board_set_member_role`, `atividades_board_toggle_favorito`, `atividades_board_set_arquivado`, `atividades_board_update`, `atividades_board_delete`, `atividades_create_board`, `atividades_coluna_create/update/delete/duplicate/reorder/set_arquivada/set_wip`, `atividades_label_upsert/delete/reorder/toggle_favorita/set_favorita`, `atividades_reorder_cards`.

Importador: `atividades_import_job_create/cancel/update_progress/finalize`, `atividades_import_entity_register/get`, `atividades_import_member_map_upsert/list`.

## Triggers
| Trigger | Tabela | Papel |
| --- | --- | --- |
| `compute_scores` | `solicitacoes` | Calcula score/score_final antes de gravar |
| `enforce_dev_only_columns` | `solicitacoes` | Blinda campos técnicos e status |
| `log_score_history` | `solicitacoes` | Registra alterações em `solicitacoes_score_history` |
| `notify_avaliacao_tecnica` | `solicitacoes` | Cria notificação para o solicitante |
| `handle_new_user` | `auth.users` | Cria `profiles` + role admin quando `allowed_emails` casar |
| `sync_allowed_email_admin` / `cleanup_allowed_email_admin` | `allowed_emails` | Mantém `user_roles` em dia |
| `normalize_allowed_email` | `allowed_emails` | Normaliza para lowercase/trim |
| `log_atividade_card_change` / `log_atividade_anexo_change` | `atividades_cards` / `atividades_anexos` | Log automático |
| `sync_card_events_to_board_historico` | `atividades_atividade_log` | Espelha para histórico do board |
| `validate_atividade_anexo` | `atividades_anexos` | Whitelist mime + limite 20 |
| `auto_conclude_on_coluna_change` | `atividades_cards` | Marca concluído ao mover para coluna final |
| `atividades_import_jobs_guard` | `atividades_import_jobs` | Máquina de estado imutável |
| `update_updated_at_column` / `update_data_atualizacao` | várias | Timestamps |

## Realtime
- Publicação `supabase_realtime` inclui tabelas de atividades e notificações.
- `REPLICA IDENTITY FULL` nas tabelas mutáveis pelo Kanban.
- Canais nomeados por board: `atividades-rt-{boardId}`.

## Storage
- Bucket `atividades-capas`: capas de quadros e cards (URLs assinadas).
- Avatares: colunas `profiles.avatar_url` referenciando storage do Supabase.

## Segredos
Mantidos no **painel Supabase** (Edge Function Secrets), nunca no repo:
- `BLOCO_ID_HUB_URL`
- `LOVABLE_API_KEY` (fallback direto)
- `SUPABASE_SERVICE_ROLE_KEY` (uso interno das functions)
