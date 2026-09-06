export const API_BASE =
  (import.meta.env?.["VITE_API_BASE_URL"] as string | undefined) || "http://127.0.0.1:8000";

async function fetchApi(endpoint: string) {
  try {
    const res = await fetch(`${API_BASE}${endpoint}`);
    if (!res.ok) throw new Error(`Erro na API: ${res.statusText}`);
    return await res.json();
  } catch (err) {
    console.error(`Falha ao carregar ${endpoint}:`, err);
    return [];
  }
}

export async function getCamaraProposicoes(itens: number = 10) {
  return await fetchApi(`/proposicoes/?itens=${itens}`);
}

export async function getCamaraResumo(keywords?: string) {
  const q = keywords?.trim() ? `?keywords=${encodeURIComponent(keywords.trim())}` : "";
  return await fetchApi(`/api/camara${q}`);
}

export async function getCamaraDeputados() {
  return await fetchApi("/deputados/");
}

export async function getSenadoMaterias() {
  return await fetchApi("/senado/materias");
}

export async function getSenadoResumo(keywords?: string) {
  const q = keywords?.trim() ? `&keywords=${encodeURIComponent(keywords.trim())}` : "";
  return await fetchApi(`/api/senado?tramitando=S${q}`);
}

export async function getSenadoComissoes() {
  return await fetchApi("/senado/comissoes");
}

export async function getDOU(q: string = "energia elétrica", data?: string) {
  const params = new URLSearchParams({ q });
  if (data) params.set("data", data);
  return await fetchApi(`/dou/pesquisa?${params.toString()}`);
}

export async function getMonitoramento() {
  return await fetchApi("/monitoramento/camara");
}

export interface ResumirDouPayload {
  titulo?: string;
  texto: string;
}

export async function resumirPublicacaoDoDou(payload: ResumirDouPayload) {
  const res = await fetch(`${API_BASE}/api/ai/resumir-dou`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(`Erro na API: ${res.status}`);
  return (await res.json()) as { titulo: string | null; resumo: string };
}