from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from slowapi.middleware import SlowAPIMiddleware

from rate_limit import limiter
from config import settings
from extrator_tse import router as rotas_extrator_tse
from exportador_local import router as rotas_exportador_local
from exportador_pdf import router as rotas_exportador_pdf
from routers import (
    deputados,
    proposicoes,
    eventos,
    autores,
    frentes,
    monitoramento,
    dou,
    tse,
    ai,
    fachada,
    planilha,
    auditoria,
)
from routers.senado import materias as senado_materias, comissoes as senado_comissoes

# Garante as pastas essenciais (entregas, cache, logs) — apenas filesystem local,
# sem nenhuma consulta a API externa (conforme AGENTS.md).
settings.garantir_diretorios()

app = FastAPI(
    title="RelMeg API",
    description="Back-end de monitoramento legislativo e stakeholder intelligence"
)

# Rate limiting (slowapi): limite genérico para todas as rotas + limites
# específicos nas rotas pesadas via @limiter.limit (ver backend/rate_limit.py).
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# CORS restritivo: somente origens explicitamente autorizadas.
# NUNCA use allow_origins=["*"] em produção (invalida cookies/credentials).
# O domínio de produção e o ambiente local do Vite são fixos; origens extras
# podem ser adicionadas via variável de ambiente RELMEG_CORS_ORIGINS.
origens_padrao = [
    "https://relmegpina.vercel.app",
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:8082",
    "http://127.0.0.1:8082",
]
origens_configuradas = [
    origem.strip()
    for origem in settings.relmeg_cors_origins_extra.split(",")
    if origem.strip()
]
allow_origins = [*origens_padrao, *origens_configuradas]

# Ordem dos middlewares: Starlette empilha de trás para frente, então a CORS
# é adicionada por último para ficar como a camada mais externa (respostas 429
# e erros também recebem os cabeçalhos CORS corretos).
app.add_middleware(
    SlowAPIMiddleware,
)
app.add_middleware(
    CORSMiddleware,
    allow_origins=allow_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["*"],
)

app.include_router(deputados.router)
app.include_router(proposicoes.router)
app.include_router(eventos.router)
app.include_router(autores.router)
app.include_router(frentes.router)
app.include_router(monitoramento.router)
app.include_router(dou.router)
app.include_router(senado_materias.router)
app.include_router(senado_comissoes.router)
app.include_router(rotas_extrator_tse)
app.include_router(rotas_extrator_tse, prefix="/api")
app.include_router(rotas_exportador_local)
app.include_router(rotas_exportador_pdf)
app.include_router(tse.router)
app.include_router(tse.router, prefix="/api")
app.include_router(ai.router)
app.include_router(ai.router, prefix="/api")
app.include_router(fachada.router)
app.include_router(planilha.router)
app.include_router(auditoria.router)

@app.get("/")
@limiter.limit("60/minute")
async def home(request: Request):
    return {"status": "ok", "mensagem": "Bem-vindo ao back-end do RelMeg modularizado!"}