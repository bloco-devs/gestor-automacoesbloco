import { supabase } from "@/integrations/supabase/client";
import { addAttachment } from "./service";
import type { DemandAttachment } from "./types";

/**
 * O envio de anexo de demanda, num lugar só.
 *
 * POR QUE ISTO VIROU MÓDULO
 * Existiam três cópias do mesmo `upload()` — `useAnexos`, `NewTicketDialog` e
 * `CreateDemandDialog` — e as três repetiam o mesmo par de defeitos, porque
 * eram a mesma linha copiada. Consertar em três lugares é consertar em dois.
 *
 * OS DOIS DEFEITOS QUE MORAVAM NESSA LINHA
 *
 * 1. O NOME DO ARQUIVO IA CRU PARA A CHAVE DO STORAGE
 *    `${demandaId}/${crypto.randomUUID()}-${arquivo.name}`. A chave de um objeto
 *    no Supabase Storage é validada contra uma lista de caracteres que NÃO
 *    inclui acento, `#`, `%` nem `\`. Ou seja: "Relatório de Não Conformidade.pdf"
 *    — o nome que um arquivo tem no Brasil — era recusado com `InvalidKey`, e o
 *    print `Captura de tela 2026-08-14 às 09.41.12.png` também (o `à`).
 *    "PDF e JPEG não anexam" era, em boa parte, "arquivo com acento no nome não
 *    anexa": o PNG que o time testou tinha nome de teste, sem acento.
 *    O nome original continua sendo gravado em `file_name`, intacto — é ele que
 *    a tela mostra. Sanitizado fica só o que vira chave.
 *
 * 2. `contentType: arquivo.type` COM `type` VAZIO
 *    Navegador nem sempre sabe o MIME: arrastar um PDF de certos gerenciadores
 *    de arquivos, ou um `.heic` do iPhone, chega com `type: ""`. Isso virava
 *    `Content-Type: ""` na requisição, o bucket com allowlist recusava, e o
 *    anexo salvo sem tipo ainda aparecia como "outro" na lista, sem miniatura.
 *    `tipoDe()` completa pela extensão, que é a mesma escolha que
 *    `generoDe()` já fazia no domínio, pelo mesmo motivo: o sistema operacional
 *    mente sobre MIME com frequência.
 */

export const BUCKET_ANEXOS = "demand-attachments";

/** Espelha `file_size_limit` do bucket. Divergir daqui devolve 400 opaco. */
export const TAMANHO_MAXIMO = 25 * 1024 * 1024;

/** A pasta de quem ainda não tem demanda. Espelha a RLS `rascunhos/<user_id>/…`. */
export const PASTA_RASCUNHO = "rascunhos";

/**
 * Espelha `allowed_mime_types` do bucket.
 *
 * Existe em duplicata de propósito: o bucket é a fronteira de segurança (um
 * cliente hostil não passa por ele), e esta lista é a fronteira de gentileza —
 * ela permite dizer "arquivo .exe não é aceito" antes de gastar o upload, em vez
 * de devolver o 400 sem texto que o storage devolve.
 */
export const MIME_PERMITIDOS = new Set<string>([
  "image/jpeg", "image/pjpeg", "image/png", "image/gif", "image/webp",
  "image/bmp", "image/avif", "image/heic", "image/heif",
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "text/plain", "text/csv", "text/markdown", "application/json", "text/xml", "application/xml",
  "video/mp4", "video/webm", "video/quicktime",
  "application/zip", "application/x-zip-compressed",
]);

/**
 * O `accept` dos seletores de arquivo.
 *
 * Repare que ele NÃO é a allowlist inteira. `accept` é dica de filtro no
 * diálogo do sistema, não validação — e um `accept` longo demais faz o macOS
 * mostrar "Tipos personalizados" em vez de "Imagens e PDFs". Quem valida é
 * `validarArquivo`, que roda depois, inclusive no arquivo que veio arrastado
 * (arrastar ignora `accept` por completo — outra razão para não confiar nele).
 */
export const ACEITA_NO_SELETOR =
  "image/*,application/pdf,.pdf,.jpg,.jpeg,.png,.webp,.gif,.heic,.doc,.docx,.xls,.xlsx,.txt,.csv,.log,.zip";

