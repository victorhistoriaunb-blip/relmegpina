import base64
import csv
import io
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, File, Form, HTTPException, UploadFile

router = APIRouter(prefix="/api", tags=["Upload de planilhas e exportação BI"])

COLUNAS_PADRAO = ["nome", "partido", "uf", "cargo", "interesse1", "contrario1", "setor1", "descricao"]


def _ler_xlsx(conteudo: bytes) -> List[Dict[str, Any]]:
    try:
        import openpyxl
    except ImportError as exc:
        raise HTTPException(
            status_code=501,
            detail="O processamento de .xlsx no backend exige a dependência 'openpyxl'. Instale com 'pip install openpyxl'.",
        ) from exc

    workbook = openpyxl.load_workbook(io.BytesIO(conteudo), read_only=True, data_only=True)
    planilha = workbook.active
    linhas = planilha.iter_rows(values_only=True)
    cabecalho = None
    registros: List[Dict[str, Any]] = []
    for index, linha in enumerate(linhas):
        if index == 0:
            cabecalho = [str(c or "").strip().lower() if c is not None else "" for c in linha]
            continue
        if linha is None:
            continue
        valores = [str(c or "").strip() if c is not None else "" for c in linha]
        registro = {cabecalho[i]: v for i, v in enumerate(valores) if i < len(cabecalho)}
        if any(registro.values()):
            registros.append(registro)
    return registros


def _ler_csv(conteudo: bytes) -> List[Dict[str, Any]]:
    texto = conteudo.decode("utf-8-sig", errors="replace")
    leitor = csv.DictReader(io.StringIO(texto), delimiter=";")
    registros: List[Dict[str, Any]] = []
    for linha in leitor:
        normalizado = {str(k or "").strip().lower(): str(v or "").strip() for k, v in linha.items()}
        if any(normalizado.values()):
            registros.append(normalizado)
    return registros


@router.post("/upload/planilha")
async def upload_planilha(
    file: UploadFile = File(..., description="Arquivo .csv, .xlsx ou .pdf"),
    cliente: Optional[str] = Form(None, description="Chave do cliente/projeto ativo"),
):
    """Recebe planilhas (.csv/.xlsx) ou PDF e devolve os registros normalizados.

    - .csv → parsing com a biblioteca padrão (`;` ou `,`)
    - .xlsx → parsing via openpyxl (opcional)
    - .pdf → armazenado como anexo base64 do projeto ativo
    """
    if not file or not file.filename:
        raise HTTPException(status_code=400, detail="Nenhum arquivo enviado.")

    extensao = (file.filename or "").rsplit(".", 1)[-1].lower()
    conteudo = await file.read()

    if extensao == "csv":
        registros = _ler_csv(conteudo)
        return {"arquivo": file.filename, "formato": "csv", "cliente": cliente, "total": len(registros), "registros": registros}

    if extensao in ("xlsx", "xls"):
        registros = _ler_xlsx(conteudo)
        return {"arquivo": file.filename, "formato": "xlsx", "cliente": cliente, "total": len(registros), "registros": registros}

    if extensao == "pdf":
        anexo = {
            "id": f"anexo-{base64.urlsafe_b64encode(file.filename.encode()).decode()[:12]}",
            "cliente": cliente,
            "nome": file.filename,
            "tipo": "pdf",
            "tamanho_bytes": len(conteudo),
            "conteudo_base64": base64.b64encode(conteudo).decode(),
        }
        return {"arquivo": file.filename, "formato": "pdf", "cliente": cliente, "anexo": anexo}

    raise HTTPException(status_code=400, detail="Formato não suportado. Use .csv, .xlsx ou .pdf.")


@router.post("/exportar/sheets")
async def exportar_sheets(payload: Dict[str, Any]):
    """Ponte para Google Sheets / Looker Studio.

    Recebe `{"nome": "...", "registros": [{...}]}` e devolve um CSV pronto
    para colar no Google Sheets (onde o Looker Studio se conecta).
    """
    nome = str(payload.get("nome") or "relmeg-exportacao")
    registros: List[Dict[str, Any]] = payload.get("registros") or []
    if not isinstance(registros, list):
        raise HTTPException(status_code=400, detail="O campo 'registros' precisa ser uma lista.")

    colunas: List[str] = []
    for registro in registros:
        if isinstance(registro, dict):
            for chave in registro.keys():
                if str(chave) not in colunas:
                    colunas.append(str(chave))

    if not colunas:
        return {"nome": nome, "csv": "", "colunas": [], "total": 0}

    saida = io.StringIO()
    escritor = csv.writer(saida, delimiter=";", quoting=csv.QUOTE_MINIMAL)
    escritor.writerow(colunas)
    for registro in registros:
        if isinstance(registro, dict):
            escritor.writerow([str(registro.get(c, "") or "") for c in colunas])

    return {
        "nome": nome,
        "csv": saida.getvalue(),
        "colunas": colunas,
        "total": len(registros),
        "ponte": "Cole o CSV em uma planilha do Google Sheets para conectar ao Looker Studio (via URL pública ou BigQuery).",
    }