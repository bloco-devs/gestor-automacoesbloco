# Permissões

## Índice
- [Modelo](#modelo)
- [Roles](#roles)
- [RBAC no frontend](#rbac-no-frontend)
- [RLS no banco](#rls-no-banco)
- [Matriz de acesso](#matriz-de-acesso)
- [ViewAs](#viewas)

## Modelo
Dois eixos:
1. **Elegibilidade** — está em `allowed_emails`? (`is_allowed_user()`).
2. **Papel** — `admin` em `user_roles` (`has_role(uid, 'admin')`) e role de aplicação em `allowed_emails.role`.

## Roles

| Role (`allowed_emails.role`) | `user_roles.admin` | Rotas alvo |
| --- | --- | --- |
| `requester` | não | `/dashboard-solicitante`, `/minhas-solicitacoes`, `/nova-solicitacao` |
| `builder` | não | herda `requester` |
| `developer` | sim | rotas de dev + admin |
| `administrador` | sim | tudo + configurações + viewAs |

## RBAC no frontend
`ProtectedRoute` avalia:
- Sessão válida.
- Se `role="developer"` e `user.isAdministrador`, permite (bypass admin).
- `builder` é normalizado como `requester` para checagem de rota.

## RLS no banco
- Toda mutação passa por policies referenciando `auth.uid()` + `has_role()` + `is_allowed_user()`.
- Funções RPC de Atividades usam `atividades_can_view/edit/admin_board`.
- Importador escopa por `criado_por = auth.uid()`.

## Matriz de acesso

| Recurso | Requester | Builder | Developer | Admin |
| --- | --- | --- | --- | --- |
| Criar solicitação | ✅ | ✅ | ✅ | ✅ |
| Ver todas as solicitações | própria | própria | ✅ | ✅ |
| Alterar `complexidade_dev` | ❌ | ❌ | ✅ | ✅ |
| Kanban de solicitações | leitura | leitura | ✅ | ✅ |
| Módulo Atividades | ❌ | ❌ | ✅ | ✅ |
| Importador Trello | ❌ | ❌ | ✅ | ✅ |
| Configurações | ❌ | ❌ | ✅ | ✅ |
| Observabilidade IA | ❌ | ❌ | ✅ | ✅ |
| `viewAs` | ❌ | ❌ | ❌ | ✅ |
| Gerenciar `allowed_emails` | ❌ | ❌ | ❌ | ✅ |

## ViewAs
- Persistido em `localStorage.viewAsRole`.
- Apenas admins efetivam a troca; `setViewAs` ignora chamada para não-admins.
- Serve para admin simular a experiência de outro perfil sem sair da sessão.
