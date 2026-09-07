from fastapi import APIRouter, Query
from starlette.requests import Request
from typing import Optional
import requests
from urllib.parse import quote
from datetime import date

from rate_limit import limiter, LIMITE_DOU

router = APIRouter(prefix="/dou", tags=["Diário Oficial da União (DOU)"])


def _url_busca_oficial(q: str, secao: int, data: Optional[str]) -> str:
    """Deep link oficial de busca no portal do DOU (Imprensa Nacional)."""
    termo = quote(q)
    base = f"https://www.in.gov.br/consulta/-/buscar/dou?q={termo}&s=todos&exactDate=personalizado&sortType=0"
    if data:
        base += f"&publishFrom={quote(data)}&publishTo={quote(data)}"
    else:
        base += f"&publish=past-month"
    base += f"&s=do{secao}"
    return base


@router.get("/pesquisa")
@limiter.limit(LIMITE_DOU)
def pesquisar_dou(
    request: Request,
    q: str = Query(..., min_length=3, max_length=150, description="Termo de busca no DOU, ex: ANEEL, concessão, marco regulatório"),
    data: Optional[str] = Query(None, pattern=r"^\d{4}-\d{2}-\d{2}$", description="Data da publicação no formato AAAA-MM-DD (ex: 2026-08-24). Se vazio, busca recentes."),
    secao: int = Query(1, ge=1, le=3, description="Seção do DOU: 1 (leis/atos normativos), 2 (pessoal), 3 (contratos/editais)")
):
    """
    Busca publicações no Diário Oficial da União (DOU) filtrando por termo, data e seção.

    O endpoint JSON legado da Imprensa Nacional (in.gov.br/es/web/dou/-/api/json)
    foi descontinuado em favor do portal de busca (SPA). A rotina ainda tenta o
    endpoint oficial legado; quando indisponível, devolve um erro estruturado com
    o deep link oficial para a consulta — nunca um falso 'nenhum resultado'.
    """
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
            try:
                dados = resposta.json()
            except ValueError:
                return {
                    "erro": "A API do DOU I retornou um conteúdo inesperado.",
                    "status_code": 200,
                    "url_busca_oficial": _url_busca_oficial(q, secao, data),
                }

            lista_itens = dados.get("json", [])
            if not lista_itens and "hits" in dados:
                lista_itens = dados.get("hits", [])

            resultados_formatados = [
                {
                    "titulo": item.get("title") or item.get("titulo"),
                    "orgao": item.get("orgao") or item.get("artType"),
                    "data_publicacao": item.get("pubDate") or item.get("dataPub"),
                    "url": f"https://in.gov.br/web/dou/-/{item.get('urlTitle')}" if item.get("urlTitle") else None,
                    "tipo": item.get("type"),
                }
                for item in lista_itens
            ]

            return {
                "termo_pesquisado": q,
                "data_filtro": data or "Mais recentes / Sem data fixa",
                "secao": secao,
                "total": len(resultados_formatados),
                "resultados": resultados_formatados,
                "url_busca_oficial": _url_busca_oficial(q, secao, data),
            }

        return {
            "erro": "A API pública de JSON do DOU não está disponível neste momento (o portal migrou para renderização sob demanda no navegador).",
            "status_code": resposta.status_code,
            "detalhes": resposta.text[:200],
            "url_busca_oficial": _url_busca_oficial(q, secao, data),
        }
    except Exception as e:
        return {
            "erro": "Falha ao processar a requisição do DOU.",
            "detalhes": str(e),
            "url_busca_oficial": _url_busca_oficial(q, secao, data),
        }