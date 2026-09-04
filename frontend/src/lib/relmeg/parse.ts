import * as XLSX from "xlsx";
import { CAMPOS, normalizeKey, type Parlamentar } from "./types";

export type ParseResult = {
  rows: Parlamentar[];
  headers: string[];
  reconhecidos: string[];
  faltantes: string[];
};

const URL_RE = /(https?:\/\/\S+)/i;

function extrair(valor: string, link: string) {
  let numero = valor.trim();
  let ementa = "";
  let url = link.trim();
  if (!url) {
    const achado = numero.match(URL_RE);
    if (achado?.[1]) {
      url = achado[1];
      numero = numero.replace(achado[1], "").trim();
    }
  }
  const partes = numero.split(/\s*[|–—]\s*|\s+-\s+/);
  if (partes.length > 1) {
    numero = (partes[0] ?? "").trim();
    ementa = partes.slice(1).join(" — ").trim();
  }
  return { numero: numero.replace(/[|–—-]\s*$/, "").trim(), ementa, url };
}

export async function parseFile(file: File): Promise<ParseResult> {
  const buffer = await file.arrayBuffer();
  const wb = XLSX.read(buffer, { type: "array", raw: false });
  const firstName = wb.SheetNames[0];
  const sheet = firstName ? wb.Sheets[firstName] : undefined;
  if (!sheet) return { rows: [], headers: [], reconhecidos: [], faltantes: [] };
  const json = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: "" });
  const headers = json[0] ? Object.keys(json[0]) : [];

  const map = new Map<string, string>();
  for (const header of headers) {
    const norm = normalizeKey(header);
    const campo = CAMPOS.find((c) => c.aliases.includes(norm) || normalizeKey(c.label) === norm);
    if (campo && !map.has(campo.key)) map.set(campo.key, header);
  }

  const rows: Parlamentar[] = json
    .map((row, index) => {
      const get = (key: string) => {
        const header = map.get(key);
        return header ? String(row[header] ?? "").trim() : "";
      };
      const p1 = extrair(get("proposicao1"), get("link1"));
      const p2 = extrair(get("proposicao2"), get("link2"));
      const p3 = extrair(get("proposicao3"), get("link3"));
      const item: Parlamentar = {
        id: `${index}-${get("nome") || "sem-nome"}`,
        nome: get("nome"),
        partido: get("partido"),
        uf: get("uf").toUpperCase(),
        cargo: get("cargo"),
        interesse1: get("interesse1"),
        interesse2: get("interesse2"),
        contrario1: get("contrario1"),
        contrario2: get("contrario2"),
        setor1: get("setor1"),
        setor2: get("setor2"),
        setor3: get("setor3"),
        descricao: get("descricao"),
        proposicao1: p1.numero,
        ementa1: get("ementa1") || p1.ementa,
        link1: p1.url,
        proposicao2: p2.numero,
        ementa2: get("ementa2") || p2.ementa,
        link2: p2.url,
        proposicao3: p3.numero,
        ementa3: get("ementa3") || p3.ementa,
        link3: p3.url,
        anotacoes: get("anotacoes"),
      };
      return item;
    })
    .filter((p) => p.nome !== "");

  const reconhecidos = CAMPOS.filter((c) => map.has(c.key)).map((c) => c.label);
  const faltantes: string[] = []; // Removida a obrigatoriedade de colunas para nunca barrar a leitura

  return { rows, headers, reconhecidos, faltantes };
}

export function baixarModelo() {
  const ws = XLSX.utils.aoa_to_sheet([CAMPOS.map((c) => c.label)]);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Parlamentares");
  XLSX.writeFile(wb, "modelo-relmeg.xlsx");
}