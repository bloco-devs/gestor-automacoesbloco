# RFC-001 — Framework de Importadores do módulo Atividades

**Status:** Aprovado e congelado (aguardando autorização para implementação)
**Autor:** Owner do produto
**Data de aprovação:** 2026-07-14
**Escopo:** Módulo Atividades (Quadros / Colunas / Cards)
**Primeiro adapter previsto:** Trello

---

## 0. Pré-condição de execução

Este RFC está **congelado**. Nenhuma linha de código do importador deve ser
escrita antes de concluir, nesta ordem, a evolução em curso do módulo Atividades:

1. Configurações completas de Quadros.
2. Gestão de membros e permissões.
3. Refinamentos da experiência dos Cards.
4. Melhorias de Colunas e Kanban.
5. Estrutura definitiva de Checklists e demais recursos do Card.

Somente após essa consolidação, e mediante autorização explícita do owner, o
importador entra em desenvolvimento seguindo a ordem descrita na §8.

---

## 1. Objetivo

Permitir migração pontual (snapshot único) de dados de ferramentas externas
(Trello como primeiro caso) para o módulo Atividades, sem criar dependência
runtime da ferramenta de origem e sem sincronização contínua.

## 2. Princípios invioláveis

- **Snapshot único**: sem webhooks, sem polling, sem sync bidirecional.
- **Independência total**: a plataforma continua 100% funcional se qualquer
  API externa (Trello, Jira, etc.) sair do ar.
- **Aditivo**: nenhuma alteração destrutiva no schema atual do módulo.
- **Genérico primeiro**: o Trello é um adapter; o núcleo não conhece Trello.
- **Server-authoritative**: dry-run e execução rodam em edge functions;
  o cliente só orquestra o wizard.

## 3. Requisitos aprovados

### 3.1 Destino flexível
- Criar novo Quadro **ou** importar para Quadro existente (papel ≥ `member`).
- Merge em quadro existente:
  - Colunas: match por **nome normalizado** → reutiliza; senão cria ao final.
  - Cards: sempre acrescentados ao final da coluna destino.
  - Labels: match por (nome + cor) → reutiliza; senão cria.

### 3.2 Seleção granular
Checkboxes por tipo: Colunas, Cards, Etiquetas, Checklists, Comentários,
Anexos, Arquivados, Membros. Defaults: essenciais marcados; anexos, arquivados
e membros desmarcados.

### 3.3 Dry-run obrigatório
Toda importação real é precedida de um dry-run server-side que produz o
relatório de contagens, incompatibilidades e conflitos. É o mesmo runner
com `options.dry_run = true`.

### 3.4 Mapeamento inteligente de membros
Estratégias por membro externo:
- Mapear para usuário existente do sistema.
- Ignorar (cards ficam sem responsável).
- Criar **referência histórica** (rótulo textual em `payload_extra.membros_externos`;
  **não** cria `auth.users` nem entrada em `allowed_emails`).

Decisões memorizadas em `atividades_import_member_map` para sugerir
automaticamente em importações futuras da mesma fonte/usuário.

### 3.5 Deduplicação e conflitos
Passo dedicado "Resolução de Conflitos" no wizard, alimentado pelo dry-run.
- Colunas: nome normalizado.
- Etiquetas: nome + cor.
- Cards: opção global `import_all | skip_same_title_same_column | force_import`.
- Nunca usar apenas título como chave; `external_id` sempre gravado em
  `payload_extra.<source>.<entity>_id` (board/list/card/label/checklist/attachment/comment).

### 3.6 Identidade da origem
Metadados obrigatórios em `atividades_boards.payload_extra.import`:
`origem`, `board_id_original`, `data_importacao`, `usuario_importador`,
`versao_importador` (semver do adapter). Espelhados em
`atividades_import_jobs` para auditoria mesmo após exclusão do board.

### 3.7 Relatório final
`atividades_import_jobs.report jsonb` contém:
`duracao_ms`, `reutilizados {colunas, etiquetas}`,
`criados {colunas, etiquetas, cards, checklists, comentarios, anexos}`,
`conflitos_auto`, `conflitos_usuario`, `ignorados_por_opcao`,
`erros[]`, `avisos[]`. Exibido em tela e disponível para download (JSON).

## 4. Contrato do adapter

```ts
interface ImportAdapter {
  source: 'trello' | 'jira' | 'csv' | string;
  version: string; // semver
  authorize(input): Promise<AuthContext>;
  listSources(auth): Promise<ExternalBoardRef[]>;
  fetchSnapshot(auth, ref): Promise<RawSnapshot>;
  dryRun(snapshot, options, targetCtx): Promise<DryRunReport>;
  run(snapshot, options, resolutions, targetCtx): Promise<RunReport>;
}
```

Localização: `supabase/functions/_shared/importers/<source>/`.
O runner genérico vive em `supabase/functions/importer-run/`.

## 5. Persistência

Nova tabela `atividades_import_jobs`:
- `id`, `source`, `adapter_version`, `criado_por`, `board_id_local`,
  `target_mode` (`create_board` | `existing_board`),
  `options jsonb` (seleções + `dry_run`),
  `resolutions jsonb` (decisões de conflito),
  `status` (`pending|running|success|failed`),
  `report jsonb`, `iniciado_em`, `concluido_em`.

Nova tabela `atividades_import_member_map`:
- `source`, `source_member_id`, `source_username`, `target_user_id?`,
  `strategy` (`map|ignore|history`), `criado_por`, `updated_at`.

RLS: acesso restrito ao criador do job e admins do board destino.

## 6. Wizard (UI)

Passos:
1. Autorizar fonte.
2. Selecionar board(s) externos.
3. Escolher destino (novo ou existente).
4. Selecionar o que importar.
5. Mapeamento de membros (com sugestões memorizadas).
6. Dry-run + resolução de conflitos.
7. Execução assíncrona com progresso.
8. Relatório final (visualizar + baixar JSON).

## 7. Fora de escopo (permanente)

- Sincronização contínua ou incremental.
- Escrita de volta na ferramenta de origem.
- Criação automática de contas de usuário a partir de membros externos.
- Dependência da API externa para qualquer funcionalidade em runtime.

## 8. Ordem de implementação (quando autorizada)

1. Migrações aditivas (`atividades_import_jobs`, `atividades_import_member_map`,
   índices, RLS, grants).
2. Framework genérico (runner + contrato + relatório).
3. Wizard reutilizável de importação (agnóstico de fonte).
4. Adapter do Trello.
5. Testes com quadros reais.
6. Documentação técnica (guia do usuário + guia para novos adapters).
7. Somente então avaliar Jira, ClickUp, Asana, Monday e CSV.

## 9. Alterações a este RFC

Este documento é a especificação oficial. Mudanças exigem novo RFC ou
emenda datada aprovada pelo owner.
