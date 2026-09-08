import { useCallback, useEffect, useRef } from "react";
import type { Andar, Mesa } from "./layout";
import { MARGEM } from "./layout";
import { balancoDaConversa, criarMotor, digitando, passoDe, type Motor, type Personagem } from "./motor";
import { mapaDeCascos, portaSemUso } from "./aparencia";
import type { DadosEscritorio } from "./dados";
import {
  MESA_H,
  MESA_W,
  PERSONAGEM_H,
  PERSONAGEM_W,
  TILE,
  alerta,
  halo,
  cadeiraDeTrabalho,
  personagem,
  type Humor,
} from "./sprites";
import type { Estado } from "./estado";
import { pessoasAgora } from "./uso";
import { obterSprite, type SpriteId } from "./mobiliario";
import {
  portaAtiva,
  type AtividadeDoNo,
  type EventoEcossistema,
  type ExecucaoDoHub,
} from "./eventos";

const ESCALA_MIN = 1;
const ESCALA_MAX = 4;
/** Os nomes longos não cabem numa etiqueta de mesa; aqui eles encurtam. */
const ROTULO_CURTO: Record<string, string> = {
  trabalhando: "trabalhando",
  ocioso: "ocioso",
  falha: "falha",
  "sem-execucao": "sem execução",
  "sem-dados": "sem dado",
};

/*
 * Quatro estados, dois elementos, nenhuma pergunta ambígua.
 *
 * `sprites.ts` tem quatro humores e não muda. Em vez de espremer cinco estados
 * em quatro desenhos, o BLINK e o monitor passam a responder perguntas
 * DIFERENTES — e é o par que identifica o estado, não cada um sozinho:
 *
 *   BLINK    o HUB tem registro deste sistema?   aceso = sim · apagado = não
 *   monitor  houve execução na janela de 30 d?   com tela = sim · preto = não
 *
 *                     BLINK      monitor              lê-se como
 *   trabalhando       aceso      verde (+ halo)       rodou nas últimas 24 h
 *   ocioso            aceso      em espera            já rodou, agora não
 *   falha             alerta     vermelho             taxa de erro alta
 *   sem-execucao      aceso      DESLIGADO            conhecido, nunca rodou
 *   sem-dados         apagado    desligado            o HUB não o conhece
 *
 * Assim "ocioso" e "sem-execucao" nunca se confundem: os dois BLINKs estão
 * acesos, mas só um tem a tela viva. E "sem-execucao" não vira sinal de
 * problema: quem está com defeito é o vermelho, e ninguém mais.
 */
/**
 * ONDE O BLINK SENTADO É DESENHADO, medido do canto do tampo.
 *
 * De pé ele fica em `pessoaX/pessoaY`, que é o canto do tile ao lado esquerdo
 * da mesa — a posição LÓGICA, a que o pathfinding, a colisão e as rotas usam.
 * Sentar não move ninguém de tile: muda só onde o sprite é pintado, 13 px à
 * direita para centrar no monitor e 18 px abaixo do tampo para encostar na
 * mesa sem tapar o teclado.
 *
 * Medido nas três alternativas: a +12 a cabeça cobre o teclado, a +24 sobra
 * um vão entre a cadeira e a mesa, a +18 encosta.
 */
const ASSENTO_X = 13;
const ASSENTO_Y = 18;

/**
 * Quanto dura o gesto de sentar.
 *
 * Sem isso o BLINK teleporta 13 px para o lado e 16 px para baixo no instante
 * em que a fase vira `mesa`, e um salto desses lê como falha de desenho. Com o
 * deslizamento, o último passo até a cadeira é o próprio gesto.
 *
 * Quem JÁ estava sentado quando a tela abriu não desliza: fazer o andar
 * inteiro se sentar no primeiro quadro afirmaria que todos acabaram de chegar,
 * e ninguém chegou — a tela só abriu.
 */
const SENTAR_MS = 220;

export const HUMOR: Record<Estado, Humor> = {
  trabalhando: "trabalhando",
  ocioso: "ocioso",
  falha: "falha",
  "sem-execucao": "ocioso",
  "sem-dados": "sem-dados",
};

export const MONITOR: Record<Estado, SpriteId> = {
  trabalhando: "computador_ativo",
  ocioso: "computador_idle",
  falha: "computador_falha",
  "sem-execucao": "computador_apagado",
  "sem-dados": "computador_apagado",
};

export interface EscritorioCanvasProps {
  andar: Andar;
  dados: DadosEscritorio;
  demo: boolean;
  selecionado: string | null;
  onSelecionar: (id: string | null) => void;
  /** Escala pedida pela página; a câmera respeita, o clique sobrepõe. */
  escala: number;
  onEscala: (e: number) => void;
  /** Ajusta o zoom para o andar inteiro caber — o padrão, para não ter de arrastar. */
  ajustar: boolean;
  /** Avisa quem está sob o ponteiro, para a página abrir a prévia. */
  onApontar?: (id: string | null, tela: { x: number; y: number } | null) => void;
  /**
   * Eventos que não vêm do retrato do HUB — hoje, das demandas. Quem os
   * produz é a página; aqui eles só são repassados ao motor.
   */
  eventosExternos?: EventoEcossistema[];
  /** Demandas em trabalho por BLINK responsável visual. */
  trabalhoPorSistema?: Record<string, number>;
  /**
   * Execuções recentes por nó chamado, do registro do HUB. Acende a porta —
   * inclusive quando quem chamou foi uma pessoa e não há viagem a mostrar.
   */
  atividade?: Map<string, AtividadeDoNo>;
  /**
   * As execuções cruas, uma por linha. Cada uma solta um emblema que sobe do
   * nó chamado: verde quando concluiu, vermelho quando não.
   */
  execucoes?: ExecucaoDoHub[];
}

