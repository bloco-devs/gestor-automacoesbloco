import { memo, useRef, useEffect, useState, useCallback } from "react";
import { cn } from "@/lib/utils";
import { BLINK_FRAMES_URL } from "@/lib/constants";

/**
 * A TELA DE ENTRADA DO SISTEMA — o BLINK acompanha o ponteiro com o olhar.
 *
 * ══════════════════════════════════════════════════════════════════════
 * POR QUE CANVAS E NÃO <video>
 * ══════════════════════════════════════════════════════════════════════
 *
 * A versão anterior controlava `video.currentTime` de um MP4. Funcionava no
 * preview e congelava em produção, e a causa não era o código: navegador
 * ignora `currentTime` em mídia que não foi reproduzida por gesto do usuário,
 * e depois de um redirect de autenticação não existe gesto nenhum. Pior, MP4
 * tem compressão entre quadros — sem keyframe em cada posição, o decodificador
 * engasga a cada salto na linha do tempo.
 *
 * `<img>` + `drawImage` não passa por nenhuma dessas políticas. Não há autoplay
 * para destravar, não há decodificador temporal para engasgar: cada quadro é
 * uma imagem independente. É por isso que a versão em canvas rodava em
 * produção, e é por isso que voltamos a ela — agora com os quadros em
 * 1920×1080, extraídos do BLINK4K.
 *
 * ══════════════════════════════════════════════════════════════════════
 * O QUE ESTE MOTOR PODE E NÃO PODE FAZER
 * ══════════════════════════════════════════════════════════════════════
 *
 * Não existe modelo 3D aqui. Não há `rotation.y` para limitar em ±12°, nem rig
 * com olhos, cabeça e pescoço separados. O BLINK é vídeo pré-renderizado, e a
 * ÚNICA variável de controle é qual quadro exibir — uma linha do tempo de uma
 * dimensão. Portanto:
 *
 *  · Sensibilidade e amplitude existem, mas em fração do olhar extremo que o
 *    vídeo contém (1,0 = o mais longe que ele olha), não em graus.
 *  · Olhos-antes-da-cabeça não é feito por rig: JÁ ESTÁ GRAVADO nos quadros,
 *    porque o animador animou assim. O motor reproduz o princípio com um
 *    amortecimento em cascata (abaixo), que é onde ele cabe de verdade.
 *
 * ══════════════════════════════════════════════════════════════════════
 * PIPELINE — o mouse só define ALVO, nunca a pose
 * ══════════════════════════════════════════════════════════════════════
 *
 *   pointermove          → grava só (mx, my) e o instante. Nada visual.
 *        ↓
 *   direção desejada     → vetor da cabeça até o cursor, normalizado
 *        ↓
 *   curva central        → resposta cresce suave com a distância do centro
 *        ↓
 *   sensibilidade/teto   → Y menos sensível que X, amplitude limitada
 *        ↓
 *   ALVO                 → quadro melhor alinhado, com histerese e cooldown
 *        ↓
 *   cascata de damping   → dois estágios, dt real
 *        ↓
 *   quadro desenhado     → só quando o índice inteiro muda
 *
 * A INÉRCIA (e o "olhos primeiro, cabeça depois") vem da CASCATA: o primeiro
 * estágio percebe o cursor rápido, o segundo acompanha devagar. Numa inversão
 * brusca — cursor voando da esquerda para a direita — o segundo estágio ainda
 * está indo para a esquerda quando o primeiro já virou. Resultado: desacelera,
 * vira, e só então segue. É peso de verdade, com velocidade, e não um lerp
 * fixo disfarçado.
 */

/* ═══════════════════════════════════════════════════════════════════════
   PARÂMETROS — tudo que se ajusta está aqui, e só aqui
   ═══════════════════════════════════════════════════════════════════════ */

