/**
 * DEDUZ A SIGLA OFICIAL DO SISTEMA
 *
 * Mapeamento completo dos 16 sistemas oficiais do HUB Bloco ID.
 * Suporta substituição de prefixos genéricos `REQ-` e `REC-` por siglas reais (RH, FIN, OBRA, PORT, CONT, INC, etc.)
 * através da análise conjunta do nome do sistema, slug e palavras-chave do título.
 */

export const SISTEMAS_ECOSSISTEMA_BLOCO_ID: Record<string, { sigla: string; nome: string }> = {
  "crm-house": { sigla: "CRM", nome: "Bloco.CRM HOUSE" },
  "desenvolvimento-produto": { sigla: "PROD", nome: "Desenvolvimento Produto" },
  "nakhon-contratos": { sigla: "CONT", nome: "Gerador de Contratos Nakhon" },
  "gestao-comercial": { sigla: "COM", nome: "Gestão Comercial e Marketing" },
  captacao: { sigla: "CAP", nome: "Gestão de Captação" },
  incorporacao: { sigla: "INC", nome: "Gestão de Incorporação" },
  produtividade: { sigla: "OBRA", nome: "Gestão de Obra" },
  obra: { sigla: "OBRA", nome: "Gestão de Obra" },
  obras: { sigla: "OBRA", nome: "Gestão de Obra" },
  processos: { sigla: "SGPO", nome: "Gestão de Processo / SGPO" },
  sgpo: { sigla: "SGPO", nome: "Gestão de Processo / SGPO" },
  rh: { sigla: "RH", nome: "Gestão de RH" },
  locacao: { sigla: "SUPR", nome: "Gestão de Suprimentos" },
  suprimentos: { sigla: "SUPR", nome: "Gestão de Suprimentos" },
  "fluxo-caixa": { sigla: "FIN", nome: "Gestão Financeira" },
  financeiro: { sigla: "FIN", nome: "Gestão Financeira" },
  atividades: { sigla: "ATIV", nome: "Gestor de Atividades Líderes" },
  automacoes: { sigla: "AUTO", nome: "Gestor de Automações" },
  portfolio: { sigla: "PORT", nome: "Gestor de Portfólio" },
  "sucesso-cliente": { sigla: "CS", nome: "Sucesso do Cliente" },
  viab: { sigla: "VIAB", nome: "ViaBuilder Pro" },
  viabuilder: { sigla: "VIAB", nome: "ViaBuilder Pro" },
  sienge: { sigla: "SIENGE", nome: "Sienge" },
  infraestrutura: { sigla: "IN", nome: "Infraestrutura & Redes" },
  infra: { sigla: "IN", nome: "Infraestrutura" },
  ti: { sigla: "TI", nome: "Tecnologia da Informação" },
};

const PALAVRAS_CHAVE: Array<{ palavras: string[]; sigla: string }> = [
  { palavras: ["gestao de obras", "gestao de obra", "produtividade", "obra", "obras", "quantitativo", "canteiro", "entregas", "frente servico", "medio prazo", "planejamento", "modulo de planejamento"], sigla: "OBRA" },
  { palavras: ["crm house", "crm-house", "crm"], sigla: "CRM" },
  { palavras: ["desenvolvimento produto", "engenharia produto", "ciclo produto"], sigla: "PROD" },
  { palavras: ["nakhon", "contrato", "contratos", "aditivo", "desembolso"], sigla: "CONT" },
  { palavras: ["gestao comercial", "comercial", "vgv", "unidades", "corretores"], sigla: "COM" },
  { palavras: ["captacao", "leads", "prospeccao"], sigla: "CAP" },
  { palavras: ["incorporacao", "incorporacao", "certidao trabalhista", "as-built", "estudo viabilidade"], sigla: "INC" },
  { palavras: ["processo", "processos", "sgpo", "autentic", "seguranca"], sigla: "SGPO" },
  { palavras: ["recursos humanos", "rh", "pessoal", "folha", "admissao", "beneficios", "colaborador"], sigla: "RH" },
  { palavras: ["suprimentos", "terceirizadas", "locacao", "locacoes", "itens locaveis", "epi"], sigla: "SUPR" },
  { palavras: ["financeira", "financeiro", "fluxo de caixa", "contas a pagar", "receber", "caixa", "faturamento", "irr"], sigla: "FIN" },
  { palavras: ["atividades lideres", "atividades", "tarefas"], sigla: "ATIV" },
  { palavras: ["automacoes", "automacao", "fluxos automatizados", "bot", "robo"], sigla: "AUTO" },
  { palavras: ["portfolio", "portfolio", "kpis financeiros"], sigla: "PORT" },
  { palavras: ["sucesso do cliente", "sucesso cliente", "cs", "onboarding", "churn"], sigla: "CS" },
  { palavras: ["viabuilder", "viab", "m1-m3"], sigla: "VIAB" },
  { palavras: ["sienge"], sigla: "SIENGE" },
  { palavras: ["infraestrutura", "infra", "redes", "servidor", "hardware"], sigla: "IN" },
  { palavras: ["tecnologia", "ti", "suporte tecnico"], sigla: "TI" },
];