interface Camera {
  x: number;
  y: number;
  escala: number;
  alvoX: number;
  alvoY: number;
  alvoEscala: number;
}

export function EscritorioCanvas({
  andar,
  dados,
  demo,
  selecionado,
  onSelecionar,
  escala,
  onEscala,
  ajustar,
  onApontar,
  eventosExternos,
  atividade,
  execucoes,
  trabalhoPorSistema,
}: EscritorioCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const fundoRef = useRef<HTMLCanvasElement | null>(null);
  const motorRef = useRef<Motor | null>(null);
  /*
   * OS EMBLEMAS QUE SOBEM DA MESA.
   *
   * No Munder Difflin cada trabalho concluído solta um símbolo que sobe e
   * apaga — visto verde quando deu certo, marca vermelha quando não. É o que
   * dá vida ao andar sem ninguém precisar andar, e encaixa exatamente no dado
   * que já chega: cada execução tem `falhou`.
   *
   * `vistos` guarda os ids já animados. A página relê a mesma janela de 60
   * minutos a cada refresh; sem isso, as mesmas execuções soltariam emblema de
   * novo a cada leitura, para sempre — o mesmo defeito que a chave
   * determinística da rajada evita no motor.
   */
  /*
   * A transição de sentar vive aqui, e não no motor: sentar é um fato de
   * DESENHO. O motor continua sabendo apenas que a fase é `mesa`.
   */
  const sentouRef = useRef<Map<string, number>>(new Map());
  const faseRef = useRef<Map<string, string>>(new Map());

  const emblemasRef = useRef<{
    vistos: Set<string>;
    ativos: { x: number; y: number; nasceu: number; falhou: boolean }[];
  }>({ vistos: new Set(), ativos: [] });
  const camRef = useRef<Camera>({ x: 0, y: 0, escala, alvoX: 0, alvoY: 0, alvoEscala: escala });
  const hoverRef = useRef<string | null>(null);
  const demoRef = useRef(demo);
  const ajustarRef = useRef(ajustar);
  const selRef = useRef(selecionado);
  const arrastando = useRef<{ x: number; y: number; moveu: boolean } | null>(null);

  demoRef.current = demo;
  ajustarRef.current = ajustar;
  selRef.current = selecionado;

  /* --------------------------------------------------- fundo estático --- */
  /*
   * O andar inteiro é rasterizado UMA vez. A planta já disse qual peça vai em
   * qual pixel, na ordem de desenho; aqui só se resolve o id em canvas.
   */
  useEffect(() => {
    const f = document.createElement("canvas");
    f.width = andar.largura;
    f.height = andar.altura;
    const c = f.getContext("2d");
    if (!c) return;
    c.imageSmoothingEnabled = false;

    for (const item of andar.camadas) {
      const sprite = obterSprite(item.sprite);
      if (sprite) c.drawImage(sprite, item.x, item.y);
    }

    // A porta de um serviço de que não sai integração nenhuma fica apagada.
    // Só o componente sabe disso: a planta não conhece as integrações.
    for (const porta of andar.portas) {
      const semUso = portaSemUso(porta.conectorId, dados.integracoes);
      const sprite = obterSprite(semUso ? "porta_apagada" : "porta_fechada");
      if (sprite) c.drawImage(sprite, porta.x, porta.y);
    }

    fundoRef.current = f;
  }, [andar, dados.integracoes]);

  /* ------------------------------------------------------------ motor --- */
  /*
   * O motor nasce UMA vez por planta e sobrevive aos refreshes.
   *
   * Antes ele dependia de `[andar, dados]`, e `dados` é objeto novo a cada
   * busca do HUB: de minuto em minuto todo mundo teleportava para a mesa e a
   * conversa em curso sumia. Agora o retrato novo entra por `atualizarDados`,
   * que atualiza a saúde e enfileira o que mudou sem tocar em posição, fase
   * ou conversa.
   */
  const dadosRef = useRef(dados);
  dadosRef.current = dados;

  useEffect(() => {
    motorRef.current = criarMotor(andar, dadosRef.current);
  }, [andar]);

  useEffect(() => {
    motorRef.current?.atualizarDados(dados);
  }, [dados]);

  useEffect(() => {
    if (eventosExternos?.length) motorRef.current?.registrarEventos(eventosExternos);
  }, [eventosExternos]);

  useEffect(() => {
    if (!execucoes?.length) return;
    const e = emblemasRef.current;
    const agora = performance.now();
    /*
     * TETO DE OITO POR LEITURA, e não um emblema por execução.
     *
     * Uma rajada real tem 35 chamadas em 14 segundos. Trinta e cinco emblemas
     * subindo ao mesmo tempo viram uma cortina, não informação. Oito já lê
     * como "muita coisa aconteceu aqui", e as falhas entram PRIMEIRO: se
     * houver erro na rajada, ele não pode ser o que sobra de fora do teto.
     */
    const novos = execucoes.filter((x) => x.id && !e.vistos.has(x.id));
    if (!novos.length) return;
    novos.sort((a, b) => Number(!!b.falhou) - Number(!!a.falhou));
    for (const x of novos) e.vistos.add(x.id);
    // a memória não cresce sem fim: guarda o suficiente para a janela do HUB
    if (e.vistos.size > 2000) {
      e.vistos = new Set([...e.vistos].slice(-1000));
    }
    let n = 0;
    for (const x of novos) {
      if (n >= 8) break;
      const destino = x.destino;
      if (!destino) continue;
      const mesa = andar.mesaPorSistema.get(destino);
      const porta = andar.portaPorConector.get(destino);
      const alvo = mesa
        ? { x: mesa.monitorX + 8, y: mesa.monitorY }
        : porta
          ? { x: porta.x + 21, y: porta.y }
          : null;
      if (!alvo) continue;
      e.ativos.push({
        x: alvo.x,
        y: alvo.y,
        // escalonado: 90 ms entre um e outro, para subirem em fila e não em bloco
        nasceu: agora + n * 90,
        falhou: !!x.falhou,
      });
      n++;
    }
  }, [execucoes, andar]);

  useEffect(() => {
    if (!trabalhoPorSistema) return;
    for (const [id, n] of Object.entries(trabalhoPorSistema)) {
      motorRef.current?.definirTrabalhoDeDemanda(id, n);
    }
  }, [trabalhoPorSistema]);

  /* ----------------------------------------------------------- câmera --- */
  const centralizar = useCallback(
    (m: Mesa, novaEscala: number) => {
      const cam = camRef.current;
      cam.alvoEscala = novaEscala;
      const canvas = canvasRef.current;
      if (!canvas) return;
      const larguraVisivel = canvas.clientWidth / novaEscala;
      const alturaVisivel = canvas.clientHeight / novaEscala;
      cam.alvoX = m.x + MESA_W / 2 - larguraVisivel / 2;
      cam.alvoY = m.y - alturaVisivel / 2;
    },
    [],
  );

  useEffect(() => {
    const cam = camRef.current;
    if (!selecionado) {
      cam.alvoEscala = escala;
      return;
    }
    const m = andar.mesaPorSistema.get(selecionado);
    if (m) centralizar(m, Math.max(3, escala));
  }, [selecionado, andar, escala, centralizar]);

  useEffect(() => {
    camRef.current.alvoEscala = escala;
  }, [escala]);

  /* ------------------------------------------------------------ laço --- */
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Cores de casco resolvidas de uma vez, para dois sistemas nunca vestirem
    // a mesma roupa — o hash sozinho colide.
    const cascos = mapaDeCascos(andar.mesas.map((m) => m.sistemaId));

    // Duas mesas na mesma fileira dividem o espaço; o nome tem de caber entre elas.
    const temVizinha = new Set<string>();
    for (const a of andar.mesas) {
      for (const b of andar.mesas) {
        if (a === b) continue;
        if (a.y === b.y && Math.abs(a.x - b.x) < 100) temVizinha.add(a.sistemaId);
      }
    }

    let vivo = true;
    let anterior = performance.now();

    const ajustarTamanho = () => {
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      const l = canvas.clientWidth;
      const a = canvas.clientHeight;
      if (canvas.width !== Math.round(l * dpr) || canvas.height !== Math.round(a * dpr)) {
        canvas.width = Math.round(l * dpr);
        canvas.height = Math.round(a * dpr);
      }
      return dpr;
    };

    const limitar = (cam: Camera, larguraTela: number, alturaTela: number) => {
      const vw = larguraTela / cam.escala;
      const vh = alturaTela / cam.escala;
      // Quando o andar é menor que a área visível ele fica CENTRADO, não colado
      // à esquerda — senão sobra um vazio escuro de um lado só.
      cam.x = andar.largura <= vw
        ? (andar.largura - vw) / 2
        : Math.min(andar.largura - vw, Math.max(0, cam.x));
      cam.y = andar.altura <= vh
        ? (andar.altura - vh) / 2
        : Math.min(andar.altura - vh, Math.max(0, cam.y));
    };

    const quadro = (agora: number) => {
      if (!vivo) return;
      const dt = Math.min(0.05, (agora - anterior) / 1000);
      anterior = agora;

      const dpr = ajustarTamanho();
      const larguraTela = canvas.width / dpr;
      const alturaTela = canvas.height / dpr;

      const cam = camRef.current;
      if (ajustarRef.current && !selRef.current) {
        /*
         * "auto" quer dizer uma coisa só: o andar INTEIRO na tela, sem
         * arrastar. Não existe piso de 1:1 aqui — um piso faria o andar sair
         * da moldura em tela de notebook, que é exatamente o que "auto" existe
         * para evitar. Quem quiser o BLINK grande usa o zoom ao lado: aí o
         * arrasto entra, e é ele que leva a tela até a sala escolhida.
         */
        cam.alvoEscala = Math.min(
          ESCALA_MAX,
          larguraTela / andar.largura,
          alturaTela / andar.altura,
        );
      }
      const k = 1 - Math.exp(-6 * dt);
      cam.escala += (cam.alvoEscala - cam.escala) * k;
      if (Math.abs(cam.alvoEscala - cam.escala) < 0.01) cam.escala = cam.alvoEscala;
      if (selRef.current) {
        cam.x += (cam.alvoX - cam.x) * k;
        cam.y += (cam.alvoY - cam.y) * k;
      }
      limitar(cam, larguraTela, alturaTela);

      const motor = motorRef.current;
      if (motor) motor.atualizar(dt, demoRef.current);

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.imageSmoothingEnabled = false;
      ctx.fillStyle = fundoDaPagina(canvas);
      ctx.fillRect(0, 0, larguraTela, alturaTela);

      const fundo = fundoRef.current;
      if (fundo) {
        ctx.drawImage(
          fundo,
          cam.x, cam.y, larguraTela / cam.escala, alturaTela / cam.escala,
          0, 0, larguraTela, alturaTela,
        );
      }

      // mundo
      ctx.setTransform(dpr * cam.escala, 0, 0, dpr * cam.escala, -cam.x * cam.escala * dpr, -cam.y * cam.escala * dpr);

      const personagens = motor?.personagens ?? [];
      const naMesa = new Map<string, Personagem>();
      for (const p of personagens) if (p.mesa) naMesa.set(p.mesa.sistemaId, p);

      /*
       * O monitor não está na camada estática: a cor da tela é o estado de
       * saúde do sistema naquele instante, e isso muda a cada recarga do HUB.
       */
      for (const m of andar.mesas) {
        const p = naMesa.get(m.sistemaId);
        const sprite = obterSprite(p ? MONITOR[p.estado] : "computador_idle");
        if (sprite) ctx.drawImage(sprite, m.monitorX, m.monitorY);
        if (p?.estado === "falha") alerta(ctx, m.x + MESA_W - 6, m.y - 18);
      }

      /*
       * Estado de cada SERVIÇO externo, na própria porta.
       *
       * A lâmpada acende por ATIVIDADE, não por saúde. Verde pulsando só
       * quando o conector executou dentro da janela de minutos; vermelha
       * quando a taxa de falha passou do limiar; apagada quando está
       * operacional mas não rodou nada agora. Serviço sem dado nenhum não
       * ganha lâmpada — a porta já está apagada.
       *
       * A diferença importa: a saúde chama de "trabalhando" quem rodou nas
       * últimas 24 h, e uma lâmpada verde por isso diria ao usuário que o
       * serviço está processando agora, o que seria mentira.
       */
      const porConector = new Map<string, Personagem>();
      for (const p of personagens) if (p.porta) porConector.set(p.porta.conectorId, p);

      for (const porta of andar.portas) {
        const servico = porConector.get(porta.conectorId);
        /*
         * A porta segue a mesma gramática das mesas, com a lâmpada no papel
         * do monitor: sem soquete = o HUB não conhece o serviço; soquete vazio
         * = conhecido e sem nenhuma execução em 30 dias; luz fosca = já
         * executou, não agora; verde = processando; vermelha = falhando.
         */
        if (!servico || servico.estado === "sem-dados") continue;
        const lx = porta.x + 21;
        const ly = porta.y + 3;
        /*
         * A EXECUÇÃO REGISTRADA MANDA MAIS QUE A SAÚDE AGREGADA.
         *
         * `servico.executando` vem do retrato: compara dois `ultima` a cada
         * 60 s. Agora existe sinal melhor — o carimbo da execução, por nó.
         * Das dez execuções da última hora, todas foram chamadas por PESSOA:
         * não geram viagem (não há origem para levantar da mesa), mas a porta
         * teve movimento e é verdade dizer isso.
         *
         * Quando há execução recente a lâmpada acende mesmo que o agregado
         * classifique o serviço como "sem execução" — o agregado subconta o
         * volume em cerca de doze vezes, e o registro é o fato.
         */
        const atv = atividade?.get(porta.conectorId);
        const chamadoAgora = portaAtiva(atv, agora);
        const pulso = (chamadoAgora || !!servico.executando) && Math.floor(agora / 700) % 2 === 0;
        ctx.fillStyle = "#14201a";
        ctx.fillRect(lx - 1, ly - 1, 8, 6);
        // soquete sem luz só quando NÃO houve execução registrada agora
        if (servico.estado === "sem-execucao" && !chamadoAgora) continue;
        const cor =
          servico.estado === "falha"
            ? "#e04a3c"
            : chamadoAgora || servico.executando
              ? "#3ecf8e"
              : "#5c5346";
        ctx.fillStyle = cor;
        ctx.fillRect(lx, ly, 6, 4);
        if (pulso) {
          ctx.fillStyle = "#d8f7e8";
          ctx.fillRect(lx + 1, ly + 1, 2, 1);
        }
      }

      /*
       * Os emblemas sobem ANTES dos personagens no mundo, para passarem por
       * trás de quem estiver de pé na frente da mesa — a mesma ordem por Y que
       * vale para todo o resto.
       */
      {
        const e = emblemasRef.current;
        const t = performance.now();
        for (let i = e.ativos.length - 1; i >= 0; i--) {
          const m = e.ativos[i];
          const vida = (t - m.nasceu) / DURACAO_EMBLEMA;
          if (vida >= 1) { e.ativos.splice(i, 1); continue; }
          if (vida < 0) continue;   // ainda escalonado, não nasceu
          emblema(ctx, m.x, m.y, vida, m.falhou);
        }
        // teto de segurança: nada justifica centenas na tela
        if (e.ativos.length > 40) e.ativos.splice(0, e.ativos.length - 40);
      }

      /*
       * Quem acabou de chegar à mesa começa a sentar AGORA. Quem já estava
       * sentado no primeiro quadro não entra na transição — ver `SENTAR_MS`.
       */
      for (const p of personagens) {
        const antes = faseRef.current.get(p.id);
        if (p.fase === "mesa" && antes !== undefined && antes !== "mesa") {
          sentouRef.current.set(p.id, agora);
        }
        faseRef.current.set(p.id, p.fase);
      }

      /*
       * A posição de DESENHO, que não é a posição lógica.
       *
       * `p.x/p.y` continuam sendo onde o personagem está para o pathfinding e
       * para a rota. O que muda aqui é só onde o pincel encosta, e por isso
       * tudo que acompanha o corpo — halo, balão, ordem por Y, contorno de
       * seleção — passa por esta função. Ler `p.y` direto em um desses lugares
       * faria o halo ficar no chão enquanto o BLINK está na cadeira.
       */
      const desenhoDe = (p: Personagem) => {
        const m = p.mesa;
        if (!m || p.fase !== "mesa") return { x: p.x, y: p.y, sentado: false };
        const t0 = sentouRef.current.get(p.id);
        const k = t0 === undefined ? 1 : Math.min(1, (agora - t0) / SENTAR_MS);
        return {
          x: p.x + (m.x + ASSENTO_X - p.x) * k,
          y: p.y + (m.y + ASSENTO_Y - p.y) * k,
          // a cadeira aparece no fim do gesto: é ela que diz "sentou"
          sentado: k >= 1,
        };
      };

      // profundidade por Y: quem está mais abaixo desenha por último
      const ordenados = personagens
        .filter((p) => p.fase !== "oculto")
        .map((p) => ({ p, d: desenhoDe(p) }))
        .sort((a, b) => a.d.y - b.d.y);
      for (const { p, d } of ordenados) {
        const naMesa = p.fase === "mesa" && !!p.mesa;
        if (naMesa && p.estado === "trabalhando") {
          halo(ctx, d.x + PERSONAGEM_W / 2, d.y + 9);
        }
        // A cadeira vai na posição PARADA, sem o balanço: móvel não respira.
        if (d.sentado) cadeiraDeTrabalho(ctx, Math.round(d.x), Math.round(d.y));
        // 1 px de balanço: é o que separa "conversando" de "congelado"
        const balanco = balancoDaConversa(p);
        personagem(ctx, Math.round(d.x), Math.round(d.y) + balanco, p.id, {
          humor: HUMOR[p.estado],
          // Na mesa o corpo TRAVA de costas: o monitor está acima dele, e quem
          // trabalha olhando para a câmera não está olhando para o monitor.
          direcao: naMesa ? "costas" : p.direcao,
          passo: passoDe(p),
          digitando: digitando(p),
          sentado: d.sentado,
          externo: p.tipo === "externo",
          casco: p.tipo === "externo" ? undefined : cascos.get(p.id),
          destacado: hoverRef.current === p.id || selRef.current === p.id,
        });
      }

      // HUD em resolução de tela
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const paraTela = (ix: number, iy: number) => ({
        x: (ix - cam.x) * cam.escala,
        y: (iy - cam.y) * cam.escala,
      });

      /*
       * O nome da ÁREA nunca some.
       *
       * As placas são desenhadas em pixel de tela, não no mundo: encolher o
       * zoom não encolhe a letra, só aproxima uma placa da outra. Então o
       * limiar aqui nunca foi sobre legibilidade — era sobre amontoado. E as
       * doze placas de área são as que menos se amontoam e as que mais fazem
       * falta: sem elas o andar vira um tabuleiro de salas anônimas, que é o
       * que acontecia em notebook desde que "auto" passou a caber inteiro
       * (escala ~0,77) e o limiar único de 0,85 apagava tudo.
       */
      for (const s of andar.salas) {
        /*
         * A placa fica ACIMA da parede, não dentro da sala.
         *
         * Dentro, ela caía exatamente sobre a fileira de monitores — e o
         * monitor é o que separa "ocioso" de "sem execução". A placa estava
         * escondendo o estado que ela deveria ajudar a ler. Acima da parede
         * sobra corredor de três tiles ou mais, e ela passa a se comportar
         * como letreiro de porta.
         */
        const t = paraTela(s.x + s.w / 2, s.y - 3);
        const largura = placa(ctx, t.x, t.y, s.grupo);
        /*
         * Somado por SALA, e nao por mesa: uma sala com tres sistemas teria
         * tres selos disputando o mesmo espaco da placa. A prévia e o painel
         * mostram o detalhe por sistema.
         */
        const gente = andar.mesas.reduce(
          (soma, m) => (m.grupo === s.grupo ? soma + pessoasAgora(dados.uso[m.sistemaId]) : soma),
          0,
        );
        if (gente > 0) seloDeGente(ctx, t.x + largura / 2 + 3, t.y, gente);
      }
      /*
       * Já as placas de porta e as etiquetas de mesa ficam a 80 px de
       * distância umas das outras no mundo; abaixo de 0,85 elas se encostam e
       * viram uma barra escura ilegível. Essas continuam com limiar — quem
       * precisa do nome de um sistema aponta para ele ou usa o zoom.
       */
      if (cam.escala >= 0.85) {
        for (const p of andar.portas) {
          /*
           * A placa fica ACIMA da porta, dentro do andar. Ficava abaixo,
           * apoiada no vazio que sobrava fora do mapa; agora que o andar
           * ocupa a área toda, ali ela seria cortada pela borda.
           */
          const t = paraTela(p.x + 13, p.y - 10);
          // As portas ficam a 80 px uma da outra na grade de tiles; sem teto
          // as placas se fundem numa barra escura ilegível.
          placa(ctx, t.x, t.y, p.nome, true, 76 * cam.escala);
        }
        for (const m of andar.mesas) {
          const p = naMesa.get(m.sistemaId);
          if (!p || p.fase !== "mesa") continue;
          /*
           * A etiqueta fica embaixo do CORPO SENTADO, não embaixo de onde o
           * personagem está. Medido de `pessoaY` ela caía sobre o encosto da
           * cadeira e tapava o tronco — o rótulo escondia o BLINK que ele
           * nomeia.
           */
          const t = paraTela(m.x + MESA_W / 2, m.y + ASSENTO_Y + PERSONAGEM_H + 8);
          // Mesa sozinha na fileira pode usar a sala inteira; com vizinha, só
          // o passo entre postos, que na grade de tiles é de 80 px.
          const largura = (temVizinha.has(m.sistemaId) ? 76 : 150) * cam.escala;
          etiqueta(ctx, t.x, t.y, m.nome, ROTULO_CURTO[p.estado], largura, cam.escala < 1.8);
        }
      }

      // Vários caminhantes no mesmo corredor empilhavam balões um sobre o outro
      // e nenhum ficava legível. Cada novo balão sobe até achar espaço livre.
      const ocupados: { x: number; y: number; w: number; h: number }[] = [];
      for (const p of personagens) {
        if (p.fase === "oculto") continue;
        // conversa entre sistemas fala a linha do roteirista; serviço de fora
        // continua dizendo o rótulo real da integração que ele entrega
        const texto = p.fala ?? (p.tipo === "externo" ? p.viagem?.label : undefined);
        if (!texto) continue;
        const d = desenhoDe(p);
        const t = paraTela(d.x + PERSONAGEM_W / 2, d.y - 6);
        balao(ctx, t.x, t.y, p.nome, texto, p.estado === "falha", ocupados);
      }

      requestAnimationFrame(quadro);
    };

    const id = requestAnimationFrame(quadro);
    return () => {
      vivo = false;
      cancelAnimationFrame(id);
    };
  }, [andar]);

  /* --------------------------------------------------------- ponteiro --- */
  const internoDoEvento = useCallback((ev: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const r = canvas.getBoundingClientRect();
    const cam = camRef.current;
    return {
      x: (ev.clientX - r.left) / cam.escala + cam.x,
      y: (ev.clientY - r.top) / cam.escala + cam.y,
    };
  }, []);

  const mesaEm = useCallback(
    (ix: number, iy: number): Mesa | null => {
      for (const m of andar.mesas) {
        const topo = Math.min(m.y, m.pessoaY) - 4;
        // `ASSENTO_Y` porque o BLINK sentado é desenhado ABAIXO de onde ele
        // está: sem somar isso, o clique na cadeira cai fora da mesa.
        const base =
          Math.max(m.y + MESA_H, m.pessoaY + PERSONAGEM_H, m.y + ASSENTO_Y + PERSONAGEM_H) + 4;
        if (ix >= m.x - 4 && ix <= m.x + MESA_W + 4 && iy >= topo && iy <= base) return m;
      }
      return null;
    },
    [andar],
  );

  return (
    <canvas
      ref={canvasRef}
      className="h-full w-full cursor-grab touch-none select-none active:cursor-grabbing"
      aria-label="Planta do escritório do ecossistema"
      onPointerDown={(ev) => {
        ev.currentTarget.setPointerCapture(ev.pointerId);
        arrastando.current = { x: ev.clientX, y: ev.clientY, moveu: false };
      }}
      onPointerMove={(ev) => {
        const a = arrastando.current;
        /*
         * O modo "ajustar" manda no zoom, não no arrasto. Quando o andar não
         * cabe inteiro a 1:1 é justamente aí que arrastar precisa funcionar —
         * senão uma fileira de salas fica inalcançável. Quando cabe, `limitar`
         * centraliza de volta e o arrasto é inócuo.
         */
        if (a) {
          const dx = ev.clientX - a.x;
          const dy = ev.clientY - a.y;
          if (Math.abs(dx) > 3 || Math.abs(dy) > 3) a.moveu = true;
          const cam = camRef.current;
          cam.x -= dx / cam.escala;
          cam.y -= dy / cam.escala;
          cam.alvoX = cam.x;
          cam.alvoY = cam.y;
          a.x = ev.clientX;
          a.y = ev.clientY;
          return;
        }
        const pt = internoDoEvento(ev);
        const m = pt ? mesaEm(pt.x, pt.y) : null;
        const id = m?.sistemaId ?? null;
        if (id !== hoverRef.current) {
          hoverRef.current = id;
          if (onApontar) {
            const r = ev.currentTarget.getBoundingClientRect();
            onApontar(id, id ? { x: ev.clientX - r.left, y: ev.clientY - r.top } : null);
          }
        }
      }}
      onPointerUp={(ev) => {
        const a = arrastando.current;
        arrastando.current = null;
        if (a?.moveu) return;
        const pt = internoDoEvento(ev);
        if (!pt) return;
        const m = mesaEm(pt.x, pt.y);
        onSelecionar(m ? m.sistemaId : null);
      }}
      onPointerLeave={() => {
        arrastando.current = null;
        hoverRef.current = null;
        onApontar?.(null, null);
      }}
      onWheel={(ev) => {
        if (!ev.ctrlKey && !ev.metaKey) return;
        ev.preventDefault();
        const proxima = Math.min(ESCALA_MAX, Math.max(ESCALA_MIN, escala + (ev.deltaY < 0 ? 1 : -1)));
        onEscala(proxima);
      }}
    />
  );
}

