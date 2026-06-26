/**
 * Onda 7 — Dados-SEMENTE da camada "Ecossistema" do mapa.
 *
 * Fonte estática usada apenas para demonstração visual; a fonte real
 * virá do HUB nas ondas 5/6 (basta trocar a origem dos dados aqui,
 * sem alterar o Diagrama).
 */

export type SistemaGrupo =
  | "Identidade"
  | "Comercial"
  | "Pessoas"
  | "Processos"
  | "Operação"
  | "Obra"
  | "Financeiro"
  | "Empreendimentos"
  | "Viabilidade"
  | "Plataforma"
  | "Projetos"
  | "Contratos"
  | "Externo";

export interface SistemaSeed {
  id: string;
  nome: string;
  grupo: SistemaGrupo;
}

export interface ConectorExternoSeed {
  id: string;
  nome: string;
}

export interface IntegracaoSeed {
  origem: string;
  destino: string;
  label: string;
}

export const SISTEMAS_SEED: SistemaSeed[] = [
  { id: "hub-bloco-id", nome: "HUB Bloco ID", grupo: "Identidade" },
  { id: "gestao-comercial", nome: "Gestão Comercial", grupo: "Comercial" },
  { id: "crm-house", nome: "CRM House", grupo: "Comercial" },
  { id: "rh", nome: "Gestão de RH", grupo: "Pessoas" },
  { id: "processos", nome: "Gestão de Processos/SGPO", grupo: "Processos" },
  { id: "atividades", nome: "Gestor de Atividades", grupo: "Operação" },
  { id: "obra", nome: "Gestão de Obra", grupo: "Obra" },
  { id: "suprimentos", nome: "Gestão de Suprimentos", grupo: "Obra" },
  { id: "financeiro", nome: "Gestão Financeira", grupo: "Financeiro" },
  { id: "portfolio", nome: "Gestor de Portfólio", grupo: "Empreendimentos" },
  { id: "incorporacao", nome: "Gestão de Incorporação", grupo: "Empreendimentos" },
  { id: "viabuilder", nome: "ViaBuilder Pro", grupo: "Viabilidade" },
  { id: "automacoes", nome: "Gestor de Automações", grupo: "Plataforma" },
  { id: "gestao-projetos", nome: "Gestão de Projetos", grupo: "Projetos" },
  { id: "nakhon", nome: "Gerador de Contratos Nakhon", grupo: "Contratos" },
];

export const CONECTORES_EXTERNOS_SEED: ConectorExternoSeed[] = [
  { id: "n8n", nome: "n8n" },
  { id: "sienge", nome: "Sienge" },
  { id: "uazapi", nome: "UAZAPI/WhatsApp" },
  { id: "lovable-ai", nome: "Lovable AI" },
  { id: "google-maps", nome: "Google Maps" },
  { id: "resend", nome: "Resend" },
];

export const INTEGRACOES_SEED: IntegracaoSeed[] = [
  { origem: "portfolio", destino: "suprimentos", label: "empreendimentos" },
  { origem: "portfolio", destino: "obra", label: "empreendimentos" },
  { origem: "portfolio", destino: "gestao-comercial", label: "empreendimentos" },
  { origem: "portfolio", destino: "incorporacao", label: "empreendimentos" },
  { origem: "portfolio", destino: "viabuilder", label: "empreendimentos" },
  { origem: "viabuilder", destino: "portfolio", label: "análise→empreendimento" },
  { origem: "rh", destino: "processos", label: "funcionários/setores" },
  { origem: "rh", destino: "atividades", label: "líderes" },
  { origem: "rh", destino: "suprimentos", label: "usuários" },
  { origem: "rh", destino: "financeiro", label: "colaboradores" },
  { origem: "gestao-comercial", destino: "crm-house", label: "corretores" },
  { origem: "crm-house", destino: "gestao-comercial", label: "leads/vendas" },
  { origem: "gestao-comercial", destino: "financeiro", label: "vendas/VGV" },
  { origem: "suprimentos", destino: "gestao-comercial", label: "fornecedores" },
  { origem: "suprimentos", destino: "financeiro", label: "fornecedores" },
  { origem: "incorporacao", destino: "portfolio", label: "stakeholders" },
  { origem: "incorporacao", destino: "gestao-projetos", label: "projetistas/disciplinas" },
  { origem: "financeiro", destino: "rh", label: "empresas (CNPJ)" },
  { origem: "hub-bloco-id", destino: "automacoes", label: "SSO/provisionamento" },
];

