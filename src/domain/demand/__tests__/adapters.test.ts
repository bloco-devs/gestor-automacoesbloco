import { describe, it, expect } from "vitest";
import type { AtividadeCard, AtividadeColuna } from "@/lib/atividades";
import type { Demand } from "@/modules/demands/types";
import {
  fromAtividades,
  fromDemands,
  agrupar,
  aplicarFila,
  buscar,
  calcularRisco,
  contarFilas,
  ordenarPorAtencao,
  resumir,
  semelhantes,
  sinaisUteis,
  type Demanda,
} from "@/domain/demand";

/**
 * O que estes testes protegem
 *
 * A migração de `atividades_cards` para `demands` acontece trocando o mapper
 * que alimenta a tela. Isso só é seguro se os dois produzirem o MESMO contrato.
 * Aqui garantimos exatamente isso: mesma forma de saída, mesmas regras de
 * risco, e as capacidades declarando honestamente o que cada fonte sabe.
 *
 * `agora` é injetado em todos os casos para que o resultado não dependa de
 * quando o teste roda.
 */

const AGORA = new Date("2026-06-15T12:00:00Z").getTime();
const DIA = 24 * 60 * 60 * 1000;
const emDias = (n: number) => new Date(AGORA + n * DIA).toISOString();

// ---------------------------------------------------------------------------

function coluna(id: string, nome: string, ordem: number): AtividadeColuna {
  return { id, boardId: "b1", nome, ordem, wipLimit: null, arquivada: false } as AtividadeColuna;
}

function card(over: Partial<AtividadeCard> = {}): AtividadeCard {
  return {
    id: "11111111-1111-1111-1111-111111111111",
    colunaId: "c2",
    boardId: "b1",
    titulo: "Exportação de vendas falha em volume alto",
    descricao: "Trava ao exportar o mês inteiro",
    responsavelId: null,
    responsavelIds: [],
    responsavelPersonaIds: [],
    solucaoId: null,
    ordem: 0,
    checklist: [],
    links: [],
    createdBy: null,
    createdAt: emDias(-20),
    updatedAt: emDias(-2),
    dataEntrega: null,
    concluido: false,
    dataConclusao: null,
    coverCor: null,
    prioridade: "alta",
    labelIds: [],
    ...over,
  } as AtividadeCard;
}

function demand(over: Partial<Demand> = {}): Demand {
  return {
    id: "22222222-2222-2222-2222-222222222222",
    title: "Exportação de vendas falha em volume alto",
    description: "Trava ao exportar o mês inteiro",
    system_id: null,
    status: "em_desenvolvimento",
    priority: "alta",
    type: "bug",
    complexity: "media",
    assigned_to: null,
    created_by: "u1",
    created_at: emDias(-20),
    updated_at: emDias(-2),
    deleted_at: null,
    sla_due_at: null,
    sla_first_response_at: null,
    sla_status: "no_prazo",
    ...over,
  } as Demand;
}

const CTX_ATIVIDADES = {
  colunas: [coluna("c1", "Novo", 0), coluna("c2", "Em Desenvolvimento", 1), coluna("c3", "Pronto", 2)],
  labels: [],
  personas: [],
  responsaveis: [],
  solucoes: [],
  agora: AGORA,
};

// ---------------------------------------------------------------------------

