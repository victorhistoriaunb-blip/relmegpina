from fastapi import APIRouter, Query
from typing import Optional
import requests

router = APIRouter(prefix="/monitoramento", tags=["Monitoramento Setorial"])

@router.get("/camara")
def monitorar_camara(
    q: str = Query(..., description="Palavra-chave para buscar nas ementas, ex: energia, tarifa, iFood"),
    ano: int = Query(2026, description="Ano das proposições"),
    itens: int = Query(10, description="Quantidade máxima de resultados")
):
    """Busca proposições na Câmara filtrando por palavras-chave na ementa ou texto."""
    url = "https://dadosabertos.camara.leg.br/api/v2/proposicoes"
    
    params = {
        "ano": ano,
        "keywords": q,
        "itens": itens,
        "ordem": "desc",
        "ordenarPor": "id"
    }
    
    resposta = requests.get(url, params=params)
    
    if resposta.status_code == 200:
        dados = resposta.json()
        proposicoes_formatadas = [
            {
                "id": p["id"],
                "uri": p["uri"],
                "siglaTipo": p["siglaTipo"],
                "numero": p["numero"],
                "ano": p["ano"],
                "ementa": p["ementa"]
            }
            for p in dados.get("dados", [])
        ]
        return {
            "termo_pesquisado": q,
            "total": len(proposicoes_formatadas),
            "resultados": proposicoes_formatadas
        }
    else:
        return {"erro": "Não foi possível realizar o monitoramento na Câmara", "status": resposta.status_code}


@router.get("/senado")
def monitorar_senado(
    q: str = Query(..., description="Palavra-chave para buscar nas matérias do Senado, ex: energia, marco legal"),
    ano: Optional[int] = Query(2026, description="Ano da matéria")
):
    """Busca matérias no Senado filtrando por palavra-chave na ementa."""
    url = "https://legis.senado.leg.br/dadosabertos/materia/pesquisa/lista"
    headers = {"Accept": "application/json"}
    
    params = {}
    if ano:
        params["ano"] = ano
        
    resposta = requests.get(url, params=params, headers=headers)
    
    if resposta.status_code == 200:
        dados = resposta.json()
        try:
            pesquisa = dados.get("PesquisaBasicaMateria", {})
            lista_materias = pesquisa.get("Materias", {}).get("Materia", [])
            
            if isinstance(lista_materias, dict):
                lista_materias = [lista_materias]
                
            # Filtro inteligente por palavra-chave na ementa (case insensitive)
            termo = q.lower()
            filtradas = []
            
            for m in lista_materias:
                ementa = m.get("EmentaMateria", "") or ""
                if termo in ementa.lower():
                    filtradas.append({
                        "codigo": m.get("CodigoMateria"),
                        "sigla": m.get("SiglaCasaMateria"),
                        "tipo": m.get("DescricaoSubTipoMateria"),
                        "numero": m.get("NumeroMateria"),
                        "ano": m.get("AnoMateria"),
                        "ementa": ementa,
                        "autor": m.get("NomeAutorMateria")
                    })
                    
            return {
                "termo_pesquisado": q,
                "total": len(filtradas),
                "resultados": filtradas
            }
        except Exception as e:
            return {"erro": "Erro ao processar filtro do Senado", "detalhes": str(e)}
    else:
        return {"erro": "Não foi possível acessar a API de monitoramento do Senado", "status": resposta.status_code}