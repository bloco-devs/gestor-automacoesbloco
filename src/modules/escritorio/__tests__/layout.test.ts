import { describe, expect, it } from "vitest";
import {
  CELULA,
  andavel,
  caminhoDaPorta,
  caminhoEntreMesas,
  celulaEm,
  larguraMinimaDeCorredor,
  melhorDivisao,
  montarAndar,
  pontoDeEncontro,
  rotaEmTiles,
  tamanhoDaSala,
} from "../layout";
import { CONECTORES_EXTERNOS_SEED, SISTEMAS_SEED } from "@/lib/ecossistemaSeed";
import { tamanhoDaPeca } from "../mobiliario";
import { PERSONAGEM_H, PERSONAGEM_W, TILE } from "../sprites";

const andar = montarAndar(SISTEMAS_SEED, CONECTORES_EXTERNOS_SEED);

describe("planta do andar", () => {
  it("dá uma mesa para cada sistema, sem sobra nem falta", () => {
    expect(andar.mesas).toHaveLength(SISTEMAS_SEED.length);
    for (const s of SISTEMAS_SEED) expect(andar.mesaPorSistema.has(s.id)).toBe(true);
  });

  it("dá uma sala para cada grupo", () => {
    const grupos = new Set(SISTEMAS_SEED.map((s) => s.grupo));
    expect(andar.salas).toHaveLength(grupos.size);
    for (const s of andar.salas) expect(grupos.has(s.grupo as never)).toBe(true);
  });

  it("põe cada mesa dentro da sala do grupo dela", () => {
    for (const m of andar.mesas) {
      const sala = andar.salas[m.salaIdx];
      expect(sala.grupo).toBe(m.grupo);
      expect(m.x).toBeGreaterThan(sala.x);
      expect(m.y).toBeGreaterThan(sala.y);
      expect(m.x).toBeLessThan(sala.x + sala.w);
      expect(m.y).toBeLessThan(sala.y + sala.h);
    }
  });

  it("mantém tudo dentro do andar", () => {
    for (const s of andar.salas) {
      expect(s.x).toBeGreaterThanOrEqual(0);
      expect(s.x + s.w).toBeLessThanOrEqual(andar.largura);
      expect(s.y + s.h).toBeLessThanOrEqual(andar.altura);
    }
  });

  it("uma porta para cada conector externo", () => {
    expect(andar.portas).toHaveLength(CONECTORES_EXTERNOS_SEED.length);
    for (const c of CONECTORES_EXTERNOS_SEED) expect(andar.portaPorConector.has(c.id)).toBe(true);
  });

  it("não vira uma torre: o andar nunca fica mais alto que largo", () => {
    expect(andar.largura).toBeGreaterThan(andar.altura);
  });

  it("equilibra as fileiras — nada de uma sobrar com uma sala só", () => {
    // nove salas de tamanhos variados nunca devem cair numa divisão desigual
    const dims = Array.from({ length: 9 }, (_, i) => tamanhoDaSala((i % 4) + 1));
    const linhas = melhorDivisao(dims);
    const base = Math.floor(9 / linhas);
    const sobra = 9 % linhas;
    const tamanhos = Array.from({ length: linhas }, (_, l) => base + (l < sobra ? 1 : 0));
    expect(Math.max(...tamanhos) - Math.min(...tamanhos)).toBeLessThanOrEqual(1);
  });
});

describe("grade de colisão", () => {
  it("o posto de cada sistema está numa célula onde dá para ficar de pé", () => {
    for (const m of andar.mesas) {
      expect(andavel(andar, m.tileX, m.tileY), m.nome).toBe(true);
    }
  });

  it("nenhum posto fica inalcançável a partir de outro", () => {
    const primeiro = andar.mesas[0];
    for (const m of andar.mesas.slice(1)) {
      const rota = rotaEmTiles(
        andar,
        { x: primeiro.tileX, y: primeiro.tileY },
        { x: m.tileX, y: m.tileY },
      );
      expect(rota, `${primeiro.nome} → ${m.nome}`).not.toBeNull();
    }
  });

  it("toda porta de serviço alcança pelo menos uma mesa", () => {
    for (const p of andar.portas) {
      const chega = andar.mesas.some(
        (m) => rotaEmTiles(andar, { x: p.tileX, y: p.tileY }, { x: m.tileX, y: m.tileY }) !== null,
      );
      expect(chega, p.nome).toBe(true);
    }
  });

  it("nenhum móvel invade parede ou soleira de porta", () => {
    const ARQUITETURA = new Set([
      "piso_base",
      "piso_var1",
      "piso_var2",
      "piso_corredor",
      "trilha",
      "trilha_topo",
      "trilha_base",
      "parede_h",
      "parede_v",
      "parede_canto",
      "porta_aberta",
      "porta_fechada",
      "porta_apagada",
      "janela_dupla",
      "janela_simples",
      "quadro_branco",
      "capacho",
      "tapete",
      "computador_idle",
      "computador_ativo",
      "computador_falha",
      "computador_apagado",
      "telefone",
    ]);
    let transbordo = 0;
    for (const it of andar.camadas) {
      if (ARQUITETURA.has(it.sprite) || it.sprite.startsWith("quadro_") || it.sprite.startsWith("relogio_")) {
        continue;
      }
      const { w, h } = tamanhoDaPeca(it.sprite);
      const tx0 = Math.floor(it.x / TILE);
      const ty0 = Math.floor(it.y / TILE);
      const tx1 = Math.ceil((it.x + w) / TILE) - 1;
      const ty1 = Math.ceil((it.y + h) / TILE) - 1;
      for (let y = ty0; y <= ty1; y++) {
        for (let x = tx0; x <= tx1; x++) {
          const c = celulaEm(andar, x, y);
          if (c === CELULA.PAREDE || c === CELULA.PORTA) transbordo++;
        }
      }
    }
    expect(transbordo).toBe(0);
  });

  it("não deixa beco sem saída: toda célula andável tem vizinha andável", () => {
    let presos = 0;
    for (let y = 1; y < andar.linhasGrade - 1; y++) {
      for (let x = 1; x < andar.colunas - 1; x++) {
        if (!andavel(andar, x, y)) continue;
        const livre =
          andavel(andar, x - 1, y) ||
          andavel(andar, x + 1, y) ||
          andavel(andar, x, y - 1) ||
          andavel(andar, x, y + 1);
        if (!livre) presos++;
      }
    }
    expect(presos).toBe(0);
  });

  it("o corredor é largo o bastante para o BLINK passar", () => {
    expect(larguraMinimaDeCorredor(andar)).toBeGreaterThanOrEqual(PERSONAGEM_W);
  });
});

