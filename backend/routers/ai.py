from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from typing import Optional

router = APIRouter(prefix="/ai", tags=["IA - Resumo DOU"])


class ResumirDOURequest(BaseModel):
    titulo: Optional[str] = Field(None, description="Título da publicação no DOU")
    texto: str = Field(..., description="Texto completo da publicação")


class ResumirDOUResponse(BaseModel):
    titulo: Optional[str]
    resumo: str


@router.post("/resumir-dou", response_model=ResumirDOUResponse)
async def resumir_dou(payload: ResumirDOURequest):
    """Gera um resumo executivo de uma publicação do DOU.

    POC: como não há chave de API de LLM configurada, o endpoint devolve um
    resumo determinístico baseado no título e no tamanho do texto. Quando um
    provider real (ex: OpenAI/Claude) for configurado, basta trocar a
    implementação interna.
    """
    texto = (payload.texto or "").strip()
    titulo = (payload.titulo or "").strip()

    if not texto:
        raise HTTPException(status_code=422, detail="O campo 'texto' é obrigatório.")

    palavras = len(texto.split())
    resumo = (
        f"O ato trata de {titulo or 'publicação oficial no Diário Oficial da União'}. "
        f"O texto (cerca de {palavras} palavras) apresenta uma normativa/ato administrativo "
        "com impacto regulatório. Leia o DOU completo em anexo para conferir prazos, "
        "abrangência e eventuais obrigações de compliance."
    )

    return ResumirDOUResponse(titulo=titulo or None, resumo=resumo)