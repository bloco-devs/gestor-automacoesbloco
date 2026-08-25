import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { formatarData, percentualDeAlcance } from "./relatorios-service";
import { nomeDoSistemaPeloSlug } from "@/domain/demand";
import { formatarReais, formatarPercentual, type ResultadoDoCiclo } from "./apuracao-data";
import type { LinhaDaApuracao, LinhaDeImplementacao } from "./relatorios-data";

export interface DadosRelatorioExecutivo {
  resultado: ResultadoDoCiclo;
  pessoas: LinhaDaApuracao[];
  atividades: LinhaDeImplementacao[];
  pendencias?: {
    concluidas_no_ciclo: number;
    elegiveis: number;
    sem_fechamento: number;
    sem_classificacao: number;
    sem_data_confiavel: number;
  } | null;
  geradoPorEmail?: string;
  observacoes?: string | null;
  /**
   * Dados de auditoria do ciclo. Opcional porque exigem capacidade de
   * remuneração — quem tem só `relatorios.ver` gera o PDF sem eles, e o
   * documento diz que não os obteve em vez de fingir que não existem.
   */
  ciclo?: {
    referencia?: string | null;
    fechado_em?: string | null;
    fechado_por_email?: string | null;
  } | null;
}

/**
 * O último dia que ENTRA no ciclo, para impressão.
 *
 * `resultado.fim` é o limite EXCLUSIVO: para o ciclo que termina em 19/09, o
 * valor é 20/09 00:00. Imprimir esse valor cru dizia "Período: 20/08 a 20/09"
 * — um dia a mais, num documento que vai para a Diretoria, e que sugere que
 * uma entrega do dia 20 teria contado. Não teria.
 */
function fimParaImpressao(fimIso: string | null): string {
  if (!fimIso) return "—";
  return formatarData(new Date(new Date(fimIso).getTime() - 1000).toISOString());
}

/**
 * Exporta o Relatório Executivo de Apuração em formato PDF oficial paginado.
 */
