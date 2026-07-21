# Glossário

| Termo | Definição |
| --- | --- |
| **Solicitação** | Registro criado por um solicitante descrevendo uma automação desejada. Vive em `solicitacoes`. |
| **Solução** | Automação/app entregue pelo time. Vive em `solucoes`. Pode atender várias solicitações. |
| **Demanda** | Sinônimo de Solicitação (linguagem antiga; rotas legadas ainda redirecionam). |
| **Score** | Nota `0–100` do solicitante calculada como `(frequência + complexidade + retorno)/30 × 100`. |
| **Score final** | Score ajustado pela `complexidade_dev`: `score × (10-complexidade_dev)/10`. |
| **Pipeline** | Fluxo de status da solicitação até a conclusão. |
| **Kanban** | Visualização por colunas (Solicitações, Soluções ou Atividades). |
| **Board / Quadro** | Kanban do módulo Atividades. |
| **Coluna** | Linha vertical do board (backlog, a fazer, em andamento, ...). |
| **Card** | Item individual do board. |
| **Etiqueta / Label** | Rótulo colorido aplicado a cards (paleta Trello). |
| **WIP** | Work In Progress; limite opcional por coluna. |
| **Persona** | Perfil (foto/nome) atribuído a cards para representar responsáveis. |
| **Membro** | Usuário com papel em um board (`owner|admin|member|viewer`). |
| **Task** | Item de checklist dentro de solução/solicitação. |
| **Consolidação** | Processo de vincular uma nova demanda a uma solução existente. |
| **Ecossistema** | Conjunto vivo de sistemas Bloco visíveis no `/diagrama`. |
| **HUB** | Projeto Supabase Bloco ID (`yzuvwhszpyxchlejxsjd`), fonte de SSO/catálogo/IA. |
| **Bloco ID** | Marca do SSO federado da Bloco. |
| **SSO** | Single Sign-On via HUB. |
| **RLS** | Row Level Security do Postgres. |
| **RBAC** | Role Based Access Control (roles no frontend). |
| **RPC** | Função remota no Postgres chamada via PostgREST. |
| **Realtime** | Canal Supabase que empurra eventos de `postgres_changes`. |
| **ViewAs** | Recurso de admin para simular outro perfil sem sair da sessão. |
| **AllowedEmails** | Whitelist de acessos autorizados ao app. |
| **ia_uso_log** | Telemetria de cada chamada de IA. |
| **Snapshot** | Formato normalizado de importação (RFC-001). |
| **Adapter** | Módulo que traduz um formato externo (ex.: Trello) em snapshot. |
| **Runner** | Executor do snapshot que grava via RPCs. |
| **Sprint** | Ciclo de trabalho do time (não é entidade no banco; conceito organizacional). |