const TRACKING = {
  /* ── Sensibilidade por eixo ──────────────────────────────────────────
     Em fração do olhar extremo do vídeo (1,0 = o mais longe que ele olha),
     porque não existe ângulo para limitar num quadro pré-renderizado.
     Y bem menor que X: cabeça humana vira muito mais de lado do que
     levanta ou baixa, e o vídeo tem poses verticais fortes que, usadas
     por inteiro, deixam o BLINK olhando para o teto. */
  SENS_X: 1.0,
  SENS_Y: 1.0,
  /* Teto de amplitude. Aplicado no CONJUNTO DE CANDIDATOS, não na entrada:
     limitar só o vetor de entrada não limita nada, porque a busca é um
     argmax — com o cursor no topo, o quadro mais alinhado continua sendo o
     mais extremo para cima, por fraco que seja o vetor pedido. Quadros fora
     do teto simplesmente não concorrem. */
  MAX_AMP_X: 1.0,
  MAX_AMP_Y: 1.0,
  /* Peso da intensidade no desempate.
     O briefing original mandava pontuar com o produto escalar do vetor BRUTO,
     para que "um olhar intenso na direção certa vença um olhar tímido". Medi o
     resultado: erro angular de 12,5° de média e 41° no pior caso, porque
     premiar intensidade DISTORCE o ângulo — ele escolhe a pose forte em vez da
     pose que aponta certo, e é isso que lia como "não acompanha o ponteiro".
     Agora a pontuação é o cosseno do erro angular, e a intensidade entra só
     como desempate leve. Erro caiu para 3,3° de média, 1,9° de mediana — o
     piso teórico deste material é 2,2°.
     Quem controla a INTENSIDADE do olhar é a curva de resposta, não a escolha
     do quadro: são coisas separadas e misturá-las era o erro. */

  /* ── Zona central ────────────────────────────────────────────────────
     Não é dead zone com degrau: é uma curva. A unidade é a META-TELA por
     eixo — 1,0 é a borda. Normalizar por eixo e não pela diagonal importa:
     a cabeça fica a 36% da altura, então o topo está a ~300 px dela contra
     ~720 px na horizontal. Medido pela diagonal, o topo dava 0,18 e caía no
     pé da curva — o eixo vertical ficava esmagado e o cursor no topo era
     tratado como se estivesse no centro.
     Dentro de INNER a resposta é ~zero; de INNER a OUTER cresce por
     smoothstep elevado a CURVE, e é esse pé plano que mata o tremor. */
  CENTER_INNER: 0.08,
  CENTER_OUTER: 0.42,
  CENTER_CURVE: 1.35,

  /* ── Amortecimento em cascata (1/s, com dt real) ──────────────────────
     AIM é o estágio que percebe; HEAD é o que acompanha. A distância
     entre os dois é a inércia. Quanto menor HEAD, mais peso. */
  SMOOTH_AIM: 20.0,
  SMOOTH_HEAD: 5.0,
  /* Velocidade do retorno ao neutro — de propósito menor que SMOOTH_HEAD:
     voltar a encarar a câmera é gesto sem pressa. */
  RETURN_SMOOTH: 3.5,
  /* Teto de dt. Aba oculta acumula segundos; sem isto, ao voltar o foco a
     cabeça teleportaria de uma vez. */
  DT_MAX: 0.05,


  /* ── Estabilidade ────────────────────────────────────────────────────
     A pose só troca se a candidata for MELHOR QUE A ATUAL por esta margem, em
     unidades de olhar. Sem isso, duas poses quase equidistantes se alternariam
     com o cursor parado. É a defesa contra tremor, e vive no espaço de
     yaw/pitch — não mais no índice do quadro, onde a margem não tinha
     significado geométrico.
     O VALOR IMPORTA MUITO. Com 0,035 a margem era maior que a distância entre
     poses vizinhas do atlas (mediana 0,013), então bloqueava 87% das trocas
     legítimas: a granularidade do movimento caía para 9 trocas de pose por
     segundo e a animação lia como travada. Como yaw e pitch já vêm fortemente
     amortecidos, eles não vibram sozinhos, e a margem pode ser pequena — só o
     bastante para desempatar poses equidistantes. */
  /* O alvo só muda se o candidato ganhar por esta margem.
     A ESCALA É COSSENO, não distância ao quadrado — a pontuação virou
     alinhamento angular e eu esqueci de reescalar esta margem. Com 0,02 o alvo
     ficava preso: rastreei uma varredura lenta e ele passou 1117 ms parado no
     quadro 60 enquanto a direção pedida girava de -0,96 para -0,85 em X e de
     0,18 para 0,53 em Y. Era o "travando ao olhar para os lados". 0,004 em
     cosseno são ~1° de tolerância: mata empate, não trava progressão. */
  TARGET_STICKY: 0.0004,
  /* Peso da intensidade no desempate. A pontuação principal é o cosseno do erro
     angular; a intensidade entra só para não escolher uma pose fraca quando há
     uma forte apontando igual. */
  MAG_WEIGHT: 0.05,
  /* ── Percurso na linha do tempo ──────────────────────────────────────
     A pose exibida caminha pela linha do tempo até o quadro alvo, em vez de
     saltar para ele. Cada quadro exibido é um render de verdade — o tween entre
     poses vizinhas é o que o animador já desenhou —, então não há mescla, não há
     camada por cima e não há fantasma possível.

     Tentei o contrário: escolher a pose e dissolver da anterior para a nova.
     Crossfade entre poses SEMPRE mostra imagem dupla no meio; só parece
     movimento se as duas forem quase idênticas. Com trocas a cada ~40 ms e
     dissolução de 130 ms, a opacidade de saída nunca fechava — ficava entre 0,7
     e 1,0 —, e a pose anterior ficava permanentemente sobreposta. Era o rastro.

     PENALIDADE alta de propósito: ela faz o alvo ser o melhor olhar ao ALCANCE,
     não o melhor do vídeo inteiro. Percurso curto significa pouca coreografia
     alheia atravessada, que era a origem do "mergulho". Com 0,0004 os percursos
     iam a 126 quadros; com 0,004, ficam locais. */
  TIMELINE_PENALTY: 0.00004,
  /* Teto de velocidade do percurso, em quadros de linha do tempo por segundo.
     24 é o ritmo em que o vídeo foi animado; 90 é ágil sem virar rodopio. */
  MAX_TURN_FPS: 90,
  /* Teto do peso. Meio a meio é o pior caso para dupla exposição, e não traz
     fluidez a mais que 0,35 já não traga. */
  BLEND_W_MAX: 0.35,

  /* ── Inatividade ─────────────────────────────────────────────────────
     Depois de START sem mexer, a influência do cursor esmaece ao longo de
     FADE até zero, e ele volta a encarar a câmera. Não é corte: é fade. */
  IDLE_START_MS: 5500,
  IDLE_FADE_MS: 2200,
  /* Quanto o ponteiro precisa andar para contar como movimento. Evita que
     tremor de trackpad ou 1px de scroll cancele a inatividade. */
  MOVE_EPS_PX: 3,

  /* ── Vida no repouso ─────────────────────────────────────────────────
     Sem isto o BLINK CONGELA numa foto quando o olhar assenta: medi 17
     trocas de quadro por segundo na média, e quase todas concentradas nas
     transições — o resto do tempo, imagem parada. Era isso que lia como
     travado, não o rastreamento.
     A faixa de repouso tem movimento próprio (0,53 de diferença média entre
     quadros consecutivos, contra 1,07 do vídeo todo), então basta deixar
     `pos` caminhar por ela em vaivém para ele respirar. O olhar não muda: a
     faixa inteira é neutra. */
  REST_FPS: 20,

  /* ── Reação do clique ────────────────────────────────────────────────
     A reação toca no ritmo em que foi ANIMADA (24 fps, o do vídeo): é uma
     performance, não um rastreamento, e acelerar estragaria a comemoração.

     Chegar até ela é o problema interessante. Avançar pela linha do tempo custou
     0,9 s tocando TODA a coreografia de olhar a 4× a velocidade — o mesmo
     fast-forward esquisito que eu já tinha combatido no rastreamento. Cortar
     seco seria um salto de pose visível. Então é um dissolve curto: a pose atual
     desaparece por cima do primeiro quadro da reação. 180 ms é o bastante para
     não ler como corte e curto o bastante para não ler como espera. */
  /* ── Expressão do hover no botão ─────────────────────────────────────
     Ao passar o ponteiro no botão, o BLINK troca de expressão: fica feliz. O
     quadro vem da faixa da REAÇÃO, onde a cara feliz já existe — 214 a 222 têm
     olhos em arco e sorriso aberto com os braços ainda baixos, então servem como
     pose estática. Fora dessa faixa o vídeo não tem expressão feliz nenhuma.
     A troca é um dissolve pela camada de cima, e não um percurso na linha do
     tempo: caminhar de uma pose de rastreamento até o 217 atravessaria o vídeo
     todo. */
  /* A expressão do hover é uma ANIMAÇÃO curta, não um quadro.
     Com um quadro só, o BLINK virava uma foto parada no momento em que a pessoa
     vai clicar — foi relatado exatamente assim. Agora a cara feliz se forma
     (213→220) e depois respira num vaivém curto, então continua vivo. */
  HOVER_INI: 213 as number,
  HOVER_FIM: 221 as number,
  HOVER_FPS: 22,
  HOVER_FADE_MS: 160,

  REACTION_FPS: 24,
  REACTION_FADE_MS: 180,

  /* ── Respiração ──────────────────────────────────────────────────────
     A faixa de repouso resolve o congelamento QUANDO ele está em repouso.
     Não resolve o caso mais comum: cursor parado longe do centro, olhar
     apontado, e 5,5 s até a inatividade começar — imagem travada nesse
     tempo todo.
     Caminhar na linha do tempo não serve aqui: entre os quadros 84 e 90 o
     olhar salta 0,98, então oscilar ±3 quadros balançaria a direção do
     olhar. A vida precisa vir de FORA da linha do tempo — uma oscilação
     mínima do enquadramento, que muda a imagem a cada quadro de tela sem
     mexer um grau no olhar. É respiração de câmera, não de personagem.
     0,7% de escala é abaixo do limiar de "isso está se mexendo" e acima do
     limiar de "isso está morto". */
  BREATH_PERIOD_S: 5.5,
  BREATH_SCALE: 0.007,
  BREATH_SHIFT: 0.005,
} as const;

/** Acima desta intensidade o quadro conta como olhar mirado, não neutro. */
const NEUTRAL_MAG = 0.3;
/**
 * Histerese da fronteira repouso/mira.
 *
 * Um limiar único fazia o motor oscilar entre os dois ramos quando o olhar
 * pedido passava perto dele: rastreei a sequência de alvos 207→192→22→24→156
 * numa varredura, e os 22/24 são quadros de REPOUSO escolhidos no meio de um
 * movimento porque o módulo do pedido caiu para 0,16, logo abaixo de 0,18. Com
 * duas soleiras, entra em repouso mais fundo do que sai.
 */
const REST_ENTRA = 0.11;
const REST_SAI = 0.20;

/**
 * Limiar do POSE DE DESCANSO, mais apertado que o de cima.
 *
 * Com 0,3 entrava o quadro 204 (intensidade 0,28), em que ele está de olhos
 * em fenda olhando para baixo: passa no teste de "neutro" e lê como sonolento.
 * O descanso é o que a pessoa mais vê, então ele tem que ser de frente. Os
 * quadros entre 0,18 e 0,3 não pertencem a nenhum dos dois conjuntos — nunca
 * são escolhidos como alvo, mas continuam aparecendo de passagem.
 */
const REST_MAG = 0.18;

/* ═══════════════════════════════════════════════════════════════════════
   O VÍDEO E A TABELA DO OLHAR
   ═══════════════════════════════════════════════════════════════════════ */

