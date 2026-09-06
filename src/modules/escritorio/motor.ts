/**
 * Motor de animação do Escritório.
 *
 * Quem levanta da cadeira, quando levanta e o que fala sai dos dados reais:
 * só existe viagem onde existe integração, e a frequência vem do volume de
 * execuções. O modo demonstração ignora isso e põe todo mundo a andar.
 */

import { caminhoDaPorta, caminhoEntreMesas, type Andar, type Mesa, type Ponto, type PortaExterna } from "./layout";
import { estaParado, estadoDoSistema, intervaloEntreViagens, type Estado, type SaudeSistema } from "./estado";
import type { DadosEscritorio } from "./dados";
import type { Direcao } from "./sprites";

const VELOCIDADE = 38;          // pixels internos por segundo
const SEG_FALANDO = 1.8;
const MAX_VIAGENS = 6;
const INTERVALO_DEMO = 7;

export type Fase = "mesa" | "indo" | "falando" | "voltando" | "oculto";

export interface Viagem {
  destinoId: string;
  label: string;
  falha: boolean;
  pontos: Ponto[];
  idx: number;
  espera: number;
}

export interface Personagem {
  id: string;
  nome: string;
  tipo: "sistema" | "externo";
  estado: Estado;
  mesa?: Mesa;
  porta?: PortaExterna;
  x: number;
  y: number;
  direcao: Direcao;
  fase: Fase;
  passoT: number;
  digitaT: number;
  proxima: number;
  viagem?: Viagem;
}

export interface Motor {
  personagens: Personagem[];
  porId: Map<string, Personagem>;
  atualizar(dt: number, demo: boolean): void;
  viagensAtivas(): number;
}

function direcaoEntre(dx: number, dy: number, atual: Direcao): Direcao {
  if (Math.abs(dx) < 0.4 && Math.abs(dy) < 0.4) return atual;
  if (Math.abs(dx) >= Math.abs(dy)) return dx >= 0 ? "direita" : "esquerda";
  return "frente";
}

