# Melhorias na aba Atividades

## 1. Múltiplos nomes por usuário (Nielson e André no mesmo login)

A tabela `atividades_personas` já existe (id, user_id, nome, ativo). Vamos reaproveitá-la — cada usuário pode ter N personas; quem não tem nenhuma cai num modo "1 persona = nome do perfil".

### Modelagem

- Inserir 2 personas para `tecnologiabloco@gmail.com`: "Nielson" e "André".
- Em `atividades_cards`, adicionar coluna `responsavel_persona_ids uuid[]` (default `{}`). Mantemos `responsavel_ids` (user_ids) para compatibilidade e regras de permissão/notificação — preenchido automaticamente a partir das personas selecionadas.
- Sem mudança de RLS: personas herdam permissão do dono do card (já coberta).

### UX no CardDialog

- A lista atual de "Responsáveis" passa a mostrar **personas** em vez de usuários:
  - Para usuários sem persona cadastrada: aparece 1 item com o nome do perfil.
  - Para `tecnologiabloco@gmail.com`: aparecem 2 itens — "Nielson" e "André" — agrupados visualmente sob o e-mail do usuário (label pequena em cinza).
- Seleção é multi-check, igual hoje. Ao salvar, persistimos `responsavel_persona_ids` e derivamos `responsavel_ids` (distinct user_ids das personas escolhidas).
- Exibição do card no board: chips mostram o **nome da persona** (não mais o nome do usuário).

### Onde personas são gerenciadas (escopo desta entrega)

- Apenas seed inicial das 2 personas do `tecnologiabloco@gmail.com` via migration. UI de gestão de personas fica fora deste plano (pode ser feita depois em Configurações).

## 2. Iluminação amarela nos cards do usuário logado

- No `Atividades.tsx`, ao renderizar cada card, comparar `currentUser.id` com `card.responsavelIds` (após a migração, equivalente ao conjunto de `user_id` das personas selecionadas).
- Quando o usuário logado é responsável, aplicar destaque amarelo:
  - `ring-2 ring-yellow-400/70`
  - `shadow-[0_0_18px_rgba(250,204,21,0.55)]`
  - fundo levemente amarelado: `bg-yellow-50/40 dark:bg-yellow-500/5`
  - transição suave (`transition-shadow`)
- Sem animação pulsante (pode distrair em colunas com muitos cards). Se preferir glow pulsante depois, ajustamos.

## Detalhes técnicos

**Migration**
```sql
ALTER TABLE public.atividades_cards
  ADD COLUMN IF NOT EXISTS responsavel_persona_ids uuid[] NOT NULL DEFAULT '{}';

-- Seed personas do tecnologiabloco@gmail.com
INSERT INTO public.atividades_personas (user_id, nome, ativo)
SELECT u.id, x.nome, true
FROM auth.users u
CROSS JOIN (VALUES ('Nielson'), ('André')) AS x(nome)
WHERE lower(u.email) = 'tecnologiabloco@gmail.com'
  AND NOT EXISTS (
    SELECT 1 FROM public.atividades_personas p
    WHERE p.user_id = u.id AND p.nome = x.nome
  );
```

**Frontend**
- `src/lib/atividades.ts`: incluir `responsavel_persona_ids` no select/insert/update; expor `responsavelPersonaIds` no tipo `Card`. Nova função `fetchPersonas()` (id, userId, nome).
- `src/components/atividades/CardDialog.tsx`: trocar lista de usuários por lista de personas (agrupadas por usuário). Estado `responsavelPersonaIds`. Ao salvar, derivar `responsavelIds` a partir das personas.
- `src/pages/Atividades.tsx`:
  - Carregar personas junto com cards (mapa `personaId → { userId, nome }`).
  - Renderizar chips do card usando nomes de persona.
  - Aplicar classes de glow amarelo quando `card.responsavelIds.includes(currentUser.id)`.

## Fora do escopo
- Tela de CRUD de personas.
- Mudar regras de notificação/permissão (continuam baseadas em `responsavel_ids`/`user_id`).