describe("domain/demand — contrato compartilhado pelos dois adapters", () => {
  it("os dois adapters produzem exatamente as mesmas chaves", () => {
    const a = fromAtividades({ cards: [card()], ...CTX_ATIVIDADES }).demandas[0];
    const b = fromDemands({ demands: [demand()], agora: AGORA }).demandas[0];

    expect(Object.keys(a).sort()).toEqual(Object.keys(b).sort());
  });

  it("declara honestamente o que cada fonte suporta", () => {
    const ativ = fromAtividades({ cards: [], ...CTX_ATIVIDADES }).capacidades;
    const dem = fromDemands({ demands: [], agora: AGORA }).capacidades;

    // A fonte herdada do Trello não conhece SLA, tipo, complexidade nem IA.
    expect(ativ.sla).toBe(false);
    expect(ativ.ia).toBe(false);
    expect(ativ.tipo).toBe(false);
    expect(ativ.complexidade).toBe(false);
    // Mas conhece etiquetas do quadro, que a outra não tem.
    expect(ativ.etiquetas).toBe(true);

    expect(dem.sla).toBe(true);
    expect(dem.ia).toBe(true);
    expect(dem.tipo).toBe(true);
    expect(dem.auditoria).toBe(true);
    expect(dem.etiquetas).toBe(false);
  });

  it("nunca inventa dado que a fonte não tem", () => {
    const a = fromAtividades({ cards: [card()], ...CTX_ATIVIDADES }).demandas[0];
    expect(a.sla).toBeNull();
    expect(a.ia).toBeNull();
    expect(a.tipo).toBeNull();
    expect(a.complexidade).toBeNull();
  });

  it("normaliza prioridade: 'urgente' do quadro vira 'critica' do domínio", () => {
    const a = fromAtividades({ cards: [card({ prioridade: "urgente" })], ...CTX_ATIVIDADES }).demandas[0];
    expect(a.prioridade).toBe("critica");
  });
});

describe("domain/demand — categorização de status", () => {
  it("mapeia colunas de nome livre para as quatro categorias", () => {
    const cards = [
      card({ id: "a1", colunaId: "c1" }),
      card({ id: "a2", colunaId: "c2" }),
      card({ id: "a3", colunaId: "c3" }),
    ];
    const r = fromAtividades({ cards, ...CTX_ATIVIDADES }).demandas;
    expect(r.find((d) => d.id === "a1")!.status.categoria).toBe("aberta");
    expect(r.find((d) => d.id === "a2")!.status.categoria).toBe("andamento");
    expect(r.find((d) => d.id === "a3")!.status.categoria).toBe("concluida");
  });

  it("mapeia o enum de demands sem heurística", () => {
    const r = fromDemands({
      demands: [
        demand({ id: "d1", status: "backlog" }),
        demand({ id: "d2", status: "homologacao" }),
        demand({ id: "d3", status: "concluido" }),
      ],
      agora: AGORA,
    }).demandas;
    expect(r[0].status.categoria).toBe("aberta");
    // Homologação é espera: a bola está com outra pessoa.
    expect(r[1].status.categoria).toBe("espera");
    expect(r[2].status.categoria).toBe("concluida");
    expect(r[2].concluida).toBe(true);
  });
});

describe("domain/demand — risco tem a mesma regra nas duas fontes", () => {
  it("prazo vencido é 'atrasada' independente da origem", () => {
    const a = fromAtividades({ cards: [card({ dataEntrega: emDias(-3) })], ...CTX_ATIVIDADES }).demandas[0];
    const b = fromDemands({ demands: [demand({ sla_due_at: emDias(-3) })], agora: AGORA }).demandas[0];
    expect(a.risco).toBe("atrasada");
    expect(b.risco).toBe("atrasada");
  });

  it("SLA estourado tem precedência sobre atraso", () => {
    const r = calcularRisco(
      { concluida: false, prazo: emDias(-3), sla: { estado: "estourado", venceEm: emDias(-3), primeiraRespostaEm: null }, diasParada: 1 },
      AGORA,
    );
    expect(r).toBe("sla_estourado");
  });

  it("estagnação vira risco a partir de 14 dias", () => {
    const antes = fromAtividades({ cards: [card({ updatedAt: emDias(-13) })], ...CTX_ATIVIDADES }).demandas[0];
    const depois = fromAtividades({ cards: [card({ updatedAt: emDias(-15) })], ...CTX_ATIVIDADES }).demandas[0];
    expect(antes.risco).toBeNull();
    expect(depois.risco).toBe("parada");
  });

  it("demanda concluída nunca tem risco, mesmo com prazo vencido", () => {
    const a = fromAtividades({
      cards: [card({ concluido: true, dataEntrega: emDias(-30) })],
      ...CTX_ATIVIDADES,
    }).demandas[0];
    expect(a.risco).toBeNull();
  });
});

