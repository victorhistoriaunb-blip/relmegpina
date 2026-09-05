import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

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
)
from routers.senado import materias as senado_materias, comissoes as senado_comissoes

app = FastAPI(
    title="RelMeg API",
    description="Back-end de monitoramento legislativo e stakeholder intelligence"
)

# Libera o acesso para o Vite / frontend local e para os deploys configurados.
# Com allow_credentials=True o wildcard ("*") é rejeitado pelos navegadores,
# então as origens são sempre uma lista explícita.
origens_padrao = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:4173",
    "http://127.0.0.1:8000",
    "http://localhost:3000",
]
origens_configuradas = [
    origem.strip()
    for origem in os.environ.get("RELMEG_CORS_ORIGINS", "").split(",")
    if origem.strip()
]
allow_origins = [*origens_padrao, *origens_configuradas]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allow_origins,
    allow_credentials=True,
    allow_methods=["*"],
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
app.include_router(tse.router)
app.include_router(tse.router, prefix="/api")
app.include_router(ai.router)
app.include_router(ai.router, prefix="/api")
app.include_router(fachada.router)
app.include_router(planilha.router)

@app.get("/")
def home():
    return {"status": "ok", "mensagem": "Bem-vindo ao back-end do RelMeg modularizado!"}