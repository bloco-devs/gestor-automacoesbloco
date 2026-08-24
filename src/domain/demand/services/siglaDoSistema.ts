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
  { palavras: ["crm house", "crm-house", "crm"], sigla: "CRM" },
  { palavras: ["desenvolvimento produto", "engenharia produto", "ciclo produto"], sigla: "PROD" },
  { palavras: ["nakhon", "contrato", "contratos", "aditivo", "desembolso"], sigla: "CONT" },
  { palavras: ["gestao comercial", "comercial", "vgv", "unidades", "corretores"], sigla: "COM" },
  { palavras: ["captacao", "leads", "prospeccao"], sigla: "CAP" },
  { palavras: ["incorporacao", "incorporacao", "certidao trabalhista", "as-built", "estudo viabilidade"], sigla: "INC" },
  { palavras: ["produtividade", "obra", "obras", "quantitativo", "canteiro", "entregas", "frente servico"], sigla: "OBRA" },
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

  // 2. Busca direta no dicionário por slug
  if (textoSlug && SISTEMAS_ECOSSISTEMA_BLOCO_ID[textoSlug]) {
    return SISTEMAS_ECOSSISTEMA_BLOCO_ID[textoSlug].sigla;
  }

  // 3. Se o slug já for uma sigla curta (2 a 6 letras maiúsculas), como "RH", "GO", "SGPO"
  if (/^[A-Z]{2,6}$/i.test(textoSlug)) {
    return textoSlug.toUpperCase();
  }

  // 4. Busca por palavras-chave combinando nomeOuSlug + titulo
  const combinado = `${textoSlug} ${textoTitulo}`
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

  for (const item of PALAVRAS_CHAVE) {
    if (item.palavras.some((p) => combinado.includes(p))) {
      return item.sigla;
    }
  }

  if (textoSlug.length >= 2) {
    return textoSlug.slice(0, 4).toUpperCase();
  }

  return null;
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
): string {
  const sigla = siglaDoSistema(sistemaNomeOuSlug, titulo);

  if (codigoOriginal) {
    // Substitui REQ- ou REC- se houver uma sigla identificada
    if (/^(REQ|REC)-/i.test(codigoOriginal) && sigla) {
      return codigoOriginal.replace(/^(REQ|REC)-/i, `${sigla}-`);
    }
    // Se já tiver uma sigla real diferente de REQ e REC, mantém o código original
    if (!codigoOriginal.startsWith("#") && !/^(REQ|REC)-/i.test(codigoOriginal)) {
      return codigoOriginal;
    }
  }

  const hashId = id.replace(/-/g, "").slice(0, 6).toUpperCase();
  if (sigla) {
    return `${sigla}-${hashId}`;
  }

  return codigoOriginal ?? `#${hashId}`;
}
