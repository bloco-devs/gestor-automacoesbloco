# Onda T4 — Anexos em cards de Atividades

Escopo isolado ao módulo Atividades, aditivo, sem tocar Kanban/DnD/CardDialog fora dos pontos indicados.

## 1. Storage

- **Bucket**: `atividades-anexos`, **privado** (`public: false`), criado via `supabase--storage_create_bucket`.
- **Path convention**: `{board_id}/{card_id}/{anexo_id}-{filename-sanitizado}`.
  - Facilita RLS por prefixo e limpeza em cascata (delete recursivo por `card_id`).
- **Upload/Download**: sempre via signed URLs (upload signed URL para PUT; download signed URL curto — 60s — sob demanda). Nunca URL pública.

## 2. Limites e validação

- **Tamanho máx**: 15 MB por arquivo (validado no client antes de pedir signed URL + reforçado na policy via `owner`/metadata check no trigger de insert da tabela de metadados).
- **Qtd máx por card**: 20 anexos (validado no insert da tabela via trigger, retornando erro amigável).
- **MIME permitidos** (allowlist, validada no client E no trigger):
  - Imagens: `image/png`, `image/jpeg`, `image/webp`, `image/gif`, `image/svg+xml`
  - Documentos: `application/pdf`, `text/plain`, `text/csv`, `text/markdown`
  - Office: `application/vnd.openxmlformats-officedocument.*` (docx/xlsx/pptx), `application/msword`, `application/vnd.ms-excel`, `application/vnd.ms-powerpoint`
  - Arquivos: `application/zip`
- Extensões perigosas (`.exe`, `.js`, `.html`, `.sh`, `.bat`) rejeitadas independentemente do MIME.

## 3. Tabela de metadados

Nova tabela `public.atividades_anexos` (migração aditiva):

| coluna | tipo | notas |
|---|---|---|
| id | uuid PK | |
| card_id | uuid FK → atividades_cards(id) **ON DELETE CASCADE** | |
| board_id | uuid FK → atividades_boards(id) | denormalizado p/ RLS por prefixo |
| storage_path | text NOT NULL | caminho no bucket |
| filename | text NOT NULL | nome original |
| mime_type | text NOT NULL | |
| size_bytes | bigint NOT NULL CHECK (>0 AND <= 15MB) | |
| uploaded_by | uuid NOT NULL | `auth.uid()` |
| uploaded_by_email | text | preenchido por trigger |
| created_at | timestamptz default now() | |

Índices: `(card_id, created_at desc)`, `(board_id)`.

GRANTs: `SELECT, INSERT, DELETE` para `authenticated`; `ALL` para `service_role`.

## 4. RLS

### `atividades_anexos`
- **SELECT**: `is_allowed_user()` (mesmo escopo dos cards).
- **INSERT**: `is_allowed_user()` E `uploaded_by = auth.uid()` E validação de MIME/size via trigger `BEFORE INSERT`.
- **DELETE**: `uploaded_by = auth.uid() OR has_role(auth.uid(), 'admin')` (autor ou admin — mesmo padrão de comentários).
- **UPDATE**: bloqueado (anexos são imutáveis; troca = delete + upload).

### `storage.objects` no bucket `atividades-anexos`
- **SELECT/INSERT/DELETE**: apenas `authenticated` E `bucket_id = 'atividades-anexos'` E `is_allowed_user()`.
- INSERT adicional: `owner = auth.uid()`.
- Sem policies para `anon`.

## 5. Exclusão segura no Storage

Trigger `AFTER DELETE` em `atividades_anexos` **não** apaga o objeto (Postgres não fala com Storage nativamente de forma confiável). Estratégia:

- **Client**: ao remover anexo, chama edge function `atividades-anexo-delete` que:
  1. Valida permissão (autor ou admin) via JWT.
  2. Remove objeto do Storage (`storage.from().remove()` com service role).
  3. Deleta a linha em `atividades_anexos`.
