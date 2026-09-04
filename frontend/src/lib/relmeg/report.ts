import type { Filters, Parlamentar } from "./types";
import { proposicoesDe, setoresDe, temasContrariosDe, temasInteresseDe } from "./types";

/* --------------------------------- Logo ---------------------------------- */

const LOGO_SVG = (cor: string) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" width="192" height="192">
  <path d="M4 34h40" stroke="${cor}" stroke-width="2.5" stroke-linecap="round" opacity="0.55"/>
  <path d="M6 30c0-4.4 4.9-8 11-8s11 3.6 11 8" stroke="${cor}" stroke-width="2.5" stroke-linecap="round" fill="none"/>
  <path d="M42 30c0-3.3-3.1-6-7-6s-7 2.7-7 6" stroke="${cor}" stroke-width="2.5" stroke-linecap="round" fill="none" opacity="0.65"/>
  <rect x="20" y="6" width="3" height="24" rx="1.5" fill="${cor}"/>
  <rect x="25.5" y="12" width="3" height="18" rx="1.5" fill="${cor}" opacity="0.7"/>
  <circle cx="21.5" cy="4" r="2.5" fill="${cor}"/>
  <circle cx="27" cy="10" r="2" fill="${cor}" opacity="0.7"/>
  <path d="M8 42h32" stroke="${cor}" stroke-width="2.5" stroke-linecap="round" opacity="0.3"/>
