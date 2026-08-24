/**
 * Bounded context `demand` — o modelo canônico de Demanda.
 *
 * PROBLEMA QUE ESTE CONTEXTO RESOLVE
 * O sistema tem duas tabelas para "coisa que alguém pediu": `atividades_cards`
 * (herdada da importação do Trello) e `demands` (o modelo de ticket, com SLA,
 * tipo, complexidade, auditoria e campos de IA). A UI do Workspace foi
 * construída sobre a primeira, que é justamente a que não tem nada disso.
 *
 * Trocar a fonte direto seria trocar o objeto central do sistema, com duas
 * verdades convivendo durante a migração. Em vez disso, a UI passa a conhecer
 * APENAS este modelo. Quem traduz é o adapter. Trocar de fonte vira trocar de
 * adapter — reversível, testável, sem quebrar a interface.
 *
 * REGRAS DO DOMÍNIO (ver src/domain/README.md)
 * 1. Nenhum import de React, Tailwind ou UI.
 * 2. Funções puras: nenhuma consulta, nenhum efeito, nenhuma escrita.
 * 3. Os dados chegam já carregados pelos hooks que já existem.
 */

// ---------------------------------------------------------------------------
// Identificação da fonte
// ---------------------------------------------------------------------------

/** De onde a demanda veio. Fica no modelo para rastreabilidade durante a migração. */
export type FonteId = "demands" | "atividades";

/**
 * O que cada fonte consegue responder.
 *
 * Esta é a peça mais importante do contrato. Sem ela, a UI não distingue
 * "esta demanda não tem SLA definido" de "esta fonte não sabe o que é SLA" —
 * e acabaria mostrando um campo vazio como se fosse informação. Com ela, a
 * coluna simplesmente não é renderizada quando a fonte não a suporta.
 */
export interface Capacidades {
  /** `sla_due_at`, `sla_status`, `sla_first_response_at` */
  sla: boolean;
  /** `ai_auto_responded`, `ai_confidence_score`, `ai_response_article_id` */
  ia: boolean;
  /** bug / melhoria / nova_funcionalidade / refatoração / infra / automação */
  tipo: boolean;
  /** fácil / média / difícil */
  complexidade: boolean;
  /** trilha de auditoria consultável (`demand_audit_logs`) */
  auditoria: boolean;
  /** contagem de comentários disponível na listagem */
  comentarios: boolean;
  /** progresso por itens de checklist */
  progresso: boolean;
  /** etiquetas coloridas do quadro */
  etiquetas: boolean;
  /** data de entrega prevista */
  prazo: boolean;
}

export const CAPACIDADES_VAZIAS: Capacidades = {
  sla: false,
  ia: false,
  tipo: false,
  complexidade: false,
  auditoria: false,
  comentarios: false,
  progresso: false,
  etiquetas: false,
  prazo: false,
};

// ---------------------------------------------------------------------------
// Vocabulário do domínio
// ---------------------------------------------------------------------------

/**
 * Categoria de status. As duas fontes têm status diferentes (colunas livres de
 * um lado, enum fixo do outro), então o domínio normaliza para quatro
 * categorias — o suficiente para agrupar, colorir e medir progresso sem que a
 * UI precise conhecer nenhum dos dois vocabulários.
 */
export type StatusCategoria = "aberta" | "andamento" | "espera" | "concluida";

export interface Status {
  /** Id na fonte: id da coluna, ou o enum de `demands`. */
  id: string;
  /** Como o usuário chama. Vem da fonte, nunca é inventado. */
  rotulo: string;
  categoria: StatusCategoria;
  /** Posição na esteira. Ordena os grupos da Lista e as colunas do Board. */
  ordem: number;
}

export type Prioridade = "baixa" | "media" | "alta" | "critica";

export type TipoDemanda =
  | "bug"
  | "melhoria"
  | "nova_funcionalidade"
  | "refatoracao"
  | "infraestrutura"
  | "automacao";

export type Complexidade = "facil" | "media" | "dificil";

export type SlaEstado = "no_prazo" | "atencao" | "estourado" | "pausado" | "cumprido";

export interface Sla {
  estado: SlaEstado;
  venceEm: string | null;
  primeiraRespostaEm: string | null;
}

export interface MarcaIa {
  /** A IA respondeu sozinha (nível 1). */
  respondeuSozinha: boolean;
  /** 0–1. `null` quando a fonte registrou atuação sem confiança. */
  confianca: number | null;
  /** Artigo usado na resposta automática, quando houve. */
  artigoId: string | null;
}

