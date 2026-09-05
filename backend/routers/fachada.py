from fastapi import APIRouter, Query
from starlette.requests import Request
from typing import Optional

from rate_limit import limiter, LIMITE_FACHADA
from .proposicoes import _listar_proposicoes
from .senado.materias import _listar_materias_senado

router = APIRouter(tags=["Fachada Câmara/Senado"])


@router.get("/api/camara")
@limiter.limit(LIMITE_FACHADA)
async def camara_resumo(
    request: Request,
    siglaTipo: Optional[str] = Query(None, description="Ex: PL, PEC, MPV"),
    ano: Optional[int] = Query(None, ge=1900, le=2100),
    keywords: Optional[str] = Query(None, min_length=3, max_length=120),
):
    """Versão 'camada de visualização' das proposições da Câmara.

    Reaproveita o endpoint enriquecido /proposicoes para a tela de Câmara.
    """
    return await _listar_proposicoes(
        siglaTipo=siglaTipo,
        ano=ano,
        keywords=keywords,
        itens=20,
        enriquecer=True,
    )


@router.get("/api/senado")
@limiter.limit(LIMITE_FACHADA)
async def senado_resumo(
    request: Request,
    sigla: Optional[str] = Query(None, description="Ex: PEC, PL, PRS"),
    ano: Optional[int] = Query(None, ge=1900, le=2100),
    tramitando: Optional[str] = Query("S", pattern="^[SN]$"),
    keywords: Optional[str] = Query(None, min_length=3, max_length=120),
):
    """Versão 'camada de visualização' das matérias do Senado."""
    return await _listar_materias_senado(
        sigla=sigla,
        ano=ano,
        tramitando=tramitando,
        keywords=keywords,
        enriquecer=True,
    )