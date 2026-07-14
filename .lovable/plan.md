
# Importador de Quadros — Trello (Fase 1, revisado v3)

Implementação **100% aditiva** conforme RFC-001, incorporando todos os ajustes solicitados. Nada existente é alterado (Kanban, Quadros, Cards, BoardSettings, RLS, Realtime, RPCs, hooks, buckets, políticas).

## 1. Banco (migração aditiva)

Três tabelas novas + RLS + grants + trigger `updated_at`.

- **`atividades_import_jobs`**
  `id`, `source`, `adapter_version`, `snapshot_version`, `runner_version` (ajuste #2),
  `criado_por`, `board_id_local?`, `target_mode`,
  `options jsonb`, `resolutions jsonb`,
  `status` ('queued'|'running'|'success'|'partial'|'failed'|'cancelled'),
  `progress jsonb`, `report jsonb`,
  `file_hash`, `file_bytes`, `file_name`,
  `iniciado_em`, `concluido_em`, `created_at`, `updated_at`.
  RLS: dono do job + admin do board destino. Adicionada ao `supabase_realtime`.

- **`atividades_import_member_map`** — como antes.

- **`atividades_import_entities`** — chave de idempotência (ajuste-forte).
  `id`, `job_id`, `source`, `entity_type`, `external_id`, `local_id?`, `created_at`.
  Índice único `(job_id, entity_type, external_id)` para garantir idempotência por job. Runner consulta antes de criar cada recurso.

Padrão neutro em `payload_extra.import = { source, external_id, import_job }`.

RPCs novas:
- `atividades_import_job_create(source, options, file_hash, file_bytes, file_name, adapter_version, snapshot_version, runner_version)`
- `atividades_import_job_update_progress(job_id, progress, status?)`
- `atividades_import_job_cancel(job_id)` — dono ou admin, seta `status='cancelled'` (ajuste #5)
- `atividades_import_job_finalize(job_id, status, report, board_id_local?)`
- `atividades_import_member_map_upsert(...)`
- `atividades_import_entity_register(job_id, entity_type, external_id, local_id?)` — idempotente via `ON CONFLICT DO NOTHING`
- `atividades_import_entity_lookup(job_id, entity_type, external_id)` — retorna `local_id` se já criado

Grants: `authenticated` + `service_role`.

## 2. Sem bucket temporário (ajuste #1)

Arquivo ZIP/JSON trafega em memória na Edge Function: upload → parse → Runner → descarte. Nenhum bucket novo, nada persistido.

## 3. CanonicalSnapshot neutro (ajuste #3)

Estrutura agnóstica, sem menção a Trello:

```ts
interface CanonicalSnapshot {
  snapshot_version: string;   // ex "1.0"
  source: string;             // "trello" | "jira" | ...
  workspaces: Workspace[];
  boards: Board[];            // Board { external_id, nome, descricao, lists[], labels[], members[] }
  lists: List[];              // { external_id, board_external_id, nome, ordem, arquivada }
  cards: Card[];              // { external_id, list_external_id, titulo, descricao_md, ... }
  comments, attachments, labels, members, checklists, checklist_items;
}
```

Parser Trello preserva **Markdown original** das descrições (ajuste #9 anterior).

## 4. Arquitetura

```text
supabase/functions/_shared/importers/
  core/
    interfaces.ts     # CanonicalSnapshot, DryRunReport, RunReport, ImportAdapter
    runner.ts         # Runner.execute({ dry_run }) — algoritmo ÚNICO, idempotente, por fases
    executor.ts       # cria via RPCs existentes
    normalize.ts, hashing.ts, versions.ts
  trello/
    index.ts, parseZip.ts, parseJson.ts, version.ts
```

**Runner por fases transacionais + commits parciais** (ajuste #4):
board → colunas → labels → cards → checklists → comentários → anexos.
Cada fase: atualiza `progress`, verifica cancelamento (ajuste #5), consulta `atividades_import_entities` antes de criar (idempotência), registra no `atividades_import_entities` após criar.
Se uma fase falhar, job termina como `partial` mantendo o que foi feito.

**Idempotência por `job_id`**: reexecução do runner com o mesmo `job_id` nunca duplica; sempre lê o mapa de entidades antes de criar.

**Executor** só usa RPCs existentes do módulo Atividades (ajuste #5 anterior). Zero SQL direto em cards/colunas/comentários/labels/anexos.

**Anexos** reutilizam o fluxo atual sem tocar bucket/políticas.

**Histórico do quadro** (ajuste #6): ao final com `success`/`partial`, Runner registra evento no histórico do board (`atividades_board_historico`) via RPC existente: "Quadro importado de {source} ({n_cards} cards, {n_colunas} colunas)".

## 5. Edge Functions

- **`importer-analisar`** (verify_jwt=true): recebe multipart, faz parse em memória, calcula `file_hash`, retorna lista de boards detectados + estatísticas prévias. Não cria job.
- **`importer-executar`** (verify_jwt=true): recebe arquivo + `board_selecionado` + `options` + `resolutions` + `target` + `dry_run`. Cria (ou reusa por `file_hash`+usuário) o job, roda Runner. UI observa via Realtime.

Dry-run e execução real são o **mesmo Runner** com a flag `dry_run` (ajuste #6 anterior).

Relatório final com métricas de auditoria (ajuste #8 anterior): duração, velocidade, reutilizados, criados, ignorados+motivos, warnings, erros, `adapter_version`, `snapshot_version`, `runner_version`, `rfc_version`, `file_hash`.

## 6. Frontend

Rota nova **`/atividades/importar`** (registrada em `App.tsx`).

```
src/pages/atividades/importar/AtividadesImportar.tsx
src/components/atividades/importar/
  PassoOrigem, PassoUpload, PassoEscolhaBoard, PassoDestino,
  PassoSelecao, PassoConflitos, PassoMembros, PassoExecucao, RelatorioFinal
src/lib/importador/{atividadesImport.ts, types.ts, __tests__/}
```

- `PassoExecucao` assina `atividades_import_jobs` filtrado por `id=job_id` (Realtime, dentro de `useEffect` com cleanup). Botão "Cancelar" chama `atividades_import_job_cancel`.
- `PassoDestino` lista quadros com papel ≥ member reusando queries existentes (não altera nenhum hook).

Único toque em UI existente: botão **"Importar quadro"** em `src/pages/Atividades.tsx` → `navigate('/atividades/importar')`.

## 7. Origem visível em BoardSettings (ajuste #7)

Alteração aditiva em `BoardSettingsDialog.tsx`, aba Geral: bloco somente-leitura exibido apenas quando o board tem `payload_extra.import`. Mostra Origem, Importado em, Job. Nenhuma outra alteração no dialog.

Isso adiciona **um terceiro** arquivo existente à lista de alterados. Toque mínimo, condicional.

## 8. Wizard — 7 passos

1. Origem (só Trello ativo).
2. Upload (parse server-side, sem bucket).
3. Escolha do board (múltiplos boards do ZIP suportados).
4. Destino (novo | existente ≥ member).
5. Seleção (Colunas/Cards/Etiquetas/Datas/Comentários/Checklists marcados; Anexos/Arquivados/Membros desmarcados).
6. Dry-run + conflitos + membros (map/ignore/histórico, sugestões memorizadas).
7. Execução via Realtime, com cancelamento + relatório final (baixar JSON).

## 9. Testes

`src/lib/importador/__tests__/` para normalização/mapeamento. Fixtures pequenos para parser. Cenário real: "Plano de Ajustes — Sistemas Bloco Construções" (4 boards, ~4 colunas, ~38 cards no board principal).

## 10. Fora de escopo

Sem sync contínua, sem write-back, sem criação automática de usuários, sem API do Trello, sem Jira/CSV/etc. nesta fase.

## 11. Ordem de execução

1. Migração (3 tabelas + RLS + grants + RPCs + publicação Realtime).
2. `_shared/importers/core` (Runner por fases, idempotente, cancelável).
3. `_shared/importers/trello` (parser JSON+ZIP, preserva Markdown).
4. Edge functions `importer-analisar` e `importer-executar`.
5. `src/lib/importador/` + testes.
6. Wizard + rota + botão em `Atividades.tsx`.
7. Bloco condicional de origem em `BoardSettingsDialog.tsx`.
8. Teste manual com o ZIP real.
9. Relatório final: arquivos criados, alterados (`App.tsx`, `src/pages/Atividades.tsx`, `BoardSettingsDialog.tsx`), novas tabelas, novas RPCs, nova rota, fluxo, aderência ao RFC-001, compatibilidade JSON+ZIP, confirmação de não-regressão.

## 12. Confirmação de não-regressão

- Nenhum arquivo do Kanban/Cards/hooks/libs/queries atuais é modificado.
- Nenhuma RPC/tabela/bucket/política existente é alterada.
- RLS/Realtime atuais intocados; novas assinaturas apenas em tabela nova.
- Único contato com UI existente: botão em Atividades, bloco condicional em BoardSettings, rota em App.tsx.
