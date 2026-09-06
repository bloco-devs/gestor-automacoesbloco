/**
 * Planta baixa do andar: uma sala por grupo, uma mesa por sistema.
 *
 * O andar inteiro é calculado em pixels internos. Nada aqui depende do
 * tamanho da tela — a câmera é quem recorta.
 */

import { MESA_W, OFFSET_MESA, PESSOA_H, PESSOA_W } from "./sprites";
import type { ConectorEco, SistemaEco } from "./dados";

export const MARGEM = 24;
export const CORREDOR_X = 30;
/** Precisa caber um personagem inteiro de pé (46 px) sem invadir as salas. */
export const CORREDOR_Y = 46;
export const SALAS_POR_LINHA = 4;

const COLUNAS_POR_SALA = 2;
const PASSO_MESA_X = 60;
const PASSO_MESA_Y = 96;
const PAREDE_SALA = 4;
const TOPO_SALA = 20;
const PISO_SALA = 10;

const SALA_W = PAREDE_SALA * 2 + COLUNAS_POR_SALA * PASSO_MESA_X + 12;

/** Ordem em que as salas aparecem; grupo desconhecido entra no fim. */
const ORDEM_GRUPOS = [
  "Identidade",
  "Plataforma",
  "Pessoas",
  "Processos",
  "Operação",
  "Comercial",
  "Financeiro",
  "Empreendimentos",
  "Viabilidade",
  "Obra",
  "Projetos",
  "Contratos",
];

export interface Mesa {
  sistemaId: string;
  nome: string;
  grupo: string;
  /** Canto superior esquerdo do tampo. */
  x: number;
  y: number;
  pessoaX: number;
  pessoaY: number;
  cadeiraX: number;
  cadeiraY: number;
  /** Ponto no chão onde o personagem para ao sair ou ao visitar. */
  saidaX: number;
  saidaY: number;
  salaIdx: number;
}

export interface Sala {
  grupo: string;
  x: number;
  y: number;
  w: number;
  h: number;
  /** Centro do vão da porta, na parede de baixo. */
  portaX: number;
  /** Y do corredor horizontal que serve esta sala. */
  corredorY: number;
  linha: number;
}

export interface PortaExterna {
  conectorId: string;
  nome: string;
  x: number;
  y: number;
  /** Ponto no corredor em frente à porta. */
  frenteX: number;
  frenteY: number;
}

export interface Andar {
  largura: number;
  altura: number;
  salas: Sala[];
  mesas: Mesa[];
  portas: PortaExterna[];
  hallX: number;
  /** Y de cada corredor horizontal, na ordem das linhas de salas. */
  corredores: number[];
  mesaPorSistema: Map<string, Mesa>;
  portaPorConector: Map<string, PortaExterna>;
}

function ordenaGrupos(grupos: string[]): string[] {
  const conhecidos = ORDEM_GRUPOS.filter((g) => grupos.includes(g));
  const resto = grupos.filter((g) => !ORDEM_GRUPOS.includes(g));
  return [...conhecidos, ...resto];
}

