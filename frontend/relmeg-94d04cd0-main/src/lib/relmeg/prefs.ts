export type CardPref = {
  key: string;
  titulo: string;
  descricao: string;
  visivel: boolean;
  limite?: number;
};

export type Prefs = {
  saudacao: string;
  nomeExibicao: string;
  mostrarSaudacao: boolean;
  mostrarKpisPerfis: boolean;
  visaoPadraoPerfis: "cards" | "tabela";
  kpis: CardPref[];
  paineis: CardPref[];
};

export const KPIS_PADRAO: CardPref[] = [
  { key: "total", titulo: "Total de Parlamentares", descricao: "na seleção atual", visivel: true },
  { key: "apoio", titulo: "Tema com Maior Apoio", descricao: "parlamentares favoráveis", visivel: true },
  { key: "resistencia", titulo: "Tema com Maior Resistência", descricao: "parlamentares contrários", visivel: true },
  { key: "uf", titulo: "UF com Maior Representação", descricao: "parlamentares", visivel: true },
];

export const PAINEIS_PADRAO: CardPref[] = [
  { key: "interesse", titulo: "Temas de Interesse", descricao: "Temas com maior apoio", visivel: true, limite: 10 },
  { key: "contrario", titulo: "Temas Contrários", descricao: "Temas com maior resistência", visivel: true, limite: 10 },
  { key: "uf", titulo: "Parlamentares por UF", descricao: "Unidades federativas", visivel: true, limite: 15 },
  { key: "partido", titulo: "Parlamentares por Partido", descricao: "Principais partidos", visivel: true, limite: 8 },
  { key: "cargo", titulo: "Parlamentares por Cargo", descricao: "Composição da base por função", visivel: true, limite: 0 },
  { key: "setor", titulo: "Parlamentares por Setor", descricao: "Setores de atuação", visivel: true, limite: 10 },
];

export const PREFS_PADRAO: Prefs = {
  saudacao: "Olá",
  nomeExibicao: "Admin",
  mostrarSaudacao: true,
  mostrarKpisPerfis: true,
  visaoPadraoPerfis: "cards",
  kpis: KPIS_PADRAO,
  paineis: PAINEIS_PADRAO,
};

/** Mescla preferências salvas com os padrões, preservando ordem salva e novos cards. */
function mesclarCards(salvos: CardPref[] | undefined, padrao: CardPref[]): CardPref[] {
  if (!Array.isArray(salvos)) return padrao.map((c) => ({ ...c }));
  const validos = salvos.filter((s) => padrao.some((p) => p.key === s.key));
  const faltantes = padrao.filter((p) => !validos.some((s) => s.key === p.key));
  return [...validos, ...faltantes].map((c) => {
    const base = padrao.find((p) => p.key === c.key)!;
    return { ...base, ...c };
  });
}

export function mesclarPrefs(salvo: Partial<Prefs> | null | undefined): Prefs {
  if (!salvo) return { ...PREFS_PADRAO, kpis: KPIS_PADRAO.map((c) => ({ ...c })), paineis: PAINEIS_PADRAO.map((c) => ({ ...c })) };
  return {
    ...PREFS_PADRAO,
    ...salvo,
    kpis: mesclarCards(salvo.kpis, KPIS_PADRAO),
    paineis: mesclarCards(salvo.paineis, PAINEIS_PADRAO),
  };
}
