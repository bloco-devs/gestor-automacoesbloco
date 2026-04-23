
# Sistema de Gestão de Demandas de Automação

Plataforma interna para o setor solicitar automações/aplicativos e o desenvolvedor priorizar e gerenciar o pipeline de entrega.

## Identidade visual
- **Fundo principal**: `#0C0C0C` (preto profundo)
- **Texto/superfícies claras**: `#E5E3DF`
- **Apoio/secundário**: `#8B796D` (marrom suave)
- **Destaque sutil**: `#FFDA5B` (apenas em CTAs principais, badges de score alto e indicadores ativos)
- Tipografia limpa sans-serif, espaçamento generoso, cantos suavemente arredondados, estilo dashboard moderno e sóbrio.

## Autenticação e papéis
- Login/cadastro por **email + senha** (Lovable Cloud).
- **Um único desenvolvedor fixo** (email definido em constante/role no banco). Todos os outros usuários são solicitantes automaticamente.
- Roteamento condicional: ao logar, solicitante vai para "Minhas Demandas"; desenvolvedor vai para o "Dashboard Dev".

## Visão Solicitante
1. **Nova Solicitação** (formulário):
   - Título da demanda
   - Descrição da atividade atual
   - Frequência (Diária / Semanal / Mensal / Eventual) → 1-4
   - Complexidade / "Chato de fazer" (1-5)
   - Retorno esperado (1-5: tempo economizado, impacto)
   - Dificuldade estimada de desenvolvimento (1-5, opcional — dev pode ajustar)
2. **Minhas Demandas**: lista das próprias solicitações com status atual (badge colorido), score calculado e linha do tempo do pipeline (visual de etapas com a atual destacada em amarelo).

## Visão Desenvolvedor
1. **Dashboard de priorização**:
   - Tabela/cards de todas as solicitações ordenadas por **score** (média dos 4 fatores normalizada 0-100).
   - Filtros por status, solicitante e faixa de score.
   - Métricas no topo: total de demandas, em desenvolvimento, prontas, em produção.
2. **Kanban do pipeline** com 7 colunas: *Novo → Em Análise → Aprovado → Em Desenvolvimento → Testando → Pronto → Em Produção*. Drag-and-drop para mover cartões entre estados; cada card mostra título, solicitante, score e ícone de complexidade.
3. **Detalhe da demanda**: ajusta dificuldade/complexidade (recalcula score), edita status, adiciona notas técnicas.
4. **Soluções desenvolvidas**: catálogo das demandas que chegaram em "Pronto"/"Em Produção", com descrição da solução final.
5. **Integrações entre soluções**: cadastro de relações (solução A consome / alimenta solução B), exibidas como lista de pares com tipo de integração.
6. **Histórico de melhorias**: para cada solução, registrar melhorias futuras planejadas/aplicadas (data, descrição, status).

## Banco de dados (Lovable Cloud)
- `profiles` — dados básicos do usuário (id ↔ auth.users)
- `user_roles` — papel `developer` / `requester` (com função `has_role` security definer)
- `solicitacoes` — demandas, fatores de score, score calculado, status do pipeline, FK ao solicitante
- `solucoes` — soluções entregues vinculadas à solicitação
- `integracoes` — pares de soluções relacionadas + tipo
- `melhorias` — melhorias por solução (descrição, status, data)
- RLS: solicitante só vê/edita as próprias solicitações; desenvolvedor vê e gerencia tudo.

## Entregáveis técnicos
- Páginas: `/auth`, `/` (redirect por papel), `/nova-demanda`, `/minhas-demandas`, `/dashboard`, `/kanban`, `/solucoes`, `/integracoes`, `/demanda/:id`.
- Componentes-chave: `RequestForm`, `StatusTimeline`, `PriorityTable`, `KanbanBoard`, `SolutionCard`, `IntegrationsManager`, `ImprovementsHistory`.
- Realtime do Supabase nas tabelas `solicitacoes` para que o solicitante veja mudanças de status em tempo real.
