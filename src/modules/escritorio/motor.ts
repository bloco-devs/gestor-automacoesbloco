/**
 * Motor de animação do Escritório.
 *
 * Quem levanta da cadeira, quando levanta e COM QUEM fala sai dos dados
 * reais: só existe viagem onde existe integração, e a frequência vem do
 * volume de execuções. O modo demonstração ignora isso e põe todo mundo a
 * andar.
 *
 * Entre dois SISTEMAS a viagem virou conversa: os dois caminham até um ponto
 * de encontro no corredor, param, se viram um para o outro e trocam três
 * linhas. As palavras vêm de `conversas.ts`, a partir da relação entre as
 * duas áreas; o par continua vindo do HUB.
 *
 * Um conector EXTERNO não conversa: ele entrega. Continua fazendo a viagem de
 * ida e volta com o rótulo da integração, como sempre fez.
 */

import {
  caminhoDaPorta,
  caminhoEntreMesas,
  caminhoEntreTiles,
  pontoDeEncontro,
  type Andar,
  type Mesa,
  type Ponto,
  type PortaExterna,
} from "./layout";
import { estaParado, estadoDoSistema, intervaloEntreViagens, type Estado, type SaudeSistema } from "./estado";
import { criarRoteirista, type Fala } from "./conversas";
import type { DadosEscritorio } from "./dados";
import { PERSONAGEM_H, TILE, type Direcao } from "./sprites";

const VELOCIDADE = 38;          // pixels internos por segundo
const SEG_FALANDO = 1.8;
const SEG_FALA = 2.6;           // cada linha da conversa
const SEG_ENCARAR = 1.0;        // param, se viram, e só então falam
const SEG_PAUSA = 1.6;          // ficam juntos um instante antes de voltar
const MAX_VIAGENS = 6;
const MAX_CONVERSAS = 2;        // dois grupos, nunca o andar inteiro falando
const LIMITE_ENCONTRO = 40;     // segundos até desistir de um encontro travado
const INTERVALO_DEMO = 7;

export type Fase = "mesa" | "indo" | "encarando" | "falando" | "voltando" | "oculto";

export interface Conversa {
  a: Personagem;
  b: Personagem;
  linhas: Fala[];
  i: number;
  t: number;
  fase: "indo" | "encarando" | "falando" | "pausa";
}

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
  /** Conversa em curso; os dois lados apontam para o mesmo objeto. */
  conversa?: Conversa;
  /** Texto do balão neste instante. Um balão por vez em cada conversa. */
  fala?: string;
}

export interface Motor {
  personagens: Personagem[];
  porId: Map<string, Personagem>;
  conversas: Conversa[];
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

  const iniciarViagem = (p: Personagem, demo: boolean) => {
    /*
     * "Parado não anda" precisa ser conferido AQUI, não só no intervalo.
     * O `proxima` inicial é sorteado no construtor, então um sistema ocioso
     * chegava a levantar uma vez antes de `intervaloDe` devolver Infinity.
     */
    if (!demo && estaParado(p.estado)) {
      p.proxima = Infinity;
      return;
    }
    const opcoes = saidasDe.get(p.id);
    if (!opcoes || opcoes.length === 0) {
      p.proxima = Infinity;
      return;
    }
    const escolha = opcoes[Math.floor(Math.random() * opcoes.length)];

    // dois sistemas se encontram e conversam; um conector externo só entrega
    if (p.tipo === "sistema" && p.mesa) {
      const outro = porId.get(escolha.destino.sistemaId);
      if (outro && iniciarConversa(p, outro, escolha.label)) return;
      // destino ocupado ou sem rota: tenta de novo daqui a pouco
      p.proxima = 4 + Math.random() * 6;
      return;
    }

    const pontos = p.porta ? caminhoDaPorta(andar, p.porta, escolha.destino) : null;
    if (!pontos) return;
    porRota(p, pontos, escolha.destino.sistemaId, escolha.label);
  };

  const roteirista = criarRoteirista();
  const conversas: Conversa[] = [];
  let relogio = 0; // segundos de simulação, base dos cooldowns das regras

  const interlocutor = (p: Personagem) => ({
    id: p.id,
    nome: p.nome,
    grupo: p.mesa?.grupo ?? "",
  });

  /** Rota de um personagem até uma célula da grade. */
  const rotaAte = (p: Personagem, alvo: { x: number; y: number }): Ponto[] | null => {
    const origem = p.mesa
      ? { x: p.mesa.tileX, y: p.mesa.tileY }
      : p.porta
        ? { x: p.porta.tileX, y: p.porta.tileY }
        : null;
    return origem ? caminhoEntreTiles(andar, origem, alvo) : null;
  };

  const porRota = (p: Personagem, pontos: Ponto[], destinoId: string, label: string) => {
    p.viagem = { destinoId, label, falha: p.estado === "falha", pontos, idx: 0, espera: 0 };
    p.fase = "indo";
    p.x = pontos[0].x;
    p.y = pontos[0].y;
  };