describe("domain/demand — IA só é marcada quando de fato atuou", () => {
  it("sem atuação, não há marca", () => {
    const d = fromDemands({ demands: [demand()], agora: AGORA }).demandas[0];
    expect(d.ia).toBeNull();
  });

  it("com resposta automática, guarda confiança e artigo", () => {
    const d = fromDemands({
      demands: [demand({ ai_auto_responded: true, ai_confidence_score: 0.87, ai_response_article_id: "art-1" })],
      agora: AGORA,
    }).demandas[0];
    expect(d.ia).toEqual({ respondeuSozinha: true, confianca: 0.87, artigoId: "art-1" });
  });
});

describe("domain/demand — fila × lente", () => {
  const universo: Demanda[] = fromAtividades({
    cards: [
      card({ id: "sem-dono", colunaId: "c1" }),
      card({ id: "atrasada", colunaId: "c2", dataEntrega: emDias(-5) }),
      card({ id: "parada", colunaId: "c2", updatedAt: emDias(-40) }),
      card({ id: "pronta", colunaId: "c3", concluido: true }),
    ],
    ...CTX_ATIVIDADES,
  }).demandas;

  it("cada fila recorta o que promete", () => {
    expect(aplicarFila(universo, "todas", null)).toHaveLength(4);
    expect(aplicarFila(universo, "concluidas", null).map((d) => d.id)).toEqual(["pronta"]);
    expect(aplicarFila(universo, "em_risco", null).map((d) => d.id).sort()).toEqual(["atrasada", "parada"]);
    // Todas estão sem responsável neste cenário, menos a concluída.
    expect(aplicarFila(universo, "sem_responsavel", null)).toHaveLength(3);
  });

  it("conta todas as filas de uma vez", () => {
    const c = contarFilas(universo, null);
    expect(c.todas).toBe(4);
    expect(c.em_risco).toBe(2);
    expect(c.concluidas).toBe(1);
  });

  it("as lentes mudam o agrupamento, nunca o conjunto", () => {
    const total = (grupos: { itens: unknown[] }[]) => grupos.reduce((n, g) => n + g.itens.length, 0);
    expect(total(agrupar(universo, "lista"))).toBe(4);
    expect(total(agrupar(universo, "sprint"))).toBe(4);
    expect(total(agrupar(universo, "timeline"))).toBe(4);
  });

  it("ordena por atenção: risco mais grave primeiro, concluída por último", () => {
    const ids = ordenarPorAtencao(universo).map((d) => d.id);
    expect(ids[0]).toBe("atrasada");
    expect(ids[ids.length - 1]).toBe("pronta");
  });

  it("busca ignora acento e caixa", () => {
    expect(buscar(universo, "EXPORTAÇÃO")).toHaveLength(4);
    expect(buscar(universo, "exportacao")).toHaveLength(4);
    expect(buscar(universo, "inexistente")).toHaveLength(0);
  });
});