- **CASCADE de card**: trigger `BEFORE DELETE` em `atividades_cards` enfileira paths em uma tabela `atividades_anexos_pendentes_delete` (id, storage_path). Edge function `atividades-anexos-gc` (chamada sob demanda no delete de card, ou por cron futuro) drena a fila.
  - Alternativa mais simples que adoto: a edge function `atividades-anexo-delete` também aceita `card_id` e apaga todos os objetos do prefixo `{board_id}/{card_id}/` antes de deixar o CASCADE remover as linhas. Chamada explicitamente pelo client no fluxo de delete de card. Sem tabela extra.

Decisão: **sem tabela de fila**. Edge function faz o trabalho síncrono; se falhar, log em `activity_log` e o objeto vira órfão (aceitável e recuperável por GC manual futuro).

## 6. Logs no histórico

Trigger `AFTER INSERT/DELETE` em `atividades_anexos` insere em `atividades_atividade_log`:
- `tipo='anexo_adicionado'`, `entity='anexo'`, `payload={filename, size_bytes, mime_type}`
- `tipo='anexo_removido'`, `entity='anexo'`, `payload={filename}`

Reutiliza infraestrutura da timeline atual (`AtividadeTimeline.tsx` só precisa reconhecer os dois novos tipos).

## 7. Edge functions

- `atividades-anexo-upload-url` (verify_jwt=true): recebe `{card_id, filename, mime_type, size_bytes}`, valida allowlist/limite/permissão, gera signed upload URL + pré-registra `anexo_id`. Retorna `{url, storage_path, anexo_id}`.
- `atividades-anexo-download-url` (verify_jwt=true): recebe `{anexo_id}`, valida `is_allowed_user`, retorna signed URL 60s.
- `atividades-anexo-delete` (verify_jwt=true): recebe `{anexo_id}` ou `{card_id}`, valida autor/admin, remove objetos + linhas.

Reutilizam `_shared/cors.ts`. Sem IA envolvida.

## 8. Frontend

- Novo `src/lib/atividadesAnexos.ts`: tipos + wrappers das 3 edge functions.
- Novo `src/hooks/useAnexosMutations.ts`: mutations React Query (upload/delete) com invalidação de `atividadesKeys.anexos(cardId)` e `activity(cardId)`.
- Novo `src/components/atividades/dialog/AnexosSection.tsx`: lista + botão "Adicionar anexo" com input file, barra de progresso, thumbnail para imagens, ícone genérico para outros tipos. Delete inline.
- `CardDialog.tsx`: adicionar `<AnexosSection cardId={...} />` numa nova aba "Anexos" ao lado de "Detalhes"/"Atividade". **Nenhuma outra mudança** no dialog.
- `KanbanCard.tsx`: badge com ícone `Paperclip` + contagem quando `anexosCount > 0` (novo campo derivado numa query leve `select count group by card_id` cacheada por board).

## 9. Testes

- Unitários (vitest): validação de MIME/tamanho no lib client.
- Manual: upload PNG, PDF, arquivo grande (rejeitar), MIME não permitido (rejeitar), delete pelo autor, delete por admin, delete de card cascateia objetos.
- Regressão: rodar suite existente (34 testes) — não devem quebrar.

## 10. Ordem de execução

1. `supabase--storage_create_bucket` (bucket privado).
2. Migração: tabela `atividades_anexos` + triggers de log + policies Storage + GRANTs.
3. Edge functions (3).
4. Frontend: lib → hook → componente → integração no CardDialog + badge no KanbanCard.
5. Rodar typecheck + vitest.

## Fora de escopo (T4)

- Preview inline de PDF/Office.
- Versionamento de anexos.
- GC agendado de órfãos (feito manualmente se necessário).
- Compartilhamento externo por link público.

Aprovando este plano, sigo com bucket + migração como primeiro passo.
