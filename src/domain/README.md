# src/domain — Bounded Contexts

Organização por contexto de negócio (não por entidade). Cada contexto expõe:

```
<context>/
  entities/       # Modelos ricos (imutáveis) do domínio
  types/          # Tipos e enums do contexto
  dto/            # DTOs para UI (nunca expor entidades cruas)
  mappers/        # entity <-> dto <-> row (Supabase)
  validators/     # Regras de negócio isoladas
  repositories/   # Interfaces + impl Supabase (aditivas, nunca substituem serviços atuais)
  services/       # Regras de aplicação
  events/         # Emissores tipados para o Domain Event Bus
  index.ts        # Barrel público
```

Contextos ativos:

- `shared/` — Result, Repository base, DomainEvent helpers
- `board/` — Boards, colunas, cards, labels (Atividades)
- `requests/` — Solicitações e demandas
- `workflow/` — Workflow definitions e runner v2
- `automation/` — Automações declarativas
- `activities/` — Timeline unificada
- `notifications/` — Central de notificações
- `users/` — Perfis, roles, allowed_emails
- `templates/` — Templates de projeto/card/checklist/automação
- `knowledge/` — Base de conhecimento
- `ai/` — Prompt registry, cache, cost monitor
- `analytics/` — Agregações

Regras:

1. Nenhum arquivo de domínio importa React, Tailwind ou UI.
2. Repositórios expõem interface. Implementações concretas ficam em `repositories/supabase/`.
3. Serviços orquestram repositórios e emitem Domain Events via `domainBus`.
4. UI consome DTOs. Entidades ficam internas ao domínio.
