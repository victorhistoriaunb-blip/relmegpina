const API_BASE = "http://127.0.0.1:8000";

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

export async function getCamaraProposicoes() {
  return await fetchApi("/proposicoes/");
}

export async function getCamaraDeputados() {
  return await fetchApi("/deputados/");
}

export async function getSenadoMaterias() {
  return await fetchApi("/senado/materias");
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