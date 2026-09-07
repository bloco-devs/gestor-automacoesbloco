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
  personagem,
} from "./sprites";
import { obterSprite } from "./mobiliario";
import type { EventoEcossistema } from "./eventos";

const ESCALA_MIN = 1;
const ESCALA_MAX = 4;
/** "sem-dados" não cabe numa etiqueta de mesa; vira "sem dado". */
const ROTULO_CURTO: Record<string, string> = {
  trabalhando: "trabalhando",
  ocioso: "ocioso",
  falha: "falha",
  "sem-dados": "sem dado",
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
  trabalhoPorSistema,
}: EscritorioCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const fundoRef = useRef<HTMLCanvasElement | null>(null);
  const motorRef = useRef<Motor | null>(null);
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
        cam.alvoEscala = Math.max(
          0.75,
          Math.min(4, Math.min(larguraTela / andar.largura, alturaTela / andar.altura)),
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
        const tela =
          p?.estado === "trabalhando"
            ? "computador_ativo"
            : p?.estado === "falha"
              ? "computador_falha"
              : p?.estado === "sem-dados"
                ? "computador_apagado"
                : "computador_idle";
        const sprite = obterSprite(tela);
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
        if (!servico || servico.estado === "sem-dados") continue;
        const lx = porta.x + 21;
        const ly = porta.y + 3;
        const pulso = !!servico.executando && Math.floor(agora / 700) % 2 === 0;
        const cor =
          servico.estado === "falha" ? "#e04a3c" : servico.executando ? "#3ecf8e" : "#5c5346";
        ctx.fillStyle = "#14201a";
        ctx.fillRect(lx - 1, ly - 1, 8, 6);
        ctx.fillStyle = cor;
        ctx.fillRect(lx, ly, 6, 4);
        if (pulso) {
          ctx.fillStyle = "#d8f7e8";
          ctx.fillRect(lx + 1, ly + 1, 2, 1);
        }
      }

      // profundidade por Y: quem está mais abaixo desenha por último
      const ordenados = [...personagens]
        .filter((p) => p.fase !== "oculto")
        .sort((a, b) => a.y - b.y);
      for (const p of ordenados) {
        const parado = p.fase === "mesa";
        if (parado && p.estado === "trabalhando") {
          halo(ctx, p.x + PERSONAGEM_W / 2, p.y + 9);
        }
        // 1 px de balanço: é o que separa "conversando" de "congelado"
        const balanco = balancoDaConversa(p);
        personagem(ctx, Math.round(p.x), Math.round(p.y) + balanco, p.id, {
          humor: p.estado,
          direcao: p.direcao,
          passo: passoDe(p),
          digitando: digitando(p),
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
       * O limiar era 1.15, calibrado para a planta antiga. O andar de tiles é
       * maior, então cabe inteiro por volta de 1.0 — e nessa escala sumiam
       * TODOS os nomes, inclusive os das salas. Com 0.85 o andar inteiro
       * continua etiquetado; abaixo disso a letra não vale a tinta.
       */
      if (cam.escala >= 0.85) {
        for (const s of andar.salas) {
          const t = paraTela(s.x + s.w / 2, s.y + 14);
          placa(ctx, t.x, t.y, s.grupo);
        }
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
          const t = paraTela(m.x + MESA_W / 2, m.pessoaY + PERSONAGEM_H + 8);
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
        const t = paraTela(p.x + PERSONAGEM_W / 2, p.y - 6);
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
        const base = Math.max(m.y + MESA_H, m.pessoaY + PERSONAGEM_H) + 4;
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
        if (a && !ajustar) {
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

/* ---------------------------------------------------------------- HUD --- */

const CORES: Record<string, [string, string]> = {
  trabalhando: ["#e6f4ec", "#1d6b43"],
  ocioso: ["#f1efe9", "#6b6555"],
  falha: ["#fceceb", "#a3271c"],
  "sem-dados": ["#eceae4", "#8a8578"],
};

function placa(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  texto: string,
  externa = false,
  larguraMax = Infinity,
) {
  ctx.font = '700 11px ui-monospace, SFMono-Regular, Menlo, monospace';
  const t = cortar(ctx, texto.toUpperCase(), larguraMax === Infinity ? Infinity : larguraMax - 16);
  const w = ctx.measureText(t).width + 22;
  const x = Math.round(cx - w / 2);
  const y = Math.round(cy - 10);
  ctx.fillStyle = externa ? "#3a3326" : "#242830";
  ctx.fillRect(x, y, w, 19);
  ctx.fillStyle = externa ? "#e0a53f" : "#74dbcd";
  ctx.fillRect(x, y, w, 2);
  ctx.fillStyle = "#f2efe6";
  ctx.fillText(t, x + 11, y + 14);
}

/**
 * Corta o nome no espaço que a mesa tem. Sem isso, "Gestor de Portfólio" e
 * "Gestão de Incorporação" se atropelam quando as duas mesas são vizinhas.
 */
function cortar(ctx: CanvasRenderingContext2D, texto: string, limite: number): string {
  if (limite <= 0 || ctx.measureText(texto).width <= limite) return texto;
  let corte = texto;
  while (corte.length > 1 && ctx.measureText(corte + "…").width > limite) corte = corte.slice(0, -1);
  return corte.trimEnd() + "…";
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
  ctx.font = '600 10px ui-monospace, SFMono-Regular, Menlo, monospace';
  const larguraEstado = ctx.measureText(estado).width + 14;
  const comChip = !compacto && (larguraMax === Infinity || larguraMax > larguraEstado + 70);
  const we = comChip ? larguraEstado : 0;
  ctx.font = fonteNome;
  const nome = cortar(ctx, nomeCompleto, larguraMax === Infinity ? Infinity : larguraMax - we - 8);
  const wn = ctx.measureText(nome).width;
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
function quebrar(ctx: CanvasRenderingContext2D, texto: string, limite: number, maxLinhas: number): string[] {
  const palavras = texto.split(/\s+/);
  const linhas: string[] = [];
  let atual = "";
  for (const palavra of palavras) {
    const tentativa = atual ? `${atual} ${palavra}` : palavra;
    if (ctx.measureText(tentativa).width <= limite || !atual) {
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
  if (usadas < palavras.length) linhas[linhas.length - 1] = cortar(ctx, linhas[linhas.length - 1] + " …", limite);
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
  ctx.font = '600 11px ui-monospace, SFMono-Regular, Menlo, monospace';
  const linhas = quebrar(ctx, rotulo, LARGURA_MAX, 3);
  const larguraRotulo = Math.max(...linhas.map((l) => ctx.measureText(l).width));
  ctx.font = '600 9px ui-monospace, SFMono-Regular, Menlo, monospace';
  const nomeCurto = cortar(ctx, nome, LARGURA_MAX);
  const w = Math.max(ctx.measureText(nomeCurto).width, larguraRotulo) + 14;
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
