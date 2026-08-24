import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { formatarData, percentualDeAlcance } from "./relatorios-service";
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
}

/**
 * Exporta o Relatório Executivo de Apuração em formato PDF oficial paginado.
 */
export function exportarPdfExecutivo(dados: DadosRelatorioExecutivo) {
  const { resultado, pessoas, atividades, pendencias, geradoPorEmail, observacoes } = dados;
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
  doc.roundedRect(14, y, 182, 22, 2, 2, "F");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(...azulEscuro);
  doc.text(`Ciclo: ${resultado.ciclo_rotulo || "Período Corrente"}`, 18, y + 8);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(...cinzaEscuro);
  const inicioFmt = resultado.inicio ? formatarData(resultado.inicio) : "—";
  const fimFmt = resultado.fim ? formatarData(resultado.fim) : "—";
  doc.text(`Período: ${inicioFmt} a ${fimFmt}`, 18, y + 15);

  const statusTexto = (resultado.situacao || "EM_APURACAO").toUpperCase();
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...azulPrimario);
  doc.text(`Status: ${statusTexto}`, 140, y + 11);

  y += 28;

  // Seção: Resumo Executivo da Meta
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.setTextColor(...azulEscuro);
  doc.text("1. RESUMO EXECUTIVO DO CICLO", 14, y);
  y += 6;

  const colW = 43;
  const kpis = [
    { label: "Meta da Equipe", val: `${resultado.meta_pontos ?? 800} pts` },
    { label: "Pontos Realizados", val: `${resultado.pontos ?? 0} pts` },
    { label: "% Atingimento", val: formatarPercentual(resultado.percentual) },
    {
      label: "Valor Total (R$)",
      val: resultado.faixa_indefinida
        ? "Faixa Indefinida"
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

  const linhasEquipe = pessoas.map((p) => [
    p.pessoa_nome || p.pessoa_email || "—",
    p.entregas.toString(),
    `${p.facil} / ${p.media} / ${p.dificil}`,
    `${p.pontos} pts`,
    formatarPercentual(percentualDeAlcance(p.pontos, resultado.meta_pontos || 800)),
    resultado.faixa_indefinida
      ? "Indefinida"
      : resultado.valor_reais !== null
      ? formatarReais(Math.round((p.pontos / (resultado.pontos || 1)) * (resultado.valor_reais || 0)))
      : "—",
  ]);

  autoTable(doc, {
    startY: y,
    head: [["Desenvolvedor", "Demandas", "Fácil / Médio / Difícil", "Pontos", "% Meta", "Valor (R$)"]],
    body: linhasEquipe,
    theme: "striped",
    headStyles: { fillColor: azulEscuro, textColor: 255, fontSize: 9, fontStyle: "bold" },
    bodyStyles: { fontSize: 8.5, textColor: [30, 41, 59] },
    columnStyles: {
      0: { cellWidth: 50 },
      1: { halign: "center" },
      2: { halign: "center" },
      3: { halign: "right", fontStyle: "bold" },
      4: { halign: "right" },
      5: { halign: "right", fontStyle: "bold" },
    },
    margin: { left: 14, right: 14 },
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  y = (doc as any).lastAutoTable.finalY + 10;

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
    atv.sistema_slug || "—",
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

  doc.text(`Solicitado / Exportado por: ${geradoPorEmail || "Sistema Automatizado"}`, 14, y);
  y += 4;
  doc.text(`Regra Financeira: Resolução 800pts = 100% Meta Equipe`, 14, y);
  y += 4;
  if (observacoes) {
    doc.text(`Observações / Histórico: ${observacoes}`, 14, y);
    y += 5;
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
