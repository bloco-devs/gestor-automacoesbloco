/**
 * Utilidades de exportação — CSV/impressão.
 * Não altera dados, apenas formata para download.
 */
function escape(value: unknown): string {
  if (value === null || value === undefined) return "";
  const str = String(value);
  if (/[",\n;]/.test(str)) return `"${str.replace(/"/g, '""')}"`;
  return str;
}

export function toCsv<T extends Record<string, unknown>>(rows: T[], columns?: Array<keyof T>): string {
  if (rows.length === 0) return "";
  const cols = (columns ?? (Object.keys(rows[0]) as Array<keyof T>)) as Array<keyof T>;
  const header = cols.map((c) => escape(String(c))).join(",");
  const body = rows
    .map((r) => cols.map((c) => escape(r[c])).join(","))
    .join("\n");
  return `${header}\n${body}`;
}

export function downloadCsv(filename: string, csv: string): void {
  const blob = new Blob([`\ufeff${csv}`], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function triggerPrint(): void {
  if (typeof window !== "undefined") window.print();
}