export function criarMotor(andar: Andar, dados: DadosEscritorio, agora = Date.now()): Motor {
  const saudeDe = (id: string): SaudeSistema | undefined => dados.saude[id];
  const maiorExecs = Math.max(1, ...Object.values(dados.saude).map((s) => s.execs ?? 0));

  const personagens: Personagem[] = [];

  for (const mesa of andar.mesas) {
    const estado = estadoDoSistema(saudeDe(mesa.sistemaId), agora);
    personagens.push({
      id: mesa.sistemaId,
      nome: mesa.nome,
      tipo: "sistema",
      estado,
      mesa,
      x: mesa.pessoaX,
      y: mesa.pessoaY,
      direcao: "frente",
      fase: "mesa",
      passoT: 0,
      digitaT: Math.random() * 2,
      proxima: 2 + Math.random() * 8,
    });
  }
  for (const porta of andar.portas) {
    personagens.push({
      id: porta.conectorId,
      nome: porta.nome,
      tipo: "externo",
      estado: "trabalhando",
      porta,
      x: porta.frenteX,
      y: porta.frenteY,
      direcao: "frente",
      fase: "oculto",
      passoT: 0,
      digitaT: 0,
      proxima: 6 + Math.random() * 18,
    });
  }

  const porId = new Map(personagens.map((p) => [p.id, p]));

  // Só vira viagem a integração cujos dois lados existem no andar.
  const saidasDe = new Map<string, { destino: Mesa; label: string }[]>();
  for (const it of dados.integracoes) {
    const destino = andar.mesaPorSistema.get(it.destino);
    if (!destino) continue;
    const origemTemMesa = andar.mesaPorSistema.has(it.origem);
    const origemTemPorta = andar.portaPorConector.has(it.origem);
    if (!origemTemMesa && !origemTemPorta) continue;
    if (it.origem === it.destino) continue;
    if (!saidasDe.has(it.origem)) saidasDe.set(it.origem, []);
    saidasDe.get(it.origem)!.push({ destino, label: it.label || "dados" });
  }

  const intervaloDe = (p: Personagem, demo: boolean): number => {
    if (demo) return INTERVALO_DEMO * (0.6 + Math.random() * 0.8);
    if (p.tipo === "externo") return 26 + Math.random() * 40;
    if (estaParado(p.estado)) return Infinity;
    const execs = saudeDe(p.id)?.execs ?? 0;
    const base = execs > 0 ? intervaloEntreViagens(execs, maiorExecs) : 45;
    return base * (0.7 + Math.random() * 0.6);
  };

  const viagensAtivas = () => personagens.filter((p) => p.fase !== "mesa" && p.fase !== "oculto").length;

  const iniciarViagem = (p: Personagem) => {
    const opcoes = saidasDe.get(p.id);
    if (!opcoes || opcoes.length === 0) {
      p.proxima = Infinity;
      return;
    }
    const escolha = opcoes[Math.floor(Math.random() * opcoes.length)];
    const pontos =
      p.tipo === "externo" && p.porta
        ? caminhoDaPorta(andar, p.porta, escolha.destino)
        : p.mesa
          ? caminhoEntreMesas(andar, p.mesa, escolha.destino)
          : null;
    if (!pontos) return;
    p.viagem = {
      destinoId: escolha.destino.sistemaId,
      label: escolha.label,
      falha: p.estado === "falha",
      pontos,
      idx: 0,
      espera: 0,
    };
    p.fase = "indo";
    p.x = pontos[0].x;
    p.y = pontos[0].y;
  };

  const andarAte = (p: Personagem, dt: number): boolean => {
    const v = p.viagem;
    if (!v) return true;
    let restante = VELOCIDADE * dt;
    while (restante > 0 && v.idx < v.pontos.length) {
      const alvo = v.pontos[v.idx];
      const dx = alvo.x - p.x;
      const dy = alvo.y - p.y;
      const dist = Math.hypot(dx, dy);
      if (dist <= restante) {
        p.x = alvo.x;
        p.y = alvo.y;
        restante -= dist;
        v.idx++;
      } else {
        const k = restante / dist;
        p.x += dx * k;
        p.y += dy * k;
        p.direcao = direcaoEntre(dx, dy, p.direcao);
        p.passoT += dt;
        return false;
      }
    }
    return v.idx >= v.pontos.length;
  };

  return {
    personagens,
    porId,
    viagensAtivas,
    atualizar(dt: number, demo: boolean) {
      for (const p of personagens) {
        p.digitaT += dt;

        switch (p.fase) {
          case "mesa":
          case "oculto": {
            p.proxima -= dt;
            if (p.proxima <= 0) {
              if (viagensAtivas() < MAX_VIAGENS) {
                iniciarViagem(p);
                if (p.fase === "mesa" || p.fase === "oculto") p.proxima = intervaloDe(p, demo);
              } else {
                p.proxima = 2 + Math.random() * 3;
              }
            }
            break;
          }
          case "indo": {
            if (andarAte(p, dt)) {
              p.fase = "falando";
              p.direcao = "frente";
              if (p.viagem) p.viagem.espera = SEG_FALANDO;
            }
            break;
          }
          case "falando": {
            const v = p.viagem;
            if (!v) {
              p.fase = "mesa";
              break;
            }
            v.espera -= dt;
            if (v.espera <= 0) {
              v.pontos = [...v.pontos].reverse();
              v.idx = 0;
              // já está no primeiro ponto do caminho invertido
              v.idx = 1;
              p.fase = "voltando";
            }
            break;
          }
          case "voltando": {
            if (andarAte(p, dt)) {
              p.viagem = undefined;
              if (p.tipo === "externo") {
                p.fase = "oculto";
                if (p.porta) {
                  p.x = p.porta.frenteX;
                  p.y = p.porta.frenteY;
                }
              } else if (p.mesa) {
                p.fase = "mesa";
                p.x = p.mesa.pessoaX;
                p.y = p.mesa.pessoaY;
                p.direcao = "frente";
              }
              p.proxima = intervaloDe(p, demo);
            }
            break;
          }
        }
      }
    },
  };
}

/** Fase de caminhada: alterna as pernas 6 vezes por segundo. */
export function passoDe(p: Personagem): 0 | 1 | 2 {
  if (p.fase !== "indo" && p.fase !== "voltando") return 0;
  return (Math.floor(p.passoT * 6) % 2 === 0 ? 1 : 2) as 1 | 2;
}

/** Digitação: mãos sobem e descem 3 vezes por segundo. */
export function digitando(p: Personagem): boolean {
  return p.fase === "mesa" && p.estado === "trabalhando" && Math.floor(p.digitaT * 3) % 2 === 0;
}