describe("domain/demand — resumo alimenta cabeçalho e Copiloto", () => {
  it("conta, mede progresso e aponta o maior risco", () => {
    const universo = fromAtividades({
      cards: [
        card({ id: "a", colunaId: "c2", dataEntrega: emDias(-5) }),
        card({ id: "b", colunaId: "c3", concluido: true }),
      ],
      ...CTX_ATIVIDADES,
    }).demandas;

    const r = resumir(universo);
    expect(r.total).toBe(2);
    expect(r.concluidas).toBe(1);
    expect(r.progresso).toBe(50);
    expect(r.atrasadas).toBe(1);
    expect(r.maiorRisco?.id).toBe("a");
    expect(r.saudavel).toBe(false);
  });

  it("estado saudável é uma resposta, não um vazio", () => {
    const universo = fromAtividades({
      cards: [card({ id: "ok", colunaId: "c2", responsavelIds: ["u1"], updatedAt: emDias(-1) })],
      ...CTX_ATIVIDADES,
      responsaveis: [{ id: "u1", nome: "Liana", email: "l@x.com", role: "developer", avatarUrl: null }],
    }).demandas;

    const r = resumir(universo);
    expect(r.emRisco).toBe(0);
    expect(r.semResponsavel).toBe(0);
    expect(r.saudavel).toBe(true);
  });

  it("mede carga por pessoa", () => {
    const universo = fromAtividades({
      cards: [
        card({ id: "a", responsavelIds: ["u1"], dataEntrega: emDias(-2) }),
        card({ id: "b", responsavelIds: ["u1"] }),
        card({ id: "c", responsavelIds: ["u2"] }),
      ],
      ...CTX_ATIVIDADES,
      responsaveis: [
        { id: "u1", nome: "Liana", email: "l@x.com", role: "developer", avatarUrl: null },
        { id: "u2", nome: "Mariana", email: "m@x.com", role: "developer", avatarUrl: null },
      ],
    }).demandas;

    const carga = resumir(universo).carga;
    expect(carga[0].pessoa.nome).toBe("Liana");
    expect(carga[0].abertas).toBe(2);
    expect(carga[0].emRisco).toBe(1);
  });
});

describe("domain/demand — duplicidade", () => {
  it("aponta demandas com títulos sobrepostos", () => {
    const universo = fromAtividades({
      cards: [
        card({ id: "x", titulo: "Cadastrar fornecedores em lote" }),
        card({ id: "y", titulo: "Cadastrar novos fornecedores lote" }),
        card({ id: "z", titulo: "Ajustar régua de cobrança" }),
      ],
      ...CTX_ATIVIDADES,
    }).demandas;

    const achados = semelhantes(universo[0], universo);
    expect(achados.map((d) => d.id)).toEqual(["y"]);
  });
});

describe("domain/demand — duplicidade não pode dar falso positivo", () => {
  function comTitulo(id: string, titulo: string, descricao = ""): Demanda {
    return {
      id,
      referencia: `#${id}`,
      titulo,
      descricao,
      status: { id: "s", rotulo: "Em andamento", categoria: "andamento", ordem: 1 },
      prioridade: "media",
      tipo: null,
      complexidade: null,
      sistema: null,
      responsaveis: [],
      autor: null,
      criadaEm: "",
      atualizadaEm: "",
      diasParada: 0,
      prazo: null,
      sla: null,
      ia: null,
      progresso: null,
      comentarios: null,
      anexos: null,
      etiquetas: [],
      concluida: false,
      risco: null,
      fonte: "atividades",
    };
  }

  it("não casa por palavras que só existem na descrição", () => {
    // Caso real observado em produção: a descrição do primeiro citava "acessos"
    // e "onboarding", que aparecem no título do segundo — e eles foram
    // apontados como duplicados sem ter nada a ver.
    const alvo = comTitulo(
      "a",
      "[GO-11] ADR sobre papel engenheiro",
      "Decisao sobre o papel de engenheiro no sistema de acessos e onboarding de usuarios",
    );
    const outro = comTitulo("b", "[GO-10] Popular usuario_acessos + onboarding de acessos");
    expect(semelhantes(alvo, [alvo, outro])).toHaveLength(0);
  });

  it("não casa por prefixo de código do projeto", () => {
    const a = comTitulo("a", "[GO-11] Revisar contrato de fornecedor");
    const b = comTitulo("b", "[GO-12] Ajustar relatorio de vendas");
    expect(semelhantes(a, [a, b])).toHaveLength(0);
  });

  it("ainda encontra duplicata de verdade", () => {
    const a = comTitulo("a", "Cadastrar fornecedores em lote");
    const b = comTitulo("b", "Cadastrar novos fornecedores em lote");
    expect(semelhantes(a, [a, b]).map((d) => d.id)).toEqual(["b"]);
  });
});

