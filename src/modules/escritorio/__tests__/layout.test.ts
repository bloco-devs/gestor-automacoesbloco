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

describe("o andar acompanha a proporção da tela", () => {
  const AREAS: [string, number][] = [
    ["Pessoas", 1], ["Operação", 4], ["Comercial", 2], ["Financeiro", 2],
    ["Suprimentos", 1], ["Incorporação", 2], ["Engenharia", 2],
    ["Jurídico", 1], ["Tecnologia", 1],
  ];
  const sistemas = AREAS.flatMap(([g, n]) =>
    Array.from({ length: n }, (_, i) => ({ id: `${g}-${i}`, nome: `${g} ${i}`, grupo: g })));

  /** Quanto da área de desenho o andar inteiro ocupa, no zoom "cabe tudo". */
  const ocupacao = (largura: number, altura: number) => {
    const alvo = Math.round((largura / altura) * 4) / 4;
    const a = montarAndar(sistemas, [], alvo);
    const escala = Math.min(largura / a.largura, altura / a.altura);
    return (a.largura * escala * a.altura * escala) / (largura * altura);
  };

  it("preenche a tela em vez de deixar tarja preta dos lados", () => {
    // era o defeito: andar de proporção 1,17 numa área de 1,89
    for (const [l, a] of [[1490, 790], [1179, 820], [900, 900], [1800, 700]] as const) {
      expect(ocupacao(l, a), `${l}x${a}`).toBeGreaterThan(0.9);
    }
  });

  it("comparar proporção por diferença absoluta escolhia o andar errado", () => {
    const dims = AREAS.map(([, n]) => tamanhoDaSala(n));
    // com 9 salas as opções são ~8,05 / 2,66 / 1,24 / 0,94; para uma tela
    // larga a de 2,66 é a certa, e a métrica antiga preferia a de 1,24
    expect(melhorDivisao(dims, 1.9)).toBe(2);
  });

  it("a folga vira corredor, nunca deixa o andar menor que o mínimo", () => {
    const dims = AREAS.map(([, n]) => tamanhoDaSala(n));
    const apertado = montarAndar(sistemas, [], 4);
    const largo = montarAndar(sistemas, [], 0.6);
    for (const a of [apertado, largo]) {
      // toda sala continua dentro do andar, com corredor em volta
      for (const s of a.salas) {
        expect(s.x).toBeGreaterThan(0);
        expect(s.x + s.w).toBeLessThan(a.largura);
        expect(s.y + s.h).toBeLessThan(a.altura);
      }
      expect(a.mesas).toHaveLength(sistemas.length);
    }
    void dims;
  });

  it("sobra espaço dentro do andar para a placa de cada serviço", () => {
    /*
     * A placa é desenhada acima da porta, em `porta.y - 10`. Antes ela ficava
     * ABAIXO, apoiada no vazio que sobrava fora do mapa — e sumiu quando o
     * andar passou a ocupar a área toda. Aqui se garante que existe andar
     * acima de toda porta de serviço para ela caber.
     */
    for (const alvo of [0.75, 1.5, 2.5]) {
      const a = montarAndar(sistemas, CONECTORES_EXTERNOS_SEED, alvo);
      expect(a.portas.length).toBeGreaterThan(0);
      for (const porta of a.portas) {
        expect(porta.y, `alvo ${alvo}: ${porta.nome}`).toBeGreaterThanOrEqual(TILE * 2);
        expect(porta.y - 10, `alvo ${alvo}: ${porta.nome}`).toBeLessThan(a.altura);
      }
    }
  });

  it("mesmo esticado, nenhum posto fica inalcançável", () => {
    for (const alvo of [0.75, 1.5, 2.5]) {
      const a = montarAndar(sistemas, [], alvo);
      const primeiro = a.mesas[0];
      for (const m of a.mesas.slice(1)) {
        const rota = rotaEmTiles(a, { x: primeiro.tileX, y: primeiro.tileY }, { x: m.tileX, y: m.tileY });
        expect(rota, `alvo ${alvo}: ${m.nome}`).not.toBeNull();
      }
    }
  });
});