const MIME_POR_EXTENSAO: Record<string, string> = {
  jpg: "image/jpeg", jpeg: "image/jpeg", jpe: "image/jpeg",
  png: "image/png", gif: "image/gif", webp: "image/webp", bmp: "image/bmp",
  avif: "image/avif", heic: "image/heic", heif: "image/heif",
  pdf: "application/pdf",
  doc: "application/msword",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  xls: "application/vnd.ms-excel",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  ppt: "application/vnd.ms-powerpoint",
  pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  txt: "text/plain", log: "text/plain", md: "text/markdown",
  csv: "text/csv", json: "application/json", xml: "application/xml",
  mp4: "video/mp4", webm: "video/webm", mov: "video/quicktime",
  zip: "application/zip",
};

const EXTENSAO_PERIGOSA = /\.(exe|msi|js|mjs|cjs|html?|sh|bat|cmd|ps1|vbs|jar|com|scr|dll)$/i;

function extensaoDe(nome: string): string {
  const i = nome.lastIndexOf(".");
  return i > 0 ? nome.slice(i + 1).toLowerCase() : "";
}

/**
 * O MIME que vamos declarar ao storage.
 *
 * A ordem é: o que o navegador disse, se for reconhecível; senão a extensão;
 * senão `application/octet-stream`, que o bucket recusa — e recusar aqui é o
 * comportamento certo, porque um arquivo que ninguém sabe o que é não deveria
 * entrar num bucket que a interface renderiza em `<img>` e `<iframe>`.
 */
export function tipoDe(arquivo: File): string {
  const declarado = (arquivo.type || "").toLowerCase();
  if (declarado && declarado !== "application/octet-stream") return declarado;
  return MIME_POR_EXTENSAO[extensaoDe(arquivo.name)] ?? "application/octet-stream";
}

/**
 * O nome que pode virar chave de objeto.
 *
 * Só `[A-Za-z0-9._-]`, que é o subconjunto seguro em qualquer versão do
 * storage-api. Acento vira `_`, e a extensão sobrevive porque `.` é permitido —
 * ela importa: é dela que `generoDe()` tira a miniatura quando o MIME falha.
 */
export function sanitizarNome(nome: string): string {
  const limpo = nome
    .normalize("NFD")
    // Tira o acento em vez de trocar por `_`: "Relatório" vira "Relatorio",
    // não "Relat_rio". O caminho continua legível para quem for depurar.
    .replace(new RegExp("[\\u0300-\\u036f]", "g"), "")
    .replace(/[^a-zA-Z0-9._-]+/g, "_")
    .replace(/^[._]+|_+$/g, "")
    .slice(0, 120);
  return limpo || "arquivo";
}

/** `null` quando o arquivo pode subir; a frase para o usuário quando não pode. */
export function validarArquivo(arquivo: File): string | null {
  if (arquivo.size <= 0) return `"${arquivo.name}" está vazio.`;
  if (arquivo.size > TAMANHO_MAXIMO) {
    return `"${arquivo.name}" tem ${(arquivo.size / 1024 / 1024).toFixed(1)} MB — o limite é 25 MB.`;
  }
  if (EXTENSAO_PERIGOSA.test(arquivo.name)) return `"${arquivo.name}" é de um tipo que não aceitamos.`;
  const tipo = tipoDe(arquivo);
  if (!MIME_PERMITIDOS.has(tipo)) {
    return `"${arquivo.name}" é de um tipo que não aceitamos (${tipo}).`;
  }
  return null;
}

/**
 * O erro do storage traduzido.
 *
 * `InvalidKey`, `Payload too large` e `mime type … is not supported` são as três
 * falhas que o usuário de fato encontra, e as três chegam em inglês, sem
 * contexto e sem dizer qual arquivo. Deixá-las passar cruas é o que fazia o
 * suporte receber "deu erro" como relato.
 */
