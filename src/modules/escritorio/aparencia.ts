/**
 * Aparência dos personagens do Escritório do Ecossistema.
 *
 * Todo mundo é o BLINK — o mascote da casa, não boneco genérico. O que
 * distingue um sistema do outro é o ACESSÓRIO, que é fixo e escolhido pelo
 * que aquele sistema faz, e a COR DO CASCO, que sai de um hash do id.
 *
 * Acessório por sistema e não por sala: a sala Operação tem quatro sistemas,
 * e quatro capacetes iguais lado a lado não distinguem nada.
 */

/**
 * Cores de casco. O amarelo e o preto do BLINK nunca mudam — são a marca.
 *
 * Eram doze para dezesseis sistemas: pela casa dos pombos, repetir era
 * garantido, e ainda por cima o hash colidia antes disso. São vinte e a
 * distribuição passou a ser feita sem repetição (ver `mapaDeCascos`).
 */
const CASCOS = [
  "#3f6fc4", "#c4463a", "#2f9e69", "#7a4fc0", "#2f8ba8", "#d1594f",
  "#e0e2e6", "#4a4f5a", "#c98a2f", "#2f6f5c", "#a8447e", "#5a6bd6",
  "#8a9a2f", "#c46a2f", "#3f8fa8", "#9a3f5c", "#5c7a3f", "#7a5c3f",
  "#b0455a", "#4a3f8a",
] as const;

export type Acessorio =
  | "capacete" | "headset" | "gravata" | "cracha" | "prancheta" | "caneca"
  | "livro" | "chave" | "megafone" | "maleta" | "rolo" | "predio"
  | "grafico" | "lapis" | "raio" | "engrenagem" | "postit"
  // de fora do escritório
  | "zap" | "envelope" | "drive" | "lupa" | "canetaAssina" | "ingresso"
  | "nos" | "coracao" | "documentoId" | "placaVenda" | "banco" | "bancoLote"
  | "cronograma" | "caixa"
  // marcas que o Bloco enviou e que leem em pixel art
  | "marcaSienge" | "marcaOrulo" | "marcaSympla" | "marcaResend"
  | "nenhum";

/**
 * Acessório fixo por sistema, amarrado ao ofício de cada um.
 * Sistema novo que o HUB traga cai no sorteio determinístico de `SORTEIO`.
 */
export const ACESSORIO_POR_SISTEMA: Record<string, Acessorio> = {
  "gestao-comercial": "megafone",
  "crm-house": "chave",
  "locacao": "prancheta",
  "processos": "engrenagem",
  "produtividade": "capacete",
  "sucesso-cliente": "headset",
  "atividades": "postit",
  "rh": "caneca",
  "fluxo-caixa": "gravata",
  "captacao": "maleta",
  "nakhon-contratos": "livro",
  "viabilidade": "rolo",
  "incorporacao": "predio",
  "portfolio": "grafico",
  "desenvolvimento-produto": "lapis",
  "automacoes": "raio",
  // nomes do seed, para quando o HUB não responde
  "obra": "capacete",
  "suprimentos": "prancheta",
  "financeiro": "gravata",
  "gestao-projetos": "lapis",
  "hub-bloco-id": "cracha",
  "nakhon": "livro",
};

const SORTEIO: Acessorio[] = [
  "cracha", "prancheta", "caneca", "livro", "chave", "megafone",
  "maleta", "rolo", "predio", "grafico", "lapis", "engrenagem", "postit",
];

export interface Aparencia {
  casco: string;
  acessorio: Acessorio;
}

