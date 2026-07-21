# Feature 003 — Centro Administrativo da Base de Conhecimento

Camada de administração para `knowledge_articles` sem alterar a arquitetura existente. Apenas admins acessam.

## Escopo

- Rota `/admin/base-conhecimento` (guarda `isAdministrador`).
- Módulo `src/modules/knowledge-admin/` isolado, consumindo tabelas e RPCs já existentes.
- CRUD + workflow (rascunho → em revisão → publicado → arquivado) + versionamento + auditoria + IA sugestiva.

## Reutilização (nada duplicado)

- **Tabelas**: `knowledge_articles`, `knowledge_feedback`, `activity_log`, `user_roles`.
- **RPCs**: `has_role`, `knowledge_search`, `admin_list_accounts` (para autores).
- **Serviços/hooks**: `knowledgeService`, `useKnowledgeMetrics`, `useAuth`, `useT` (UX Layer), `aiOrchestrator` (Intent Engine), `contextEngine`.
- **UI**: shadcn (Table, Dialog, Tabs, Badge, Select, Input, Textarea, Sheet, DropdownMenu), `EmptyState`, `ListState`, `DataSourceBadge`, `StatusBadge`.
- **Registries**: `navigation-registry` e `command-registry` da Platform Layer (adicionar entrada admin-only).

## Recursos novos (mínimos)

Frontend (`src/modules/knowledge-admin/`):
- `services/admin-service.ts` — CRUD, publish/archive/duplicate, list versions, restore.
- `hooks/useAdminArticles.ts`, `useArticleVersions.ts`, `useAdminMetrics.ts`.
- `components/`: `AdminHeader`, `MetricsStrip`, `ArticlesTable` (search/filter/sort/paginate client-side), `ArticleFormDialog`, `MarkdownEditor` (textarea + preview react-markdown com sanitização), `VersionHistoryPanel`, `AISuggestPanel` (usa `aiOrchestrator`), `StatusPill`, `DeleteConfirm`.
- `providers/AdminKnowledgeProvider.tsx` — cache local (React Query).
- `utils/markdown.ts` (render seguro), `utils/diff.ts` (comparar versões).
- `types/index.ts`.
- `__tests__/`: service CRUD, workflow transitions, version diff, permissões.
- Página: `src/pages/admin/BaseConhecimento.tsx`.

Backend (migração aditiva):
- `knowledge_article_versions` (id, article_id fk, versao int, snapshot jsonb, changed_by uuid, changed_by_email text, resumo_alteracao text, created_at). GRANTs + RLS: leitura/escrita apenas para admin via `has_role`.
- Trigger `knowledge_articles_version_snapshot` — em INSERT/UPDATE grava snapshot com nº sequencial por artigo.
- Coluna nova opcional: `knowledge_articles.deleted_at timestamptz` (exclusão lógica). Ajustar `knowledge_search` para filtrar `deleted_at IS NULL`.
- Coluna nova: `workflow_status` só se `status` atual não cobrir "em_revisao" — verificar; se `status` já é livre (text), reutilizar valores `rascunho|em_revisao|publicado|arquivado`.
- Política RLS extra: admins podem `SELECT/INSERT/UPDATE/DELETE` em `knowledge_articles`.

IA:
- Sem nova edge function. `AISuggestPanel` chama `aiOrchestrator.run({ text, intentHint: "KNOWLEDGE" })` para melhorar/resumir/expandir/gerar FAQ/tags/título. Resultado sempre volta ao formulário para o admin aplicar manualmente.

## Workflow

```text
rascunho ──▶ em_revisao ──▶ publicado ──▶ arquivado
   ▲             │              │             │
   └─────────────┴──────────────┴─────────────┘
        admin pode mover livremente
```

Preparado para aprovação por gestores (campo `revisor_id` reservado no snapshot; não implementado agora).

## Segurança

- Rota protegida por `ProtectedRoute` + check `user.isAdministrador`.
- RLS: novas policies com `public.has_role(auth.uid(), 'admin')`.
- Sanitização: markdown → HTML via `react-markdown` com `rehype-sanitize` (adicionar dep).
- Auditoria: cada mutation grava linha em `activity_log` (reuso do trigger existente) e em `knowledge_article_versions`.

## Navegação

Item "Base de Conhecimento" na sidebar admin (dentro de AppLayout, gate `isAdministrador`). Comando na Command Palette: "Gerenciar base de conhecimento".

## Testes

Vitest para: service CRUD, transitions de workflow, restauração de versão, diff, guardas de permissão, hook de métricas.

## Documentação

`docs/29-Knowledge-Admin.md` com arquitetura, fluxos, diagrama Mermaid do workflow e do versionamento, roadmap (aprovação por gestores, embeddings, editor rich).

## Módulos preservados

AI Workspace, Intent Engine, Context Engine, Platform Layer, UX Layer, Portal, Central Inteligente — nenhum arquivo desses módulos é alterado. Apenas adições em `navigation-registry` e `command-registry` (extensões previstas pela própria Platform Layer).

## Dependências novas

- `react-markdown`, `remark-gfm`, `rehype-sanitize` (renderização segura).
