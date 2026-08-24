/**
 * DEDUZ A SIGLA OFICIAL DO SISTEMA
 *
 * Mapeamento completo dos 16 sistemas oficiais do HUB Bloco ID:
 * 1. crm-house               → CRM   (Bloco.CRM HOUSE)
 * 2. desenvolvimento-produto → PROD  (Desenvolvimento Produto)
 * 3. nakhon-contratos        → CONT  (Gerador de Contratos Nakhon)
 * 4. gestao-comercial        → COM   (Gestão Comercial e Marketing)
 * 5. captacao                → CAP   (Gestão de Captação)
 * 6. incorporacao            → INC   (Gestão de Incorporação)
 * 7. produtividade / obra    → OBRA  (Gestão de Obra)
 * 8. processos / sgpo        → SGPO  (Gestão de Processo / SGPO)
 * 9. rh                      → RH    (Gestão de RH)
 * 10. locacao / suprimentos  → SUPR  (Gestão de Suprimentos)
 * 11. fluxo-caixa / finan    → FIN   (Gestão Financeira)
 * 12. atividades             → ATIV  (Gestor de Atividades Líderes)
 * 13. automacoes             → AUTO  (Gestor de Automações)
 * 14. portfolio              → PORT  (Gestor de Portfólio)
 * 15. sucesso-cliente        → CS    (Sucesso do Cliente)
 * 16. viab / viabuilder      → VIAB  (ViaBuilder Pro)
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
  { palavras: ["nakhon", "contrato", "contratos", "aditivo"], sigla: "CONT" },
  { palavras: ["gestao comercial", "comercial", "vgv", "unidades", "corretores"], sigla: "COM" },
  { palavras: ["captacao", "leads", "prospeccao"], sigla: "CAP" },
  { palavras: ["incorporacao", "empreendimento", "as-built", "estudo viabilidade"], sigla: "INC" },
  { palavras: ["produtividade", "obra", "obras", "frente servico", "pavimentos"], sigla: "OBRA" },
  { palavras: ["processo", "processos", "sgpo"], sigla: "SGPO" },
  { palavras: ["recursos humanos", "rh", "pessoal", "folha", "admissao", "beneficios", "colaborador"], sigla: "RH" },
  { palavras: ["suprimentos", "locacao", "locacoes", "itens locaveis"], sigla: "SUPR" },
  { palavras: ["financeira", "financeiro", "fluxo de caixa", "contas a pagar", "receber", "caixa"], sigla: "FIN" },
  { palavras: ["atividades lideres", "atividades", "tarefas"], sigla: "ATIV" },
  { palavras: ["automacoes", "automacao", "fluxos automatizados", "bot", "robo"], sigla: "AUTO" },
  { palavras: ["portfolio", "portfólio", "kpis financeiros"], sigla: "PORT" },
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
  // 1. Tenta extrair código entre colchetes do título: `[GO-11]`, `[RH-02]`
  if (titulo) {
    const matchTitulo = titulo.match(/^\s*\[([A-Z]{2,6})-[0-9]{1,4}\]/i);
    if (matchTitulo?.[1]) {
      return matchTitulo[1].toUpperCase();
    }
  }

  if (!nomeOuSlug) return null;
  const texto = nomeOuSlug.trim();
  if (!texto) return null;

  const normalizado = texto
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

  // 2. Busca direta no dicionário por slug
  if (SISTEMAS_ECOSSISTEMA_BLOCO_ID[normalizado]) {
    return SISTEMAS_ECOSSISTEMA_BLOCO_ID[normalizado].sigla;
  }

  // 3. Se já for uma sigla curta (2 a 6 letras maiúsculas), como "RH", "GO", "SGPO"
  if (/^[A-Z]{2,6}$/.test(texto)) {
    return texto;
  }

  // 4. Busca por palavras-chave
  for (const item of PALAVRAS_CHAVE) {
    if (item.palavras.some((p) => normalizado.includes(p))) {
      return item.sigla;
    }
  }

  // Fallback: iniciais de palavras relevantes (>2 letras)
  const palavras = normalizado.split(/[^a-z0-9]+/).filter((p) => p.length > 2);
  if (palavras.length >= 2) {
    return palavras.map((p) => p[0].toUpperCase()).join("");
  }

  return texto.slice(0, 4).toUpperCase();
}

/**
 * Formata o código de referência substituindo o prefixo genérico `REC` ou `#`
 * pela sigla oficial do sistema (ex: `RH-2607-0001`, `SIENGE-2608-0002`).
 */
export function formatarReferenciaComSigla(
  codigoOriginal: string | null | undefined,
  sistemaNomeOuSlug: string | null | undefined,
  id: string,
  titulo?: string | null,
): string {
  const sigla = siglaDoSistema(sistemaNomeOuSlug, titulo);

  if (codigoOriginal) {
    // Se o código do banco começou com REC- e temos uma sigla identificada, troca REC pela sigla!
    if (codigoOriginal.startsWith("REC-") && sigla) {
      return codigoOriginal.replace(/^REC-/, `${sigla}-`);
    }
    // Se não for nulo nem #hash, devolve o próprio código
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