/**
 * Cor de fundo atrás da planta. Vem do token `--escritorio-fundo`, para não
 * ficar um hex solto fora da paleta do sistema; o pixel art em si tem paleta
 * própria porque canvas não lê variável CSS por pixel.
 */
function fundoDaPagina(canvas: HTMLCanvasElement): string {
  const v = getComputedStyle(canvas).getPropertyValue("--escritorio-fundo").trim();
  return v ? `hsl(${v})` : "#1d2420";
}

/**
 * O selo de gente na sala.
 *
 * TERCEIRO eixo, e por isso um elemento proprio: o BLINK diz se o HUB conhece
 * o sistema, o monitor diz se houve execucao, e este diz se tem PESSOA dentro.
 * Sem ele, o Gestao de Processos aparecia com nove pessoas na sala e monitor
 * apagado, porque nao executa integracao nenhuma.
 *
 * Desenhado com retangulos no HUD, nao com sprite: `sprites.ts` esta congelado
 * e nao existe arte de pessoa sentada. Aqui e um pictograma de 5x7 px em
 * espaco de TELA — legivel em qualquer zoom, como as placas.
 */
function seloDeGente(ctx: CanvasRenderingContext2D, x: number, cy: number, n: number) {
  const fonte = '700 10px ui-monospace, SFMono-Regular, Menlo, monospace';
  ctx.font = fonte;
  const txt = String(n);
  const w = largura(ctx, txt, fonte) + 20;
  const y = Math.round(cy - 10);
  ctx.fillStyle = "#1d2b22";
  ctx.fillRect(Math.round(x), y, w, 19);
  ctx.fillStyle = "#3ecf8e";
  ctx.fillRect(Math.round(x), y, w, 2);
  // pictograma: cabeca + tronco
  const px = Math.round(x) + 6;
  ctx.fillStyle = "#8ff0c4";
  ctx.fillRect(px + 1, y + 6, 3, 3);
  ctx.fillRect(px, y + 10, 5, 4);
  ctx.fillStyle = "#f2efe6";
  ctx.fillText(txt, Math.round(x) + 13, y + 14);
}

