import { describe, expect, it } from "vitest";
import { CORREDOR_Y, caminhoDaPorta, caminhoEntreMesas, montarAndar } from "../layout";
import { CONECTORES_EXTERNOS_SEED, SISTEMAS_SEED } from "@/lib/ecossistemaSeed";
import { MESA_H, MESA_W, PERSONAGEM_H } from "../sprites";

const sistemas = SISTEMAS_SEED.map((s) => ({ id: s.id, nome: s.nome, grupo: s.grupo as string }));
const conectores = CONECTORES_EXTERNOS_SEED.map((c) => ({ id: c.id, nome: c.nome }));
const andar = montarAndar(sistemas, conectores);

describe("planta do andar", () => {
  it("dá uma mesa para cada sistema, sem sobra nem falta", () => {
    expect(andar.mesas).toHaveLength(sistemas.length);
    expect(new Set(andar.mesas.map((m) => m.sistemaId)).size).toBe(sistemas.length);
  });

  it("dá uma sala para cada grupo", () => {
    const grupos = new Set(sistemas.map((s) => s.grupo));
    expect(andar.salas).toHaveLength(grupos.size);
    expect(new Set(andar.salas.map((s) => s.grupo))).toEqual(grupos);
  });

  it("põe cada mesa dentro da sala do grupo dela", () => {
    for (const m of andar.mesas) {
      const sala = andar.salas[m.salaIdx];
      expect(sala.grupo).toBe(m.grupo);
      expect(m.x).toBeGreaterThanOrEqual(sala.x);
      expect(m.x + MESA_W).toBeLessThanOrEqual(sala.x + sala.w);
      expect(m.y).toBeGreaterThan(sala.y);
      expect(m.y + MESA_H).toBeLessThanOrEqual(sala.y + sala.h);
    }
  });

  it("não deixa duas mesas se sobreporem", () => {
    for (let i = 0; i < andar.mesas.length; i++) {
      for (let j = i + 1; j < andar.mesas.length; j++) {
        const a = andar.mesas[i];
        const b = andar.mesas[j];
        const cruza =
          a.x < b.x + MESA_W && b.x < a.x + MESA_W && a.pessoaY < b.y + MESA_H && b.pessoaY < a.y + MESA_H;
        expect(cruza, `${a.sistemaId} x ${b.sistemaId}`).toBe(false);
      }
    }
  });

  it("mantém tudo dentro do andar", () => {
    for (const m of andar.mesas) {
      expect(m.x).toBeGreaterThan(0);
      expect(m.x + MESA_W).toBeLessThan(andar.largura);
      expect(m.pessoaY).toBeGreaterThan(0);
      expect(m.cadeiraY).toBeLessThan(andar.altura);
    }
    for (const p of andar.portas) {
      expect(p.x).toBeGreaterThan(0);
      expect(p.x + 26).toBeLessThan(andar.largura);
    }
  });

  it("uma porta para cada conector externo", () => {
    expect(andar.portas).toHaveLength(conectores.length);
    expect(andar.portaPorConector.size).toBe(conectores.length);
  });
});

describe("caminho entre mesas", () => {
  const de = andar.mesaPorSistema.get("gestao-comercial")!;
  const para = andar.mesaPorSistema.get("financeiro")!;

  it("sai da mesa de origem e termina ao lado da mesa de destino", () => {
    const pontos = caminhoEntreMesas(andar, de, para);
    expect(pontos[0]).toEqual({ x: de.saidaX, y: de.saidaY });
    expect(pontos[pontos.length - 1].y).toBe(para.saidaY);
  });

  it("passa pelo corredor das duas salas", () => {
    const pontos = caminhoEntreMesas(andar, de, para);
    const dentroDe = (corredorY: number) =>
      pontos.some((p) => Math.abs(p.y + PERSONAGEM_H / 2 - corredorY) <= CORREDOR_Y / 2);
    expect(dentroDe(andar.salas[de.salaIdx].corredorY)).toBe(true);
    expect(dentroDe(andar.salas[para.salaIdx].corredorY)).toBe(true);
  });

  it("no corredor o corpo inteiro cabe na faixa — nada de cabeça atravessando parede", () => {
    const corredores = new Set(andar.salas.map((s) => s.corredorY));
    for (const a of andar.mesas) {
      for (const b of andar.mesas) {
        if (a === b) continue;
        for (const p of caminhoEntreMesas(andar, a, b)) {
          const meio = p.y + PERSONAGEM_H / 2;
          for (const cy of corredores) {
            if (Math.abs(meio - cy) > 2) continue;
            expect(p.y).toBeGreaterThanOrEqual(cy - CORREDOR_Y / 2);
            expect(p.y + PERSONAGEM_H).toBeLessThanOrEqual(cy + CORREDOR_Y / 2);
          }
        }
      }
    }
  });

  it("só anda em linha reta — cada trecho muda um eixo de cada vez", () => {
    const pontos = caminhoEntreMesas(andar, de, para);
    for (let i = 1; i < pontos.length; i++) {
      const mudaX = pontos[i].x !== pontos[i - 1].x;
      const mudaY = pontos[i].y !== pontos[i - 1].y;
      expect(mudaX && mudaY, `trecho ${i} corta na diagonal`).toBe(false);
    }
  });

  it("caminho de uma porta externa também é ortogonal e chega na mesa", () => {
    const porta = andar.portaPorConector.get("sienge")!;
    const pontos = caminhoDaPorta(andar, porta, para);
    for (let i = 1; i < pontos.length; i++) {
      const mudaX = pontos[i].x !== pontos[i - 1].x;
      const mudaY = pontos[i].y !== pontos[i - 1].y;
      expect(mudaX && mudaY).toBe(false);
    }
    expect(pontos[pontos.length - 1].y).toBe(para.saidaY);
  });
});
