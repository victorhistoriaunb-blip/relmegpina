from fastapi import APIRouter, Query
from typing import Optional

from .proposicoes import listar_proposicoes
from .senado.materias import listar_materias_senado

router = APIRouter(tags=["Fachada Câmara/Senado"])


@router.get("/api/camara")
async def camara_resumo(
    siglaTipo: Optional[str] = Query(None, description="Ex: PL, PEC, MPV"),
    ano: Optional[int] = Query(None),
    keywords: Optional[str] = Query(None),
):
    """Versão 'camada de visualização' das proposições da Câmara.

    Reaproveita o endpoint enriquecido /proposicoes para a tela de Câmara.
    """
    return await listar_proposicoes(
        siglaTipo=siglaTipo,
        ano=ano,
        keywords=keywords,
        itens=20,
        enriquecer=True,
    )


@router.get("/api/senado")
async def senado_resumo(
    sigla: Optional[str] = Query(None, description="Ex: PEC, PL, PRS"),
    ano: Optional[int] = Query(None),
    tramitando: Optional[str] = Query("S"),
    keywords: Optional[str] = Query(None),
):
    """Versão 'camada de visualização' das matérias do Senado."""
    return await listar_materias_senado(
        sigla=sigla,
        ano=ano,
        tramitando=tramitando,
        keywords=keywords,
        enriquecer=True,
    )