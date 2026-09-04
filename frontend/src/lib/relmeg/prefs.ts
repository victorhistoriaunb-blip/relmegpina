export type TipoCard = "barra" | "pizza" | "ranking" | "tabela" | "kpi";

export type CardPref = {
  key: string;
  titulo: string;
  descricao: string;
  visivel: boolean;
  limite?: number;
  tipo?: TipoCard;
  colunaOrigem?: string; // Coluna da planilha que alimentará este card dinamicamente
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
  { key: "total", titulo: "Total de Registros", descricao: "na seleção atual", visivel: true, tipo: "kpi" },
  { key: "destaque1", titulo: "Métrica Principal", descricao: "Indicador dinâmico", visivel: true, tipo: "kpi" },
];

export const PAINEIS_PADRAO: CardPref[] = [
  { key: "dinamico1", titulo: "Análise por Categoria", descricao: "Baseado nas colunas da planilha", visivel: true, limite: 10, tipo: "barra" },
  { key: "dinamico2", titulo: "Distribuição Proporcional", descricao: "Visão em ranking/fatias", visivel: true, limite: 10, tipo: "ranking" },
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