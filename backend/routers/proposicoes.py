from fastapi import APIRouter, Query
from typing import Optional
import requests

router = APIRouter(prefix="/proposicoes", tags=["Proposições"])

@router.get("/")
def listar_proposicoes(
    siglaTipo: Optional[str] = Query(None, description="Ex: PL, PEC, MPV"),
    ano: Optional[int] = Query(None, description="Ex: 2026, 2025"),
    keywords: Optional[str] = Query(None, description="Palavra-chave para buscar na ementa (ex: energia, imposto)"),
    itens: int = Query(10, description="Quantidade máxima de itens retornados")
):
    """Busca proposições legislativas na API da Câmara de forma genérica e flexível."""

    # URL base da API da Câmara
    url = "https://dadosabertos.camara.leg.br/api/v2/proposicoes"

    # Montando os parâmetros de forma dinâmica
    params = {
        "itens": itens,
        "ordem": "desc",
        "ordenarPor": "id"
    }

    if siglaTipo:
        params["siglaTipo"] = siglaTipo
    if ano:
        params["ano"] = ano
    if keywords:
        params["keywords"] = keywords

    resposta = requests.get(url, params=params)

    if resposta.status_code == 200:
        dados = resposta.json()
        proposicoes_formatadas = [
            {
                "id": prop["id"],
                "siglaTipo": prop["siglaTipo"],
                "numero": prop["numero"],
                "ano": prop["ano"],
                "ementa": prop["ementa"]
            }
            for prop in dados["dados"]
        ]
        return {
            "total": len(proposicoes_formatadas),
            "filtros_aplicados": {
                "siglaTipo": siglaTipo,
                "ano": ano,
                "keywords": keywords
            },
            "proposicoes": proposicoes_formatadas
        }
    else:
        return {"erro": "Não foi possível acessar a API de proposições", "status": resposta.status_code}