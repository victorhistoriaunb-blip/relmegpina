/**
 * Inteligência Eleitoral (TSE / DivulgaCandContas).
 * Tipos, constantes e clientes da API consumidos pelo módulo Eleições.
 */
import { API_BASE } from "./apiService";

// ---------------------------------------------------------------------------
// Constantes da eleição
// ---------------------------------------------------------------------------

export const ANOS_ELEITORAIS = [2024, 2022, 2020];

export const CARGOS_ELEITORAIS: Record<number, string> = {
  1: "Presidente",
  3: "Governador",
  5: "Senador",
  6: "Deputado Federal",
  7: "Deputado Estadual/Distrital",
  11: "Prefeito",
  13: "Vereador",
};

export const CARGOS_FEDERAIS = [1, 3, 5, 6, 7];
export const CARGOS_MUNICIPAIS = [11, 13];

export const UFS = [
  "BR",
  "AC",
  "AL",
  "AP",
  "AM",
  "BA",
  "CE",
  "DF",
  "ES",
  "GO",
  "MA",
  "MT",
  "MS",
  "MG",
  "PA",
  "PB",
  "PR",
  "PE",
  "PI",
  "RJ",
  "RN",
  "RS",
  "RO",
  "RR",
  "SC",
  "SP",
  "SE",
  "TO",
];

export function cargoLabel(codigo: number | null | undefined): string {
  if (codigo == null) return "";
  return CARGOS_ELEITORAIS[codigo] ?? `Cargo ${codigo}`;
}

/** Cargos disponíveis conforme a eleição: municipais (2020/2024) ou gerais/federais (2022). */
export function cargosPorAno(ano: number | null | undefined): number[] {
  if (ano === 2022) return CARGOS_FEDERAIS;
  return CARGOS_MUNICIPAIS;
}

// ---------------------------------------------------------------------------
// Tipos
// ---------------------------------------------------------------------------

export interface TseCandidato {
  id: number;
  nomeUrna: string;
  nomeCompleto: string;
  numero: number | null;
  siglaPartido: string | null;
  descricaoSituacao: string | null;
  fotoUrl?: string | null;
  // contexto enriquecido no frontend para consultas de detalhe
  ano: number;
  uf: string;
  codigoCargo: number;
}

export interface TseBem {
  tipo: string;
  descricao: string;
  valor: number;
}

export interface TsePatrimonio {
  totalDeBens: number;
  bens: TseBem[];
}

export interface TseCandidatoDetalhe {
  dados: {
    nomeCompleto: string | null;
    nomeUrna: string | null;
    cpf: string | null;
    ocupacao: string;
    grauInstrucao: string;
    situacao: string | null;
    fotoUrl?: string | null;
  };
  eleicao: {
    partido: string | null;
    numero: number | null;
    coligacao: string | null;
    federacao: string | null;
  };
  patrimonio: TsePatrimonio;
}

// ---------------------------------------------------------------------------
// Helpers de apresentação
// ---------------------------------------------------------------------------

const formatadorBRL = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

export function formatarBRL(valor: number | null | undefined): string {
  return formatadorBRL.format(valor || 0);
}

/** Classe de estilo do Badge conforme a situação eleitoral do candidato. */
export function badgeSituacao(situacao: string | null | undefined): string {
  const s = (situacao ?? "").toLowerCase();

  if (s.includes("sub") && (s.includes("judice") || s.includes("júdice"))) {
    return "border-transparent bg-amber-500/15 text-amber-400";
  }
  if (
    s.includes("indeferido") ||
    s.includes("indeferimento") ||
    s.includes("renúncia") ||
    s.includes("renuncia") ||
    s.includes("cancelado")
  ) {
    return "border-transparent bg-red-500/15 text-red-400";
  }
  if (s.includes("deferido")) {
    return "border-transparent bg-emerald-500/15 text-emerald-400";
  }
  return "border-transparent bg-secondary text-secondary-foreground";
}

// ---------------------------------------------------------------------------
// Cliente da API
// ---------------------------------------------------------------------------

function mensagemDeErro(resposta: Response, corpo: unknown): string {
  if (corpo && typeof corpo === "object") {
    const obj = corpo as Record<string, unknown>;
    const detail = obj["detail"];
    if (typeof detail === "string") return detail;
    if (Array.isArray(detail)) {
      const msgs = detail.map((d) => (d as { msg?: string })?.["msg"]).filter(Boolean);
      if (msgs.length) return msgs.join(". ");
    }
    const erro = obj["erro"];
    if (typeof erro === "string") return erro;
  }
  return `Erro ${resposta.status} na API. Tente novamente.`;
}

async function fetchJson<T>(endpoint: string): Promise<T> {
  let resposta: Response;
  try {
    resposta = await fetch(`${API_BASE}${endpoint}`);
  } catch {
    throw new Error("Não foi possível conectar ao servidor. Verifique se o back-end está no ar.");
  }

  if (!resposta.ok) {
    const corpo = await resposta.json().catch(() => null);
    throw new Error(mensagemDeErro(resposta, corpo));
  }

  const dados = await resposta.json();
  if (Array.isArray(dados) && dados.length === 0) return dados as T;
  return dados as T;
}

export interface RespostaListaCandidatos {
  total: number;
  candidatos: TseCandidato[];
}

/** Consulta a listagem de candidatos no TSE (via back-end). */
export async function listarCandidatosTSE(
  ano: number,
  uf: string,
  codigoCargo: number,
): Promise<TseCandidato[]> {
  const params = new URLSearchParams({
    ano: String(ano),
    uf,
    codigo_cargo: String(codigoCargo),
  });
  const resposta = await fetchJson<RespostaListaCandidatos>(`/api/tse/candidatos?${params.toString()}`);
  return (resposta?.candidatos ?? []).map((c) => ({
    ...c,
    ano,
    uf: uf.toUpperCase(),
    codigoCargo,
  }));
}

/** Consulta o dossiê (dados pessoais + eleição + patrimônio) de um candidato. */
export async function detalheCandidatoTSE(
  ano: number,
  uf: string,
  idCandidato: number,
): Promise<TseCandidatoDetalhe> {
  return fetchJson<TseCandidatoDetalhe>(
    `/api/tse/candidato/${ano}/${encodeURIComponent(uf)}/${idCandidato}`,
  );
}