## Visão geral
Duas frentes para a aba **Atividades**:
1. Permitir que um mesmo login (ex.: `tecnologiabloco@gmail.com`) apareça como dois responsáveis distintos no kanban (Nielson e André).
2. Tornar o board mais visual: destaque dos cards do usuário logado (anel + fundo iluminado) e uma faixa lateral colorida indicando prioridade.

---

## 1. Dois responsáveis para o mesmo login (personas)

A tabela `allowed_emails` tem `UNIQUE(email)`, então não dá para duplicar o usuário lá. A solução é introduzir o conceito de **persona**: um "responsável" exibido no kanban que aponta para um `auth.users` real.

### Banco
- Nova tabela `public.atividades_personas` com:
  - `id` (uuid, PK) — usado em `atividades_cards.responsavel_ids`
  - `user_id` (uuid, FK lógica para `auth.users.id`)
  - `nome` (text)
  - `ativo` (bool, default true)
  - timestamps + trigger de `updated_at`
- GRANTs + RLS (leitura para `authenticated`, escrita restrita a admin via `has_role`).
- Para `tecnologiabloco@gmail.com`, seed manual de duas personas: "Nielson" e "André".

### Backend / helpers
- Nova função em `src/lib/atividades.ts`: `listAtividadesAssignables()` que devolve a união de:
  - usuários reais de `list_assignable_users` que **não** têm personas, e
  - todas as personas ativas (cada uma com seu próprio id mas resolvendo para o `user_id` real).
- Tipo `AtividadeAssignable = { id, nome, email, role, userId }` onde `userId` é o `auth.users.id` real (igual a `id` quando não é persona).

### UI
- `CardDialog` e filtros do `Atividades.tsx` passam a usar `AtividadeAssignable` em vez de `AssignableUser`. Quando um usuário tem personas, **somente** as personas aparecem (não o nome "cru") para evitar três opções para a mesma pessoa.
- Cards existentes que apontam para o user_id real continuam funcionando: o mapa de resolução faz fallback para o nome real do usuário quando o id não bate com nenhuma persona.

---

## 2. Kanban mais visual

### 2a. Destaque dos cards do usuário logado
- Helper `isMyCard(card)` que retorna true se o `auth.user.id` aparece em `responsavelIds` **ou** se alguma persona ligada a esse `user_id` aparece em `responsavelIds`.
- No `KanbanCard`:
  - **Anel colorido**: `ring-2 ring-primary/60` quando `isMyCard`.
  - **Fundo iluminado**: gradiente tonal suave usando tokens (`bg-primary/5` + leve glow via `shadow-[0_0_0_1px_hsl(var(--primary)/0.25)]`). Todos os valores via tokens semânticos do `index.css` — sem cores hardcoded.
- Sem badge "Você" e sem esmaecer os outros (conforme escolhido).

### 2b. Cor por prioridade
- Adicionar coluna `prioridade` em `atividades_cards`:
  - tipo: `text` com check (`baixa | media | alta | urgente`), default `media`, nullable false.
- Tokens novos em `src/index.css` (HSL): `--priority-low`, `--priority-medium`, `--priority-high`, `--priority-urgent` + mapeados em `tailwind.config.ts`.
- `CardDialog` ganha um `Select` "Prioridade".
- `KanbanCard` recebe uma **faixa lateral esquerda** de 4px usando a cor da prioridade (`border-l-4` + bg do token correspondente). Cards sem prioridade definida ficam neutros.
- Tooltip no chip mostrando o nome da prioridade.

---

## Detalhes técnicos

### Migração SQL (estrutura)
```text
1) CREATE TABLE public.atividades_personas (...)
   GRANT SELECT TO authenticated; GRANT ALL TO service_role;
   ENABLE RLS;
   POLICY select: authenticated
   POLICY insert/update/delete: has_role(auth.uid(),'admin')

2) ALTER TABLE public.atividades_cards
   ADD COLUMN prioridade text NOT NULL DEFAULT 'media'
   CHECK (prioridade IN ('baixa','media','alta','urgente'));
```

### Insert de personas (separado, via data tool)
- `INSERT INTO atividades_personas (user_id, nome) VALUES ((select id from auth.users where email='tecnologiabloco@gmail.com'), 'Nielson'), (..., 'André');`

### Arquivos a tocar
- **Editar**: `src/lib/atividades.ts` (novo helper + tipo + prioridade em mapCard/createCard/updateCard), `src/pages/Atividades.tsx` (uso de assignables, isMyCard, faixa de prioridade, anel/fundo), `src/components/atividades/CardDialog.tsx` (select de prioridade + uso do novo tipo de assignable), `src/index.css` (tokens de prioridade), `tailwind.config.ts` (mapear tokens).
- **Sem mudança**: `list_assignable_users` continua existindo para o resto do app; só a aba Atividades passa pelo novo helper.

### Compatibilidade
- Cards antigos sem prioridade recebem `media` pelo default.
- Cards antigos com `responsavel_ids` apontando para o user real continuam mostrando o nome real (fallback no mapa).
- Atribuir um card ao "Nielson" grava o id da persona; ao filtrar/destacar pelo usuário logado, comparamos o `userId` resolvido — então um card atribuído a "André" ainda acende para o login `tecnologiabloco@gmail.com`.

---

## Fora de escopo (não fazer agora)
- Renomear personas via UI / CRUD de personas (pode ser feito depois pelo admin via SQL).
- Reordenar prioridades automaticamente.
- Filtro por prioridade (pode entrar numa próxima iteração).