function traduzirErro(erro: unknown, nome: string): Error {
  const bruto = erro instanceof Error ? erro.message : String(erro);
  if (/invalid ?key/i.test(bruto)) return new Error(`Não foi possível salvar "${nome}": nome de arquivo inválido.`);
  if (/exceeded|too large|payload/i.test(bruto)) return new Error(`"${nome}" excede o limite de 25 MB.`);
  if (/mime|content.?type/i.test(bruto)) return new Error(`"${nome}" é de um tipo que o servidor não aceita.`);
  if (/row-level security|policy|denied|unauthorized|403/i.test(bruto)) {
    return new Error(`Sem permissão para anexar em "${nome}". Recarregue a página e tente de novo.`);
  }
  if (/already exists|duplicate/i.test(bruto)) return new Error(`"${nome}" já foi enviado.`);
  return new Error(`Falha ao enviar "${nome}": ${bruto}`);
}

async function subir(caminho: string, arquivo: File): Promise<void> {
  const { error } = await supabase.storage.from(BUCKET_ANEXOS).upload(caminho, arquivo, {
    upsert: false,
    contentType: tipoDe(arquivo),
  });
  if (error) throw traduzirErro(error, arquivo.name);
}

/** Envia um arquivo para uma demanda que já existe e registra a linha. */
export async function enviarAnexoDaDemanda(
  demandaId: string,
  arquivo: File,
): Promise<DemandAttachment> {
  const problema = validarArquivo(arquivo);
  if (problema) throw new Error(problema);

  const caminho = `${demandaId}/${crypto.randomUUID()}-${sanitizarNome(arquivo.name)}`;
  await subir(caminho, arquivo);

  try {
    return await addAttachment(demandaId, {
      file_url: caminho,
      file_type: tipoDe(arquivo),
      // O nome original, com acento e espaço: é o que a pessoa reconhece.
      file_name: arquivo.name.slice(0, 200),
    });
  } catch (erro) {
    // Objeto órfão é pior que falha limpa: ele conta no tamanho do bucket e não
    // aparece em lista nenhuma. Mesmo cuidado de `uploadAnexo` em atividades.
    await supabase.storage.from(BUCKET_ANEXOS).remove([caminho]).catch(() => {});
    throw traduzirErro(erro, arquivo.name);
  }
}

/**
 * Um anexo que ainda não tem demanda.
 *
 * Ele já ESTÁ no storage — o upload é imediato, durante a conversa, para que
 * confirmar a demanda seja instantâneo e não uma segunda espera com barra de
 * progresso. O que falta é só a linha em `demand_attachments`, que depende de um
 * `demand_id` que ainda não nasceu.
 */
export interface AnexoDeRascunho {
  /** Local, só para React key e remoção na lista. */
  id: string;
  nome: string;
  tipo: string;
  tamanho: number;
  /** Caminho em `rascunhos/<user_id>/…`. Vira `file_url` depois de promovido. */
  caminho: string;
}

/** Sobe o arquivo para a área do usuário, antes de existir demanda. */
export async function enviarRascunho(arquivo: File): Promise<AnexoDeRascunho> {
  const problema = validarArquivo(arquivo);
  if (problema) throw new Error(problema);

  const { data: sessao } = await supabase.auth.getUser();
  const uid = sessao.user?.id;
  if (!uid) throw new Error("Sessão expirada. Entre novamente para anexar.");

  const caminho = `${PASTA_RASCUNHO}/${uid}/${crypto.randomUUID()}-${sanitizarNome(arquivo.name)}`;
  await subir(caminho, arquivo);

  return {
    id: crypto.randomUUID(),
    nome: arquivo.name,
    tipo: tipoDe(arquivo),
    tamanho: arquivo.size,
    caminho,
  };
}

/** Desiste de um rascunho: tira o objeto do bucket, sem drama se já sumiu. */
export async function descartarRascunho(anexo: AnexoDeRascunho): Promise<void> {
  await supabase.storage.from(BUCKET_ANEXOS).remove([anexo.caminho]).catch(() => {});
}