export function exportarPdfExecutivo(dados: DadosRelatorioExecutivo) {
  const { resultado, pessoas, atividades, pendencias, geradoPorEmail, observacoes, ciclo } = dados;

  /**
   * A meta vem do ciclo. Sem valor, o PDF NÃO chuta 800.
   *
   * Havia `?? 800` em três lugares. Parece inofensivo — a meta é 800 hoje —
   * mas 800 é configuração de um ciclo, alterável pelo RH na tela de Gestão de
   * Ciclos. Um PDF que assume 800 quando o dado falta imprime um percentual
   * calculado sobre uma meta que talvez não seja a daquele ciclo, e não há
   * como quem lê perceber.
   */
  const meta = resultado.meta_pontos;
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });

  const azulEscuro: [number, number, number] = [15, 23, 42]; // #0f172a
  const azulPrimario: [number, number, number] = [37, 99, 235]; // #2563eb
  const cinzaEscuro: [number, number, number] = [71, 85, 105]; // #475569
  const cinzaClaro: [number, number, number] = [241, 245, 249]; // #f1f5f9
  const vermelhoAviso: [number, number, number] = [225, 29, 72]; // #e11d48

  let y = 15;

  // Cabeçalho Principal
  doc.setFillColor(...azulEscuro);
  doc.rect(0, 0, 210, 28, "F");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.setTextColor(255, 255, 255);
  doc.text("GRUPO BLOCO", 14, 12);

  doc.setFontSize(11);
  doc.setFont("helvetica", "normal");
  doc.text("RELATÓRIO DE APURAÇÃO DE REMUNERAÇÃO VARIÁVEL", 14, 19);

  doc.setFontSize(9);
  doc.setTextColor(203, 213, 225);
  const dataEmissao = new Date().toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" });
  doc.text(`Emitido em: ${dataEmissao}`, 140, 19);

  y = 35;

  // Card do Ciclo
  doc.setFillColor(...cinzaClaro);
  // Alto o suficiente para a linha da referência da folha caber dentro.
  doc.roundedRect(14, y, 182, 27, 2, 2, "F");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(...azulEscuro);
  doc.text(`Ciclo: ${resultado.ciclo_rotulo || "Período Corrente"}`, 18, y + 8);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(...cinzaEscuro);
  const inicioFmt = resultado.inicio ? formatarData(resultado.inicio) : "—";
  const fimFmt = fimParaImpressao(resultado.fim);
  doc.text(`Produção considerada: ${inicioFmt} a ${fimFmt}`, 18, y + 15);

  // A folha de destino, separada do período de produção. A folha de setembro
  // remunera trabalho de agosto e setembro; juntar as duas informações numa
  // linha só foi a origem da confusão sobre "a regra da empresa ser 20 a 19".
  if (ciclo?.referencia) {
    doc.text(
      `Referência da folha: ${ciclo.referencia.slice(5, 7)}/${ciclo.referencia.slice(0, 4)}`,
      18,
      y + 21,
    );
  }

  const statusTexto = (resultado.situacao || "EM_APURACAO").toUpperCase();
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...azulPrimario);
  doc.text(`Status: ${statusTexto}`, 140, y + 11);

  y += 33;

  // Seção: Resumo Executivo da Meta
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.setTextColor(...azulEscuro);
  doc.text("1. RESUMO EXECUTIVO DO CICLO", 14, y);
  y += 6;

  const colW = 43;
  const kpis = [
    { label: "Meta da Equipe", val: meta ? `${meta} pts` : "não informada" },
    { label: "Pontos Realizados", val: `${resultado.pontos ?? 0} pts` },
    { label: "% Atingimento", val: formatarPercentual(resultado.percentual) },
    {
      label: "Valor da Equipe (R$)",
      // Dizia "Faixa Indefinida". O texto oficial acordado é este, e a
      // diferença não é estética: "indefinida" pode ser lido como falha do
      // sistema, quando o que existe é uma faixa que o RH ainda não definiu.
      val: resultado.faixa_indefinida
        ? "não definido"
        : resultado.valor_reais !== null
        ? formatarReais(resultado.valor_reais)
        : "—",
    },
  ];

  kpis.forEach((kpi, idx) => {
    const x = 14 + idx * (colW + 3);
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(x, y, colW, 16, 1, 1, "FD");

    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(...cinzaEscuro);
    doc.text(kpi.label, x + 3, y + 5);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(...azulEscuro);
    doc.text(kpi.val, x + 3, y + 12);
  });

  y += 22;

  // Seção: Tabela Comparativa da Equipe
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.setTextColor(...azulEscuro);
  doc.text("2. DESEMPENHO DA EQUIPE", 14, y);
  y += 4;

  /**
   * SEM COLUNA DE VALOR POR PESSOA — e esta é a correção mais importante
   * deste arquivo.
   *
   * A versão anterior imprimia, para cada desenvolvedor:
   *
   *   formatarReais(Math.round((p.pontos / resultado.pontos) * resultado.valor_reais))
   *
   * ou seja, rateava o dinheiro da equipe na proporção dos pontos. Se a equipe
   * batesse R$ 1.200 e alguém tivesse 60% dos pontos, o documento oficial
   * afirmava que essa pessoa receberia R$ 720.
   *
   * Essa regra NÃO EXISTE. As faixas cadastradas (R$ 800 / 1.000 / 1.200)
   * são o resultado da EQUIPE. Se esse valor é de cada um, se é dividido, ou
   * se segue outro modelo, é decisão do RH — e até hoje ela não foi tomada.
   * Um PDF assinado pelo sistema, entregue à Diretoria, com um número
   * individual derivado de uma regra inventada, é o pior lugar possível para
   * um palpite: ele vira base de conversa sobre o salário de alguém.
   *
   * No lugar entra o que é medido de verdade: quanto cada pessoa produziu, e
   * que fração do total da equipe isso representa. Quem for distribuir decide
   * com informação real, em vez de herdar uma conta que ninguém autorizou.
   */
  const linhasEquipe = pessoas.map((p) => [
    p.pessoa_nome || p.pessoa_email || "—",
    p.entregas.toString(),
    `${p.facil} / ${p.media} / ${p.dificil}`,
    `${p.pontos} pts`,
    // Fração da produção da equipe. Não é dinheiro, e o cabeçalho diz isso.
    resultado.pontos > 0 ? `${Math.round((p.pontos / resultado.pontos) * 100)}%` : "—",
    meta ? formatarPercentual(percentualDeAlcance(p.pontos, meta)) : "—",
  ]);

  autoTable(doc, {
    startY: y,
    head: [
      [
        "Desenvolvedor",
        "Demandas",
        "Fácil / Médio / Difícil",
        "Pontos",
        "% da produção",
        "% da meta da equipe",
      ],
    ],
    body: linhasEquipe,
    theme: "striped",
    headStyles: { fillColor: azulEscuro, textColor: 255, fontSize: 9, fontStyle: "bold" },
    bodyStyles: { fontSize: 8.5, textColor: [30, 41, 59] },
    columnStyles: {
      0: { cellWidth: 48 },
      1: { halign: "center" },
      2: { halign: "center" },
      3: { halign: "right", fontStyle: "bold" },
      4: { halign: "right" },
      5: { halign: "right" },
    },
    margin: { left: 14, right: 14 },
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  y = (doc as any).lastAutoTable.finalY + 5;

  // A nota que impede a leitura errada da tabela acima. Sem ela, quem vê
  // "60% da produção" ao lado de "R$ 1.200 da equipe" faz a multiplicação
  // sozinho — que é exatamente a conta que o sistema deixou de fazer.
  doc.setFont("helvetica", "italic");
  doc.setFontSize(7.5);
  doc.setTextColor(...cinzaEscuro);
  doc.text(
    "A faixa de remuneração é apurada sobre o resultado da equipe. A regra de distribuição individual",
    14,
    y,
  );
  doc.text("não foi definida pelo RH, por isso este relatório não atribui valor por pessoa.", 14, y + 3.5);

  y += 12;

  // Seção: Pendências e Alertas
  if (pendencias) {
    if (y > 240) {
      doc.addPage();
      y = 20;
    }

    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.setTextColor(...azulEscuro);
    doc.text("3. PENDÊNCIAS E DIAGNÓSTICO DO CICLO", 14, y);
    y += 6;

    const temPendencias =
      pendencias.sem_fechamento > 0 ||
      pendencias.sem_classificacao > 0 ||
      pendencias.sem_data_confiavel > 0 ||
      resultado.faixa_indefinida;

    doc.setFillColor(temPendencias ? 255 : 240, temPendencias ? 241 : 253, temPendencias ? 242 : 244);
    doc.roundedRect(14, y, 182, 16, 2, 2, "F");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(temPendencias ? vermelhoAviso[0] : 22, temPendencias ? vermelhoAviso[1] : 101, temPendencias ? vermelhoAviso[2] : 52);

    const txtPend = `Elegíveis: ${pendencias.elegiveis} de ${pendencias.concluidas_no_ciclo} entregas | Sem Fechamento: ${pendencias.sem_fechamento} | Sem Classificação: ${pendencias.sem_classificacao}`;
    doc.text(txtPend, 18, y + 10);

    y += 22;
  }

  // Seção: Atividades Consideradas
  if (y > 220) {
    doc.addPage();
    y = 20;
  }

  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.setTextColor(...azulEscuro);
  doc.text("4. ATIVIDADES DA EQUIPE NO CICLO", 14, y);
  y += 4;

  const linhasAtividades = atividades.map((atv) => [
    atv.ticket_code,
    atv.titulo.length > 40 ? atv.titulo.substring(0, 37) + "..." : atv.titulo,
    nomeDoSistemaPeloSlug(atv.sistema_slug) || atv.sistema_slug || "—",
    atv.responsavel_nome || "—",
    formatarData(atv.concluida_em),
    atv.classificacao_rotulo || "Não classificada",
    atv.pontos !== null ? `${atv.pontos} pts` : "—",
    atv.autoclassificada ? "Sim (Auto)" : "Não",
  ]);

  autoTable(doc, {
    startY: y,
    head: [["Código", "Título da Demanda", "Sistema", "Responsável", "Conclusão", "Classificação", "Pontos", "Autoclass."]],
    body: linhasAtividades,
    theme: "grid",
    headStyles: { fillColor: cinzaEscuro, textColor: 255, fontSize: 8, fontStyle: "bold" },
    bodyStyles: { fontSize: 7.5, textColor: [51, 65, 85] },
    columnStyles: {
      0: { cellWidth: 22 },
      1: { cellWidth: 50 },
      2: { cellWidth: 24 },
      3: { cellWidth: 28 },
      4: { cellWidth: 20 },
      5: { cellWidth: 22 },
      6: { cellWidth: 14, halign: "right" },
      7: { cellWidth: 14, halign: "center" },
    },
    margin: { left: 14, right: 14 },
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  y = (doc as any).lastAutoTable.finalY + 10;

  // Seção: Auditoria
  if (y > 250) {
    doc.addPage();
    y = 20;
  }

  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(...azulEscuro);
  doc.text("5. TRILHA DE AUDITORIA", 14, y);
  y += 5;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(...cinzaEscuro);

  doc.text(`Gerado por: ${geradoPorEmail || "Sistema Automatizado"}`, 14, y);
  y += 4;
  doc.text(`Gerado em: ${dataEmissao}`, 14, y);
  y += 4;

  // A meta do ciclo, não uma constante. Dizia "800pts" em texto fixo, o que
  // continuaria dizendo 800 depois de o RH mudar a meta na tela de ciclos.
  doc.text(
    meta
      ? `Regra: ${meta} pontos = 100% da meta da equipe. Escala Fácil 50 / Médio 100 / Difícil 200.`
      : "Regra: meta do ciclo não informada.",
    14,
    y,
  );
  y += 4;

  // FECHAMENTO E REABERTURA. Um resultado congelado sem dizer quem congelou e
  // quando não é auditável — é só um número que alguém afirma ser definitivo.
  if (resultado.congelado) {
    doc.text(
      `Ciclo fechado por ${ciclo?.fechado_por_email ?? "—"} em ${
        ciclo?.fechado_em
          ? new Date(ciclo.fechado_em).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" })
          : "—"
      }.`,
      14,
      y,
    );
    y += 4;
    doc.text(
      "Os números acima vêm do resultado congelado no fechamento e não mudam com alterações posteriores nas demandas.",
      14,
      y,
    );
    y += 4;
  } else {
    doc.text(
      "Ciclo em apuração: os números refletem a situação neste momento e ainda podem mudar.",
      14,
      y,
    );
    y += 4;
  }

  /**
   * O histórico de reaberturas mora em `relatorio_ciclo.observacoes` — é lá
   * que `relatorio_reabrir_ciclo` grava motivo, autor e data, em linhas
   * acumuladas. Era impresso como uma linha só, que estourava a margem e
   * cortava justamente o motivo. Agora quebra e ocupa o espaço que precisar.
   */
  if (observacoes && observacoes.trim()) {
    y += 2;
    doc.setFont("helvetica", "bold");
    doc.text("Histórico do ciclo (fechamentos e reaberturas):", 14, y);
    y += 4;
    doc.setFont("helvetica", "normal");
    for (const linha of doc.splitTextToSize(observacoes.trim(), 182) as string[]) {
      if (y > 275) {
        doc.addPage();
        y = 20;
      }
      doc.text(linha, 14, y);
      y += 4;
    }
  }

  if (!ciclo) {
    doc.setFont("helvetica", "italic");
    doc.text(
      "Dados de fechamento não incluídos: exigem capacidade de remuneração e não foram obtidos por quem gerou este relatório.",
      14,
      y,
    );
    y += 4;
  }

  // Rodapé em todas as páginas
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const pageCount = (doc as any).internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(148, 163, 184);

    doc.line(14, 282, 196, 282);
    doc.text(`Grupo Bloco — Módulo de Remuneração por Performance`, 14, 287);
    doc.text(`Página ${i} de ${pageCount}`, 175, 287);
  }

  const nomeArquivo = `relatorio-executivo-${(resultado.ciclo_rotulo || "ciclo").replace("/", "-")}.pdf`;
  doc.save(nomeArquivo);
}

/**
 * Exporta o Relatório Técnico por Sistema em PDF.
 */
export function exportarPdfTecnicoPorSistema(
  sistemaSlug: string,
  inicio: Date,
  fim: Date,
  atividades: LinhaDeImplementacao[]
) {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const azulEscuro: [number, number, number] = [15, 23, 42];
  const cinzaEscuro: [number, number, number] = [71, 85, 105];

  doc.setFillColor(...azulEscuro);
  doc.rect(0, 0, 210, 24, "F");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.setTextColor(255, 255, 255);
  doc.text(`RELATÓRIO TÉCNICO DE IMPLEMENTAÇÕES — ${sistemaSlug.toUpperCase()}`, 14, 15);

  let y = 32;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(...cinzaEscuro);
  doc.text(`Período: ${formatarData(inicio.toISOString())} a ${formatarData(fim.toISOString())}`, 14, y);
  doc.text(`Total de Implementações: ${atividades.length}`, 140, y);

  y += 8;

  const linhas = atividades.map((a) => [
    a.ticket_code,
    a.titulo,
    a.responsavel_nome || "—",
    formatarData(a.concluida_em),
    a.classificacao_rotulo || "Não classificada",
    a.pontos !== null ? `${a.pontos} pts` : "—",
  ]);

  autoTable(doc, {
    startY: y,
    head: [["Código", "Título / Funcionalidade", "Desenvolvedor", "Conclusão", "Classificação", "Pontos"]],
    body: linhas,
    theme: "striped",
    headStyles: { fillColor: azulEscuro, textColor: 255, fontSize: 8.5 },
    bodyStyles: { fontSize: 8, textColor: [30, 41, 59] },
    columnStyles: {
      0: { cellWidth: 24 },
      1: { cellWidth: 70 },
      2: { cellWidth: 35 },
      3: { cellWidth: 22 },
      4: { cellWidth: 25 },
      5: { cellWidth: 16, halign: "right" },
    },
    margin: { left: 14, right: 14 },
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const pageCount = (doc as any).internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(148, 163, 184);
    doc.text(`Grupo Bloco — Relatório Técnico (${sistemaSlug})`, 14, 287);
    doc.text(`Página ${i} de ${pageCount}`, 175, 287);
  }

  doc.save(`relatorio-tecnico-${sistemaSlug}.pdf`);
}
