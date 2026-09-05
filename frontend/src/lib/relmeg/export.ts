import * as XLSX from "xlsx";
import { saveAs } from "file-saver";

export type LinhaExportavel = Record<string, unknown>;

export function csvDeLinhas(linhas: LinhaExportavel[]): string {
  const colunas: string[] = [];
  for (const linha of linhas) {
    for (const chave of Object.keys(linha)) {
      if (!colunas.includes(chave)) colunas.push(chave);
    }
  }
  if (colunas.length === 0) return "";

  const escapar = (valor: string) =>
    /[";\r\n]/.test(valor) ? `"${valor.replace(/"/g, '""')}"` : valor;

  const cabecalho = colunas.map((c) => escapar(c)).join(";");
  const linhasCsv = linhas.map((linha) =>
    colunas
      .map((c) => {
        const v = linha[c];
        if (v === undefined || v === null) return "";
        if (typeof v === "object") return escapar(JSON.stringify(v));
        return escapar(String(v));
      })
      .join(";"),
  );

  return [cabecalho, ...linhasCsv].join("\r\n");
}

export function exportarCSV(linhas: LinhaExportavel[], nomeArquivo?: string) {
  const nome = (nomeArquivo || `relmeg-${Date.now()}`).replace(/\.[^.]+$/, "") + ".csv";
  const blob = new Blob(["\uFEFF" + csvDeLinhas(linhas)], { type: "text/csv;charset=utf-8;" });
  saveAs(blob, nome);
}

export function exportarXLSX(linhas: LinhaExportavel[], nomeArquivo?: string) {
  const nome = (nomeArquivo || `relmeg-${Date.now()}`).replace(/\.[^.]+$/, "") + ".xlsx";
  const planilha = XLSX.utils.json_to_sheet(linhas);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, planilha, "RelMeg");
  XLSX.writeFile(workbook, nome);
}

export function exportarJSON(linhas: LinhaExportavel[], nomeArquivo?: string) {
  const nome = (nomeArquivo || `relmeg-${Date.now()}`).replace(/\.[^.]+$/, "") + ".json";
  const blob = new Blob([JSON.stringify(linhas, null, 2)], { type: "application/json" });
  saveAs(blob, nome);
}