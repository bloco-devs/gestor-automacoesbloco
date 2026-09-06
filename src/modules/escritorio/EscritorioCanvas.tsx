import { useCallback, useEffect, useRef } from "react";
import type { Andar, Mesa } from "./layout";
import { MARGEM } from "./layout";
import { criarMotor, digitando, passoDe, type Motor, type Personagem } from "./motor";
import { mapaDeCascos, portaSemUso } from "./aparencia";
import type { DadosEscritorio } from "./dados";
import {
  MESA_H,
  MESA_W,
  PERSONAGEM_H,
  PERSONAGEM_W,
  TILE,
  alerta,
  arquivo,
  banco,
  bebedouro,
  cadeira,
  calendario,
  copa,
  divisoria,
  estante,
  halo,
  impressora,
  janela,
  maquina,
  mesa as desenhaMesa,
  paredeExterna,
  pisoTile,
  planta,
  porta as desenhaPorta,
  personagem,
  quadro,
  quadroBranco,
  relogio,
  sofa,
  vasoAlto,
} from "./sprites";

const ESCALA_MIN = 1;
const ESCALA_MAX = 4;
const VAO_PORTA = 15;
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
  useEffect(() => {
    const f = document.createElement("canvas");
    f.width = andar.largura;
    f.height = andar.altura;
    const c = f.getContext("2d");
    if (!c) return;

    for (let y = 0; y < andar.altura; y += TILE) {
      for (let x = 0; x < andar.largura; x += TILE) pisoTile(c, x, y);
    }

    paredeExterna(c, 0, 0, andar.largura, MARGEM);
    paredeExterna(c, 0, andar.altura - MARGEM, andar.largura, MARGEM);
    paredeExterna(c, 0, 0, MARGEM, andar.altura);
    paredeExterna(c, andar.largura - MARGEM, 0, MARGEM, andar.altura);

    // adornos da parede de cima, como na planta de referência
    relogio(c, MARGEM + 40, MARGEM / 2 + 1);
    janela(c, MARGEM + 70, 4);
    calendario(c, MARGEM + 110, 3);
    janela(c, Math.floor(andar.largura / 2), 4);
    janela(c, andar.largura - MARGEM - 60, 4);

    andar.salas.forEach((s, i) => {
      divisoria(c, s.x, s.y, s.w, 20);
      divisoria(c, s.x, s.y + 20, 4, s.h - 20);
      divisoria(c, s.x + s.w - 4, s.y + 20, 4, s.h - 20);
      const vaoEsq = s.portaX - VAO_PORTA;
      const vaoDir = s.portaX + VAO_PORTA;
      divisoria(c, s.x, s.y + s.h - 4, vaoEsq - s.x, 4);
      divisoria(c, vaoDir, s.y + s.h - 4, s.x + s.w - vaoDir, 4);

      // A sala tinha uma planta e nada mais; sobrava chão liso em toda ela.
      quadroBranco(c, s.x + 10, s.y + 5);
      quadro(c, s.x + s.w - 26, s.y + 5, ["#c4463a", "#3f6fc4", "#2f9e69"][i % 3]);
      planta(c, s.x + s.w - 22, s.y + 26);
      const rodape = s.y + s.h - 30;
      if (i % 3 === 0) arquivo(c, s.x + 10, rodape - 4);
      else if (i % 3 === 1) impressora(c, s.x + 10, rodape);
      else estante(c, s.x + 10, rodape - 10);
      vasoAlto(c, s.x + s.w - 26, rodape - 8);
    });

    // copa e máquinas ocupam a faixa livre do último corredor
    const ultimo = andar.corredores[andar.corredores.length - 1];
    copa(c, andar.largura - MARGEM - 70, ultimo - 6);
    maquina(c, andar.largura - MARGEM - 110, ultimo - 14);
    bebedouro(c, MARGEM + 6, ultimo - 10);
    sofa(c, MARGEM + 30, ultimo - 8);
    estante(c, MARGEM + 86, ultimo - 12);

    // Corredor comprido e liso é o que mais fazia o andar parecer vazio.
    // Alterna banco, vaso e planta entre as salas, sem tapar as portas.
    const portas = new Set(andar.salas.map((s) => s.portaX));
    const longe = (x: number) => [...portas].every((p) => Math.abs(p - x) > 40);
    andar.corredores.slice(0, -1).forEach((cy, linha) => {
      let k = linha;
      for (let x = MARGEM + 40; x < andar.largura - MARGEM - 60; x += 104) {
        if (!longe(x)) continue;
        if (k % 3 === 0) banco(c, x, cy - 6);
        else if (k % 3 === 1) vasoAlto(c, x, cy - 14);
        else planta(c, x, cy - 10);
        k++;
      }
    });

    andar.portas.forEach((p) => desenhaPorta(c, p.x, p.y, !portaSemUso(p.conectorId, dados.integracoes)));

    fundoRef.current = f;
  }, [andar, dados.integracoes]);

  /* ------------------------------------------------------------ motor --- */
  useEffect(() => {
    motorRef.current = criarMotor(andar, dados);
  }, [andar, dados]);

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
        if (a.y === b.y && Math.abs(a.x - b.x) < 130) temVizinha.add(a.sistemaId);
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

      for (const m of andar.mesas) {
        const p = naMesa.get(m.sistemaId);
        const sentado = !p || p.fase === "mesa";
        cadeira(ctx, m.cadeiraX, m.cadeiraY);
        if (p && sentado) {
          if (p.estado === "trabalhando") halo(ctx, m.pessoaX + PERSONAGEM_W / 2, m.pessoaY + 9);
          personagem(ctx, Math.round(p.x), Math.round(p.y), p.id, {
            humor: p.estado,
            direcao: p.direcao,
            digitando: digitando(p),
            casco: cascos.get(p.id),
            destacado: hoverRef.current === p.id || selRef.current === p.id,
          });
        }
        desenhaMesa(ctx, m.x, m.y);
        if (p && sentado && p.estado === "falha") alerta(ctx, m.x + MESA_W - 6, m.y - 24);
      }

      // quem está fora da mesa desenha por último, para passar na frente
      for (const p of personagens) {
        if (p.fase === "mesa" || p.fase === "oculto") continue;
        personagem(ctx, Math.round(p.x), Math.round(p.y), p.id, {
          humor: p.estado,
          direcao: p.direcao,
          passo: passoDe(p),
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

      if (cam.escala >= 1.15) {
        for (const s of andar.salas) {
          const t = paraTela(s.x + s.w / 2, s.y + 14);
          placa(ctx, t.x, t.y, s.grupo);
        }
        for (const p of andar.portas) {
          const t = paraTela(p.x + 13, p.y + 34);
          // As portas ficam a 44px uma da outra; sem teto as placas se fundem
          // numa barra escura ilegível.
          placa(ctx, t.x, t.y, p.nome, true, 58 * cam.escala);
        }
        for (const m of andar.mesas) {
          const p = naMesa.get(m.sistemaId);
          if (!p || p.fase !== "mesa") continue;
          const t = paraTela(m.x + MESA_W / 2, m.y + MESA_H + 26);
          // Mesa sozinha na fileira pode usar a sala inteira; com vizinha, só o passo entre mesas.
          const largura = (temVizinha.has(m.sistemaId) ? 58 : 130) * cam.escala;
          etiqueta(ctx, t.x, t.y, m.nome, ROTULO_CURTO[p.estado], largura, cam.escala < 1.8);
        }
      }

      // Vários caminhantes no mesmo corredor empilhavam balões um sobre o outro
      // e nenhum ficava legível. Cada novo balão sobe até achar espaço livre.
      const ocupados: { x: number; y: number; w: number; h: number }[] = [];
      for (const p of personagens) {
        if (!p.viagem || p.fase === "mesa" || p.fase === "oculto") continue;
        const t = paraTela(p.x + PERSONAGEM_W / 2, p.y - 6);
        balao(ctx, t.x, t.y, p.nome, p.viagem.label, p.viagem.falha, ocupados);
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
        if (ix >= m.x - 4 && ix <= m.x + MESA_W + 4 && iy >= m.pessoaY - 4 && iy <= m.y + MESA_H + 4) return m;
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
