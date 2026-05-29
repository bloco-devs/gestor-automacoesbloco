# Plano: Aba "Diagrama" para Desenvolvedores

Nova rota `/diagrama` exclusiva do perfil developer, exibindo todas as Soluções como nós em um canvas tipo Lucidchart, com conexões desenhadas manualmente e posições compartilhadas entre todos os devs.

## Mudanças no banco (Supabase)

Duas novas tabelas (com GRANTs e RLS para admin/dev):

1. **`solucao_diagrama_posicoes`** — posição global de cada Solução no canvas
   - `solucao_id` (uuid, único), `x` (numeric), `y` (numeric), `updated_at`, `updated_by`
   - RLS: SELECT para qualquer allowed_user; INSERT/UPDATE/DELETE só admin (developer)

2. **`solucao_diagrama_conexoes`** — arestas entre Soluções
   - `id`, `source_id` (uuid), `target_id` (uuid), `label` (text, opcional), `created_by`, `created_at`
   - Constraint: `source_id <> target_id`, unique (`source_id`,`target_id`)
   - RLS: SELECT para allowed_user; INSERT/UPDATE/DELETE só admin

## Dependência

Adicionar `@xyflow/react` (React Flow v12).

## Mudanças no frontend

- **`src/components/AppLayout.tsx`** — adicionar item "Diagrama" (ícone `Workflow` ou `Network` do lucide) ao `devNav`, posicionado antes de "Configurações".
- **`src/App.tsx`** — registrar rota protegida `/diagrama` com `role="developer"` apontando para nova página.
- **`src/pages/Diagrama.tsx`** (novo) — página com layout em altura cheia:
  - Carrega Soluções (com plataforma + setor + ícone), posições e conexões em paralelo.
  - Renderiza `<ReactFlow>` com `MiniMap`, `Controls`, `Background`, pan/zoom.
  - Nós customizados (componente `SolucaoNode`) mostrando: ícone da plataforma, nome, badge de status, setor. Clique no nó navega para `/solucoes/:id`.
  - Soluções sem posição salva recebem layout em grid inicial.
  - Drag de nó faz debounce (~500 ms) e persiste `x,y` em `solucao_diagrama_posicoes` (upsert).
  - `onConnect` cria aresta no Supabase; clicar em aresta + tecla Delete remove.
  - Realtime opcional (postgres_changes) para refletir mudanças de outros devs.
- **`src/lib/diagrama.ts`** (novo) — helpers: `listPosicoes`, `upsertPosicao`, `listConexoes`, `createConexao`, `deleteConexao`.

## Detalhes técnicos

- Plataforma do nó: usar `plataformas.icone` (já existe) + nome.
- Cores do status: reaproveitar mapeamento já usado em `StatusBadge` / Kanban de Soluções.
- Tokens de design: todas as cores via tokens HSL existentes (`--background`, `--border`, `--primary`, etc.), sem cores hardcoded.
- Soluções deletadas em outro lugar ficam órfãs nas tabelas novas — limpar via `ON DELETE CASCADE` lógico (ou ignorar no frontend filtrando por solução existente).

## Fora de escopo

- Edição de Solução dentro do diagrama (apenas navegação para o detalhe).
- Posições por usuário (foi escolhido global).
- Sugestões automáticas de conexões.
- Agrupamentos/containers visuais por setor ou plataforma.