export function montarAndar(sistemas: SistemaEco[], conectores: ConectorEco[]): Andar {
  const porGrupo = new Map<string, SistemaEco[]>();
  for (const s of sistemas) {
    const g = s.grupo || "Outros";
    if (!porGrupo.has(g)) porGrupo.set(g, []);
    porGrupo.get(g)!.push(s);
  }
  const grupos = ordenaGrupos([...porGrupo.keys()]);

  const hallX = MARGEM + Math.floor(CORREDOR_X / 2);
  const x0 = MARGEM + CORREDOR_X;

  // Altura de cada linha: manda a sala com mais fileiras de mesa.
  const linhas: string[][] = [];
  for (let i = 0; i < grupos.length; i += SALAS_POR_LINHA) {
    linhas.push(grupos.slice(i, i + SALAS_POR_LINHA));
  }
  const alturaLinha = linhas.map((linha) => {
    const fileiras = Math.max(
      1,
      ...linha.map((g) => Math.ceil((porGrupo.get(g)?.length ?? 0) / COLUNAS_POR_SALA)),
    );
    return TOPO_SALA + fileiras * PASSO_MESA_Y + PISO_SALA;
  });

  const salas: Sala[] = [];
  const mesas: Mesa[] = [];
  const corredores: number[] = [];

  let y = MARGEM;
  linhas.forEach((linha, iLinha) => {
    const h = alturaLinha[iLinha];
    const corredorY = y + h + Math.floor(CORREDOR_Y / 2);
    corredores.push(corredorY);

    linha.forEach((grupo, iCol) => {
      const x = x0 + iCol * (SALA_W + CORREDOR_X);
      const salaIdx = salas.length;
      salas.push({
        grupo,
        x,
        y,
        w: SALA_W,
        h,
        portaX: x + Math.floor(SALA_W / 2),
        corredorY,
        linha: iLinha,
      });

      (porGrupo.get(grupo) ?? []).forEach((s, i) => {
        const col = i % COLUNAS_POR_SALA;
        const fila = Math.floor(i / COLUNAS_POR_SALA);
        const mx = x + PAREDE_SALA + 6 + col * PASSO_MESA_X;
        const my = y + TOPO_SALA + fila * PASSO_MESA_Y + 44;
        mesas.push({
          sistemaId: s.id,
          nome: s.nome,
          grupo,
          x: mx,
          y: my,
          pessoaX: mx + Math.floor((MESA_W - PESSOA_W) / 2),
          pessoaY: my - OFFSET_MESA,
          cadeiraX: mx + 13,
          cadeiraY: my + 30,
          saidaX: mx + Math.floor(MESA_W / 2) - Math.floor(PESSOA_W / 2),
          saidaY: my + 34,
          salaIdx,
        });
      });
    });

    y += h + CORREDOR_Y;
  });

  const largura = x0 + SALAS_POR_LINHA * SALA_W + (SALAS_POR_LINHA - 1) * CORREDOR_X + MARGEM;
  const altura = y + MARGEM;

  // Conectores externos: portas na parede de baixo. Não moram no escritório.
  const portas: PortaExterna[] = [];
  const passoPorta = 44;
  const larguraPortas = conectores.length * passoPorta;
  const inicioPortas = Math.max(MARGEM + 10, Math.floor((largura - larguraPortas) / 2));
  conectores.forEach((c, i) => {
    const px = inicioPortas + i * passoPorta;
    portas.push({
      conectorId: c.id,
      nome: c.nome,
      x: px,
      y: altura - MARGEM - 24,
      frenteX: px + 2,
      frenteY: altura - MARGEM - 24 - PESSOA_H,
    });
  });

  return {
    largura,
    altura,
    salas,
    mesas,
    portas,
    hallX,
    corredores,
    mesaPorSistema: new Map(mesas.map((m) => [m.sistemaId, m])),
    portaPorConector: new Map(portas.map((p) => [p.conectorId, p])),
  };
}


/**
 * Os pontos do caminho são o canto superior do sprite, não os pés. Sem este
 * desconto o personagem anda com a cabeça na linha do corredor e o corpo
 * atravessando a parede da sala de baixo.
 */
function noCorredor(corredorY: number): number {
  return corredorY - Math.floor(PESSOA_H / 2);
}

export interface Ponto {
  x: number;
  y: number;
}

/**
 * Caminho de uma mesa até outra: sai da mesa, cruza a porta da sala, pega o
 * corredor da linha, sobe ou desce pelo hall da esquerda quando as linhas são
 * diferentes, e entra na sala de destino.
 */
export function caminhoEntreMesas(andar: Andar, de: Mesa, para: Mesa): Ponto[] {
  const salaDe = andar.salas[de.salaIdx];
  const salaPara = andar.salas[para.salaIdx];
  const pontos: Ponto[] = [{ x: de.saidaX, y: de.saidaY }];

  pontos.push({ x: salaDe.portaX - 11, y: de.saidaY });
  pontos.push({ x: salaDe.portaX - 11, y: noCorredor(salaDe.corredorY) });

  if (salaDe.linha !== salaPara.linha) {
    pontos.push({ x: andar.hallX - 11, y: noCorredor(salaDe.corredorY) });
    pontos.push({ x: andar.hallX - 11, y: noCorredor(salaPara.corredorY) });
  }

  pontos.push({ x: salaPara.portaX - 11, y: noCorredor(salaPara.corredorY) });
  pontos.push({ x: salaPara.portaX - 11, y: para.saidaY });
  pontos.push({ x: para.saidaX + 26, y: para.saidaY });
  return pontos;
}

/** Caminho de uma porta externa até a mesa que consome aquele conector. */
export function caminhoDaPorta(andar: Andar, porta: PortaExterna, para: Mesa): Ponto[] {
  const salaPara = andar.salas[para.salaIdx];
  const ultimoCorredor = andar.corredores[andar.corredores.length - 1];
  return [
    { x: porta.frenteX, y: porta.frenteY },
    { x: porta.frenteX, y: noCorredor(ultimoCorredor) },
    { x: andar.hallX - 11, y: noCorredor(ultimoCorredor) },
    { x: andar.hallX - 11, y: noCorredor(salaPara.corredorY) },
    { x: salaPara.portaX - 11, y: noCorredor(salaPara.corredorY) },
    { x: salaPara.portaX - 11, y: para.saidaY },
    { x: para.saidaX + 26, y: para.saidaY },
  ];
}
