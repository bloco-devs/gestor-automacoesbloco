# Personas

## Índice
- [Solicitante](#solicitante)
- [Builder](#builder)
- [Desenvolvedor](#desenvolvedor)
- [Administrador](#administrador)
- [Gestor / Diretoria](#gestor--diretoria)

## Solicitante
- **Role**: `requester`
- **Necessidade**: registrar demandas de automação e acompanhar seu andamento.
- **Ferramentas**: `/dashboard-solicitante`, `/minhas-solicitacoes`, `/nova-solicitacao`.
- **Poderes**: criar, editar campos permitidos da sua solicitação, comentar.
- **Restrições**: não altera `complexidade_dev`, `status`, `avaliado_por` — trigger `enforce_dev_only_columns` bloqueia.

## Builder
- **Role**: `builder`
- **Perfil híbrido**: usuário avançado que constrói pequenas automações. Herda todas as rotas de `requester` (ver `ProtectedRoute`).
- **Necessidade**: registrar demandas próprias e enxergar contexto do backlog.

## Desenvolvedor
- **Role**: `developer`
- **Necessidade**: priorizar, executar, encerrar demandas; manter Atividades, Soluções, Diagrama.
- **Ferramentas**: `/dashboard`, `/solicitacoes[/kanban|/gantt]`, `/solucoes[/kanban|/gantt|/:id]`, `/atividades`, `/diagrama`, `/consolidacao`, `/observabilidade-ia`, `/configuracoes`.
- **Poderes**: avaliar complexidade (score final), mover Kanban, criar soluções, importar quadros Trello.

## Administrador
- **Marcador**: `allowed_emails.role in ('developer','administrador')` + linha em `user_roles` com `role='admin'`.
- **Necessidade**: gerenciar `allowed_emails`, papéis, configuração, auditoria.
- **Poderes extras**: `viewAs` (alternar entre `developer|requester|builder` sem sair da sessão), acesso a rotas `role="developer"` mesmo em modo de visão de solicitante.

## Gestor / Diretoria
- **Perfil de leitura**: consumidor do Dashboard e do Diagrama.
- **Necessidade**: entender pipeline, riscos do ecossistema e ROI das automações.
- **Ferramentas**: `/dashboard` + `/diagrama` + `Resumo executivo` (IA).
