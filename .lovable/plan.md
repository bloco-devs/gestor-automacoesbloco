## Objetivo
Regerar `solicitacoes.csv` priorizando legibilidade para quem vai consumir o arquivo, sem alterar nada no banco nem no app.

## O que muda no CSV

**1. Cabeçalhos em português, amigáveis**
- `id` → `ID`
- `titulo` → `Título`
- `descricao` → `Descrição`
- `setor` → `Setor`
- `status` → `Status`
- `solicitante_nome` → `Solicitante`
- `email` → `E-mail`
- `telefone` → `Telefone`
- `created_at` → `Criado em`
- `updated_at` → `Atualizado em`
- `data_inicio_prevista` → `Início previsto`
- `data_fim_prevista` → `Fim previsto`
- `frequencia` → `Frequência`
- `retorno` → `Retorno`
- `complexidade` → `Dificuldade (solicitante)`
- `complexidade_dev` → `Complexidade (dev)`
- `score` → `Score`
- `tem_integracao` → `Tem integração?`
- `integracoes` → `Integrações`
- `notas_tecnicas_complexidade` → `Notas técnicas`

**2. Reordenação por prioridade de leitura**
1. Identificação: ID curto (8 chars), Título, Status, Setor
2. Solicitante: Nome, E-mail, Telefone
3. Datas: Criado em, Atualizado em, Início previsto, Fim previsto
4. Avaliação: Score, Frequência, Retorno, Dificuldade (solicitante), Complexidade (dev)
5. Integrações: Tem integração?, Integrações
6. Texto longo no fim: Descrição, Notas técnicas

**3. Formatação dos valores**
- Status traduzido (`novo` → "Novo", `em_analise` → "Em Análise", etc.)
- Datas em `DD/MM/AAAA HH:MM` (timezone America/Sao_Paulo)
- Datas previstas em `DD/MM/AAAA`
- `tem_integracao` → "Sim"/"Não"
- `integracoes` (array) → lista separada por `; `
- Campos vazios ficam em branco (sem `""` literal nem `null`)
- Quebras de linha dentro da descrição preservadas com aspas (CSV padrão RFC 4180)
- Separador `,`, encoding UTF-8 com BOM (abre certo no Excel BR)

**4. Entrega**
- Sobrescreve `/mnt/documents/solicitacoes.csv` (versão limpa)
- Mantém os 61 registros, ordenados por **Criado em desc**

## Fora de escopo
- Nenhuma migração, alteração de RLS, ou mudança no app.
- Sem gerar `.xlsx` (a menos que você peça).