describe("domain/demand — sinais úteis", () => {
  function comSinais(id: string, titulo: string, prioridade: "media" | "alta" | null): Demanda {
    return {
      id,
      referencia: `#${id}`,
      titulo,
      descricao: "",
      status: { id: "s", rotulo: "Em andamento", categoria: "andamento", ordem: 1 },
      prioridade,
      tipo: null,
      complexidade: null,
      sistema: null,
      responsaveis: [],
      autor: null,
      criadaEm: "",
      atualizadaEm: "",
      diasParada: 0,
      prazo: null,
      sla: null,
      ia: null,
      progresso: null,
      comentarios: null,
      anexos: null,
      etiquetas: [],
      concluida: false,
      risco: null,
      fonte: "atividades",
    };
  }

  it("esconde prioridade quando todas são iguais — 36 vezes 'Média' é textura", () => {
    const todas = [
      comSinais("a", "Primeira", "media"),
      comSinais("b", "Segunda", "media"),
      comSinais("c", "Terceira", "media"),
    ];
    expect(sinaisUteis(todas).prioridade).toBe(false);
  });

  it("mostra prioridade assim que ela passa a distinguir", () => {
    const mistas = [comSinais("a", "Primeira", "media"), comSinais("b", "Segunda", "alta")];
    expect(sinaisUteis(mistas).prioridade).toBe(true);
  });

  it("esconde o hash quando o título já traz um código da equipe", () => {
    const comCodigo = [
      comSinais("a", "[GO-11] ADR sobre papel engenheiro", "media"),
      comSinais("b", "[IN-05] Paginação nas queries", "media"),
    ];
    // Dois identificadores competindo é pior que um só.
    expect(sinaisUteis(comCodigo).referencia).toBe(false);
  });

  it("mantém o hash quando os títulos não têm código", () => {
    const semCodigo = [comSinais("a", "Revisar contrato", "media"), comSinais("b", "Ajustar relatório", "media")];
    expect(sinaisUteis(semCodigo).referencia).toBe(true);
  });

  it("não quebra com lista vazia", () => {
    expect(sinaisUteis([]).prioridade).toBe(false);
  });
});

/**
 * Grupos concluídos.
 *
 * Não é preferência visual: num quadro de 36 itens com 25 prontos, "Feito" é a
 * maior coluna e empurra o trabalho em curso para fora da tela. O domínio só
 * informa que o grupo está inteiro concluído; a lente decide o que fazer.
 */
describe("grupo concluído", () => {
  function comEstado(id: string, statusId: string, rotulo: string, concluida: boolean): Demanda {
    return {
      id,
      referencia: `#${id}`,
      titulo: `Demanda ${id}`,
      descricao: "",
      status: {
        id: statusId,
        rotulo,
        categoria: concluida ? "concluida" : "andamento",
        ordem: concluida ? 9 : 1,
      },
      prioridade: "media",
      tipo: null,
      complexidade: null,
      sistema: null,
      responsaveis: [],
      autor: null,
      criadaEm: "",
      atualizadaEm: "",
      diasParada: 0,
      prazo: null,
      sla: null,
      ia: null,
      progresso: null,
      comentarios: null,
      anexos: null,
      etiquetas: [],
      concluida,
      risco: null,
      fonte: "atividades",
    };
  }

  it("marca a coluna em que todas as demandas estão concluídas", () => {
    const grupos = agrupar(
      [
        comEstado("a", "andamento", "Em andamento", false),
        comEstado("b", "feito", "Feito", true),
        comEstado("c", "feito", "Feito", true),
      ],
      "board",
    );
    expect(grupos.find((g) => g.id === "feito")?.concluido).toBe(true);
    expect(grupos.find((g) => g.id === "andamento")?.concluido).toBe(false);
  });

  it("não marca coluna mista — uma demanda viva ali ainda pede atenção", () => {
    const grupos = agrupar(
      [comEstado("a", "revisao", "Revisão", true), comEstado("b", "revisao", "Revisão", false)],
      "board",
    );
    expect(grupos.find((g) => g.id === "revisao")?.concluido).toBe(false);
  });
});