/** Quanto tempo o emblema leva para subir e apagar. */
const DURACAO_EMBLEMA = 1100;

/**
 * O emblema que sobe da mesa: verde concluiu, vermelho não.
 *
 * Desenhado em pixels do MUNDO, não da tela, para subir junto com o zoom e
 * ficar ancorado no monitor. Sobe 14 px em 1,1 s desacelerando, e desaparece
 * nos últimos 35% — a saída suave é o que evita o corte seco que denuncia
 * animação barata.
 *
 * Não usa `sprites.ts`: são cinco retângulos. Um visto em duas diagonais para
 * o verde, um quadrado cheio para o vermelho — as mesmas formas do vídeo, que
 * são legíveis a 5 px porque não tentam ser desenho.
 */
function emblema(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  vida: number,
  falhou: boolean,
) {
  const subida = 14 * (1 - (1 - vida) ** 2);   // desacelera no fim
  const py = Math.round(y - 4 - subida);
  const px = Math.round(x - 3);
  const alfa = vida < 0.65 ? 1 : 1 - (vida - 0.65) / 0.35;
  const antes = ctx.globalAlpha;
  ctx.globalAlpha = Math.max(0, Math.min(1, alfa));

  // fundo claro, como o envelope do vídeo: destaca sobre mesa e piso
  ctx.fillStyle = "#f4f1e8";
  ctx.fillRect(px, py, 7, 6);
  ctx.fillStyle = falhou ? "#c9352a" : "#2f9e5f";
  if (falhou) {
    ctx.fillRect(px + 2, py + 1, 3, 4);
  } else {
    ctx.fillRect(px + 1, py + 2, 2, 2);
    ctx.fillRect(px + 3, py + 3, 1, 1);
    ctx.fillRect(px + 4, py + 1, 2, 2);
  }
  ctx.globalAlpha = antes;
}