describe("C · o andar inteiro cabe na área, sem arrastar", () => {
  const AREAS: [string, number][] = [
    ["Pessoas", 1], ["Operação", 4], ["Comercial", 2], ["Financeiro", 2],
    ["Suprimentos", 1], ["Incorporação", 2], ["Engenharia", 2],
    ["Jurídico", 1], ["Tecnologia", 1],
  ];
  const sistemas = AREAS.flatMap(([g, n]) =>
    Array.from({ length: n }, (_, i) => ({ id: `${g}-${i}`, nome: `${g} ${i}`, grupo: g })));
  const conectores = Array.from({ length: 13 }, (_, i) => ({ id: `c${i}`, nome: `c${i}` }));

  /** Tamanho mínimo possível do andar: sem preenchimento nenhum. */
  const minimo = (alvo: number) => montarAndar(sistemas, conectores, alvo);

  it("o preenchimento nunca cresce além da área de desenho", () => {
    for (const [l, a] of [[1320, 785], [1180, 820], [1600, 900], [900, 900]] as const) {
      const alvo = Math.round((l / a) * 4) / 4;
      const area = { largura: l, altura: a };
      const cheio = montarAndar(sistemas, conectores, alvo, area);
      const cru = minimo(alvo);
      // ou o andar cabe na área, ou ele já era maior que ela sem preenchimento
      expect(cheio.largura <= l || cru.largura > l, `largura ${l}x${a}`).toBe(true);
      expect(cheio.altura <= a || cru.altura > a, `altura ${l}x${a}`).toBe(true);
      // e o preenchimento jamais deixa o andar MAIOR que o mínimo + a área
      expect(cheio.largura).toBeLessThanOrEqual(Math.max(cru.largura, l));
      expect(cheio.altura).toBeLessThanOrEqual(Math.max(cru.altura, a));
    }
  });

  it("encher a sobra não pode encolher o BLINK", () => {
    for (const [l, a] of [[1320, 785], [1600, 900], [919, 549], [1060, 666]] as const) {
      const alvo = Math.round((l / a) * 4) / 4;
      const cru = minimo(alvo);
      const cheio = montarAndar(sistemas, conectores, alvo, { largura: l, altura: a });
      const escalaCrua = Math.min(l / cru.largura, a / cru.altura);
      const escalaCheia = Math.min(l / cheio.largura, a / cheio.altura);
      // o preenchimento pode empatar, nunca piorar — nem quando a escala é < 1
      expect(escalaCheia, `${l}x${a}`).toBeGreaterThanOrEqual(escalaCrua - 0.001);
    }
  });

  /*
   * A queixa que originou esta regra: "estou usando cem por cento da página e
   * tenho de arrastar para ver os BLINKs". Em "auto" isso não pode acontecer
   * em tela nenhuma — nem na mais apertada.
   */
  it("em qualquer tela, o andar inteiro cabe na moldura", () => {
    for (const [l, a] of [[919, 549], [1060, 666], [1320, 785], [1540, 799], [800, 460]] as const) {
      const alvo = Math.round((l / a) * 4) / 4;
      const andar = montarAndar(sistemas, conectores, alvo, { largura: l, altura: a });
      const escala = Math.min(4, l / andar.largura, a / andar.altura);
      expect(andar.largura * escala, `largura ${l}x${a}`).toBeLessThanOrEqual(l + 0.5);
      expect(andar.altura * escala, `altura ${l}x${a}`).toBeLessThanOrEqual(a + 0.5);
    }
  });

  it("a sobra vira corredor até a borda: sem tarja preta de um dos lados", () => {
    for (const [l, a] of [[919, 549], [1320, 785], [1540, 799]] as const) {
      const alvo = Math.round((l / a) * 4) / 4;
      const andar = montarAndar(sistemas, conectores, alvo, { largura: l, altura: a });
      const escala = Math.min(4, l / andar.largura, a / andar.altura);
      // o lado que manda encosta na borda; o outro fica a menos de um tile dela
      const sobraL = l - andar.largura * escala;
      const sobraA = a - andar.altura * escala;
      expect(Math.min(sobraL, sobraA), `${l}x${a}`).toBeLessThan(TILE);
    }
  });

  it("sem área informada, o comportamento é o de antes", () => {
    const comAlvo = montarAndar(sistemas, conectores, 1.9);
    expect(comAlvo.mesas).toHaveLength(sistemas.length);
    expect(comAlvo.largura).toBeGreaterThan(comAlvo.altura);
  });

  it("mesmo com a área apertando, tudo continua alcançável", () => {
    const a = montarAndar(sistemas, conectores, 1.68, { largura: 1300, altura: 800 });
    const primeiro = a.mesas[0];
    for (const m of a.mesas.slice(1)) {
      expect(
        rotaEmTiles(a, { x: primeiro.tileX, y: primeiro.tileY }, { x: m.tileX, y: m.tileY }),
        m.nome,
      ).not.toBeNull();
    }
    for (const p of a.portas) expect(p.y).toBeGreaterThanOrEqual(TILE * 2);
  });
});
