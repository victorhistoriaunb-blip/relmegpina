from fastapi import APIRouter, Query
from typing import Optional
import requests

router = APIRouter(prefix="/senado/materias", tags=["Senado - Matérias"])

@router.get("/")
def listar_materias_senado(
    sigla: Optional[str] = Query(None, description="Sigla do tipo de matéria, ex: PEC, PL, PRS"),
    ano: Optional[int] = Query(None, description="Ano da matéria, ex: 2026"),
    tramitando: Optional[str] = Query("S", description="Apenas matérias em tramitação: S ou N")
):
    """Busca matérias legislativas no Senado Federal."""
    # API oficial de dados abertos do Senado para matérias
    url = "https://legis.senado.leg.br/dadosabertos/materia/pesquisa/lista"
    
    params = {}
    if sigla:
        params["sigla"] = sigla
    if ano:
        params["ano"] = ano
    if tramitando:
        params["tramitando"] = tramitando

    # O Senado exige o cabeçalho 'Accept: application/json' para retornar JSON limpo
    headers = {"Accept": "application/json"}
    
    resposta = requests.get(url, params=params, headers=headers)
    
    if resposta.status_code == 200:
        dados = resposta.json()
        
        # Tratamento seguro para navegar no JSON do Senado
        try:
            pesquisa = dados.get("PesquisaBasicaMateria", {})
            lista_materias = pesquisa.get("Materias", {}).get("Materia", [])
            
            # Se vier apenas um item, o Senado pode retornar um dicionário em vez de lista
            if isinstance(lista_materias, dict):
                lista_materias = [lista_materias]

            materias_formatadas = [
                {
                    "codigo": m.get("CodigoMateria"),
                    "sigla": m.get("SiglaCasaMateria"),
                    "tipo": m.get("DescricaoSubTipoMateria"),
                    "numero": m.get("NumeroMateria"),
                    "ano": m.get("AnoMateria"),
                    "ementa": m.get("EmentaMateria"),
                    "autor": m.get("NomeAutorMateria")
                }
                for m in lista_materias
            ]
            
            return {
                "total": len(materias_formatadas),
                "materias": materias_formatadas
            }
        except Exception as e:
            return {"erro": "Erro ao processar o formato dos dados do Senado", "detalhes": str(e)}
    else:
        return {"erro": "Não foi possível acessar a API do Senado", "status": resposta.status_code}