/* ---------------------------------------------------------------- HUD --- */

const CORES: Record<string, [string, string]> = {
  trabalhando: ["#e6f4ec", "#1d6b43"],
  ocioso: ["#f1efe9", "#6b6555"],
  falha: ["#fceceb", "#a3271c"],
  "sem-execucao": ["#f1efe9", "#6b6555"],
  "sem-dados": ["#eceae4", "#8a8578"],
};

function placa(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  texto: string,
  externa = false,
  larguraMax = Infinity,
): number {
  const fonte = '700 11px ui-monospace, SFMono-Regular, Menlo, monospace';
  ctx.font = fonte;
  const t = cortar(ctx, texto.toUpperCase(), larguraMax === Infinity ? Infinity : larguraMax - 16, fonte);
  const w = largura(ctx, t, fonte) + 22;
  const x = Math.round(cx - w / 2);
  const y = Math.round(cy - 10);
  ctx.fillStyle = externa ? "#3a3326" : "#242830";
  ctx.fillRect(x, y, w, 19);
  ctx.fillStyle = externa ? "#e0a53f" : "#74dbcd";
  ctx.fillRect(x, y, w, 2);
  ctx.fillStyle = "#f2efe6";
  ctx.fillText(t, x + 11, y + 14);
  return w;
}