export function siglaDoSistema(
  nomeOuSlug: string | null | undefined,
  titulo?: string | null,
  descricao?: string | null,
): string | null {
  // 1. Extrai código entre colchetes do título: `[GO-11]`, `[RH-02]`
  if (titulo) {
    const matchTitulo = titulo.match(/^\s*\[([A-Z]{2,6})-[0-9]{1,4}\]/i);
    if (matchTitulo?.[1]) {
      return matchTitulo[1].toUpperCase();
    }
  }

  const textoSlug = (nomeOuSlug || "").trim().toLowerCase();
  const textoTitulo = (titulo || "").trim().toLowerCase();
  const textoDescricao = (descricao || "").trim().toLowerCase();

  // 2. Prioridade: palavras-chave no contexto combinando slug + titulo + descricao
  const combinado = `${textoSlug} ${textoTitulo} ${textoDescricao}`
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

  for (const item of PALAVRAS_CHAVE) {
    if (item.palavras.some((p) => combinado.includes(p))) {
      return item.sigla;
    }
  }

  // 3. Busca direta no dicionário por slug
  if (textoSlug && SISTEMAS_ECOSSISTEMA_BLOCO_ID[textoSlug]) {
    return SISTEMAS_ECOSSISTEMA_BLOCO_ID[textoSlug].sigla;
  }

  // 4. Se o slug já for uma sigla curta (2 a 6 letras maiúsculas), como "RH", "GO", "SGPO"
  if (/^[A-Z]{2,6}$/i.test(textoSlug)) {
    return textoSlug.toUpperCase();
  }

  if (textoSlug.length >= 2) {
    return textoSlug.slice(0, 4).toUpperCase();
  }

  return null;
}