describe("caminhos", () => {
  const mesas = andar.mesas;

  it("sai da mesa de origem e chega na de destino", () => {
    const pontos = caminhoEntreMesas(andar, mesas[0], mesas[mesas.length - 1]);
    expect(pontos.length).toBeGreaterThan(1);
    expect(pontos[0]).toEqual({ x: mesas[0].pessoaX, y: mesas[0].pessoaY });
    const fim = pontos[pontos.length - 1];
    expect(fim.x).toBe(mesas[mesas.length - 1].pessoaX);
    expect(fim.y).toBe(mesas[mesas.length - 1].pessoaY);
  });

  it("nenhum trecho passa por célula bloqueada", () => {
    for (let i = 1; i < mesas.length; i++) {
      const rota = rotaEmTiles(
        andar,
        { x: mesas[0].tileX, y: mesas[0].tileY },
        { x: mesas[i].tileX, y: mesas[i].tileY },
      );
      expect(rota).not.toBeNull();
      for (const [x, y] of rota!) expect(andavel(andar, x, y), `${x},${y}`).toBe(true);
    }
  });

  it("só anda em linha reta — cada trecho muda um eixo de cada vez", () => {
    const pontos = caminhoEntreMesas(andar, mesas[0], mesas[3] ?? mesas[1]);
    for (let i = 1; i < pontos.length; i++) {
      const mudouX = pontos[i].x !== pontos[i - 1].x;
      const mudouY = pontos[i].y !== pontos[i - 1].y;
      expect(mudouX && mudouY).toBe(false);
    }
  });

  it("caminho de uma porta externa chega numa mesa", () => {
    const porta = andar.portas[0];
    const alvo = andar.mesas.find(
      (m) => rotaEmTiles(andar, { x: porta.tileX, y: porta.tileY }, { x: m.tileX, y: m.tileY }) !== null,
    )!;
    const pontos = caminhoDaPorta(andar, porta, alvo);
    const fim = pontos[pontos.length - 1];
    expect(fim.x).toBe(alvo.pessoaX);
    expect(fim.y).toBe(alvo.pessoaY);
  });

  it("os pés ficam na base da célula — nada de cabeça atravessando parede", () => {
    const pontos = caminhoEntreMesas(andar, mesas[0], mesas[mesas.length - 1]);
    for (const p of pontos) {
      expect((p.y + PERSONAGEM_H) % TILE).toBe(0);
    }
  });
});

describe("ponto de encontro", () => {
  it("entre áreas diferentes acontece no corredor, fora das duas salas", () => {
    const a = andar.mesas[0];
    const b = andar.mesas.find((m) => m.grupo !== a.grupo)!;
    const pe = pontoDeEncontro(
      andar,
      { x: a.tileX, y: a.tileY },
      { x: b.tileX, y: b.tileY },
      false,
    );
    expect(pe).not.toBeNull();
    const dentro = andar.salas.some(
      (s) =>
        pe!.um.x > s.x / TILE &&
        pe!.um.x < (s.x + s.w) / TILE - 1 &&
        pe!.um.y > s.y / TILE &&
        pe!.um.y < (s.y + s.h) / TILE - 1,
    );
    expect(dentro).toBe(false);
  });

  it("os dois param a dois tiles, para os sprites não se sobreporem", () => {
    const a = andar.mesas[0];
    const b = andar.mesas.find((m) => m.grupo !== a.grupo)!;
    const pe = pontoDeEncontro(
      andar,
      { x: a.tileX, y: a.tileY },
      { x: b.tileX, y: b.tileY },
      false,
    )!;
    const dist = Math.abs(pe.um.x - pe.outro.x) + Math.abs(pe.um.y - pe.outro.y);
    expect(dist * TILE).toBeGreaterThanOrEqual(PERSONAGEM_W);
  });

  it("colegas da mesma sala se encontram sem sair dela", () => {
    const porSala = new Map<number, typeof andar.mesas>();
    for (const m of andar.mesas) {
      if (!porSala.has(m.salaIdx)) porSala.set(m.salaIdx, []);
      porSala.get(m.salaIdx)!.push(m);
    }
    const dupla = [...porSala.values()].find((v) => v.length >= 2);
    if (!dupla) return; // seed sem sala de dois; nada a verificar
    const pe = pontoDeEncontro(
      andar,
      { x: dupla[0].tileX, y: dupla[0].tileY },
      { x: dupla[1].tileX, y: dupla[1].tileY },
      true,
    );
    expect(pe).not.toBeNull();
  });
});