/**
 * Corta o nome no espaço que a mesa tem. Sem isso, "Gestor de Portfólio" e
 * "Gestão de Incorporação" se atropelam quando as duas mesas são vizinhas.
 */
/*
 * MEDIR TEXTO É CARO, E A GENTE MEDIA O MESMO TEXTO SESSENTA VEZES POR SEGUNDO.
 *
 * `cortar` encurta o nome caractere por caractere, chamando `measureText` a
 * cada passo. "Gerador de Contratos Nakhon" reduzido a dez caracteres são
 * dezessete medições — e havia cerca de quarenta etiquetas na tela (nove
 * salas, treze portas, dezesseis mesas). A 60 fps isso passava de mil
 * `measureText` por segundo, recalculando sempre o MESMO corte, do MESMO
 * texto, no MESMO limite.
 *
 * A chave inclui a fonte porque a largura depende dela, e o limite arredondado
 * para pixel inteiro: o limite varia com o zoom, e diferença de fração de
 * pixel não muda onde a palavra é cortada.
 *
 * Nenhum destes caches invalida, e não precisa: as chaves são o conteúdo. Um
 * nome que mude gera chave nova; o antigo vira lixo e cai no teto abaixo.
 */
const TETO_CACHE = 600;

/*
 * As fontes viram constantes porque agora elas são CHAVE de cache. Repetir a
 * string em dois lugares e divergir num deles produziria medida certa e cache
 * errado — o pior tipo de defeito, porque a tela fica sutilmente torta.
 */
