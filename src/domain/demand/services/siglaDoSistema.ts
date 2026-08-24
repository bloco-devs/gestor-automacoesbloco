/**
 * DEDUZ A SIGLA OFICIAL DO SISTEMA
 *
 * Resolve o "Defeito C" do sistema: quando o banco gera `REC-2607-0001` porque
 * `system_id` era nulo ou o slug vindo da IA não casou diretamente com a tabela,
 * esta função traduz o nome/slug do sistema ou o título da solicitação na sigla
 * oficial da equipe (RH, SIENGE, FIN, GO, IN, TI, AUTO, SGPO).
 */

const SIGLAS_CONHECIDAS: Array<{ palavras: string[]; sigla: string }> = [
  { palavras: ["recursos humanos", "rh", "pessoal", "folha", "admissao", "beneficios"], sigla: "RH" },
  { palavras: ["sienge"], sigla: "SIENGE" },
  { palavras: ["financeiro", "finan", "faturamento", "contabilidade", "fiscal", "pagamento", "caixa"], sigla: "FIN" },
  { palavras: ["obras", "gestao de obras", "engenharia", "sgpo", "canteiro"], sigla: "GO" },
  { palavras: ["infra", "infraestrutura", "servidor", "rede", "hardware"], sigla: "IN" },
  { palavras: ["ti", "tecnologia", "sistema", "suporte tecnico"], sigla: "TI" },
  { palavras: ["automacao", "processos", "bot", "robo", "workflow"], sigla: "AUTO" },
  { palavras: ["suporte", "helpdesk"], sigla: "SUP" },
  { palavras: ["compras", "suprimentos"], sigla: "COMP" },
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

  // Se já for uma sigla curta (2 a 6 letras maiúsculas), como "RH", "GO", "SGPO"
  if (/^[A-Z]{2,6}$/.test(texto)) {
    return texto;
  }

  const normalizado = texto
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

  for (const item of SIGLAS_CONHECIDAS) {
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
