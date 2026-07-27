/**
 * A classificação de anexos.
 *
 * POR QUE ISTO É DOMÍNIO E NÃO DETALHE DE TELA
 * "Um print vale por quarenta mensagens" só é verdade se o print for **visto**.
 * Um anexo listado como `IMG_4821.png · 2,1 MB · baixar` não vale nada: para
 * ver, a pessoa baixa, abre noutro programa e volta — e na prática ninguém
 * volta. A diferença entre um anexo útil e um anexo inútil é uma decisão sobre
 * como ele é apresentado, e essa decisão depende do que ele é.
 *
 * A regra que organiza tudo aqui: **o que pode ser visto na tela não deve
 * exigir download**. O que não pode ser visto ganha o nome e o tamanho, que é
 * a informação que ajuda a decidir se vale abrir.
 *
 * Classificar por tipo declarado (`file_type`) E por extensão de propósito:
 * navegadores e sistemas operacionais mentem sobre MIME com frequência, e um
 * `application/octet-stream` que se chama `erro.png` é um png.
 */

export type Genero = "imagem" | "video" | "pdf" | "log" | "pacote" | "outro";

export interface Anexo {
  id: string;
  nome: string;
  /** Caminho no storage. Não é URL: precisa ser assinado antes de exibir. */
  caminho: string;
  genero: Genero;
  tipo: string | null;
  em: string;
  autorId: string | null;
}

const POR_EXTENSAO: Array<[RegExp, Genero]> = [
  [/\.(png|jpe?g|gif|webp|bmp|avif|heic)$/i, "imagem"],
  [/\.(mp4|webm|mov|m4v|ogv)$/i, "video"],
  [/\.pdf$/i, "pdf"],
  [/\.(log|txt|json|csv|xml|ya?ml|har|stacktrace)$/i, "log"],
  [/\.(zip|rar|7z|tar|gz|tgz)$/i, "pacote"],
];

export function generoDe(nome: string | null, tipo: string | null): Genero {
  const n = nome ?? "";
  for (const [padrao, genero] of POR_EXTENSAO) {
    if (padrao.test(n)) return genero;
  }
  if (!tipo) return "outro";
  if (tipo.startsWith("image/")) return "imagem";
  if (tipo.startsWith("video/")) return "video";
  if (tipo === "application/pdf") return "pdf";
  if (tipo.startsWith("text/") || tipo === "application/json") return "log";
  if (/zip|compressed|tar|gzip/.test(tipo)) return "pacote";
  return "outro";
}

/** O que dá para ver sem sair da página. */
export function visualizavel(genero: Genero): boolean {
  return genero === "imagem" || genero === "video" || genero === "pdf" || genero === "log";
}

/**
 * A ordem em que os anexos aparecem.
 *
 * Não é cronológica. Imagem primeiro, porque é o anexo com maior densidade de
 * informação por segundo de atenção — quem abre uma demanda com um print e um
 * zip deve ver o print sem rolar. Dentro do mesmo gênero, o mais recente vem
 * antes: numa demanda longa, o print de hoje explica melhor que o de três
 * semanas atrás.
 */
const PESO: Record<Genero, number> = { imagem: 0, video: 1, pdf: 2, log: 3, pacote: 4, outro: 5 };

export function ordenarAnexos(anexos: Anexo[]): Anexo[] {
  return anexos
    .slice()
    .sort((a, b) => PESO[a.genero] - PESO[b.genero] || new Date(b.em).getTime() - new Date(a.em).getTime());
}

/**
 * Uma frase para o briefing.
 *
 * Existe porque "existem anexos?" é uma das perguntas dos 20 segundos, e a
 * resposta precisa caber numa linha antes de a pessoa rolar até eles.
 */
export function resumirAnexos(anexos: Anexo[]): string | null {
  if (anexos.length === 0) return null;
  const conta = new Map<Genero, number>();
  for (const a of anexos) conta.set(a.genero, (conta.get(a.genero) ?? 0) + 1);

  const nome: Record<Genero, [string, string]> = {
    imagem: ["imagem", "imagens"],
    video: ["vídeo", "vídeos"],
    pdf: ["PDF", "PDFs"],
    log: ["log", "logs"],
    pacote: ["arquivo", "arquivos"],
    outro: ["anexo", "anexos"],
  };

  return [...conta.entries()]
    .sort((a, b) => PESO[a[0]] - PESO[b[0]])
    .map(([g, n]) => `${n} ${nome[g][n === 1 ? 0 : 1]}`)
    .join(", ");
}