const MONO = "ui-monospace, SFMono-Regular, Menlo, monospace";
const FONTE_ESTADO = `600 10px ${MONO}`;
const FONTE_ROTULO = `600 11px ${MONO}`;

const larguras = new Map<string, number>();

function largura(ctx: CanvasRenderingContext2D, texto: string, fonte: string): number {
  const chave = `${fonte}\u0000${texto}`;
  const guardada = larguras.get(chave);
  if (guardada !== undefined) return guardada;
  ctx.font = fonte;
  const w = ctx.measureText(texto).width;
  if (larguras.size > TETO_CACHE) larguras.clear();
  larguras.set(chave, w);
  return w;
}

const cortes = new Map<string, string>();

function cortar(
  ctx: CanvasRenderingContext2D,
  texto: string,
  limite: number,
  fonte: string,
): string {
  if (limite <= 0 || largura(ctx, texto, fonte) <= limite) return texto;
  const chave = `${fonte}\u0000${Math.round(limite)}\u0000${texto}`;
  const pronto = cortes.get(chave);
  if (pronto !== undefined) return pronto;

  let corte = texto;
  while (corte.length > 1 && largura(ctx, corte + "…", fonte) > limite) {
    corte = corte.slice(0, -1);
  }
  const resultado = corte.trimEnd() + "…";
  if (cortes.size > TETO_CACHE) cortes.clear();
  cortes.set(chave, resultado);
  return resultado;
}