</svg>`;

export async function logoPng(cor = "#ffffff"): Promise<string> {
  const svg = LOGO_SVG(cor);
  const url = `data:image/svg+xml;base64,${btoa(unescape(encodeURIComponent(svg)))}`;
  const img = new Image();
  img.src = url;
  await img.decode();
  const canvas = document.createElement("canvas");
  canvas.width = 192;
  canvas.height = 192;
  const ctx = canvas.getContext("2d")!;
  ctx.drawImage(img, 0, 0, 192, 192);
  return canvas.toDataURL("image/png");
}

/* -------------------------------- Dados ---------------------------------- */

export type GraficoKey = "uf" | "partido" | "cargo" | "setor" | "interesse" | "contrario";

export const GRAFICOS: { key: GraficoKey; titulo: string }[] = [
  { key: "interesse", titulo: "Temas de Interesse" },
  { key: "contrario", titulo: "Temas Contrários" },
  { key: "uf", titulo: "Distribuição por UF" },
  { key: "partido", titulo: "Distribuição por Partido" },
  { key: "cargo", titulo: "Distribuição por Cargo" },
  { key: "setor", titulo: "Setores de Atuação" },
];

export const CAMPOS_FICHA: { key: string; label: string }[] = [
  { key: "identificacao", label: "Cargo, partido e UF" },
  { key: "interesse", label: "Temas de Interesse" },
  { key: "contrario", label: "Temas Contrários" },
  { key: "setores", label: "Setores" },
  { key: "descricao", label: "Breve descrição" },
  { key: "proposicoes", label: "Proposições (número, ementa e link)" },
  { key: "anotacoes", label: "Anotações internas" },
];

export type FichaConfig = {
  titulo: string;
  subtitulo: string;
  incluirCapa: boolean;
  incluirFiltros: boolean;
  incluirIndicadores: boolean;
  graficos: GraficoKey[];
  campos: string[];
  incluirPerfis: boolean;
  limitePerfis: number;
  cliente?: string;
  analise?: string;
};

export const FICHA_PADRAO: FichaConfig = {
  titulo: "Ficha de Estudo Parlamentar",
  subtitulo: "RelMeg — Inteligência Legislativa",
  incluirCapa: true,
  incluirFiltros: true,
  incluirIndicadores: true,
  graficos: ["interesse", "contrario", "uf", "partido"],
  campos: CAMPOS_FICHA.map((c) => c.key),
  incluirPerfis: true,
  limitePerfis: 50,
};

function valoresDe(data: Parlamentar[], key: GraficoKey): string[] {
  if (key === "uf") return data.map((p) => p.uf);
  if (key === "partido") return data.map((p) => p.partido);
  if (key === "cargo") return data.map((p) => p.cargo);
  if (key === "setor") return data.flatMap(setoresDe);
  if (key === "interesse") return data.flatMap(temasInteresseDe);
  return data.flatMap(temasContrariosDe);
}

export function contagem(data: Parlamentar[], key: GraficoKey, limite = 8) {
  const counts = new Map<string, number>();
  valoresDe(data, key)
    .map((v) => (v ?? "").trim())
    .filter(Boolean)
    .forEach((v) => counts.set(v, (counts.get(v) ?? 0) + 1));
  return [...counts.entries()]
    .map(([name, total]) => ({ name, total }))
    .sort((a, b) => b.total - a.total)
    .slice(0, limite);
}

export function indicadores(data: Parlamentar[]) {
  const top = (key: GraficoKey) => contagem(data, key, 1)[0];
  const apoio = top("interesse");
  const resist = top("contrario");
  const uf = top("uf");
  const partido = top("partido");
  return [
    { label: "Total de parlamentares", valor: String(data.length), nota: "registros filtrados" },
    { label: "Tema com maior apoio", valor: apoio?.name ?? "—", nota: apoio ? `${apoio.total} parlamentares` : "—" },
    {
      label: "Tema com maior resistência",
      valor: resist?.name ?? "—",
      nota: resist ? `${resist.total} parlamentares` : "—",
    },
    { label: "UF com maior representação", valor: uf?.name ?? "—", nota: uf ? `${uf.total} parlamentares` : "—" },
    {
      label: "Partido predominante",
      valor: partido?.name ?? "—",
      nota: partido ? `${partido.total} parlamentares` : "—",
    },
  ];
}

export const ROTULOS_FILTRO: Record<keyof Filters, string> = {
  busca: "Busca",
  partido: "Partido",
  uf: "UF",
  cargo: "Cargo",
  setor: "Setor",
  interesse: "Tema de Interesse",
  contrario: "Tema Contrário",
};

export function filtrosAtivos(filters: Filters) {
  return (Object.keys(ROTULOS_FILTRO) as (keyof Filters)[])
    .filter((k) => (filters[k] ?? "").trim())
    .map((k) => ({ label: ROTULOS_FILTRO[k], valor: filters[k] }));
}

export function dataHoje() {
  return new Date().toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" });
}

export function nomeArquivo(config: FichaConfig, ext: string) {
  const base = config.titulo
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .toLowerCase();
  return `${base || "ficha"}-${new Date().toISOString().slice(0, 10)}.${ext}`;
}

export function perfilLinhas(p: Parlamentar, campos: string[]) {
  const linhas: { rotulo: string; texto: string }[] = [];
  const add = (rotulo: string, texto: string) => {
    if (texto.trim()) linhas.push({ rotulo, texto });
  };
  if (campos.includes("identificacao")) {
    add(
      "Identificação",
      [p.cargo, [p.partido, p.uf].filter(Boolean).join("/")].filter(Boolean).join(" • "),
    );
  }
  if (campos.includes("interesse")) add("Temas de Interesse", temasInteresseDe(p).join(", "));
  if (campos.includes("contrario")) add("Temas Contrários", temasContrariosDe(p).join(", "));
  if (campos.includes("setores")) add("Setores", setoresDe(p).join(", "));
  if (campos.includes("descricao")) add("Breve descrição", p.descricao);
  if (campos.includes("proposicoes")) {
    const props = proposicoesDe(p)
      .map((x) => `• ${[x.numero, x.ementa].filter(Boolean).join(" — ")}${x.link ? ` (${x.link})` : ""}`)
      .join("\n");
    add("Proposições", props);
  }
  if (campos.includes("anotacoes")) add("Anotações internas", p.anotacoes);
  return linhas;
}

/* ---------------------------------- PDF ----------------------------------- */

const NAVY: [number, number, number] = [22, 33, 62];
const AZUL: [number, number, number] = [58, 110, 220];
const TEXTO: [number, number, number] = [28, 32, 42];
const CINZA: [number, number, number] = [96, 104, 120];
const VERDE: [number, number, number] = [24, 140, 110];
const VERMELHO: [number, number, number] = [200, 62, 62];

export async function gerarPdf(config: FichaConfig, data: Parlamentar[], filters: Filters) {
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const logo = await logoPng("#ffffff");
  const W = doc.internal.pageSize.getWidth();
  const H = doc.internal.pageSize.getHeight();
  const M = 40;
  let y = 0;
  let pagina = 0;

  const cabecalho = () => {
    doc.setFillColor(...NAVY);
    doc.rect(0, 0, W, 54, "F");
    doc.addImage(logo, "PNG", M, 13, 28, 28);
    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(13);
    doc.text("RelMeg", M + 36, 27);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(196, 208, 235);
    doc.text("Inteligência Legislativa", M + 36, 39);
    doc.setFontSize(8);
    doc.text(config.titulo, W - M, 33, { align: "right" });
    y = 84;
  };

  const rodape = () => {
    doc.setDrawColor(220, 224, 232);
    doc.line(M, H - 38, W - M, H - 38);
    doc.setFontSize(8);
    doc.setTextColor(...CINZA);
    doc.text(`${config.subtitulo} • ${dataHoje()}`, M, H - 24);
    doc.text(`Página ${pagina}`, W - M, H - 24, { align: "right" });
  };

  const novaPagina = () => {
    if (pagina > 0) rodape();
    doc.addPage();
    pagina += 1;
    cabecalho();
  };

  const espaco = (altura: number) => {
    if (y + altura > H - 56) novaPagina();
  };

  const titulo = (texto: string) => {
    espaco(40);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(13);
    doc.setTextColor(...NAVY);
    doc.text(texto, M, y);
    doc.setDrawColor(...AZUL);
    doc.setLineWidth(2);
    doc.line(M, y + 6, M + 34, y + 6);
    doc.setLineWidth(0.5);
    y += 24;
  };

  // Capa
  pagina = 1;
  if (config.incluirCapa) {
    doc.setFillColor(...NAVY);
    doc.rect(0, 0, W, H, "F");
    doc.addImage(logo, "PNG", M, 90, 64, 64);
    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(30);
    doc.text(doc.splitTextToSize(config.titulo, W - M * 2), M, 230);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(13);
    doc.setTextColor(186, 202, 236);
    doc.text(config.subtitulo, M, 280);
    doc.setDrawColor(...AZUL);
    doc.setLineWidth(3);
    doc.line(M, 300, M + 90, 300);
    doc.setLineWidth(0.5);
    doc.setFontSize(11);
    doc.setTextColor(226, 234, 250);
    doc.text(`${data.length} parlamentares no recorte`, M, 340);
    doc.text(dataHoje(), M, 360);
    novaPagina();
  } else {
    cabecalho();
  }

  // Cliente / Destinatário
  if (config.cliente?.trim()) {
    espaco(30);
    doc.setFillColor(244, 247, 252);
    doc.roundedRect(M, y - 14, W - M * 2, 24, 4, 4, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(...NAVY);
    doc.text(`Cliente / Destinatário: ${config.cliente}`, M + 10, y + 2);
    y += 24;
  }

  // Filtros
  if (config.incluirFiltros) {
    const ativos = filtrosAtivos(filters);
    titulo("Filtros aplicados");
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(...TEXTO);
    if (ativos.length === 0) {
      doc.text("Nenhum filtro aplicado — base completa.", M, y);
      y += 22;
    } else {
      ativos.forEach((f) => {
        espaco(18);
        doc.setTextColor(...CINZA);
        doc.text(`${f.label}:`, M, y);
        doc.setTextColor(...TEXTO);
        doc.text(f.valor, M + 110, y);
        y += 16;
      });
      y += 8;
    }
  }

  // Indicadores
  if (config.incluirIndicadores) {
    titulo("Indicadores");
    const cards = indicadores(data);
    const largura = (W - M * 2 - 12) / 2;
    cards.forEach((c, i) => {
      if (i % 2 === 0) espaco(64);
      const x = M + (i % 2) * (largura + 12);
      const linha = y;
      doc.setFillColor(244, 247, 252);
      doc.setDrawColor(224, 231, 242);
      doc.roundedRect(x, linha - 12, largura, 54, 6, 6, "FD");
      doc.setFontSize(8);
      doc.setTextColor(...CINZA);
      doc.text(c.label.toUpperCase(), x + 10, linha + 2);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(12);
      doc.setTextColor(...NAVY);
      doc.text(doc.splitTextToSize(c.valor, largura - 20)[0] ?? "—", x + 10, linha + 20);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.setTextColor(...CINZA);
      doc.text(c.nota, x + 10, linha + 34);
      if (i % 2 === 1) y += 66;
    });
    if (cards.length % 2 === 1) y += 66;
  }

  // Análise IA
  if (config.analise?.trim()) {
    titulo("Análise Executiva");
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(...TEXTO);
    const splitAnalise = doc.splitTextToSize(config.analise, W - M * 2);
    espaco(splitAnalise.length * 14);
    doc.text(splitAnalise, M, y);
    y += splitAnalise.length * 14 + 10;
  }

  // Gráficos (barras vetoriais)
  for (const key of config.graficos) {
    const info = GRAFICOS.find((g) => g.key === key);
    const dados = contagem(data, key);
    if (!info || dados.length === 0) continue;
    titulo(info.titulo);
    const max = Math.max(...dados.map((d) => d.total));
    const cor = key === "interesse" ? VERDE : key === "contrario" ? VERMELHO : AZUL;
    dados.forEach((d) => {
      espaco(24);
      doc.setFontSize(9);
      doc.setTextColor(...TEXTO);
      doc.text(doc.splitTextToSize(d.name, 150)[0] ?? "", M, y + 9);
      const base = M + 160;
      const total = W - M - base - 30;
      doc.setFillColor(236, 240, 247);
      doc.roundedRect(base, y, total, 12, 3, 3, "F");
      doc.setFillColor(...cor);
      doc.roundedRect(base, y, Math.max(3, (d.total / max) * total), 12, 3, 3, "F");
      doc.setTextColor(...CINZA);
      doc.text(String(d.total), W - M, y + 9, { align: "right" });
      y += 20;
    });
    y += 10;
  }

  // Perfis
  if (config.incluirPerfis && config.campos.length > 0) {
    const lista = data.slice(0, config.limitePerfis);
    titulo(`Fichas individuais (${lista.length})`);
    lista.forEach((p) => {
      const linhas = perfilLinhas(p, config.campos);
      espaco(60);
      doc.setFillColor(...NAVY);
      doc.roundedRect(M, y - 12, W - M * 2, 22, 4, 4, "F");
      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      doc.setTextColor(255, 255, 255);
      doc.text(p.nome || "Sem nome", M + 10, y + 3);
      y += 24;
      linhas.forEach((l) => {
        const texto = doc.splitTextToSize(l.texto, W - M * 2 - 120);
        espaco(14 + texto.length * 12);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(9);
        doc.setTextColor(...CINZA);
        doc.text(l.rotulo, M, y);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(...TEXTO);
        doc.text(texto, M + 116, y);
        y += Math.max(14, texto.length * 12) + 2;
      });
      y += 12;
    });
  }

  rodape();
  doc.save(nomeArquivo(config, "pdf"));
}

/* ---------------------------------- PPTX ---------------------------------- */

const HEX_NAVY = "16213E";
const HEX_AZUL = "3A6EDC";
const HEX_TEXTO = "1C202A";
const HEX_CINZA = "606878";

export async function gerarPptx(config: FichaConfig, data: Parlamentar[], filters: Filters) {
  const PptxGenJS = (await import("pptxgenjs")).default;
  const pptx = new PptxGenJS();
  pptx.layout = "LAYOUT_16x9";
  const logo = await logoPng("#ffffff");

  const novoSlide = (titulo?: string) => {
    const slide = pptx.addSlide();
    slide.background = { color: "FFFFFF" };
    slide.addShape(pptx.ShapeType.rect, { x: 0, y: 0, w: "100%", h: 0.62, fill: { color: HEX_NAVY } });
    slide.addImage({ data: logo, x: 0.35, y: 0.11, w: 0.4, h: 0.4 });
    slide.addText("RelMeg", { x: 0.85, y: 0.11, w: 3, h: 0.4, fontSize: 14, bold: true, color: "FFFFFF" });
    slide.addText(config.titulo, {
      x: 5.5, y: 0.11, w: 4.2, h: 0.4, fontSize: 10, color: "C4D0EB", align: "right",
    });
    if (titulo) {
      slide.addText(titulo, { x: 0.5, y: 0.85, w: 9, h: 0.5, fontSize: 24, bold: true, color: HEX_NAVY });
      slide.addShape(pptx.ShapeType.rect, { x: 0.5, y: 1.35, w: 0.7, h: 0.05, fill: { color: HEX_AZUL } });
    }
    return slide;
  };

  if (config.incluirCapa) {
    const capa = pptx.addSlide();
    capa.background = { color: HEX_NAVY };
    capa.addImage({ data: logo, x: 0.6, y: 0.7, w: 0.9, h: 0.9 });
    capa.addText(config.titulo, { x: 0.6, y: 1.9, w: 8.8, h: 1.1, fontSize: 34, bold: true, color: "FFFFFF" });
    capa.addText(config.subtitulo, { x: 0.6, y: 3.0, w: 8.8, h: 0.4, fontSize: 15, color: "BACAEC" });
    capa.addShape(pptx.ShapeType.rect, { x: 0.6, y: 3.5, w: 1.2, h: 0.06, fill: { color: HEX_AZUL } });
    
    // Injeta o cliente na capa do PPTX se ele existir
    if (config.cliente?.trim()) {
      capa.addText(`Cliente: ${config.cliente}`, { x: 0.6, y: 4.0, w: 8.8, h: 0.4, fontSize: 13, bold: true, color: "FFFFFF" });
    }

    capa.addText(`${data.length} parlamentares • ${dataHoje()}`, {
      x: 0.6, y: 4.5, w: 8.8, h: 0.4, fontSize: 12, color: "E2EAFA",
    });
  }

  // Slide de Análise Executiva
  if (config.analise?.trim()) {
    const slideAnalise = novoSlide("Análise Executiva");
    slideAnalise.addText(config.analise, {
      x: 0.6, y: 1.7, w: 8.8, h: 3.4, fontSize: 14, color: HEX_TEXTO, align: "left", valign: "top"
    });
  }

  if (config.incluirFiltros) {
    const slide = novoSlide("Filtros aplicados");
    const ativos = filtrosAtivos(filters);
    slide.addText(
      ativos.length
        ? ativos.map((f) => ({ text: `${f.label}: ${f.valor}`, options: { bullet: true, breakLine: true } }))
        : [{ text: "Nenhum filtro aplicado — base completa.", options: { bullet: false } }],
      { x: 0.6, y: 1.7, w: 8.8, h: 3.4, fontSize: 16, color: HEX_TEXTO },
    );
  }

  if (config.incluirIndicadores) {
    const slide = novoSlide("Indicadores");
    indicadores(data)
      .slice(0, 4)
      .forEach((c, i) => {
        const x = 0.6 + (i % 2) * 4.5;
        const yy = 1.7 + Math.floor(i / 2) * 1.6;
        slide.addShape(pptx.ShapeType.roundRect, {
          x, y: yy, w: 4.1, h: 1.35, fill: { color: "F4F7FC" }, line: { color: "E0E7F2" }, rectRadius: 0.08,
        });
        slide.addText(c.label.toUpperCase(), { x: x + 0.2, y: yy + 0.1, w: 3.7, h: 0.3, fontSize: 9, color: HEX_CINZA });
        slide.addText(c.valor, { x: x + 0.2, y: yy + 0.4, w: 3.7, h: 0.45, fontSize: 18, bold: true, color: HEX_NAVY });
        slide.addText(c.nota, { x: x + 0.2, y: yy + 0.9, w: 3.7, h: 0.3, fontSize: 10, color: HEX_CINZA });
      });
  }

  for (const key of config.graficos) {
    const info = GRAFICOS.find((g) => g.key === key);
    const dados = contagem(data, key);
    if (!info || dados.length === 0) continue;
    const slide = novoSlide(info.titulo);
    const cor = key === "interesse" ? "188C6E" : key === "contrario" ? "C83E3E" : HEX_AZUL;
    slide.addChart(
      key === "partido" ? pptx.ChartType.doughnut : pptx.ChartType.bar,
      [{ name: info.titulo, labels: dados.map((d) => d.name), values: dados.map((d) => d.total) }],
      {
        x: 0.6, y: 1.6, w: 8.8, h: 3.5,
        chartColors: key === "partido" ? ["3A6EDC", "5B8DEF", "2AA9C6", "7C6BE8", "8FB3F5", "4CC3A5"] : [cor],
        showValue: true,
        dataLabelColor: key === "partido" ? "FFFFFF" : "FFFFFF",
        catAxisLabelColor: HEX_TEXTO,
        valAxisLabelColor: HEX_TEXTO,
        showLegend: key === "partido",
        legendPos: "r",
        legendColor: HEX_TEXTO,
        barDir: "bar",
      },
    );
  }

  if (config.incluirPerfis && config.campos.length > 0) {
    data.slice(0, config.limitePerfis).forEach((p) => {
      const slide = novoSlide(p.nome || "Sem nome");
      const linhas = perfilLinhas(p, config.campos);
      const rows = linhas.map((l) => [
        { text: l.rotulo, options: { bold: true, color: HEX_NAVY, fill: { color: "F4F7FC" }, valign: "top" as const } },
        { text: l.texto, options: { color: HEX_TEXTO, valign: "top" as const } },
      ]);
      if (rows.length === 0) return;
      slide.addTable(rows, {
        x: 0.6, y: 1.6, w: 8.8, colW: [2.2, 6.6], fontSize: 12,
        border: { type: "solid", color: "E0E7F2", pt: 1 },
        margin: 6, autoPage: true, autoPageRepeatHeader: false,
      });
    });
  }

  await pptx.writeFile({ fileName: nomeArquivo(config, "pptx") });
}