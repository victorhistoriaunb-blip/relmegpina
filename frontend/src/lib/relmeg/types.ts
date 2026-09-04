export type Proposicao = { numero: string; ementa: string; link: string };

export type Parlamentar = {
  id: string;
  nome: string;
  partido: string;
  uf: string;
  cargo: string;
  interesse1: string;
  interesse2: string;
  contrario1: string;
  contrario2: string;
  setor1: string;
  setor2: string;
  setor3: string;
  descricao: string;
  proposicao1: string;
  ementa1: string;
  link1: string;
  proposicao2: string;
  ementa2: string;
  link2: string;
  proposicao3: string;
  ementa3: string;
  link3: string;
  anotacoes: string;
};

export type Filters = {
  busca: string;
  partido: string;
  uf: string;
  cargo: string;
  setor: string;
  interesse: string;
  contrario: string;
};

export const EMPTY_FILTERS: Filters = {
  busca: "",
  partido: "",
  uf: "",
  cargo: "",
  setor: "",
  interesse: "",
  contrario: "",
};

export type Campo = {
  key: keyof Omit<Parlamentar, "id">;
  label: string;
  aliases: string[];
  obrigatorio?: boolean;
};

export const CAMPOS: Campo[] = [
  { key: "nome", label: "Nome", aliases: ["nome", "nomedoparlamentar", "parlamentar"], obrigatorio: true },
  { key: "partido", label: "Partido", aliases: ["partido"], obrigatorio: true },
  { key: "uf", label: "UF", aliases: ["uf", "estado"], obrigatorio: true },
  { key: "cargo", label: "Cargo", aliases: ["cargo"], obrigatorio: true },
  {
    key: "interesse1",
    label: "Tema de Interesse 1",
    aliases: ["temadeinteresse1", "temainteresse1", "interesse1"],
    obrigatorio: true,
  },
  {
    key: "interesse2",
    label: "Tema de Interesse 2",
    aliases: ["temadeinteresse2", "temainteresse2", "interesse2"],
    obrigatorio: true,
  },
  {
    key: "contrario1",
    label: "Tema Contrário 1",
    aliases: ["temacontrario1", "temacontrário1", "contrario1"],
    obrigatorio: true,
  },
  {
    key: "contrario2",
    label: "Tema Contrário 2",
    aliases: ["temacontrario2", "temacontrário2", "contrario2"],
    obrigatorio: true,
  },
  { key: "setor1", label: "Setor 1", aliases: ["setor1", "setor"], obrigatorio: true },
  { key: "setor2", label: "Setor 2", aliases: ["setor2"] },
  { key: "setor3", label: "Setor 3", aliases: ["setor3"] },
  { key: "descricao", label: "Breve Descrição", aliases: ["brevedescricao", "descricao", "brevedescrição", "descrição"] },
  { key: "proposicao1", label: "Proposição 1", aliases: ["proposicao1", "proposição1"] },
  { key: "ementa1", label: "Ementa 1", aliases: ["ementa1", "ementaproposicao1"] },
  { key: "link1", label: "Link 1", aliases: ["link1", "linkproposicao1", "url1"] },
  { key: "proposicao2", label: "Proposição 2", aliases: ["proposicao2", "proposição2"] },
  { key: "ementa2", label: "Ementa 2", aliases: ["ementa2", "ementaproposicao2"] },
  { key: "link2", label: "Link 2", aliases: ["link2", "linkproposicao2", "url2"] },
  { key: "proposicao3", label: "Proposição 3", aliases: ["proposicao3", "proposição3"] },
  { key: "ementa3", label: "Ementa 3", aliases: ["ementa3", "ementaproposicao3"] },
  { key: "link3", label: "Link 3", aliases: ["link3", "linkproposicao3", "url3"] },
  { key: "anotacoes", label: "Anotações Internas", aliases: ["anotacoesinternas", "anotacoes", "anotações", "anotaçõesinternas"] },
];

export const OBRIGATORIOS = CAMPOS.filter((c) => c.obrigatorio);

export function normalizeKey(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

const limpar = (values: string[]) => [...new Set(values.map((s) => (s ?? "").trim()).filter(Boolean))];

export function setoresDe(p: Parlamentar) {
  return limpar([p.setor1, p.setor2, p.setor3]);
}

export function temasInteresseDe(p: Parlamentar) {
  return limpar([p.interesse1, p.interesse2]);
}

export function temasContrariosDe(p: Parlamentar) {
  return limpar([p.contrario1, p.contrario2]);
}

export function proposicoesDe(p: Parlamentar): Proposicao[] {
  return [
    { numero: p.proposicao1, ementa: p.ementa1, link: p.link1 },
    { numero: p.proposicao2, ementa: p.ementa2, link: p.link2 },
    { numero: p.proposicao3, ementa: p.ementa3, link: p.link3 },
  ]
    .map((x) => ({ numero: (x.numero ?? "").trim(), ementa: (x.ementa ?? "").trim(), link: (x.link ?? "").trim() }))
    .filter((x) => x.numero || x.ementa || x.link);
}

export function briefing(p: Parlamentar) {
  const props = proposicoesDe(p);
  const linhas = [
    `BRIEFING — ${p.nome}`,
    [p.cargo, p.partido && p.uf ? `${p.partido}/${p.uf}` : p.partido || p.uf].filter(Boolean).join(" — "),
    "",
    temasInteresseDe(p).length ? `Temas de Interesse: ${temasInteresseDe(p).join(", ")}` : "",
    temasContrariosDe(p).length ? `Temas Contrários: ${temasContrariosDe(p).join(", ")}` : "",
    setoresDe(p).length ? `Setores: ${setoresDe(p).join(", ")}` : "",
    p.descricao ? `\nDescrição:\n${p.descricao}` : "",
    props.length
      ? `\nProposições:\n${props
          .map((x) => `- ${[x.numero, x.ementa].filter(Boolean).join(" — ")}${x.link ? `\n  ${x.link}` : ""}`)
          .join("\n")}`
      : "",
    p.anotacoes ? `\nAnotações internas:\n${p.anotacoes}` : "",
  ];
  return linhas.filter((l) => l !== "").join("\n");
}