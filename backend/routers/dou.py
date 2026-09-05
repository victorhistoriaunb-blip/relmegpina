from fastapi import APIRouter, Query
from starlette.requests import Request
from typing import Optional
import requests
from datetime import date

from rate_limit import limiter, LIMITE_DOU

router = APIRouter(prefix="/dou", tags=["Diário Oficial da União (DOU)"])

@router.get("/pesquisa")
@limiter.limit(LIMITE_DOU)
def pesquisar_dou(
    request: Request,
    q: str = Query(..., min_length=3, max_length=150, description="Termo de busca no DOU, ex: ANEEL, concessão, iFood, tarifa"),
    data: Optional[str] = Query(None, pattern=r"^\d{4}-\d{2}-\d{2}$", description="Data da publicação no formato AAAA-MM-DD (ex: 2026-08-24). Se vazio, busca recentes."),
    secao: int = Query(1, ge=1, le=3, description="Seção do DOU: 1 (leis/atos normativos), 2 (pessoal), 3 (contratos/editais)")
):
    """
    Busca publicações no Diário Oficial da União (DOU) filtrando por termo, data e seção.
    """
    # Endpoint oficial de JSON da Imprensa Nacional
    url = "https://in.gov.br/es/web/dou/-/api/json"
    
    params = {
        "q": q,
        "section": f"dou{secao}"
    }
    
    if data:
        params["date"] = data
        
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
    }
    
    try:
        resposta = requests.get(url, params=params, headers=headers)
        
        if resposta.status_code == 200:
            dados = resposta.json()
            
            # A API do in.gov.br costuma retornar os resultados dentro da chave 'json' ou 'hits' dependendo da versão
            # Vamos tratar para extrair os itens com segurança
            lista_itens = dados.get("json", [])
            if not lista_itens and "hits" in dados:
                lista_itens = dados.get("hits", [])
                
            resultados_formatados = [
                {
                    "titulo": item.get("title") or item.get("titulo"),
                    "orgao": item.get("orgao") or item.get("artType"),
                    "data_publicacao": item.get("pubDate") or item.get("dataPub"),
                    "url": f"https://in.gov.br/web/dou/-/{item.get('urlTitle')}" if item.get('urlTitle') else None,
                    "tipo": item.get("type")
                }
                for item in lista_itens
            ]
            
            return {
                "termo_pesquisado": q,
                "data_filtro": data or "Mais recentes / Sem data fixa",
                "secao": secao,
                "total": len(resultados_formatados),
                "resultados": resultados_formatados
            }
        else:
            return {
                "erro": "Não foi possível acessar a API do DOU diretamente com esses parâmetros",
                "status_code": resposta.status_code,
                "detalhes": resposta.text[:200]
            }
            
    except Exception as e:
        return {"erro": "Falha ao processar a requisição do DOU", "detalhes": str(e)}