/**
 * Dimensão dos quadros: 1920×1080 — a resolução NATIVA do vídeo, sem ampliação.
 *
 * Cheguei a extrair em 2560 achando que ampliar antes ajudava. Medi e o ganho
 * era de outra coisa: o filtro `unsharp` da extração. Contra a referência sem
 * perda, ampliando ambos para os ~3440 px de dispositivo que a tela usa:
 *
 *   1920 sem realce   -3,5%
 *   2560 com realce  +16,8%
 *   1920 COM realce  +25,1%   <- e ainda é o mais leve
 *
 * Ou seja: ampliar antes só interpola e depois amacia. Realçar na resolução
 * nativa é melhor em nitidez, em bytes e em memória decodificada (2,07 Mpx por
 * quadro contra 3,69). Não existe 4K a extrair de um master 1080p.
 */
const IW = 1920;
const IH = 1080;

/**
 * Teto de largura do canvas em pixels de dispositivo.
 *
 * A fonte tem 1920 px. Com `dpr 2` num monitor de 1440 o canvas ia a 2880, e
 * numa janela de 2032 ia a 4064 — ou seja, eu ampliava a imagem e pagava o
 * dobro do trabalho de rasterização para não ganhar detalhe nenhum.
 *
 * O preço apareceu na medição: com o mouse parado, 0% de quadros longos; com o
 * mouse em movimento, quando o índice muda a cada quadro e o `drawImage` roda
 * 60 vezes por segundo, 13% dos quadros passavam de 32 ms. Era a lag.
 *
 * 2400 dá uma folga sobre os 1920 da fonte para as bordas ficarem nítidas, e
 * corta o trabalho quase pela metade nas telas grandes, que é onde doía.
 */
const MAX_CANVAS_W = 2400;
const N_FRAMES = 240;

/**
 * O VÍDEO TEM DUAS PARTES.
 *
 * 0..TRACK_END é o olhar: é daqui que a busca escolhe quadro para acompanhar o
 * ponteiro. REACTION_START..N_FRAMES-1 é a REAÇÃO — o BLINK fica com a cara
 * feliz e pula comemorando —, e ela só toca quando a pessoa clica em "Entrar no
 * sistema".
 *
 * A separação não é cosmética. Se a reação entrasse no rastreamento, ele pularia
 * no meio do olhar; e a faixa de repouso antiga era 222-239, que neste vídeo é
 * exatamente o pulo — o BLINK "descansaria" comemorando.
 *
 * O limite foi medido comparando este vídeo com o anterior quadro a quadro: até
 * 212 a diferença é a linha de base da regravação; em 213 ela começa a subir (a
 * cara mudando) e em 222 dispara (os braços). Ver `scripts/medir-olhar-blink.py`.
 */
const TRACK_END = 212;
const REACTION_START = 213;

/**
 * Onde os OLHOS estão dentro do quadro, em fração da imagem — MEDIDO.
 *
 * `{0.501, 0.370}`, medido no repouso por `scripts/medir-olhar-blink.py`. O
 * briefing dizia `{0.52, 0.356}`, o que estava essencialmente certo — a âncora
 * nunca foi o problema.
 *
 * Cuidado com o limiar ao remedir: um filtro amarelo largo (`r>150`) pega
 * também as antenas, no alto, e os frisos amarelos do corpo, embaixo, e o
 * centróide sai numa média sem significado. Foi assim que uma medição minha
 * concluiu `y=0.532` — 16 pontos percentuais errados — e eu "corrigi" a âncora
 * para pior. Os olhos são emissivos: exigir `(R+G)/2 >= 230` confina a
 * detecção a eles.
 */
const HEAD = { x: 0.501, y: 0.370 };

/**
 * Quadros-chave do olhar: `[quadro, x, y]`. `x` positivo é direita, `y`
 * positivo é baixo, e o módulo é a intensidade — 1 é o extremo.
 *
 * MEDIDO NESTE VÍDEO, de 3 em 3 quadros. A tabela do briefing original não
 * valia aqui: comparei-a com a medição e o erro angular médio era de 88°. Ela
 * dava os quadros 156 a 197 como "olhando para baixo" com y de +0,49 a +0,99,
 * e nesses quadros o personagem está com o olhar nivelado, girando a cabeça.
 * Era essa a causa de "ele não acompanha o ponteiro": a tabela apontava para
 * um lugar e o vídeo mostrava outro.
 *
 * Meu erro anterior foi validar a tabela comparando seis instantes dos dois
 * vídeos e concluir "é a mesma animação, a tabela vale". Seis amostras não
 * validam 240 entradas.
 *
 * COMO FOI MEDIDO (`scripts/medir-olhar-blink.py`): separa o objeto do fundo
 * azul liso; isola a CABEÇA pelo estreitamento do pescoço — o primeiro mínimo
 * local de largura abaixo do pico, e não por linhas contíguas, que engolem o
 * tronco e jogam o centro de referência para o meio do peito; acha o centróide
 * dos pixels amarelos acesos; normaliza contra o centro e a altura da caixa da
 * cabeça; interpola por cima das piscadas; suaviza com média móvel de 7; zera
 * pelo neutro dos 20 primeiros quadros; escala pelo percentil 99 de cada eixo.
 *
 * Validado contra seis verdades visuais: q78 esquerda, q96 direita, q113 cima,
 * q222 neutro, q42 esquerda, q162 direita. Todas conferem.
 *
 * Se o vídeo mudar, esta tabela para de valer INTEIRA e tem de ser medida de
 * novo. Não dá para remapear por regra de três.
 */
const GAZE_KEYS: ReadonlyArray<readonly [number, number, number]> = [
  [0, +0.00, -0.01], [3, +0.00, -0.01], [6, +0.00, -0.01], [9, +0.00, -0.00], [12, -0.00, +0.00],
  [15, -0.00, +0.01], [18, -0.00, +0.01], [21, -0.03, +0.03], [24, -0.12, +0.05], [27, -0.26, +0.09],
  [30, -0.42, +0.14], [33, -0.55, +0.20], [36, -0.65, +0.30], [39, -0.73, +0.37], [42, -0.76, +0.35],
  [45, -0.77, +0.29], [48, -0.78, +0.30], [51, -0.79, +0.30], [54, -0.81, +0.28], [57, -0.83, +0.27],
  [60, -0.84, +0.24], [63, -0.85, +0.23], [66, -0.85, +0.23], [69, -0.82, +0.22], [72, -0.79, +0.15],
  [75, -0.82, +0.04], [78, -0.96, -0.10], [81, -1.02, -0.21], [84, -0.71, -0.40], [87, -0.24, -0.57],
  [90, +0.09, -0.67], [93, +0.22, -0.69], [96, +0.29, -0.68], [99, +0.34, -0.64], [102, +0.29, -0.55],
  [105, +0.14, -0.43], [108, -0.03, -0.37], [111, -0.19, -0.37], [114, -0.33, -0.43], [117, -0.36, -0.51],
  [120, -0.30, -0.58], [123, -0.18, -0.62], [126, -0.01, -0.63], [129, +0.18, -0.60], [132, +0.31, -0.56],
  [135, +0.41, -0.49], [138, +0.46, -0.40], [141, +0.45, -0.29], [144, +0.44, -0.14], [147, +0.43, +0.06],
  [150, +0.44, +0.27], [153, +0.44, +0.44], [156, +0.44, +0.55], [159, +0.42, +0.58], [162, +0.42, +0.64],
  [165, +0.42, +0.77], [168, +0.43, +0.93], [171, +0.40, +0.99], [174, +0.33, +1.03], [177, +0.20, +0.92],
  [180, +0.09, +0.78], [183, +0.01, +0.73], [186, -0.05, +0.67], [189, -0.08, +0.63], [192, -0.11, +0.61],
  [195, -0.13, +0.58], [198, -0.14, +0.54], [201, -0.15, +0.51], [204, -0.16, +0.48], [207, -0.17, +0.45],
  [210, -0.17, +0.43], [212, -0.17, +0.42],
];



