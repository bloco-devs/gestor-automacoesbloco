# Fase 3 — Botão "Assumir" nos cartões sem responsável

Permitir que o desenvolvedor assuma uma demanda direto do cartão no quadro de `/workspace`, sem abrir o detalhe.

## O que muda na tela

- Todo cartão que hoje mostra o círculo tracejado "Sem responsável" passa a mostrar, no lugar dele, um botão discreto "Assumir".
- Clicar em "Assumir" atribui a demanda à pessoa logada; o cartão não abre.
- Enquanto a atribuição está em curso o botão fica desabilitado; ao terminar, o avatar da pessoa substitui o botão.
- Cartões que já têm responsável seguem exatamente como estão.
- No workspace de projeto o mesmo cartão continua funcionando; lá o botão só aparece se a tela passar a ação.

## Como a ação é ligada (ponto de arquitetura)

O cartão vive em `BoardLente.tsx`, que é compartilhado entre `/workspace` e o workspace de projeto. Chamar `useAcoesDemanda` dentro do cartão não funciona nesta tela: esse hook é criado a partir de um escopo, e `/workspace` soma duas fontes — cartões de quadros (`atividades_cards`) e a fila global (`demands`). Cada demanda pode pertencer a uma fonte diferente, e um hook por cartão com escopo variável quebraria a regra de a UI não saber de onde o dado vem.

Solução: o cartão recebe um callback opcional `onAssumir(id)` e nada mais. Quem resolve a fonte é a página, que já tem o mapa `projetoPorDemanda`.

## Detalhes técnicos

**1. `src/modules/demand-access/useAssumirDemanda.ts` (novo)**

Hook da camada de acesso que expõe `assumir(demandaId, projetoId | null)`. Internamente monta as ações certas por fonte reusando `useAcoesDemanda`:
- `{ tipo: "demanda", demandaId, projetoId }` resolve para `atividades` quando há projeto e `demands` quando não há — exatamente o que `resolverFonte` já faz.
- Como hooks não podem ser criados por item, o hook mantém uma instância para a fila global e uma por projeto ativo é inviável; então ele usa as duas mutações já existentes por baixo (`useCardMutations` para quadro, `useAssignDemand` para `demands`), no mesmo formato que `useAcoesDemanda.atribuir` usa hoje — inclusive removendo o prefixo `u:`/`p:` do id da pessoa no caminho de quadro. Expõe também `emAndamento: Set<string>` para desabilitar o botão do cartão em voo.

**2. `src/modules/workspace-demandas/components/BoardLente.tsx`**

- `Props` e o `Cartao` ganham `onAssumir?: (id: string) => void` e `assumindo?: (id: string) => boolean` (repassados de `BoardLenteImpl` → coluna → cartão).
- No bloco `direita`, quando não há `responsavel` e `onAssumir` existe, renderizar `<button>` "Assumir" no lugar do círculo tracejado. Sem `onAssumir`, o círculo permanece — nenhuma tela existente muda.
- `onClick` do botão faz `e.stopPropagation()` e `e.preventDefault()` antes de chamar `onAssumir(d.id)`, para não disparar o `onClick` do cartão nem o arrasto (`onPointerDown` também para propagar, pois o drag do dnd-kit escuta pointer, não click).
- Estilo com tokens semânticos do design system, não cores fixas: `text-[11px] rounded border border-border/70 bg-muted/60 px-1.5 py-0.5 text-muted-foreground hover:bg-primary/10 hover:text-primary transition-colors`. As classes `bg-blue-50 text-blue-600` sugeridas ficariam fora do tema escuro — mesmo peso visual, tokens corretos.

**3. `src/pages/DeveloperWorkspace.tsx`**

- Usa `useAssumirDemanda` e passa `onAssumir={(id) => assumir(id, projetoPorDemanda.get(id) ?? null)}` e `assumindo` ao `BoardLente`.
- O quadro segue `podeMover={false}`; assumir é a primeira escrita desta tela.
- Toast de erro em caso de falha, usando o `useToast` do projeto.

## Fora do escopo

Banco, RLS, Edge Functions, arrastar cartões, desatribuir, e atribuir a outra pessoa que não a logada.
