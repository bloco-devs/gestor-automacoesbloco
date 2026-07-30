# Triagem: parar de devolver "Sistema não identificado"

Escopo: apenas a lógica de extração do LLM na triagem. Sem mudança de UI, banco ou RLS.

## O que foi verificado

- A lista de sistemas já chega à IA: `useAIWorkspace` envia `sistemas` (slug + nome) → `aiOrchestrator.finalize` → `triagem-demanda`, e a Edge Function já monta o bloco `SISTEMAS` no prompt com todos os slugs (ex.: `rh — Gestão de RH`, `processos — Gestão de Processos/SGPO`, `obra — Gestão de Obra`).
- Portanto o problema não é falta de contexto — é o próprio prompt e a validação pós-resposta:
  1. O system prompt diz literalmente **"Se incerto, use null"**, o que empurra o modelo ao null sempre que a menção é informal ("RH", "pessoal do RH") e não bate com o nome cadastrado ("Gestão de RH").
  2. Na validação, um slug válido é **descartado** quando `tipo_demanda === "novo_sistema"` — se o modelo erra o tipo, o sistema some junto.

## Mudanças (arquivo único: `supabase/functions/triagem-demanda/index.ts`)

1. **System prompt mais assertivo sobre o sistema alvo**
   - Instrução explícita: analisar o texto em busca do sistema/área afetada (RH, Recursos Humanos, Processos, Obras, Suprimentos, Financeiro, Comercial, etc.) e mapear para o slug mais próximo da lista `SISTEMAS`.
   - Regra invertida: `sistema_alvo_slug` **não deve ser null** se houver qualquer menção a área, setor ou software que corresponda a um item da lista. Null passa a ser exceção, reservada a demandas genuinamente sem sistema identificável na lista.
   - Orientar o casamento semântico: sigla, nome parcial, sinônimo e nome do setor valem ("RH" → `rh`, "obra"/"canteiro" → `obra`, "SGPO" → `processos`).
   - Manter a proibição de inventar slug fora da lista.

2. **Reforçar o bloco `SISTEMAS` no user message**
   - Além de `slug — nome`, incluir o grupo/área quando disponível e uma linha final lembrando que a resposta deve usar exatamente um dos slugs listados. O front passa a enviar também o `grupo` do sistema (campo opcional já disponível em `useEcossistemaSistemas`), sem alterar contratos existentes.

3. **Rede de segurança determinística no servidor** (roda só quando o LLM devolve null)
   - Normalizar título + descrição (minúsculas, sem acento) e procurar menção ao slug, ao nome do sistema ou a apelidos conhecidos (`rh`/`recursos humanos`, `sgpo`/`processos`, `obra`/`obras`/`canteiro`, `suprimentos`/`compras`, `financeiro`, `comercial`/`vendas`, `portfólio`, `incorporação`, `projetos`, `contratos`).
   - Casar por palavra inteira para evitar falso positivo, e só preencher quando houver exatamente um candidato — ambiguidade continua null.
   - A justificativa registra quando o sistema veio dessa inferência textual.

4. **Corrigir o descarte cruzado**
   - Deixar de zerar `sistema_alvo_slug` quando `tipo_demanda === "novo_sistema"`. Em vez disso, se o modelo indicar um sistema válido da lista, ajustar o tipo para `novo_modulo`, que é o significado real de "capacidade nova dentro de um sistema existente".

Depois da alteração, a função `triagem-demanda` é publicada e testada com um texto mencionando "RH" para confirmar que o slug volta preenchido.

## Fora de escopo

- Nenhuma mudança em `useAIWorkspace`, componentes, tabelas ou políticas — o front continua apenas exibindo o nome do sistema resolvido pelo slug.
