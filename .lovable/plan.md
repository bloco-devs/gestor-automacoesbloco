## Remover a aba "Catálogos" de Configurações

### Mudanças

**`src/pages/Configuracoes.tsx`**
- Remover o `<TabsTrigger value="catalogos">` e o `<TabsContent value="catalogos">`.
- Remover o import de `CatalogosPanel`.
- Como sobra só uma aba ("Acessos"), simplificar removendo o `Tabs`/`TabsList` e renderizar `AcessosPanel` diretamente. (Posso manter o `Tabs` se preferir, mas com uma única aba fica visualmente vazio.)

**`src/components/configuracoes/CatalogosPanel.tsx`**
- Deletar o arquivo (não é mais referenciado).

**`src/lib/tiposDemanda.ts`**
- Deletar o arquivo (helpers só usados pelo painel removido).

### O que NÃO será alterado

- Tabela `tipos_demanda` no banco permanece (mantém os 5 tipos seed). Posso adicionar uma migration de `DROP TABLE` se preferir limpar tudo — confirme.
- Nada em Setores/Plataformas é alterado (CRUDs continuam disponíveis em outros lugares, como `/departamentos`).
