"""
Módulo de Inteligência Eleitoral (TSE — DivulgaCandContas).

Consulta candidaturas e o detalhamento patrimonial dos candidatos
usando a API aberta do Tribunal Superior Eleitoral de forma assíncrona (httpx).
"""
from fastapi import APIRouter, HTTPException, Query
import httpx

router = APIRouter(prefix="/tse", tags=["TSE"])

BASE_TSE = "https://divulgacandcontas.tse.jus.br/divulga/rest/v1"

# Ano eleitoral -> id_eleicao correspondente (eleição ordinária no TSE)
IDS_ELEICAO = {
    2024: "2045202024",
    2022: "2022802018",
    2020: "2030402020",
}

# Cargos reconhecidos pela API do TSE
CARGOS = {
    1: "Presidente",
    3: "Governador",
    5: "Senador",
    6: "Deputado Federal",
    7: "Deputado Estadual/Distrital",
    11: "Prefeito",
    13: "Vereador",
}

_TIMEOUT = httpx.Timeout(30.0)


def _id_eleicao(ano: int) -> str:
    """Retorna o id_eleicao do TSE para o ano ou levanta 400 se for inválido."""
    id_eleicao = IDS_ELEICAO.get(ano)
    if not id_eleicao:
        suportados = ", ".join(str(a) for a in sorted(IDS_ELEICAO))
        raise HTTPException(
            status_code=400,
            detail=f"Ano inválido: {ano}. Anos suportados: {suportados}.",
        )
    return id_eleicao


def _validar_uf(uf: str) -> str:
    uf = (uf or "").strip().upper()
    if len(uf) != 2 or not uf.isalpha():
        raise HTTPException(status_code=400, detail="UF inválida: informe a sigla de 2 letras (ex: SP, BR).")
    return uf


def _validar_cargo(codigo_cargo: int) -> int:
    nome = CARGOS.get(codigo_cargo)
    if not nome:
        raise HTTPException(status_code=400, detail=f"Cargo inválido: {codigo_cargo}. Cargos: {', '.join(f'{k} ({v})' for k, v in CARGOS.items())}.")
    return codigo_cargo


def _texto(valor) -> str:
    """Normaliza valores que o TSE retorna como objeto {codigo, nome} ou string."""
    if isinstance(valor, dict):
        return str(valor.get("nome") or "").strip()
    return str(valor or "").strip()


async def _get_json(url: str) -> dict:
    """Executa o GET na API do TSE e devolve o JSON ou erro amigável."""
    try:
        async with httpx.AsyncClient(timeout=_TIMEOUT, follow_redirects=True) as client:
            resposta = await client.get(url, headers={"Accept": "application/json"})
            resposta.raise_for_status()
            return resposta.json()
    except httpx.HTTPStatusError as exc:
        raise HTTPException(
            status_code=502,
            detail=f"O TSE respondeu com erro {exc.response.status_code} na consulta.",
        ) from exc
    except httpx.TimeoutException as exc:
        raise HTTPException(status_code=504, detail="O TSE demorou demais para responder. Tente novamente.") from exc
    except httpx.HTTPError as exc:
        raise HTTPException(status_code=502, detail="Não foi possível se comunicar com a API do TSE.") from exc


@router.get("/candidatos")
async def listar_candidatos(
    ano: int = Query(..., description="Ano eleitoral: 2024, 2022 ou 2020"),
    uf: str = Query(..., description="Sigla da UF (2 letras) ou BR"),
    codigo_cargo: int = Query(..., description="Código do cargo (1, 3, 5, 6, 7, 11, 13)"),
):
    """Lista candidatos de uma eleição com base em ano, UF e cargo."""
    uf = _validar_uf(uf)
    id_eleicao = _id_eleicao(ano)
    _validar_cargo(codigo_cargo)

    url = f"{BASE_TSE}/candidatura/listar/{ano}/{uf}/{id_eleicao}/{codigo_cargo}/candidatos"
    dados = await _get_json(url)

    candidatos_brutos = dados.get("candidatos") or []

    candidatos = []
    for c in candidatos_brutos:
        partido = c.get("partido") or {}
        candidatos.append(
            {
                "id": c.get("id"),
                "nomeUrna": c.get("nomeUrna"),
                "nomeCompleto": c.get("nomeCompleto"),
                "numero": c.get("numero"),
                "siglaPartido": partido.get("sigla") or c.get("siglaPartido"),
                "descricaoSituacao": c.get("descricaoSituacao"),
                "fotoUrl": c.get("fotoUrl"),
            }
        )

    return {"total": len(candidatos), "candidatos": candidatos}


@router.get("/candidato/{ano}/{uf}/{id_candidato}")
async def detalhe_candidato(
    ano: int,
    uf: str,
    id_candidato: int,
):
    """Detalha um candidato, incluindo dados pessoais, eleição e patrimônio declarado."""
    uf = _validar_uf(uf)
    id_eleicao = _id_eleicao(ano)

    url = f"{BASE_TSE}/candidatura/buscar/{ano}/{uf}/{id_eleicao}/candidato/{id_candidato}"
    dados = await _get_json(url)

    # A API varia entre as versões: candidato direto ou aninhado em dadosCandidato
    conteudo = dados.get("candidato") or dados.get("dadosCandidato") or dados

    partido = conteudo.get("partido") or {}
    coligacao = conteudo.get("coligacao")
    federacao = conteudo.get("federacao")

    bens_brutos = dados.get("bens") or []
    bens = []
    for bem in bens_brutos:
        valor_raw = bem.get("valorBem") or 0
        bens.append(
            {
                "tipo": _texto(bem.get("descricaoTipoBem")),
                "descricao": str(bem.get("descricaoDetalhadaBem") or bem.get("descricaoBem") or "").strip(),
                "valor": round(float(valor_raw), 2),
            }
        )

    return {
        "dados": {
            "nomeCompleto": conteudo.get("nomeCompleto"),
            "nomeUrna": conteudo.get("nomeUrna"),
            "cpf": conteudo.get("cpf"),
            "ocupacao": _texto(conteudo.get("ocupacao")),
            "grauInstrucao": _texto(conteudo.get("grauInstrucao")),
            "situacao": conteudo.get("descricaoSituacao"),
            "fotoUrl": conteudo.get("fotoUrl"),
        },
        "eleicao": {
            "partido": partido.get("sigla"),
            "numero": conteudo.get("numero"),
            "coligacao": _texto(coligacao) if isinstance(coligacao, dict) else str(coligacao or "").strip() or None,
            "federacao": _texto(federacao) if isinstance(federacao, dict) else str(federacao or "").strip() or None,
        },
        "patrimonio": {
            "totalDeBens": round(sum(b["valor"] for b in bens), 2),
            "bens": bens,
        },
    }