# Fluxos

## Índice
- [Login](#login)
- [Nova Solicitação com triagem IA](#nova-solicitação-com-triagem-ia)
- [Movimento de card no Kanban](#movimento-de-card-no-kanban)
- [Importador Trello](#importador-trello)
- [Detecção de similares](#detecção-de-similares)

## Login

```mermaid
sequenceDiagram
  participant U as Usuario
  participant SPA as SPA
  participant SB as Supabase Auth
  participant HUB as HUB Bloco ID
  U->>SPA: Acessa /auth
  alt SSO
    SPA->>HUB: sso-login
    HUB-->>SPA: token + callback
    SPA->>SB: setSession
  else Email/Senha
    U->>SPA: credenciais
    SPA->>SB: signInWithPassword
  end
  SPA->>SB: get_my_role + is_allowed_user
  SB-->>SPA: role + allowed
  SPA->>U: Redireciona por role
```

## Nova Solicitação com triagem IA

```mermaid
sequenceDiagram
  participant U as Solicitante
  participant SPA as SPA
  participant EF as triagem-demanda
  participant IA as HUB IA Gateway
  participant DB as Postgres
  U->>SPA: Sugerir com IA
  SPA->>EF: descricao
  EF->>IA: prompt
  IA-->>EF: insumos sugeridos
  EF->>DB: ia_uso_log
  EF-->>SPA: sugestao
  U->>SPA: confirma / edita
  SPA->>DB: update solicitacoes
  DB->>DB: trigger compute_scores
```

## Movimento de card no Kanban

```mermaid
graph LR
  A[Card em Coluna X] -->|drag| B[Coluna Y]
  B -->|RPC atividades_reorder_cards| DB[(Postgres)]
  DB -->|Realtime FULL| Sub[Subscribers]
  Sub --> UI[Outras abas / usuarios]
```

## Importador Trello

```mermaid
graph TD
  Up[Upload arquivo Trello] --> EF1[importer-upload]
  EF1 --> Job[(atividades_import_jobs)]
  Job --> Wiz[Wizard 7 passos]
  Wiz --> EF2[importer-run]
  EF2 --> Adapter[Adapter Trello v1]
  Adapter --> Snap[Snapshot normalizado]
  Snap --> Exec[Executor via RPCs atividades_*]
  Exec --> DB[(atividades_boards/colunas/cards)]
```

## Detecção de similares

```mermaid
sequenceDiagram
  participant SPA as NovaSolicitacao
  participant EF as demandas-similares
  participant DB as Postgres
  participant IA as HUB IA
  SPA->>EF: titulo + descricao
  EF->>DB: candidatos por texto/embedding
  EF->>IA: ranking + explicacao
  IA-->>EF: top N
  EF-->>SPA: lista + score
  SPA->>Usuario: exibe DemandasSimilares
```
