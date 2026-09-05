from fastapi import APIRouter, Query
from typing import Optional
import httpx
import asyncio
import re

router = APIRouter(prefix="/senado/materias", tags=["Senado - Matérias"])

URL_PESQUISA = "https://legis.senado.leg.br/dadosabertos/materia/pesquisa/lista"
URL_PROCESSO = "https://legis.senado.leg.br/dadosabertos/processo"

_HEADERS = {"Accept": "application/json"}


def _primeiro_token_identificacao(identificacao: Optional[str]) -> Optional[str]:
    """Extrai a sigla do tipo a partir do campo IdentificacaoProcesso (ex: 'PL 1/2024')."""
    if not identificacao:
        return None
    token = identificacao.strip().split(" ", 1)[0]
    return token or None


async def _enriquecer_senado(
    client: httpx.AsyncClient,
    materia: dict,
) -> dict:
    """Busca situação/comissão atual e relator de uma matéria do Senado.

    Usa o serviço 'dadosabertos/processo' (substituto do antigo tramitacao,
    já descontinuado) para obter o andamento vigente.
    """
    id_processo = materia.get("identificacaoProcesso")
    if not id_processo:
        return {"situacao": None, "comissao": None, "relator": None}

    try:
        resposta = await client.get(f"{URL_PROCESSO}/{id_processo}", headers=_HEADERS)
        if resposta.status_code != 200:
            return {"situacao": None, "comissao": None, "relator": None}

        dados = resposta.json()
        situacao = dados.get("situacaoAtual")
        comissao = None
        relator = None

        # Comissão: último colegiado diferente do Plenário em despachos/autuações
        registros = (dados.get("despachos") or []) + (dados.get("autuacoes") or [])
        for registro in reversed(registros):
            colegiado = _colegiado_em(registro)
            sigla = colegiado.get("sigla") or colegiado.get("nome")
            if sigla and str(sigla).strip().upper() != "PLEN":
                comissao = str(sigla).strip()
                break

        # Relator: varre despachos por designação/menção a relator
        for registro in dados.get("despachos") or []:
            texto = str(registro)
            if "relator" not in texto.lower():
                continue

            achado = re.search(r"[Rr]elator(?:\(a\))?\s*[:\-]?\s*([^,;\n]{5,80})", texto)
            if achado:
                nome = achado.group(1).strip(" .")
                if nome.lower() not in ("a", "o", "designado", "designação"):
                    relator = nome
                    break

        return {
            "situacao": situacao,
            "comissao": comissao,
            "relator": relator,
        }
    except Exception:
        return {"situacao": None, "comissao": None, "relator": None}


def _colegiado_em(registro) -> dict:
    if not isinstance(registro, dict):
        return {}
    colegiado = (registro.get("encontroLegislativo") or {}).get("colegiado")
    if not colegiado:
        colegiado = registro.get("colegiado")
    return colegiado or {}


@router.get("/")
async def listar_materias_senado(
    sigla: Optional[str] = Query(None, description="Sigla do tipo de matéria, ex: PEC, PL, PRS"),
    ano: Optional[int] = Query(None, description="Ano da matéria, ex: 2026"),
    tramitando: Optional[str] = Query("S", description="Apenas matérias em tramitação: S ou N"),
    enriquecer: bool = Query(True, description="Se false, retorna apenas os campos básicos (mais rápido)"),
    keywords: Optional[str] = Query(None, description="Termo livre para filtrar por ementa ou autor"),
):
    """Busca matérias legislativas no Senado Federal, com situação, comissão e relator."""

    params = {}
    if sigla:
        params["sigla"] = sigla
    if ano:
        params["ano"] = ano
    if tramitando:
        params["tramitando"] = tramitando

    timeout = httpx.Timeout(30.0)

    try:
        async with httpx.AsyncClient(timeout=timeout, follow_redirects=True) as client:
            resposta = await client.get(URL_PESQUISA, params=params, headers=_HEADERS)
            if resposta.status_code != 200:
                return {"erro": "Não foi possível acessar a API do Senado", "status": resposta.status_code}

            dados = resposta.json()
            pesquisa = dados.get("PesquisaBasicaMateria", {})
            lista_materias = pesquisa.get("Materias", {}).get("Materia", [])

            # Se vier apenas um item, o Senado pode retornar um dicionário em vez de lista
            if isinstance(lista_materias, dict):
                lista_materias = [lista_materias]

            materias_formatadas = [
                {
                    "codigo": m.get("Codigo"),
                    "sigla": m.get("Sigla"),
                    "tipo": _primeiro_token_identificacao(m.get("DescricaoIdentificacao")) or m.get("Sigla"),
                    "numero": m.get("Numero"),
                    "ano": m.get("Ano"),
                    "ementa": m.get("Ementa"),
                    "autor": m.get("Autor"),
                    "data": m.get("Data"),
                    "url": m.get("UrlDetalheMateria"),
                    "identificacaoProcesso": m.get("IdentificacaoProcesso"),
                    "situacao": None,
                    "comissao": None,
                    "relator": None,
                }
                for m in lista_materias
            ]

            if keywords:
                termo = keywords.strip().lower()
                if termo:
                    materias_formatadas = [
                        m for m in materias_formatadas
                        if termo in (m.get("ementa") or "").lower()
                        or termo in (m.get("autor") or "").lower()
                        or termo in (m.get("sigla") or "").lower()
                    ]

            if enriquecer and materias_formatadas:
                alvo = materias_formatadas[:20]
                riquezas = await asyncio.gather(
                    *[_enriquecer_senado(client, m) for m in alvo]
                )
                for materia, riqueza in zip(alvo, riquezas):
                    materia.update(riqueza)

            return {
                "total": len(materias_formatadas),
                "materias": materias_formatadas,
            }
    except httpx.HTTPError:
        return {"erro": "Não foi possível acessar a API do Senado", "status": 502}