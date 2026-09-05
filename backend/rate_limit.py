"""Rate limiting centralizado do RelMeg (slowapi).

Todas as rotas pesadas — que consomem APIs externas (Câmara, Senado, DOU,
TSE) ou processos uploads/varreduras — devem usar ``limiter.limit``.

A chave de limitação considera o ``X-Forwarded-For`` quando presente (deploys
atrás de proxy/reverse proxy) e cai para o endereço do socket caso contrário.
"""
from slowapi import Limiter

# Alvo: limite genérico (backstop) aplicado pelo middleware a rotas NÃO
# decoradas. As rotas sensíveis possuem limites próprios mais restritos.
LIMITES_PADRAO = ["120/minute"]

# Limites por grupo de rota (ajuste conforme o uso real em produção)
LIMITE_FACHADA = "10/minute"
LIMITE_PROPOSICOES = "15/minute"
LIMITE_MONITORAMENTO = "10/minute"
LIMITE_DOU = "10/minute"
LIMITE_TSE = "10/minute"
LIMITE_IA = "10/minute"
LIMITE_UPLOAD = "10/minute"


def _chave_remota(request) -> str:
    """Extrai o IP efetivo do cliente, preferindo o 1º endereço de X-Forwarded-For.

    O ``X-Forwarded-For`` é confiável apenas quando o app roda atrás de um
    proxy/reverse-proxy controlado (Render, Vercel, nginx). Isso evita que o
    IP interno do proxy colapse todos os clientes em uma única cota.
    """
    forwarded = request.headers.get("X-Forwarded-For")
    if forwarded:
        primeiro = forwarded.split(",")[0].strip()
        if primeiro:
            return primeiro
    if request.client:
        return request.client.host or "indefinido"
    return "indefinido"


LIMITER_KEY_FUNC = _chave_remota

limiter = Limiter(
    key_func=LIMITER_KEY_FUNC,
    default_limits=LIMITES_PADRAO,
)