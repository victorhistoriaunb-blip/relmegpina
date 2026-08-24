from fastapi import FastAPI
from routers import deputados, proposicoes, eventos, autores, frentes
from routers.senado import materias as senado_materias, comissoes as senado_comissoes

app = FastAPI(title="RelMeg API", description="Back-end de monitoramento legislativo e stakeholder intelligence")

app.include_router(deputados.router)
app.include_router(proposicoes.router)
app.include_router(eventos.router)
app.include_router(autores.router)
app.include_router(frentes.router)
app.include_router(senado_materias.router)
app.include_router(senado_comissoes.router)  # <--- Adicionado aqui

@app.get("/")
def home():
    return {"status": "ok", "mensagem": "Bem-vindo ao back-end do RelMeg modularizado!"}