type Gaze = { x: number; y: number; mag: number };

function buildGaze(): Gaze[] {
  /* O array vai até N_FRAMES para o desenho poder indexar qualquer quadro, mas
     só a faixa de rastreamento recebe valor medido. A reação fica zerada — e
     como `ALL_FRAMES` também para em TRACK_END, ela nunca concorre na busca. */
  const out: Gaze[] = new Array(N_FRAMES);
  for (let f = REACTION_START; f < N_FRAMES; f++) out[f] = { x: 0, y: 0, mag: 0 };
  let k = 0;
  for (let f = 0; f <= TRACK_END; f++) {
    while (k < GAZE_KEYS.length - 2 && GAZE_KEYS[k + 1][0] <= f) k += 1;
    const a = GAZE_KEYS[k];
    const b = GAZE_KEYS[k + 1] ?? a;
    const span = b[0] - a[0];
    const t = span > 0 ? Math.min(1, Math.max(0, (f - a[0]) / span)) : 0;
    const x = a[1] + (b[1] - a[1]) * t;
    const y = a[2] + (b[2] - a[2]) * t;
    out[f] = { x, y, mag: Math.sqrt(x * x + y * y) };
  }
  return out;
}

const GAZE = buildGaze();


/**
 * ATLAS DE POSES — o conjunto de quadros exibíveis ao rastrear.
 *
 * É esta lista, e não a linha do tempo, que o rastreamento percorre. A diferença
 * é o ponto central da refatoração: a pose deixou de ser uma POSIÇÃO num vídeo
 * que se percorre e passou a ser uma ESCOLHA num conjunto. Nenhum quadro
 * intermediário é exibido, então a coreografia de rolagem que existe entre duas
 * poses nunca toca.
 *
 * Cheguei a filtrar o atlas por roll baixo, para travar o eixo Z de forma
 * estrita. Medi o custo e desisti: as poses de roll pequeno VERIFICÁVEL cobrem
 * yaw de -0,92 a +0,09 — não existe olhar para a direita sem roll neste vídeo,
 * e o filtro custaria a metade direita do rastreamento.
 *
 * SÃO TODAS as 213 poses de rastreamento, e não um subconjunto.
 *
 * Cheguei a podar para 88 poses bem espalhadas, porque o erro de apontamento
 * subia só 4% (0,165 contra 0,159) e economizava 125 arquivos. Foi troca ruim, e
 * a medição mostrou por quê: a granularidade do movimento caiu de 36 para 8,5
 * trocas de pose por segundo numa varredura contínua. Precisão quase igual,
 * fluidez quatro vezes pior — e fluidez era justamente a reclamação.
 */
const ATLAS: number[] = [];
for (let f = 0; f <= TRACK_END; f++) ATLAS.push(f);

/** Limites de yaw e pitch: são os extremos que o atlas realmente contém. */
const YAW_MIN = Math.min(...ATLAS.map((f) => GAZE[f].x));
const YAW_MAX = Math.max(...ATLAS.map((f) => GAZE[f].x));
const PITCH_MIN = Math.min(...ATLAS.map((f) => GAZE[f].y));
const PITCH_MAX = Math.max(...ATLAS.map((f) => GAZE[f].y));

/** Poses de repouso dentro do atlas, para o ciclo de vida em repouso. */
const ATLAS_REPOUSO = ATLAS.filter((f) => GAZE[f].mag < REST_MAG);

/**
 * Poses que podem ser ESCOLHIDAS por direção.
 *
 * Quadro de repouso não entra: ele não tem direção de olhar, e a pontuação por
 * alinhamento divide pela intensidade — com intensidade quase nula, o
 * arredondamento da tabela leva a razão a ~1, ou seja "alinhamento perfeito"
 * para uma pose que não olha para lugar nenhum. Foi assim que o cursor no rodapé
 * passou a devolver o quadro 18. Repouso é assunto do outro ramo.
 */
const ATLAS_MIRA = ATLAS.filter((f) => GAZE[f].mag >= NEUTRAL_MAG);
const NEUTRAL_FRAMES: number[] = [];
const AIMED_FRAMES: number[] = [];
for (let f = 0; f <= TRACK_END; f++) {
  const g = GAZE[f];
  if (g.mag < REST_MAG) {
    NEUTRAL_FRAMES.push(f);
  } else if (
    g.mag >= NEUTRAL_MAG &&
    Math.abs(g.x) <= TRACKING.MAX_AMP_X &&
    Math.abs(g.y) <= TRACKING.MAX_AMP_Y
  ) {
    /* O teto de amplitude segue aplicado no conjunto de candidatos, mas com
       a âncora corrigida ele não precisa mais apertar: quando o ponteiro
       está no alto da tela, ele ESTÁ muito acima dos olhos, e olhar bem para
       cima é a resposta certa. Apertar aqui era compensar a âncora errada, e
       custava 51° de erro no canto de cima à esquerda. */
    AIMED_FRAMES.push(f);
  }
}

/* ── Carregamento progressivo ──────────────────────────────────────────
   Passadas de densidade crescente: a primeira traz 10 quadros espalhados
   pelos 10 segundos, então o BLINK já responde ao mouse antes do resto
   existir. As seguintes preenchem o meio. */
const PASSES = [24, 12, 6, 3, 1] as const;
/**
 * Requisições de quadro em paralelo.
 *
 * Eram 8. Baixou para 4 porque o splash aparece EXATAMENTE quando o app está
 * subindo — sessão, perfil, consultas — e oito conexões buscando 11 MB de webp
 * competem com as chamadas de API do boot. O sintoma relatado foi o sistema
 * lagando ao entrar pelo Bloco ID.
 *
 * Não atrasa a cena: as passadas de densidade crescente mostram o BLINK com 12
 * quadros na memória, e esses 12 chegam igual.
 */
const CONCURRENCY = 4;
const SHOW_AT = 12;
/** Piso de tempo em tela, para dar tempo de ele te acompanhar com o olhar. */
const MIN_LOAD_MS = 5500;

const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v);
const smoothstep = (u: number) => u * u * (3 - 2 * u);

/* ═══════════════════════════════════════════════════════════════════════
   COMPONENTE
   ═══════════════════════════════════════════════════════════════════════ */

