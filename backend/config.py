"""
Configurações centralizadas do RelMeg (pydantic-settings + pathlib).

Ponto único de verdade para diretórios, URLs de APIs públicas, TTL de cache,
limites de concorrência e parâmetros operacionais. Nenhum módulo pode mais
hardcodar caminhos ou configurações: tudo passa por ``settings``.

Carregamento:
    - Valores padrão tipados definidos abaixo;
    - Sobrescritos por variáveis de ambiente (ex.: RELMEG_DIR_ENTREGAS,
      TSE_BASE_URL, TSE_CACHE_TTL) e pelo arquivo backend/.env, se existir.

Validação inicial:
    - ``settings.garantir_diretorios()`` cria as pastas essenciais (entregas,
      cache, logs) se não existirem; é chamado na montagem da aplicação em
      main.py (sem tocar em APIs externas — ok mesmo com AGENTS.md).
"""
from __future__ import annotations

from functools import lru_cache
from pathlib import Path
from typing import Tuple

from pydantic_settings import BaseSettings, SettingsConfigDict

DIR_ARQUIVO = Path(__file__).resolve()
DIR_BACKEND = DIR_ARQUIVO.parent          # <repo>/backend
RAIZ_REPO = DIR_BACKEND.parent            # raiz do repositório
ARQUIVO_ENV = DIR_BACKEND / ".env"


class Configuracoes(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=str(ARQUIVO_ENV),
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    # ------------------------------------------------------------------
    # Diretórios raiz
    # ------------------------------------------------------------------
    backend_dir: Path = DIR_BACKEND
    repo_root: Path = RAIZ_REPO

    # ------------------------------------------------------------------
    # Pasta de entregas ("RelMeg - Entregas", fora do repositório)
    # ------------------------------------------------------------------
    dir_entregas: Path = Path.home() / "Desktop" / "RelMeg - Entregas"
    subdir_tse: str = "TSE"
    subdir_novas_proposicoes: str = "Novas proposições"
    subdir_relatorios: str = "Relatórios"

    # ------------------------------------------------------------------
    # Cache local e logs
    # ------------------------------------------------------------------
    data_dir: Path = DIR_BACKEND / "data"
    log_dir: Path = DIR_BACKEND / "logs"
    relmeg_cache_db: Path = DIR_BACKEND / "data" / "relmeg_cache.db"
    # Nível de log da observabilidade (loguru). Sobrescrevível via env
    # RELMEG_LOG_LEVEL. Em produção recomendado "INFO"; depuração: "DEBUG".
    log_level: str = "INFO"

    # ------------------------------------------------------------------
    # TSE (DivulgaCandContas) — parâmetros operacionais
    # ------------------------------------------------------------------
    tse_base_url: str = "https://divulgacandcontas.tse.jus.br/divulga/rest/v1"
    tse_portal_url: str = "https://divulgacandcontas.tse.jus.br/divulga/"
    tse_timeout: float = 30.0
    # Concorrência máxima nas chamadas assíncronas de enriquecimento (protege
    # o rate-limit do TSE dentro de uma única requisição on-demand).
    tse_max_concurrency: int = 12
    # Retry com Exponential Backoff + Jitter (falhas de rede, timeouts e
    # bloqueios temporários 403/429/5xx). O atraso entre tentativas cresce como
    # base * 2**(n-1) e soma um jitter aleatório de 0..tse_backoff_jitter.
    tse_max_tentativas: int = 4
    tse_backoff_base: float = 1.0
    tse_backoff_jitter: float = 0.5
    # Janela de validade do cache local (segundos); ttl=0 desativa o reuso.
    tse_cache_ttl: int = 60 * 60 * 24
    tse_user_agent: str = (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
        "(KHTML, like Gecko) Chrome/126.0 Safari/537.36"
    )
    # id_eleicao da API do DivulgaCandContas para as Eleições Gerais 2026.
    # ATENÇÃO: o valor abaixo é o mais provável, mas o TSE bloqueou a
    # verificação desta rede (403); confirme no portal e, se diferente,
    # ajuste via env TSE_ID_ELEICAO_2026 (ex.: "2055502026").
    tse_id_eleicao_2026: str = "2055502026"

    # ------------------------------------------------------------------
    # CORS (origens extras além das padrão de main.py)
    # ------------------------------------------------------------------
    relmeg_cors_origins_extra: str = ""

    # ------------------------------------------------------------------
    # Helpers
    # ------------------------------------------------------------------
    @property
    def dir_tse(self) -> Path:
        """Pasta de entregas dos extratos TSE: <entregas>/TSE."""
        return self.dir_entregas / self.subdir_tse

    @property
    def dir_novas_proposicoes_pasta(self) -> Path:
        """Pasta do Clipping: <entregas>/Novas proposições."""
        return self.dir_entregas / self.subdir_novas_proposicoes

    @property
    def dir_relatorios(self) -> Path:
        """Pasta dos Relatórios Executivos PDF: <entregas>/Relatórios."""
        return self.dir_entregas / self.subdir_relatorios

    def garantir_diretorios(self) -> Tuple[Path, ...]:
        """Cria (se ausentes) as pastas essenciais do projeto.

        Chamado na montagem da aplicação FastAPI. Nenhuma API externa é
        consultada aqui — apenas filesystem local.
        """
        pastas = (
            self.dir_entregas,
            self.dir_tse,
            self.dir_novas_proposicoes_pasta,
            self.dir_relatorios,
            self.data_dir,
            self.log_dir,
            self.relmeg_cache_db.parent,
        )
        for pasta in pastas:
            pasta.mkdir(parents=True, exist_ok=True)
        return pastas


@lru_cache(maxsize=1)
def get_settings() -> Configuracoes:
    """Provedor de configurações (cachê único; usável como dependência DI)."""
    return Configuracoes()


# Singleton de conveniência importado pelos módulos consumidores.
settings = get_settings()