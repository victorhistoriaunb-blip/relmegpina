// Serviço de integração com o Back-end FastAPI do RelMeg

const API_BASE_URL = import.meta.env["VITE_API_BASE_URL"] || "http://127.0.0.1:8000";

export async function pesquisarDOU(termo: string, secao: number = 1) {
  try {
    const response = await fetch(`${API_BASE_URL}/dou/pesquisa?q=${encodeURIComponent(termo)}&secao=${secao}`);
    if (!response.ok) {
      throw new Error(`Erro na API do DOU: ${response.statusText}`);
    }
    return await response.json();
  } catch (error) {
    console.error("Erro ao buscar no DOU:", error);
    throw error;
  }
}