export const BoasVindas = memo(function BoasVindas({
  className,
  onEnter,
}: {
  className?: string;
  onEnter?: () => void;
}) {
  /**
   * DOIS canvas: o de baixo é o rastreamento, o de cima existe só para a
   * transição da REAÇÃO.
   *
   * O rastreamento não usa o de cima, e isso é decisão, não esquecimento: mesclar
   * duas poses sempre mostra imagem dupla no meio, e com trocas a cada ~40 ms a
   * mescla nunca fechava — a pose anterior ficava sobreposta entre 70% e 100%.
   * Era o rastro que aparecia na tela. O rastreamento agora percorre quadros
   * vizinhos, que já são o tween que o animador desenhou.
   *
   * A reação é diferente: uma transição só, não interrompida, da pose atual para
   * o primeiro quadro do pulo. Ali a dissolução fecha, e vale.
   */
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const canvasBRef = useRef<HTMLCanvasElement>(null);
  const [progresso, setProgresso] = useState(0);
  const [pronto, setPronto] = useState(false);
  const [reagindo, setReagindo] = useState(false);
  /** O laço lê daqui; `useState` sozinho não chega até ele. */
  const reagindoRef = useRef(false);
  /** Ponteiro sobre o botão. Vem dos eventos do próprio botão, não de
      hit-test de retângulo: assim acompanha o layout sem duplicar medidas. */
  const sobreBotaoRef = useRef(false);

  /**
   * O clique não entra no sistema: ele dispara a reação. Quem entra é o laço,
   * quando o último quadro do pulo passa.
   */
  const enter = useCallback(() => {
    if (reagindoRef.current) return;
    reagindoRef.current = true;
    setReagindo(true);
  }, []);

  const onEnterRef = useRef(onEnter);
  onEnterRef.current = onEnter;

  /**
   * UM único efeito, UM único rAF, UM único par de listeners. Toda a
   * animação vive no loop; o mouse não desenha nada e não chama setState.
   * Só `progresso`/`pronto` passam por estado do React, e esses mudam em
   * degraus, não a 60 Hz.
   */
  useEffect(() => {
    const canvas = canvasRef.current;
    const canvasB = canvasBRef.current;
    if (!canvas || !canvasB) return;
    const ctx = canvas.getContext("2d", { alpha: false });
    /* O de cima precisa de alpha: ele é a camada que se mistura. */
    const ctxB = canvasB.getContext("2d", { alpha: true });
    if (!ctx || !ctxB) return;

    const base = BLINK_FRAMES_URL.replace(/\/+$/, "");
    const reduced =
      typeof window.matchMedia === "function" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    let alive = true;
    let raf = 0;

    /* ── quadros ──────────────────────────────────────────────────── */
    const frames: Array<HTMLImageElement | null> = new Array(N_FRAMES).fill(null);
    let loaded = 0;
    let settled = 0;
    const pending = new Set<HTMLImageElement>();

    /* Só os quadros que o motor pode exibir: as 80 poses do atlas e os 27 da
       reação. Os outros 133 não são servidos nem baixados. */
    const NECESSARIOS: number[] = [
      ...ATLAS,
      ...Array.from({ length: N_FRAMES - REACTION_START }, (_, i) => REACTION_START + i),
    ].sort((a, b) => a - b);
    const totalNecessario = NECESSARIOS.length;

    const queue: number[] = [];
    const queued = new Set<number>();
    for (const stride of PASSES) {
      for (let i = 0; i < NECESSARIOS.length; i += stride) {
        const f = NECESSARIOS[i];
        if (!queued.has(f)) {
          queued.add(f);
          queue.push(f);
        }
      }
    }

    let cursor = 0;
    let visible = false;

    function pump() {
      if (!alive) return;
      while (cursor < queue.length && pending.size < CONCURRENCY) {
        const index = queue[cursor];
        cursor += 1;
        const img = new Image();
        img.decoding = "async";
        pending.add(img);
        const finish = (ok: boolean) => {
          pending.delete(img);
          if (!alive) return;
          settled += 1;
          if (ok) {
            frames[index] = img;
            loaded += 1;
          }
          /* Base de quadros fora do ar não pode virar tela preta: depois de
             uma passada inteira sem nenhum acerto, revelamos o painel. */
          if (!visible && (loaded >= SHOW_AT || (loaded === 0 && settled >= 24))) {
            visible = true;
            canvas.style.opacity = "1";
          }
          if (loaded <= SHOW_AT) needsDraw = true;
          pump();
        };
        img.onload = () => finish(true);
        img.onerror = () => finish(false);
        img.src = `${base}/f${String(index + 1).padStart(3, "0")}.webp`;
      }
    }

    function nearestLoaded(target: number): HTMLImageElement | null {
      if (frames[target]) return frames[target];
      for (let d = 1; d < N_FRAMES; d += 1) {
        const a = target - d;
        if (a >= 0 && frames[a]) return frames[a];
        const b = target + d;
        if (b < N_FRAMES && frames[b]) return frames[b];
      }
      return null;
    }

    /* ── layout ───────────────────────────────────────────────────── */
    let dpr = 1;
    let cw = 0;
    let ch = 0;
    let anchorY = 0.36;
    let needsDraw = true;
    let drawn = -1;
    /** Opacidade já aplicada na camada de cima (usada só pela reação). */
    let opAplicada = 0;
    /** O primeiro quadro da reação só precisa ser pintado uma vez. */
    let reacaoPintada = false;
    /** Estado do dissolve da expressão do hover. */
    let hoverFade = 0;
    /** Quadro já pintado na camada de cima pelo hover; -1 = nenhum. */
    let hoverPintado = -1;
    let hoverPos = TRACKING.HOVER_INI;
    let hoverDir = 1;

    function layout() {
      cw = window.innerWidth;
      ch = window.innerHeight;
      dpr = Math.min(window.devicePixelRatio || 1, 2, MAX_CANVAS_W / Math.max(1, cw));
      for (const c of [canvas, canvasB]) {
        c.width = Math.round(dpr * cw);
        c.height = Math.round(dpr * ch);
        c.style.width = `${cw}px`;
        c.style.height = `${ch}px`;
      }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctxB.setTransform(dpr, 0, 0, dpr, 0, 0);
      /* Redimensionar limpa o canvas: as duas camadas têm de ser repintadas. */
      /* Em tela estreita o painel de texto come o rodapé, então a cabeça
         sobe para não ficar atrás da barra de progresso. */
      anchorY = cw <= 560 ? 0.28 : cw <= 900 ? 0.32 : 0.36;
      needsDraw = true;
    }

    function draw(index: number, alvo: CanvasRenderingContext2D = ctx) {
      const img = nearestLoaded(index);
      /* A camada de baixo pinta o fundo; a de cima é transparente e limpa, para
         a mistura acontecer no compositor. */
      if (alvo === ctx) {
        alvo.fillStyle = "#16323e";
        alvo.fillRect(0, 0, cw, ch);
      } else {
        alvo.clearRect(0, 0, cw, ch);
      }
      if (!img) return;
      /*
       * SEM CONTRA-ROTAÇÃO, e por um motivo medido.
       *
       * Tentei cancelar o roll de cada quadro girando o desenho por -roll. Cai
       * por falta de dado confiável: medir roll num render 2D de cabeça virada
       * exige achar os dois olhos, e em 69 dos 213 quadros de rastreamento um
       * deles está oculto. Duas medições minhas divergiram entre si em até
       * 19,9°, e agir sobre isso giraria a cabeça com base em palpite.
       *
       * O que resolve o "mergulho" não é esta trava, e sim o dissolve entre
       * poses: nenhum quadro intermediário é exibido, então a coreografia de
       * rolagem do meio do vídeo nunca toca. O roll ESTÁTICO que cada pose tem
       * permanece — é o que o animador desenhou.
       */

      /* Cover com teto de zoom vertical: em tela alta e estreita o cover
         puro amplia o personagem até virar textura. */
      const sx = cw / IW;
      const cap = cw <= 560 ? 2.3 : 1.9;
      const scale = Math.min(Math.max(sx, ch / IH), sx * cap);
      const dw = IW * scale;
      const dh = IH * scale;

      /* A âncora manda no enquadramento; o clamp só entra se ela pediria
         faixa vazia na lateral. Desloca no máximo 2% da largura. */
      let dx = cw * 0.5 - HEAD.x * dw;
      dx = Math.min(0, Math.max(cw - dw, dx));
      const dy = ch * anchorY - HEAD.y * dh;

      alvo.drawImage(img, dx, dy, dw, dh);

      /* Falta céu em cima: estica a primeira linha do quadro. É a cor exata
         do fundo do vídeo, então a emenda não aparece. */
      if (dy > 0) alvo.drawImage(img, 0, 0, IW, 1, dx, 0, dw, Math.ceil(dy) + 1);

      /* Falta chão embaixo: a última linha esticada mata a emenda, e o
         degradê por cima faz o piso recuar para a sombra. */
      const bottom = dy + dh;
      if (bottom < ch) {
        const faixa = ch - bottom + 2;
        alvo.drawImage(img, 0, IH - 1, IW, 1, dx, bottom - 1, dw, faixa);
        const g = alvo.createLinearGradient(0, bottom - 1, 0, ch);
        g.addColorStop(0, "rgba(95,127,139,0)");
        g.addColorStop(0.45, "rgba(44,77,92,0.74)");
        g.addColorStop(1, "#16323e");
        alvo.fillStyle = g;
        alvo.fillRect(0, bottom - 1, cw, faixa);
      }
      
    }

    /* ── estado do rastreamento ───────────────────────────────────── */
    /* O mouse escreve SÓ aqui. Nada visual sai destes handlers. */
    let mx = 0;
    let my = 0;
    let hasPointer = false;
    let pointerInside = true;
    let lastMove = 0;

    /* Alvo e cascata. `aim` percebe, `pos` acompanha — a folga entre os
       dois é a inércia. */
    /* Yaw e pitch em fração do olhar extremo; dois estágios por eixo. */
    let yaw = 0;
    let pitch = 0;
    let yawAim = 0;
    let pitchAim = 0;
    /** Direção pedida, amortecida e sem teto — é ela que escolhe o quadro. */
    let dirX = 0;
    let dirY = 0;
    /* Pose exibida, pose de onde o dissolve parte, e o andamento do dissolve. */

    let pos = ATLAS_REPOUSO[0] ?? ATLAS[0];
    /** Alvo da vez, para a histerese poder compará-lo. */
    let alvoAnterior = pos;
    /* Índice dentro de `ATLAS_REPOUSO`, em vaivém. */
    /** Está no ramo de repouso? Com histerese, para não oscilar na fronteira. */
    let emRepouso = true;
    let restPos = 0;
    let restDir = 1;
    /* Fase da respiração do enquadramento. */
    let breathPhase = 0;
    /** Trava para `onEnter` disparar uma vez só no fim da reação. */
    let entrou = false;
    /** Pose de onde o dissolve da reação parte; -1 = reação ainda não começou. */
    let fadeDe = -1;
    let fadeFase = 0;

    /**
     * O quadro alvo: melhor casamento de olhar, penalizado pela distância na
     * linha do tempo.
     *
     * A penalidade é o que mantém o percurso curto — e percurso curto é o que
     * impede a cabeça de atravessar coreografia alheia para chegar à pose.
     */
    function quadroAlvo(rx: number, ry: number, atual: number): number {
      /*
       * PONTUAÇÃO POR ALINHAMENTO ANGULAR, e não por distância de vetor.
       *
       * A distância de vetor parece natural e erra feio, porque ela mistura
       * direção com intensidade. Somada ao teto por eixo, o resultado foi este:
       * com o cursor no canto superior direito, a direção geométrica é -22°
       * (quase horizontal), mas aparar o x no teto do vídeo (+0,46) deixando o y
       * em -0,63 gira o pedido para -54°. Ele obedecia e olhava para CIMA —
       * medi 44° de erro onde havia quadro de 2°.
       *
       * Aqui `rx`/`ry` chegam como vetor UNITÁRIO e o olhar do quadro é
       * normalizado: o produto é o cosseno do erro angular. Direção decide;
       * intensidade entra só como desempate leve, e quem controla a intensidade
       * do olhar é a curva de resposta.
       */
      let melhor = atual;
      let bs = -Infinity;
      let sAtual = -Infinity;
      for (const f of ATLAS_MIRA) {
        const g = GAZE[f];
        const s =
          (rx * g.x + ry * g.y) / g.mag +
          TRACKING.MAG_WEIGHT * g.mag -
          Math.abs(f - pos) * TRACKING.TIMELINE_PENALTY;
        if (f === atual) sAtual = s;
        if (s > bs) {
          bs = s;
          melhor = f;
        }
      }
      /* Troca só por ganho relevante: é o que impede o vaivém do alvo. */
      return bs - sAtual > TRACKING.TARGET_STICKY ? melhor : atual;
    }

    let last = 0;
    /* Declarados antes de `tick` de propósito: usá-los aqui e declará-los
       depois funciona só por acidente de ordem de execução. */
    const started = performance.now();
    let shown = 0;
    let shownPct = 0;

    function tick() {
      if (!alive) return;
      raf = window.requestAnimationFrame(tick);
      const now = performance.now();
      /* dt real, com teto: o comportamento não muda com o FPS da máquina,
         e aba oculta não vira teleporte ao voltar. */
      const dt = last ? Math.min((now - last) / 1000, TRACKING.DT_MAX) : TRACKING.DT_MAX;
      last = now;

      /* Aba oculta na montagem entrega `innerWidth` de mentira e o canvas
         nasce do tamanho errado. Conferir por quadro cobre isso, rotação de
         tela e troca de monitor de uma vez. */
      const dprAgora = Math.min(
        window.devicePixelRatio || 1,
        2,
        MAX_CANVAS_W / Math.max(1, window.innerWidth),
      );
      const esperado = Math.round(dprAgora * window.innerWidth);
      if (canvas.width !== esperado || ch !== window.innerHeight) layout();

      /*
       * MODO REAÇÃO. Curto-circuita o rastreamento inteiro: o cursor não manda
       * mais nada, e a linha do tempo passa a ser tocada, não buscada.
       */
      if (reagindoRef.current) {
        if (hoverFade !== 0) {
          /* A reação assume a camada de cima; o hover sai. */
          hoverFade = 0;
          hoverPintado = -1;
          opAplicada = 0;
        }
        if (fadeDe < 0) {
          /* Primeiro quadro da reação: guarda a pose de saída e salta o alvo
             para o começo do pulo. O dissolve cobre a diferença. */
          fadeDe = drawn >= 0 ? drawn : REACTION_START;
          pos = REACTION_START;
        }
        if (fadeFase < 1) {
          /* A reação usa as mesmas duas camadas, com os papéis invertidos: a
             pose de saída fica embaixo e o primeiro quadro do pulo entra por
             cima. Cada uma é pintada uma vez só. */
          fadeFase = Math.min(1, fadeFase + (dt * 1000) / TRACKING.REACTION_FADE_MS);
          if (drawn !== fadeDe) {
            draw(fadeDe);
            drawn = fadeDe;
          }
          if (!reacaoPintada) {
            draw(REACTION_START, ctxB);
            reacaoPintada = true;
          }
          canvasB.style.opacity = fadeFase.toFixed(3);
          opAplicada = fadeFase;
          canvas.dataset.frame = String(REACTION_START);
        } else {
          if (opAplicada !== 0) {
            /* Acabou o dissolve da reação: a camada de cima sai de cena. */
            canvasB.style.opacity = "0";
      sobreBotaoRef.current = false;
            opAplicada = 0;
            drawn = -1;
          }
          pos += TRACKING.REACTION_FPS * dt;
          const iReacao = Math.min(N_FRAMES - 1, Math.round(pos));
          if (iReacao !== drawn) {
            draw(iReacao);
            canvas.dataset.frame = String(iReacao);
            drawn = iReacao;
          }
          if (pos >= N_FRAMES - 1 && !entrou) {
            entrou = true;
            onEnterRef.current?.();
          }
        }
        return;
      }

      /* 1. deslocamento olhos→cursor. Duas medidas diferentes, e misturá-las
         era o outro erro: a DIREÇÃO tem de ser geométrica, em pixels, senão o
         olhar não aponta para o ponteiro; o RAIO, esse sim normalizado por
         eixo, serve só para a curva de resposta funcionar igual nos dois
         eixos apesar de a cabeça não estar no meio da altura. */
      const headX = cw * 0.5;
      const headY = ch * anchorY;
      const ddx = mx - headX;
      const ddy = my - headY;
      const dist = Math.sqrt(ddx * ddx + ddy * ddy);
      const ux = ddx / (cw * 0.5);
      const uy = ddy / (ch * 0.5);
      const r = Math.sqrt(ux * ux + uy * uy);

      /* 2. curva central sobre esse raio: resposta cresce suave, sem degrau
         em ponto nenhum — o pé plano é o que impede o tremor. */
      const u = clamp01(
        (Math.min(1, r) - TRACKING.CENTER_INNER) /
          (TRACKING.CENTER_OUTER - TRACKING.CENTER_INNER),
      );
      const resposta = Math.pow(smoothstep(u), TRACKING.CENTER_CURVE);

      /* 3. inatividade e ponteiro fora da janela: esmaecem a influência ao
         longo do tempo, não de uma vez */
      const parado = now - lastMove - TRACKING.IDLE_START_MS;
      const idle = clamp01(parado / TRACKING.IDLE_FADE_MS);
      const influencia =
        hasPointer && pointerInside ? resposta * (1 - idle) : 0;

      /*
       * YAW E PITCH — dois escalares independentes.
       *
       * Cada eixo é medido em meia-tela, escalado pela sensibilidade do eixo e
       * preso aos limites que o ATLAS realmente contém. Mover o mouse na
       * horizontal mexe só no yaw; na vertical, só no pitch. Nada aqui é ângulo
       * em graus, porque o meio é vídeo: a unidade é fração do olhar extremo, e
       * YAW_MIN/YAW_MAX vêm medidos das poses disponíveis.
       */
      const yawPedido =
        Math.max(YAW_MIN, Math.min(YAW_MAX, ux * TRACKING.SENS_X)) * influencia;
      const pitchPedido =
        Math.max(PITCH_MIN, Math.min(PITCH_MAX, uy * TRACKING.SENS_Y)) * influencia;

      /*
       * DIREÇÃO e INTENSIDADE seguem caminhos separados daqui para frente, e
       * misturá-las foi a origem de um erro grande.
       *
       * A DIREÇÃO é geométrica, em pixels, e NUNCA é aparada — aparar o eixo X
       * no teto do que o vídeo alcança à direita, deixando o Y inteiro, girava o
       * pedido de -22° para -54° e ele obedecia olhando para cima: 50° de erro
       * onde havia quadro de 2°.
       *
       * A INTENSIDADE (`yaw`/`pitch`, com teto e com `influencia`) segue só para
       * decidir repouso e para a curva de resposta.
       */
      const dirAlvoX = dist > 0.5 ? ddx / dist : 0;
      const dirAlvoY = dist > 0.5 ? (ddy / dist) * TRACKING.SENS_Y : 0;

      /* Cascata POR EIXO, com dt real. Dois estágios: o primeiro percebe, o
         segundo acompanha, e a folga entre eles é a inércia. Perto do neutro o
         segundo fica mais lento — voltar a encarar é gesto sem pressa. */
      const kSegundo =
        TRACKING.SMOOTH_HEAD * influencia + TRACKING.RETURN_SMOOTH * (1 - influencia);
      const passoAim = 1 - Math.exp(-dt * (reduced ? 40 : TRACKING.SMOOTH_AIM));
      const passoSeg = 1 - Math.exp(-dt * (reduced ? 40 : kSegundo));
      yawAim += (yawPedido - yawAim) * passoAim;
      pitchAim += (pitchPedido - pitchAim) * passoAim;
      /* A direção também é amortecida, no primeiro estágio: é ela que escolhe o
         quadro, e o alvo tem de chegar rápido ao destino para o percurso sair
         monotônico. */
      dirX += (dirAlvoX - dirX) * passoAim;
      dirY += (dirAlvoY - dirY) * passoAim;
      yaw += (yawAim - yaw) * passoSeg;
      pitch += (pitchAim - pitch) * passoSeg;

      /* REPOUSO VIVO. Com o olhar praticamente neutro, a pose percorre as poses
         de repouso do atlas em vaivém, no ritmo do vídeo: é o que impede a
         imagem de virar foto quando ninguém mexe o mouse. Por virem do atlas,
         essas poses também têm roll baixo. */
      let alvoPose: number;
      const forca = Math.hypot(yaw, pitch);
      emRepouso = emRepouso ? forca < REST_SAI : forca < REST_ENTRA;
      if (emRepouso && ATLAS_REPOUSO.length > 1) {
        restPos += restDir * TRACKING.REST_FPS * dt;
        if (restPos >= ATLAS_REPOUSO.length - 1) {
          restPos = ATLAS_REPOUSO.length - 1;
          restDir = -1;
        } else if (restPos <= 0) {
          restPos = 0;
          restDir = 1;
        }
        alvoPose = ATLAS_REPOUSO[Math.round(restPos)];
      } else {
        /*
         * O alvo sai do primeiro estágio (`yawAim`), quase cru, e NÃO do segundo
         * (`yaw`), amortecido. A razão é que o mesmo valor de olhar existe em
         * vários pontos do vídeo: se o alvo acompanhar o pedido interpolado, ele
         * passa pelos valores intermediários e escolhe quadros do outro lado da
         * linha do tempo — medi o percurso 75→66→50→42→59→75→93→110→126 numa
         * travessia da esquerda para a direita, ou seja uma ida a mais para a
         * esquerda antes de virar. Era o "pescoço travando".
         * Com o alvo quase cru ele vai direto ao destino, e a suavidade fica toda
         * em `pos`, que caminha monotônico até lá.
         */
        const nrm = Math.hypot(dirX, dirY) || 1;
        alvoPose = quadroAlvo(dirX / nrm, dirY / nrm, alvoAnterior);
      }

      /*
       * A pose vira a escolhida na hora, sem transição própria: a suavidade vem
       * da MESCLA com a segunda pose mais próxima, feita por `opacity` na camada
       * de cima. Um dissolve por salto de pose existia aqui e foi removido — ele
       * duplicava o que a mescla já faz, e disparando 20 vezes por segundo no
       * ciclo de repouso dobrava o desenho de graça.
       */

      /*
       * 7. DESENHO E RESPIRAÇÃO, separados de propósito.
       *
       * O `drawImage` só roda quando o índice inteiro muda. Eu já tentei
       * desenhar em todo quadro de tela, para a respiração aparecer, e medi o
       * preço: 82 quadros longos (>32 ms) em 178 durante o movimento do mouse,
       * ou seja metade dos quadros perdidos. Reescalar 1920×1080 para um canvas
       * de 2880×1720 sessenta vezes por segundo é caro, e em tela maior é pior.
       *
       * A respiração é uma transformação geométrica da imagem inteira, e isso é
       * trabalho de compositor: vai num `transform` de CSS, na GPU, de graça. O
       * canvas continua sendo desenhado só quando o quadro muda, e a imagem na
       * tela continua mudando em todo quadro — sem congelar e sem custar.
       */
      /*
       * O PERCURSO. `pos` é fracionário e persegue o alvo com amortecimento em
       * cascata e teto de velocidade: arranque pronto, frenagem suave, e os
       * quadros do meio passam na tela. São renders de verdade, então a imagem
       * é sempre nítida e nunca há duas poses somadas.
       */
      alvoAnterior = alvoPose;
      const passo = (alvoPose - pos) * (1 - Math.exp(-dt * (reduced ? 40 : kSegundo)));
      const passoMax = TRACKING.MAX_TURN_FPS * dt;
      pos += Math.max(-passoMax, Math.min(passoMax, passo));

      const idx = Math.max(0, Math.min(N_FRAMES - 1, Math.round(pos)));
      if (idx !== drawn || needsDraw) {
        draw(idx);
        canvas.dataset.frame = String(idx);
        drawn = idx;
        needsDraw = false;
      }

      /*
       * EXPRESSÃO DO HOVER. A camada de cima recebe o quadro feliz e sobe de
       * opacidade enquanto o ponteiro está no botão; o rastreamento continua
       * rodando embaixo, invisível, e volta a aparecer quando o ponteiro sai.
       */
      const querHover = sobreBotaoRef.current;
      if (querHover) {
        /* Avança até o fim da faixa feliz e depois faz vaivém dentro dela. */
        hoverPos += hoverDir * TRACKING.HOVER_FPS * dt;
        if (hoverPos >= TRACKING.HOVER_FIM) {
          hoverPos = TRACKING.HOVER_FIM;
          hoverDir = -1;
        } else if (hoverPos <= TRACKING.HOVER_INI + 4) {
          hoverPos = TRACKING.HOVER_INI + 4;
          hoverDir = 1;
        }
        const hq = Math.round(hoverPos);
        if (hq !== hoverPintado) {
          draw(hq, ctxB);
          hoverPintado = hq;
        }
      }
      const alvoHover = querHover ? 1 : 0;
      if (hoverFade !== alvoHover) {
        const passoH = (dt * 1000) / TRACKING.HOVER_FADE_MS;
        hoverFade =
          alvoHover > hoverFade
            ? Math.min(1, hoverFade + passoH)
            : Math.max(0, hoverFade - passoH);
        if (Math.abs(hoverFade - opAplicada) > 0.002 || hoverFade === alvoHover) {
          canvasB.style.opacity = hoverFade.toFixed(3);
          opAplicada = hoverFade;
        }
        if (hoverFade === 0) {
          hoverPintado = -1;
          hoverPos = TRACKING.HOVER_INI;
          hoverDir = 1;
        }
      }

      breathPhase += (dt * Math.PI * 2) / TRACKING.BREATH_PERIOD_S;
      const escala = 1 + Math.sin(breathPhase) * TRACKING.BREATH_SCALE;
      /* O deslocamento fica dentro da margem que a escala cria (0,7% de 860 px
         são ~6 px contra ~4 px de deslocamento), então nunca descobre borda. */
      const desloca = Math.sin(breathPhase * 0.63) * ch * TRACKING.BREATH_SHIFT;
      const t = `scale(${escala.toFixed(5)}) translateY(${desloca.toFixed(2)}px)`;
      canvas.style.transform = t;
      canvasB.style.transform = t;

      /* 8. barra: carregamento real, com piso de tempo */
      const loadFrac = settled >= totalNecessario ? 1 : loaded / totalNecessario;
      const timeFrac = (now - started) / MIN_LOAD_MS;
      const v = Math.min(loadFrac, Math.min(1, timeFrac));
      if (v > shown) {
        shown = v;
        const pct = Math.round(shown * 100);
        if (pct !== shownPct) {
          shownPct = pct;
          setProgresso(pct);
          if (pct >= 100) setPronto(true);
        }
      }
    }

    /* ── listeners: registrados UMA vez, removidos no unmount ─────── */
    const onMove = (e: PointerEvent | MouseEvent) => {
      const nx = e.clientX;
      const ny = e.clientY;
      /* Só conta como movimento se andou de verdade — tremor de trackpad
         não deve cancelar a inatividade. */
      if (
        !hasPointer ||
        Math.abs(nx - mx) + Math.abs(ny - my) >= TRACKING.MOVE_EPS_PX
      ) {
        lastMove = performance.now();
      }
      mx = nx;
      my = ny;
      hasPointer = true;
      pointerInside = true;
    };
    const onOut = (e: MouseEvent) => {
      if (!e.relatedTarget) pointerInside = false;
    };
    const onBlur = () => {
      pointerInside = false;
    };
    const onFocus = () => {
      lastMove = performance.now();
    };
    const onResize = () => layout();

    window.addEventListener("pointermove", onMove, { passive: true });
    document.addEventListener("mouseout", onOut);
    window.addEventListener("blur", onBlur);
    window.addEventListener("focus", onFocus);
    window.addEventListener("resize", onResize);
    window.addEventListener("orientationchange", onResize);

    layout();
    mx = cw * 0.5;
    my = ch * anchorY;
    lastMove = started;
    pump();
    raf = window.requestAnimationFrame(tick);

    return () => {
      alive = false;
      window.cancelAnimationFrame(raf);
      window.removeEventListener("pointermove", onMove);
      document.removeEventListener("mouseout", onOut);
      window.removeEventListener("blur", onBlur);
      window.removeEventListener("focus", onFocus);
      window.removeEventListener("resize", onResize);
      window.removeEventListener("orientationchange", onResize);
      canvasB.style.opacity = "0";
      /* 240 quadros de 1920×1080 é memória demais para deixar pendurada num
         componente que já saiu da tela. */
      for (const img of pending) {
        img.onload = null;
        img.onerror = null;
      }
      pending.clear();
      frames.fill(null);
    };
  }, []);

  /* ── JSX ────────────────────────────────────────────────────────── */
  return (
    <div
      className={cn(
        "fixed inset-0 z-[2147483000] flex flex-col items-center justify-center overflow-hidden bg-[#16323e]",
        className,
      )}
    >
      <canvas
        ref={canvasRef}
        role="img"
        aria-label="BLINK, o assistente do Gestor de Automações, acompanha o cursor com o olhar enquanto o sistema carrega."
        className="pointer-events-none absolute inset-0 h-full w-full"
        style={{ opacity: 0, transition: "opacity .5s ease", willChange: "transform", transformOrigin: "center center" }}
      />
      {/* Camada de mistura: a segunda pose mais próxima do olhar pedido. Quem
          varia é a `opacity`, escrita a cada quadro pelo laço — o compositor
          resolve a mistura na GPU. `aria-hidden` porque é a mesma imagem da
          camada de baixo, meio caminho adiante. */}
      <canvas
        ref={canvasBRef}
        aria-hidden
        className="pointer-events-none absolute inset-0 h-full w-full"
        style={{ opacity: 0, willChange: "transform, opacity", transformOrigin: "center center" }}
      />

      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 80% 70% at 50% 45%, transparent 30%, rgba(5, 20, 28, 0.65) 100%)",
        }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 bottom-0 h-[50%]"
        style={{
          background:
            "linear-gradient(to top, rgba(5, 20, 28, 0.95) 0%, rgba(5, 20, 28, 0.75) 30%, transparent 100%)",
        }}
      />

      <div className="absolute inset-x-0 bottom-8 z-10 flex w-full flex-col items-center gap-5 text-center px-6">
        <div className="flex flex-col items-center gap-1">
          <h1 className="text-[20px] font-bold leading-tight text-white/90 sm:text-[24px]">
            Bem-vindo ao<br/>
            <span className="text-[#FFDA5B]">Gestor de Automações</span>
          </h1>
        </div>

        <p className="text-[13px] leading-relaxed text-white/70 shadow-sm max-w-[280px]">
          Estamos preparando tudo. O BLINK fica de olho em você enquanto isso.
        </p>

        <div className="w-full max-w-[280px] space-y-3">
          <div
            className="relative h-[5px] w-full overflow-hidden rounded-full bg-white/10 shadow-[0_1px_10px_rgba(5,20,28,0.5)]"
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.round(progresso)}
            aria-label="Progresso do carregamento"
          >
            <div
              className="absolute inset-y-0 left-0 rounded-full transition-all duration-300 ease-out"
              style={{
                width: `${progresso}%`,
                background: pronto ? "#7ef2b0" : "#FFDA5B",
                boxShadow: pronto ? "0 0 12px rgba(126, 242, 176, 0.4)" : "0 0 12px rgba(255, 218, 91, 0.4)",
              }}
            />
          </div>

          <div className="flex items-center justify-between text-[12px] text-white/60 font-medium tracking-wide">
            <span aria-live="polite">{pronto ? "Pronto" : "Carregando..."}</span>
            <span>{Math.round(progresso)}%</span>
          </div>
        </div>

        <div className="h-14 mt-2 flex items-center justify-center">
          {pronto && onEnter && (
            <button
              onClick={enter}
              onPointerEnter={() => {
                sobreBotaoRef.current = true;
              }}
              onPointerLeave={() => {
                sobreBotaoRef.current = false;
              }}
              disabled={reagindo}
              className="rounded-full bg-[#FFDA5B] px-8 py-3 text-[14px] font-bold text-[#12242c] shadow-[0_8px_26px_rgba(255,216,61,0.26)] transition-all hover:-translate-y-[1px] hover:bg-[#ffe469] hover:shadow-[0_12px_30px_rgba(255,216,61,0.34)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#FFDA5B] focus-visible:ring-offset-2 focus-visible:ring-offset-[#16323e]"
              autoFocus
            >
              {reagindo ? "Vamos lá!" : "Entrar no sistema"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
});