/** Conector externo ⇄ HUB Bloco ID via api-gateway (bidirecional). */
export const INTEGRACOES_HUB_SEED: IntegracaoSeed[] = [
  { origem: "hub-bloco-id", destino: "n8n", label: "api-gateway" },
  { origem: "hub-bloco-id", destino: "sienge", label: "api-gateway" },
  { origem: "hub-bloco-id", destino: "uazapi", label: "api-gateway" },
  { origem: "hub-bloco-id", destino: "lovable-ai", label: "api-gateway" },
  { origem: "hub-bloco-id", destino: "google-maps", label: "api-gateway" },
  { origem: "hub-bloco-id", destino: "resend", label: "api-gateway" },
];

export interface EcossistemaNodeSeed {
  id: string;
  nome: string;
  grupo: string;
  externo: boolean;
  x: number;
  y: number;
}

export interface EcossistemaEdgeSeed {
  id: string;
  source: string;
  target: string;
  label: string;
}

/**
 * Auto-layout simples por grupo (colunas). Cada grupo vira uma coluna
 * vertical; conectores externos formam uma coluna final destacada.
 */
export function computeEcossistemaLayout(): {
  nodes: EcossistemaNodeSeed[];
  edges: EcossistemaEdgeSeed[];
} {
  const COL_W = 280;
  const ROW_H = 140;

  // Ordem das colunas (grupos) — coloca Identidade no centro lógico (primeira),
  // Plataforma logo ao lado, demais por afinidade.
  const ORDER: SistemaGrupo[] = [
    "Identidade",
    "Plataforma",
    "Pessoas",
    "Processos",
    "Operação",
    "Comercial",
    "Financeiro",
    "Empreendimentos",
    "Viabilidade",
    "Obra",
    "Projetos",
    "Contratos",
  ];

  const porGrupo = new Map<SistemaGrupo, SistemaSeed[]>();
  for (const s of SISTEMAS_SEED) {
    const arr = porGrupo.get(s.grupo) ?? [];
    arr.push(s);
    porGrupo.set(s.grupo, arr);
  }

  const nodes: EcossistemaNodeSeed[] = [];
  ORDER.forEach((grupo, colIdx) => {
    const sistemas = porGrupo.get(grupo) ?? [];
    sistemas.forEach((s, rowIdx) => {
      nodes.push({
        id: s.id,
        nome: s.nome,
        grupo: s.grupo,
        externo: false,
        x: colIdx * COL_W,
        y: rowIdx * ROW_H,
      });
    });
  });

  // Conectores externos: coluna à direita
  const externCol = ORDER.length;
  CONECTORES_EXTERNOS_SEED.forEach((c, i) => {
    nodes.push({
      id: c.id,
      nome: c.nome,
      grupo: "Externo",
      externo: true,
      x: externCol * COL_W,
      y: i * ROW_H,
    });
  });

  const edges: EcossistemaEdgeSeed[] = [
    ...INTEGRACOES_SEED.map((it, i) => ({
      id: `int-${i}-${it.origem}-${it.destino}`,
      source: it.origem,
      target: it.destino,
      label: it.label,
    })),
    ...INTEGRACOES_HUB_SEED.map((it, i) => ({
      id: `hub-${i}-${it.origem}-${it.destino}`,
      source: it.origem,
      target: it.destino,
      label: it.label,
    })),
  ];

  return { nodes, edges };
}