export interface Pessoa {
  id: string;
  nome: string;
  avatarUrl: string | null;
  /**
   * O Blink. Ele já era criado com este campo em `useFioDaDemanda`; agora o
   * tipo o reconhece, para a interface poder dar a ele um símbolo próprio em
   * vez da inicial "B" — que o faz parecer um colega chamado Bruno.
   *
   * Não é o mesmo que `ia`: `participantes()` exclui `ia` da lista de quem
   * está envolvido, e o Blink deve continuar aparecendo lá.
   */
  sistema?: boolean;
}

export interface Etiqueta {
  id: string;
  nome: string;
  cor: string | null;
}

export interface Sistema {
  id: string;
  nome: string;
}

export interface Progresso {
  feitos: number;
  total: number;
  /** 0–100. Já arredondado — nenhum consumidor precisa recalcular. */
  percentual: number;
}

/**
 * Por que a demanda pede atenção.
 *
 * Ordem de precedência: SLA estourado > atrasada > vence hoje > SLA em atenção
 * > parada > vence em breve. A UI nunca decide isso — recebe pronto, e assim
 * Lista, Board, Sprint, Timeline e Gantt não podem discordar entre si.
 */
export type Risco =
  | "sla_estourado"
  | "atrasada"
  | "vence_hoje"
  | "sla_atencao"
  | "parada"
  | "vence_em_breve"
  | null;

// ---------------------------------------------------------------------------
// O modelo canônico
// ---------------------------------------------------------------------------

/**
 * A única forma de "demanda" que a interface conhece.
 *
 * Campos `null` significam ausência de valor. Para saber se a ausência é
 * "não preenchido" ou "a fonte não suporta", consulte `Capacidades`.
 */
export interface Demanda {
  id: string;
  /** Curto e humano, para citar em conversa: `#142`, `#a1b2c3`. */
  referencia: string;
  titulo: string;
  descricao: string;

  status: Status;
  prioridade: Prioridade | null;
  tipo: TipoDemanda | null;
  complexidade: Complexidade | null;
  sistema: Sistema | null;

  responsaveis: Pessoa[];
  autor: Pessoa | null;

  criadaEm: string;
  atualizadaEm: string;
  /** Dias inteiros desde a última movimentação. Pré-calculado para ordenação barata. */
  diasParada: number;

  prazo: string | null;
  sla: Sla | null;
  ia: MarcaIa | null;

  progresso: Progresso | null;
  comentarios: number | null;
  anexos: number | null;
  etiquetas: Etiqueta[];

  concluida: boolean;
  risco: Risco;

  /** Rastreabilidade durante a convivência das duas fontes. */
  fonte: FonteId;
}

/** O que um adapter devolve: as demandas e o que aquela fonte sabe responder. */
export interface ResultadoFonte {
  demandas: Demanda[];
  capacidades: Capacidades;
  fonte: FonteId;
}

// ---------------------------------------------------------------------------
// Rótulos — pertencem ao domínio porque são vocabulário, não estilo
// ---------------------------------------------------------------------------

export const RISCO_ROTULO: Record<Exclude<Risco, null>, string> = {
  sla_estourado: "SLA estourado",
  atrasada: "Atrasada",
  vence_hoje: "Vence hoje",
  sla_atencao: "SLA em atenção",
  parada: "Parada",
  vence_em_breve: "Vence em breve",
};

export const PRIORIDADE_ROTULO: Record<Prioridade, string> = {
  baixa: "Baixa",
  media: "Média",
  alta: "Alta",
  critica: "Crítica",
};

export const TIPO_ROTULO: Record<TipoDemanda, string> = {
  bug: "Bug",
  melhoria: "Melhoria",
  nova_funcionalidade: "Nova funcionalidade",
  refatoracao: "Refatoração",
  infraestrutura: "Infraestrutura",
  automacao: "Automação",
};

export const COMPLEXIDADE_ROTULO: Record<Complexidade, string> = {
  facil: "Fácil",
  media: "Média",
  dificil: "Difícil",
};

/**
 * Severidade do risco. Único lugar onde a ordem de gravidade é decidida.
 * Maior = mais urgente.
 */
export const RISCO_SEVERIDADE: Record<Exclude<Risco, null>, number> = {
  sla_estourado: 600,
  atrasada: 500,
  vence_hoje: 400,
  sla_atencao: 300,
  parada: 200,
  vence_em_breve: 100,
};
