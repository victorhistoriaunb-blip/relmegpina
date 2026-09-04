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

export async function getCamaraResumo() {
  return await fetchApi("/api/camara");
}

export async function getCamaraDeputados() {
  return await fetchApi("/deputados/");
}

export async function getSenadoMaterias() {
  return await fetchApi("/senado/materias");
}

export async function getSenadoResumo() {
  return await fetchApi("/api/senado");
}

export async function getSenadoComissoes() {
  return await fetchApi("/senado/comissoes");
}

export async function getDOU() {
  return await fetchApi("/dou/");
}

export async function getMonitoramento() {
  return await fetchApi("/monitoramento/");
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