export const ESTILOS_DE_COR_DOS_SISTEMAS: Record<string, { bg: string; border: string; text: string; badgeClass: string }> = {
  OBRA: {
    bg: "bg-amber-500/15",
    border: "border-amber-500/40",
    text: "text-amber-500 dark:text-amber-400",
    badgeClass: "bg-amber-500/15 border-amber-500/40 text-amber-500 dark:text-amber-400",
  },
  INC: {
    bg: "bg-indigo-500/15",
    border: "border-indigo-500/40",
    text: "text-indigo-500 dark:text-indigo-400",
    badgeClass: "bg-indigo-500/15 border-indigo-500/40 text-indigo-500 dark:text-indigo-400",
  },
  RH: {
    bg: "bg-rose-500/15",
    border: "border-rose-500/40",
    text: "text-rose-500 dark:text-rose-400",
    badgeClass: "bg-rose-500/15 border-rose-500/40 text-rose-500 dark:text-rose-400",
  },
  FIN: {
    bg: "bg-emerald-500/15",
    border: "border-emerald-500/40",
    text: "text-emerald-500 dark:text-emerald-400",
    badgeClass: "bg-emerald-500/15 border-emerald-500/40 text-emerald-500 dark:text-emerald-400",
  },
  CONT: {
    bg: "bg-cyan-500/15",
    border: "border-cyan-500/40",
    text: "text-cyan-500 dark:text-cyan-400",
    badgeClass: "bg-cyan-500/15 border-cyan-500/40 text-cyan-500 dark:text-cyan-400",
  },
  SGPO: {
    bg: "bg-sky-500/15",
    border: "border-sky-500/40",
    text: "text-sky-500 dark:text-sky-400",
    badgeClass: "bg-sky-500/15 border-sky-500/40 text-sky-500 dark:text-sky-400",
  },
  AUTO: {
    bg: "bg-violet-500/15",
    border: "border-violet-500/40",
    text: "text-violet-500 dark:text-violet-400",
    badgeClass: "bg-violet-500/15 border-violet-500/40 text-violet-500 dark:text-violet-400",
  },
  SUPR: {
    bg: "bg-yellow-500/15",
    border: "border-yellow-500/40",
    text: "text-yellow-600 dark:text-yellow-400",
    badgeClass: "bg-yellow-500/15 border-yellow-500/40 text-yellow-600 dark:text-yellow-400",
  },
  CRM: {
    bg: "bg-fuchsia-500/15",
    border: "border-fuchsia-500/40",
    text: "text-fuchsia-500 dark:text-fuchsia-400",
    badgeClass: "bg-fuchsia-500/15 border-fuchsia-500/40 text-fuchsia-500 dark:text-fuchsia-400",
  },
  PORT: {
    bg: "bg-teal-500/15",
    border: "border-teal-500/40",
    text: "text-teal-500 dark:text-teal-400",
    badgeClass: "bg-teal-500/15 border-teal-500/40 text-teal-500 dark:text-teal-400",
  },
  CS: {
    bg: "bg-purple-500/15",
    border: "border-purple-500/40",
    text: "text-purple-500 dark:text-purple-400",
    badgeClass: "bg-purple-500/15 border-purple-500/40 text-purple-500 dark:text-purple-400",
  },
  TI: {
    bg: "bg-blue-500/15",
    border: "border-blue-500/40",
    text: "text-blue-500 dark:text-blue-400",
    badgeClass: "bg-blue-500/15 border-blue-500/40 text-blue-500 dark:text-blue-400",
  },
  IN: {
    bg: "bg-blue-500/15",
    border: "border-blue-500/40",
    text: "text-blue-500 dark:text-blue-400",
    badgeClass: "bg-blue-500/15 border-blue-500/40 text-blue-500 dark:text-blue-400",
  },
  PROD: {
    bg: "bg-orange-500/15",
    border: "border-orange-500/40",
    text: "text-orange-500 dark:text-orange-400",
    badgeClass: "bg-orange-500/15 border-orange-500/40 text-orange-500 dark:text-orange-400",
  },
  COM: {
    bg: "bg-lime-500/15",
    border: "border-lime-500/40",
    text: "text-lime-600 dark:text-lime-400",
    badgeClass: "bg-lime-500/15 border-lime-500/40 text-lime-600 dark:text-lime-400",
  },
  CAP: {
    bg: "bg-emerald-500/15",
    border: "border-emerald-500/40",
    text: "text-emerald-500 dark:text-emerald-400",
    badgeClass: "bg-emerald-500/15 border-emerald-500/40 text-emerald-500 dark:text-emerald-400",
  },
  VIAB: {
    bg: "bg-amber-600/15",
    border: "border-amber-600/40",
    text: "text-amber-600 dark:text-amber-400",
    badgeClass: "bg-amber-600/15 border-amber-600/40 text-amber-600 dark:text-amber-400",
  },
};

export function obterEstiloDoSistema(siglaOuNome?: string | null, codigoOuTitulo?: string | null) {
  let sigla = siglaDoSistema(siglaOuNome, codigoOuTitulo);
  if (!sigla && codigoOuTitulo) {
    const match = codigoOuTitulo.match(/^([A-Z]{2,6})-/i);
    if (match?.[1]) sigla = match[1].toUpperCase();
  }
  if (!sigla && siglaOuNome) {
    const match = siglaOuNome.match(/^([A-Z]{2,6})-/i);
    if (match?.[1]) sigla = match[1].toUpperCase();
  }
  if (sigla && ESTILOS_DE_COR_DOS_SISTEMAS[sigla]) {
    return ESTILOS_DE_COR_DOS_SISTEMAS[sigla];
  }
  return {
    bg: "bg-primary/15",
    border: "border-primary/30",
    text: "text-primary",
    badgeClass: "bg-primary/15 border-primary/30 text-primary",
  };
}

/**
 * Formata o código de referência substituindo o prefixo genérico `REQ-` ou `REC-` ou `#`
 * pela sigla oficial do sistema (ex: `RH-2607-0001`, `FIN-2608-0033`, `OBRA-2608-0053`).
 */
export function formatarReferenciaComSigla(
  codigoOriginal: string | null | undefined,
  sistemaNomeOuSlug: string | null | undefined,
  id: string,
  titulo?: string | null,
  descricao?: string | null,
): string {
  const sigla = siglaDoSistema(sistemaNomeOuSlug, titulo, descricao);

  if (codigoOriginal) {
    if (sigla && (/^(REQ|REC|TI)-/i.test(codigoOriginal) || (sigla !== "TI" && codigoOriginal.startsWith("TI-")))) {
      return codigoOriginal.replace(/^(REQ|REC|TI|[A-Z]{2,6})-/i, `${sigla}-`);
    }
    if (!codigoOriginal.startsWith("#")) {
      return codigoOriginal;
    }
  }

  const hashId = id.replace(/-/g, "").slice(0, 6).toUpperCase();
  if (sigla) {
    return `${sigla}-${hashId}`;
  }

  return codigoOriginal ?? `#${hashId}`;
}