/** FNV-1a. Determinístico e estável entre navegadores. */
export function hash(texto: string): number {
  let h = 2166136261;
  for (let i = 0; i < texto.length; i++) {
    h ^= texto.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/**
 * `>>>` e não `>>`: com deslocamento aritmético o hash vira negativo e o
 * módulo devolve índice negativo — a paleta some e o personagem não desenha.
 */
export function aparenciaDoSistema(id: string): Aparencia {
  const h = hash(id);
  return {
    casco: CASCOS[h % CASCOS.length],
    acessorio: ACESSORIO_POR_SISTEMA[id] ?? SORTEIO[(h >>> 7) % SORTEIO.length],
  };
}

/** Quem entrega pela porta é um BLINK de fora: casco cinza e uma caixa na mão. */
/**
 * O que cada serviço de fora carrega na mão.
 *
 * Marca de verdade só onde eu conheço a marca: WhatsApp, Google Drive, n8n e
 * Lovable. Para Sienge, Órulo, Prevision, Tavily e Autentique eu NÃO conheço o
 * logotipo — inventar um daria ao desenho um ar de oficial estando errado, o
 * que é pior que um símbolo genérico. Esses levam o símbolo do ofício.
 */
export const ACESSORIO_POR_CONECTOR: Record<string, Acessorio> = {
  uazapi: "zap",                    // marca: balão verde do WhatsApp
  "google-drive": "drive",          // marca: triângulo tricolor do Drive
  n8n: "nos",                       // marca: nós ligados, rosa do n8n
  "lovable-ai": "coracao",          // marca: coração
  sienge: "marcaSienge",            // marca enviada pelo Bloco: S vermelho
  "sienge-bulk": "bancoLote",       // mesma casa, mas em lote: base de dados
  orulo: "marcaOrulo",              // marca enviada: "ö" branco em azul
  sympla: "marcaSympla",            // marca enviada: "s" com bolinhas
  autentique: "canetaAssina",       // o "a" nao lia em pixel; simbolo do oficio le melhor
  email: "marcaResend",             // marca enviada: "R" preto
  prevision: "cronograma",          // as tres setas viravam pontinhos; cronograma le melhor
  busca: "lupa",                    // ofício: lupa — sem logo recebido
  cnpj: "documentoId",              // ofício: documento — não tem logo próprio
};

export function aparenciaDeConector(id: string): Aparencia {
  return {
    casco: hash(id) % 2 === 0 ? "#7d7768" : "#6f6a5c",
    acessorio: ACESSORIO_POR_CONECTOR[id] ?? "caixa",
  };
}

/**
 * Porta apagada: o serviço está cadastrado mas o HUB não registra integração
 * nenhuma saindo dele — hoje, Órulo e Sympla. Ninguém sai por ali, e a porta
 * precisa dizer isso em vez de parecer uma porta que ninguém usa.
 */
export function portaSemUso(conectorId: string, integracoes: { origem: string }[]): boolean {
  return !integracoes.some((i) => i.origem === conectorId);
}

/**
 * Distribui as cores de casco SEM repetir.
 *
 * `aparenciaDoSistema` sozinha não consegue: ela só vê um id por vez e não
 * sabe quem mais está no andar. Aqui a lista inteira é vista de uma vez —
 * cada um tenta a cor que o hash prefere e, se já estiver tomada, leva a
 * próxima livre. Ordenado por id, para a mesma lista dar sempre o mesmo mapa.
 */
export function mapaDeCascos(ids: string[]): Map<string, string> {
  const mapa = new Map<string, string>();
  const tomadas = new Set<string>();
  for (const id of [...ids].sort()) {
    const preferida = hash(id) % CASCOS.length;
    let cor = CASCOS[preferida];
    for (let passo = 1; tomadas.has(cor) && passo <= CASCOS.length; passo++) {
      cor = CASCOS[(preferida + passo) % CASCOS.length];
    }
    tomadas.add(cor);
    mapa.set(id, cor);
  }
  return mapa;
}

/** Multiplica o brilho de um hex, saturando em 255. */
export function tom(hex: string, fator: number): string {
  const n = parseInt(hex.slice(1), 16);
  const r = Math.min(255, Math.round(((n >> 16) & 255) * fator));
  const g = Math.min(255, Math.round(((n >> 8) & 255) * fator));
  const b = Math.min(255, Math.round((n & 255) * fator));
  return "#" + ((r << 16) | (g << 8) | b).toString(16).padStart(6, "0");
}
