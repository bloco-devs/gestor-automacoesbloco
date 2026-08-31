/**
 * Constantes de infraestrutura que o front precisa saber de cor.
 *
 * Nada de segredo aqui: só endereço público.
 */

/**
 * Quadros do BLINK da tela de entrada.
 *
 * POR QUE SAIU DO SUPABASE STORAGE E VEIO PARA `public/`
 *
 * Três motivos, todos descobertos na prática:
 *
 *  1. `cache-control`. O uploader do Dashboard grava `no-cache`, e só a
 *     service_role consegue gravar outro valor. Eram 7,6 MB rebaixados a
 *     cada login, para sempre. Servido de `public/`, o cabeçalho é o do
 *     próprio host, que faz cache direito.
 *
 *  2. Sobrescrita. O uploader do Dashboard PULA arquivo que já existe, sem
 *     avisar: subir uma versão nova dos quadros com os mesmos nomes não
 *     trocava nada, e o app continuava servindo os antigos.
 *
 *  3. Sincronia. Assim os quadros e o código que os lê viajam no mesmo
 *     deploy. Não existe mais o estado em que o componente espera um
 *     conjunto de quadros e o Storage tem outro.
 *
 * Caminho relativo de propósito: mesma origem do app, então vale em preview
 * e em produção sem configuração, e não há uma segunda origem para falhar
 * logo depois do redirect do Bloco ID.
 *
 * Sem barra final: o `BoasVindas` concatena `/fNNN.webp`.
 */
export const BLINK_FRAMES_URL = "/blink/frames";
