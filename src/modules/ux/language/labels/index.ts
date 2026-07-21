/**
 * Empty states humanizados, prontos para uso.
 * Preferir estas mensagens a strings inline "No data" / "Nenhum item".
 */
export const EMPTY_STATES = {
  requests: {
    title: "Você ainda não possui solicitações",
    description: "Quando você registrar um pedido, ele aparecerá aqui.",
    action: "Registrar um pedido",
  },
  inbox: {
    title: "Nada pendente agora",
    description: "Você está em dia! Volte mais tarde para ver novos itens.",
    action: null,
  },
  search: {
    title: "Nada encontrado",
    description: "Tente outras palavras ou verifique a escrita.",
    action: null,
  },
  activities: {
    title: "Nenhuma atividade por aqui",
    description: "Assim que houver movimentação, aparecerá nesta lista.",
    action: null,
  },
} as const;

/** Microcopy padrão para botões e estados comuns. */
export const MICROCOPY = {
  loading: "Carregando…",
  saving: "Salvando…",
  saved: "Salvo",
  retry: "Tentar novamente",
  cancel: "Cancelar",
  confirm: "Confirmar",
  back: "Voltar",
  close: "Fechar",
} as const;
