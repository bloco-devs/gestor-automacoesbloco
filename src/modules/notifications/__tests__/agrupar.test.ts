import { describe, it, expect } from "vitest";
import { agruparNotificacoes } from "../agrupar";
import type { AppNotification } from "../service";

const BASE = new Date("2026-07-29T12:00:00Z").getTime();

/** `minutosAtras` cresce para o passado — a lista chega da mais nova para a mais velha. */
function noti(
  id: string,
  minutosAtras: number,
  extra: Partial<AppNotification> = {},
): AppNotification {
  return {
    id,
    user_id: "u1",
    title: "Status da demanda atualizado",
    message: "Demanda X agora está em desenvolvimento",
    type: "status_change",
    link_url: "/demandas/d1",
    read: false,
    created_at: new Date(BASE - minutosAtras * 60_000).toISOString(),
    ...extra,
  } as AppNotification;
}

describe("agruparNotificacoes", () => {
  it("junta mudanças de status seguidas da mesma demanda", () => {
    const grupos = agruparNotificacoes([
      noti("a", 0),
      noti("b", 5),
      noti("c", 10),
      noti("d", 15),
      noti("e", 20),
    ]);

    expect(grupos).toHaveLength(1);
    expect(grupos[0].quantidade).toBe(5);
    expect(grupos[0].naoLidas).toBe(5);
    // O representante é o mais recente: é ele que diz o estado atual.
    expect(grupos[0].representante.id).toBe("a");
    expect(grupos[0].ids).toEqual(["a", "b", "c", "d", "e"]);
  });

  it("não junta demandas diferentes", () => {
    const grupos = agruparNotificacoes([
      noti("a", 0),
      noti("b", 5, { link_url: "/demandas/d2" }),
    ]);
    expect(grupos).toHaveLength(2);
  });

  it("não junta naturezas diferentes na mesma demanda", () => {
    const grupos = agruparNotificacoes([
      noti("a", 0, { type: "assigned" }),
      noti("b", 5, { type: "status_change" }),
    ]);
    expect(grupos).toHaveLength(2);
  });

  it("não junta avisos sem destino", () => {
    const grupos = agruparNotificacoes([
      noti("a", 0, { link_url: null, type: "system" }),
      noti("b", 1, { link_url: null, type: "system" }),
    ]);
    expect(grupos).toHaveLength(2);
  });

  it("quebra o grupo quando o intervalo passa da janela", () => {
    const grupos = agruparNotificacoes([noti("a", 0), noti("b", 60 * 7)]);
    expect(grupos).toHaveLength(2);
  });

  it("encadeia: a janela é medida contra a última absorvida, não contra o topo", () => {
    // 0h, 5h, 10h, 15h. Medindo sempre contra o topo, tudo além de 6h cairia
    // fora. Medindo em cadeia, é uma sequência contínua de trabalho — que é
    // como a pessoa a viveu.
    const grupos = agruparNotificacoes([
      noti("a", 0),
      noti("b", 60 * 5),
      noti("c", 60 * 10),
      noti("d", 60 * 15),
    ]);
    expect(grupos).toHaveLength(1);
    expect(grupos[0].quantidade).toBe(4);
  });

  it("preserva a ordem cronológica: nunca reordena a lista", () => {
    const grupos = agruparNotificacoes([
      noti("a", 0),
      noti("b", 5, { link_url: "/demandas/d2" }),
      noti("c", 10),
    ]);
    // A e C são da mesma demanda mas não são vizinhas — juntá-las moveria uma
    // das duas no tempo. Ficam separadas, na ordem em que chegaram.
    expect(grupos.map((g) => g.id)).toEqual(["a", "b", "c"]);
  });

  it("conta só as não lidas do grupo", () => {
    const grupos = agruparNotificacoes([
      noti("a", 0),
      noti("b", 5, { read: true }),
      noti("c", 10, { read: true }),
    ]);
    expect(grupos).toHaveLength(1);
    expect(grupos[0].quantidade).toBe(3);
    expect(grupos[0].naoLidas).toBe(1);
  });

  it("lista vazia devolve nenhum grupo", () => {
    expect(agruparNotificacoes([])).toEqual([]);
  });
});
