import { toast } from "sonner";

export type CasaClipping = "camara" | "senado" | "outros";

const NOMES_CASA: Record<CasaClipping, string> = {
  camara: "Câmara dos Deputados",
  senado: "Senado Federal",
  outros: "Outras fontes",
};

const ORDEM_CASA: CasaClipping[] = ["camara", "senado", "outros"];

function limpar(valor: unknown): string {
  return String(valor ?? "").trim();
}

export function formatarData(valor: unknown): string {
  const texto = limpar(valor);
  if (!texto) return "—";
  const iso = texto.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return `${iso[3]}/${iso[2]}/${iso[1]}`;
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(texto)) return texto;
  return texto;
}

export function autorComPartido(item: any): string {
  const nome = limpar(item.autor || item.nome);
  const partido = limpar(item.partido);
  const uf = limpar(item.uf);
  if (!nome) return "—";
  if (partido && uf) return `${nome} (${partido}/${uf})`;
  if (partido || uf) return `${nome} (${partido || uf})`;
  return nome;
}

export function tituloProposicao(item: any): string {
  const personalizado = limpar(item.titulo);
  if (personalizado) return personalizado;

  const sigla = limpar(item.sigla || item.siglaTipo);
  const numero = limpar(item.numero);
  const ano = limpar(item.ano);
  const semAno = [sigla, numero].filter(Boolean).join(" ");
  return ano && semAno ? `${semAno}/${ano}` : semAno || "Sem título";
}

export function casaDe(item: any): CasaClipping {
  if (item.origemCategoria === "camara") return "camara";
  if (item.origemCategoria === "senado") return "senado";
  if (item.casa === "camara" || item.casa === "senado") return item.casa;
  if (limpar(item.siglaTipo)) return "camara";
  if (limpar(item.sigla) && !limpar(item.siglaPartido)) return "senado";
  return "outros";
}

export function linkProposicao(item: any): string | undefined {
  const direto = limpar(item.link || item.link1 || item.uri || item.url);
  if (direto) return direto;

  const casa = casaDe(item);
  const id = String(item.id ?? "").trim();
  if (casa === "camara" && /^\d+$/.test(id)) {
    return `https://www.camara.leg.br/proposicoesWeb/fichadetramitacao?idProposicao=${id}`;
  }
  const codigo = String(item.codigo ?? item.id ?? "").trim();
  if (casa === "senado" && /^\d+$/.test(codigo)) {
    return `https://www25.senado.leg.br/web/atividade/materias/-/materia/${codigo}`;
  }
  return undefined;
}

function linhaItem(item: any): string {
  const titulo = tituloProposicao(item);
  const link = linkProposicao(item);
  const ementa = limpar(item.ementa || item.ementa1 || item.resumo || item.descricao);
  const autor = autorComPartido(item);
  const data = formatarData(item.data || item.atualizacao);
  const status = limpar(item.status || item.situacao || item.descricaoSituacao);

  const linhas: string[] = [];
  linhas.push(link ? `📌 *[${titulo}](${link})*` : `📌 *${titulo}*`);
  if (ementa) linhas.push(ementa);
  linhas.push(`*Autor:* ${autor}`);
  linhas.push(`*Data:* ${data}`);
  if (status && status !== "Em monitoramento") linhas.push(`*Status:* ${status}`);

  return linhas.join("\n");
}

export function montarClipping(itens: any[]): string {
  const agrupados = ORDEM_CASA.map((casa) => ({
    casa,
    itens: itens.filter((item) => casaDe(item) === casa),
  })).filter((grupo) => grupo.itens.length > 0);

  const blocos: string[] = [];
  for (const grupo of agrupados) {
    blocos.push(`*${NOMES_CASA[grupo.casa]}*`);
    for (const item of grupo.itens) {
      blocos.push(linhaItem(item));
    }
  }

  return blocos.join("\n\n");
}

export async function exportarClippingParaWhatsApp(itens: any[]): Promise<string> {
  if (itens.length === 0) {
    toast.info("Selecione ao menos um item para exportar");
    return "";
  }
  const texto = montarClipping(itens);
  try {
    await navigator.clipboard.writeText(texto);
    toast.success(
      `Clipping com ${itens.length} ${itens.length === 1 ? "item" : "itens"} copiado para a área de transferência — cole no WhatsApp`,
    );
  } catch {
    toast.error("Não foi possível copiar o clipping. Seu navegador bloqueou a área de transferência.");
  }
  return texto;
}