function etiqueta(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  nomeCompleto: string,
  estado: string,
  larguraMax = Infinity,
  compacto = false,
) {
  // Na vista do andar inteiro a escala fica perto de 1,5x. Com fonte de 12px
  // sobrava espaço para meia palavra; 10px cabe o nome quase todo, e o estado
  // já vem do halo e do alerta.
  const fonteNome = compacto
    ? '600 10px ui-monospace, SFMono-Regular, Menlo, monospace'
    : '600 12px ui-monospace, SFMono-Regular, Menlo, monospace';
  const cor = CORES[estado] ?? CORES.ocioso;
  ctx.font = FONTE_ESTADO;
  const larguraEstado = largura(ctx, estado, FONTE_ESTADO) + 14;
  const comChip = !compacto && (larguraMax === Infinity || larguraMax > larguraEstado + 70);
  const we = comChip ? larguraEstado : 0;
  ctx.font = fonteNome;
  const nome = cortar(
    ctx,
    nomeCompleto,
    larguraMax === Infinity ? Infinity : larguraMax - we - 8,
    fonteNome,
  );
  const wn = largura(ctx, nome, fonteNome);
  const total = wn + (comChip ? 8 + we : 0);
  const x = Math.round(cx - total / 2);
  const y = Math.round(cy);
  ctx.fillStyle = "rgba(18,26,22,.80)";
  ctx.fillRect(x - 8, y - 13, total + 16, compacto ? 17 : 20);
  ctx.font = fonteNome;
  ctx.fillStyle = "#f2efe6";
  ctx.fillText(nome, x, y + 1);
  if (!comChip) return;
  ctx.fillStyle = cor[0];
  ctx.fillRect(x + wn + 8, y - 10, we, 14);
  ctx.font = '600 10px ui-monospace, SFMono-Regular, Menlo, monospace';
  ctx.fillStyle = cor[1];
  ctx.fillText(estado, x + wn + 15, y);
}

/**
 * Balão de duas linhas: quem está andando em cima, o que está levando embaixo.
 *
 * Eram dois elementos — balão sobre a cabeça e etiqueta sob os pés. A etiqueta
 * caía justamente na placa da sala de baixo. Um elemento só resolve.
 */
/**
 * Quebra o rótulo em linhas dentro de um limite de largura.
 *
 * Cortar com reticências escondia justamente o que interessa: "Análises de
 * viabilidade apr…" não diz nada. Quebrado em duas linhas, cabe inteiro.
 */
function quebrar(
  ctx: CanvasRenderingContext2D,
  texto: string,
  limite: number,
  maxLinhas: number,
  fonte: string,
): string[] {
  const palavras = texto.split(/\s+/);
  const linhas: string[] = [];
  let atual = "";
  for (const palavra of palavras) {
    const tentativa = atual ? `${atual} ${palavra}` : palavra;
    if (largura(ctx, tentativa, fonte) <= limite || !atual) {
      atual = tentativa;
    } else {
      linhas.push(atual);
      atual = palavra;
      if (linhas.length === maxLinhas) break;
    }
  }
  if (linhas.length < maxLinhas && atual) linhas.push(atual);
  // sobrou palavra: a última linha avisa com reticências, mas só nesse caso
  const usadas = linhas.join(" ").split(/\s+/).length;
  if (usadas < palavras.length) {
    linhas[linhas.length - 1] = cortar(ctx, linhas[linhas.length - 1] + " …", limite, fonte);
  }
  return linhas;
}

function balao(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  nome: string,
  rotulo: string,
  falha: boolean,
  ocupados: { x: number; y: number; w: number; h: number }[] = [],
) {
  const LARGURA_MAX = 230;
  const ALTURA_LINHA = 14;
  ctx.font = FONTE_ROTULO;
  const linhas = quebrar(ctx, rotulo, LARGURA_MAX, 3, FONTE_ROTULO);
  const larguraRotulo = Math.max(...linhas.map((l) => largura(ctx, l, FONTE_ROTULO)));
  const fonteNome = '600 9px ui-monospace, SFMono-Regular, Menlo, monospace';
  ctx.font = fonteNome;
  const nomeCurto = cortar(ctx, nome, LARGURA_MAX, fonteNome);
  const w = Math.max(largura(ctx, nomeCurto, fonteNome), larguraRotulo) + 14;
  const h = 14 + linhas.length * ALTURA_LINHA;

  const limite = ctx.canvas.width / (ctx.getTransform().a || 1);
  const x = Math.round(Math.min(limite - w - 4, Math.max(4, cx - w / 2)));
  let y = Math.round(cy - h);
  const bate = (yy: number) =>
    ocupados.some((o) => x < o.x + o.w + 4 && o.x < x + w + 4 && yy < o.y + o.h + 4 && o.y < yy + h + 4);
  for (let tentativa = 0; tentativa < 6 && bate(y); tentativa++) y -= h + 6;
  ocupados.push({ x, y, w, h });

  ctx.fillStyle = "#15181d";
  ctx.fillRect(x - 2, y - 2, w + 4, h + 4);
  ctx.fillStyle = falha ? "#fceceb" : "#ffffff";
  ctx.fillRect(x, y, w, h);
  const rabo = Math.round(Math.min(x + w - 10, Math.max(x + 4, cx - 4)));
  ctx.fillStyle = "#15181d";
  ctx.fillRect(rabo, y + h, 8, 4);
  ctx.fillRect(rabo, y + h + 4, 4, 3);
  ctx.font = '600 9px ui-monospace, SFMono-Regular, Menlo, monospace';
  ctx.fillStyle = "#8a8578";
  ctx.fillText(nomeCurto, x + 7, y + 11);
  ctx.font = '600 11px ui-monospace, SFMono-Regular, Menlo, monospace';
  ctx.fillStyle = falha ? "#a3271c" : "#15181d";
  linhas.forEach((linha, i) => ctx.fillText(linha, x + 7, y + 24 + i * ALTURA_LINHA));
}
