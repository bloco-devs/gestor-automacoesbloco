export {
  getPreferencias,
  salvarPreferencias,
  listarFila,
  reenviar,
  processarFilaAgora,
  PREFERENCIAS_PADRAO,
  ROTULO_EVENTO,
  type PreferenciasEmail,
  type ItemFilaEmail,
  type EventoEmail,
  type SituacaoEnvio,
  type ResumoProcessamento,
} from "./service";

export {
  usePreferenciasEmail,
  useSalvarPreferenciasEmail,
  useFilaEmail,
  useReenviarEmail,
  useProcessarFila,
} from "./hooks";
