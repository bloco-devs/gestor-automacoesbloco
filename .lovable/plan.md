## Objetivo
Permitir excluir soluções diretamente na aba **Soluções**. Ao excluir, a solução desaparece automaticamente da demanda à qual estava vinculada (e suas melhorias associadas também são removidas).

## Mudanças

### 1. `src/lib/supabaseData.ts`
Adicionar função `deleteSolucao(id)` que:
- Apaga primeiro as melhorias vinculadas (`demanda_melhorias` onde `solucao_id = id`)
- Em seguida apaga a solução em `demanda_solucoes`

Isso garante que a tela de detalhe da demanda (que lista soluções por `solicitacao_id`) deixe de exibir essa solução imediatamente, via o realtime já existente em `useSupabaseData`.

### 2. `src/pages/Solucoes.tsx`
- Adicionar um botão de excluir (ícone lixeira) no cabeçalho de cada `SolucaoCard`.
- Confirmação via `AlertDialog` antes de excluir, avisando que a ação também remove a solução da demanda vinculada e apaga as melhorias registradas.
- Ao confirmar, chamar `deleteSolucao(id)` e exibir toast de sucesso/erro.

## Comportamento esperado
- Usuário clica na lixeira em uma solução → confirma → solução some da aba Soluções, some da página de detalhe da demanda original, e suas melhorias são removidas.
- Atualização em tempo real já é tratada pelo hook `useSupabaseData` (que escuta `demanda_solucoes` e `demanda_melhorias`).

## Fora de escopo
- Nenhuma mudança em outras abas além das atualizações automáticas refletidas pelo realtime.
- Sem alteração de schema/RLS — políticas já permitem DELETE para usuários autorizados.