  /**
   * Conversa entre dois sistemas. O par já veio do HUB; aqui só se resolve
   * onde os dois se encontram e o que dizem.
   */
  const iniciarConversa = (a: Personagem, b: Personagem, label: string): boolean => {
    if (!a.mesa || !b.mesa) return false;
    if (b.fase !== "mesa" || b.conversa) return false;
    if (estaParado(b.estado)) return false;
    if (conversas.length >= MAX_CONVERSAS) return false;
    // uma conversa põe DUAS pessoas de pé: o teto tem de contar as duas
    if (viagensAtivas() + 2 > MAX_VIAGENS) return false;

    const pe = pontoDeEncontro(
      andar,
      { x: a.mesa.tileX, y: a.mesa.tileY },
      { x: b.mesa.tileX, y: b.mesa.tileY },
      a.mesa.grupo === b.mesa.grupo,
    );
    if (!pe) return false;
    const rotaA = rotaAte(a, pe.um);
    const rotaB = rotaAte(b, pe.outro);
    if (!rotaA || !rotaB) return false;

    const conversa: Conversa = {
      a,
      b,
      linhas: roteirista.dialogoPara(interlocutor(a), interlocutor(b), label, relogio),
      i: 0,
      t: 0,
      fase: "indo",
    };
    a.conversa = b.conversa = conversa;
    porRota(a, rotaA, b.id, label);
    porRota(b, rotaB, a.id, label);
    conversas.push(conversa);
    return true;
  };

  const encarar = (p: Personagem, alvo: Personagem) => {
    p.direcao =
      Math.abs(alvo.x - p.x) > Math.abs(alvo.y - p.y)
        ? alvo.x > p.x
          ? "direita"
          : "esquerda"
        : "frente";
  };

  const voltarParaMesa = (p: Personagem) => {
    p.conversa = undefined;
    p.fala = undefined;
    if (!p.mesa) {
      p.fase = "mesa";
      return;
    }
    // inverte `pontoDoTile`: os pés estão na base da célula
    const volta = caminhoEntreTiles(
      andar,
      {
        x: Math.round(p.x / TILE),
        y: Math.round((p.y + PERSONAGEM_H - TILE) / TILE),
      },
      { x: p.mesa.tileX, y: p.mesa.tileY },
    );
    if (volta && volta.length > 1) {
      p.viagem = { destinoId: p.id, label: "", falha: false, pontos: volta, idx: 1, espera: 0 };
      p.fase = "voltando";
    } else {
      p.viagem = undefined;
      p.fase = "mesa";
      p.x = p.mesa.pessoaX;
      p.y = p.mesa.pessoaY;
      p.direcao = "frente";
    }
  };

  const avancarConversa = (c: Conversa, dt: number, demo: boolean) => {
    switch (c.fase) {
      case "indo":
        c.t += dt;
        if (c.a.fase === "encarando" && c.b.fase === "encarando") {
          c.fase = "encarando";
          c.t = 0;
          encarar(c.a, c.b);
          encarar(c.b, c.a);
        } else if (c.t > LIMITE_ENCONTRO) {
          // um dos dois não chegou: desfaz em vez de travar os dois de pé
          for (const p of [c.a, c.b]) {
            voltarParaMesa(p);
            p.proxima = intervaloDe(p, demo);
          }
          const i = conversas.indexOf(c);
          if (i >= 0) conversas.splice(i, 1);
        }
        break;
      case "encarando":
        c.t += dt;
        if (c.t >= SEG_ENCARAR) {
          c.fase = "falando";
          c.i = 0;
          c.t = 0;
        }
        break;
      case "falando": {
        c.t += dt;
        const linha = c.linhas[c.i];
        if (linha) {
          const quem = linha.quem === "a" ? c.a : c.b;
          const outro = linha.quem === "a" ? c.b : c.a;
          quem.fala = linha.texto;
          outro.fala = undefined; // um balão por vez: dois nunca se sobrepõem
        }
        if (c.t >= SEG_FALA) {
          c.t = 0;
          c.i++;
          if (c.i >= c.linhas.length) {
            c.fase = "pausa";
            c.a.fala = undefined;
            c.b.fala = undefined;
          }
        }
        break;
      }
      case "pausa":
        c.t += dt;
        if (c.t >= SEG_PAUSA) {
          for (const p of [c.a, c.b]) {
            voltarParaMesa(p);
            p.proxima = intervaloDe(p, demo);
          }
          const i = conversas.indexOf(c);
          if (i >= 0) conversas.splice(i, 1);
        }
        break;
    }
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
    conversas,
    viagensAtivas,
    atualizar(dt: number, demo: boolean) {
      relogio += dt;
      for (const c of [...conversas]) avancarConversa(c, dt, demo);

      for (const p of personagens) {
        p.digitaT += dt;

        switch (p.fase) {
          case "mesa":
          case "oculto": {
            p.proxima -= dt;
            if (p.proxima <= 0) {
              if (viagensAtivas() < MAX_VIAGENS) {
                iniciarViagem(p, demo);
                if (p.fase === "mesa" || p.fase === "oculto") p.proxima = intervaloDe(p, demo);
              } else {
                p.proxima = 2 + Math.random() * 3;
              }
            }
            break;
          }
          case "indo": {
            if (andarAte(p, dt)) {
              if (p.conversa) {
                // espera o outro chegar; quem manda agora é a conversa
                p.fase = "encarando";
              } else {
                p.fase = "falando";
                p.direcao = "frente";
                if (p.viagem) p.viagem.espera = SEG_FALANDO;
              }
            }
            break;
          }
          case "encarando":
            break;
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