/**
 * Promove os rascunhos da conversa a anexos da demanda recém-criada.
 *
 * O `move` é a parte opcional: ele arruma a casa (`<demand_id>/…` é onde todo
 * anexo mora), mas se falhar o arquivo continua acessível pelo caminho de
 * rascunho — a política de leitura tem uma porta exatamente para esse caso. O
 * que NÃO é opcional é a linha em `demand_attachments`: sem ela o arquivo existe
 * e ninguém sabe.
 *
 * Nunca lança. Uma demanda criada com sucesso não pode ser reportada como falha
 * porque um dos três prints não migrou de pasta; quem chama recebe a lista do
 * que não foi e decide o que dizer.
 */
export async function promoverRascunhos(
  demandaId: string,
  rascunhos: AnexoDeRascunho[],
): Promise<{ anexados: number; falhas: string[] }> {
  const falhas: string[] = [];
  let anexados = 0;

  for (const r of rascunhos) {
    const destino = `${demandaId}/${r.caminho.split("/").pop()}`;
    const { error: erroMove } = await supabase.storage.from(BUCKET_ANEXOS).move(r.caminho, destino);
    const caminhoFinal = erroMove ? r.caminho : destino;

    try {
      await addAttachment(demandaId, {
        file_url: caminhoFinal,
        file_type: r.tipo,
        file_name: r.nome.slice(0, 200),
      });
      anexados += 1;
    } catch (erro) {
      falhas.push(traduzirErro(erro, r.nome).message);
    }
  }

  return { anexados, falhas };
}

/**
 * Envia vários e conta o placar.
 *
 * Não para no primeiro erro: quem arrasta cinco prints e tem um arquivo grande
 * demais no meio deve terminar com quatro anexados e uma frase sobre o quinto,
 * não com zero anexados e uma frase sobre o quinto.
 */
export async function enviarVarios(
  demandaId: string,
  arquivos: File[],
): Promise<{ anexados: number; falhas: string[] }> {
  const falhas: string[] = [];
  let anexados = 0;
  for (const arquivo of arquivos) {
    try {
      await enviarAnexoDaDemanda(demandaId, arquivo);
      anexados += 1;
    } catch (erro) {
      falhas.push(erro instanceof Error ? erro.message : `Falha ao enviar "${arquivo.name}".`);
    }
  }
  return { anexados, falhas };
}

/**
 * EXCLUIR UM ANEXO.
 *
 * A ORDEM É DELIBERADA: ARQUIVO PRIMEIRO, LINHA DEPOIS.
 *
 * As duas permissões não têm o mesmo alcance, e isso não é descuido de quem as
 * escreveu — são camadas diferentes:
 *
 *   `demand_attachments` (linha)  quem subiu, admin, OU quem abriu a demanda
 *   `storage.objects` (arquivo)   quem subiu, admin, ou rascunho próprio
 *
 * Ou seja: o solicitante pode apagar a LINHA de um anexo que ele não subiu,
 * mas não pode apagar o ARQUIVO. Removendo a linha primeiro, a interface diria
 * "excluído" e o arquivo continuaria no bucket para sempre — invisível,
 * inauditável e ocupando espaço. Órfão silencioso é a pior forma de lixo,
 * porque ninguém sabe que ele existe para ir limpar.
 *
 * Apagando o arquivo primeiro, quem não tem permissão recebe um erro claro e
 * nada é removido pela metade. "Não consegui" é resposta melhor que uma
 * exclusão que não excluiu.
 */
export async function excluirAnexoDaDemanda(anexoId: string, caminho: string): Promise<void> {
  const { error: erroDoArquivo } = await supabase.storage.from(BUCKET_ANEXOS).remove([caminho]);

  if (erroDoArquivo) {
    throw new Error(
      "Não foi possível excluir o arquivo. Só quem enviou o anexo, ou um administrador, pode removê-lo.",
    );
  }

  const { error: erroDaLinha, data } = await supabase
    .from("demand_attachments")
    .delete()
    .eq("id", anexoId)
    .select("id");

  // Mesma armadilha de sempre neste schema: DELETE barrado por RLS não devolve
  // erro, devolve zero linhas. Sem esta checagem, o arquivo sairia, a linha
  // ficaria, e a lista mostraria um anexo cujo download nunca abre.
  if (erroDaLinha || !data || data.length === 0) {
    throw new Error(
      "O arquivo foi removido, mas o registro do anexo não. Recarregue a página e tente de novo.",
    );
  }
}
