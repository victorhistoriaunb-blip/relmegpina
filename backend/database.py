"""
Camada de persistência e cache local do RelMeg (SQLite).

Garante que os resultados de extrações pesadas (TSE) fiquem disponíveis mesmo
quando as APIs públicas governamentais estiverem instáveis ou estiverem
bloqueando acessos automatizados (ex.: HTTP 403 do TSE). Uma vez salva, a base
é reutilizada dentro de uma janela de validade (TTL) sem refazer as chamadas de
enriquecimento — resposta instantânea e proteção contra rate limits.

Decisão de engine: SQLite (stdlib) em vez de DuckDB.
    - Zero dependência adicional em ambiente serverless (nenhuma lib nativa).
    - O volume dos extratos é baixo (centenas/milhares de linhas) e bem servido
      por um banco transacional simples com WAL.
    - Toda a lógica está isolada nas funções deste módulo: trocar o engine por
      DuckDB depois é uma alteração localizada (INSERT/SELECT), sem impacto no
      extrator ou nas rotas.

Tabelas:
    - tse_candidatos_raw : linhas brutas de candidatos (1 coluna por chave do
      DataFrame BI), indexadas por cache_key.
    - tse_cache_execucoes: histórico/controle por filtro (ano, uf, cargo), TTL,
      origem da captura e timestamps.
"""
from __future__ import annotations

import json
import sqlite3
import threading
from contextlib import contextmanager
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, Iterator, List, Optional

from config import settings


def caminho_db() -> Path:
    """Caminho completo do arquivo do banco local (config.py / RELMEG_CACHE_DB)."""
    return settings.relmeg_cache_db


# ---------------------------------------------------------------------------
# Schema
# ---------------------------------------------------------------------------

_TABELA_CANDIDATOS = """CREATE TABLE IF NOT EXISTS tse_candidatos_raw (
    cache_key                TEXT NOT NULL,
    linha                    INTEGER NOT NULL,
    ano                      INTEGER,
    uf                       TEXT,
    cargo                    TEXT,
    id_candidato             TEXT,
    nome_urna                TEXT,
    nome_completo            TEXT,
    numero                   TEXT,
    partido_sigla            TEXT,
    situacao                 TEXT,
    ocupacao                 TEXT,
    genero                   TEXT,
    cor_raca                 TEXT,
    grau_instrucao           TEXT,
    estado_civil             TEXT,
    data_nascimento          TEXT,
    municipio                TEXT,
    coligacao                TEXT,
    total_bens_declarados    REAL,
    cpf                      TEXT,
    cnpj                     TEXT,
    foto_url                 TEXT,
    tem_detalhe              INTEGER,
    capturado_em             TEXT NOT NULL
)"""

_TABELA_EXECUCOES = """CREATE TABLE IF NOT EXISTS tse_cache_execucoes (
    cache_key        TEXT PRIMARY KEY,
    ano              INTEGER NOT NULL,
    uf               TEXT NOT NULL,
    codigo_cargo     INTEGER NOT NULL,
    municipio        TEXT,
    limite           INTEGER,
    origem           TEXT NOT NULL DEFAULT 'api',
    total_candidatos INTEGER NOT NULL DEFAULT 0,
    criado_em        TEXT NOT NULL,
    ultimo_acesso    TEXT NOT NULL,
    meta             TEXT
)"""

# Registro das execuções em segundo plano (jobs) de extração do TSE: estado e
# etapas para acompanhamento via rota de status (/tse/execucoes/{task_id}).
_TABELA_EXECUCOES_TSE = """CREATE TABLE IF NOT EXISTS tse_execucoes (
    task_id             TEXT PRIMARY KEY,
    ano                 INTEGER NOT NULL,
    uf                  TEXT NOT NULL,
    codigo_cargo        INTEGER NOT NULL,
    municipio           TEXT,
    limite              INTEGER,
    forcar_atualizacao  INTEGER NOT NULL DEFAULT 0,
    status              TEXT NOT NULL,
    etapas              TEXT NOT NULL DEFAULT '[]',
    detalhe             TEXT,
    criado_em           TEXT NOT NULL,
    concluido_em        TEXT,
    total_candidatos    INTEGER,
    origem              TEXT,
    cache_key           TEXT,
    caminho_arquivo     TEXT
)"""

_TABELA_EVENTOS = """CREATE TABLE IF NOT EXISTS auditoria_eventos (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    tipo        TEXT NOT NULL,
    detalhe     TEXT NOT NULL,
    criado_em   TEXT NOT NULL
)"""

_INDICES = [
    "CREATE INDEX IF NOT EXISTS idx_tse_raw_chave ON tse_candidatos_raw (cache_key)",
    "CREATE INDEX IF NOT EXISTS idx_tse_raw_filtro ON tse_candidatos_raw (ano, uf, cargo)",
    "CREATE INDEX IF NOT EXISTS idx_tse_exec_concluido ON tse_execucoes (concluido_em)",
    "CREATE INDEX IF NOT EXISTS idx_eventos_tipo ON auditoria_eventos (tipo, criado_em)",
]

# As 22 chaves do DataFrame BI (COLUNAS_BI em extrator_tse.py) — nomeiam
# exatamente as colunas da tabela bruta.
CHAVES_DF = [
    "ano", "uf", "cargo", "id_candidato", "nome_urna", "nome_completo",
    "numero", "partido_sigla", "situacao", "ocupacao", "genero", "cor_raca",
    "grau_instrucao", "estado_civil", "data_nascimento", "municipio",
    "coligacao", "total_bens_declarados", "cpf", "cnpj", "foto_url",
    "tem_detalhe",
]
_CHAVES_SQL = ", ".join(CHAVES_DF)

_cerveja_lock = threading.Lock()
_ini_ok = False


def _agora_utc() -> str:
    """Timestamp ISO-8601 em UTC (armazenamento e comparação de TTL)."""
    return datetime.now(timezone.utc).isoformat()


@contextmanager
def _conectar() -> Iterator[sqlite3.Connection]:
    """Abre conexão SQLite (WAL) e GARANTE fechamento automático no `with`.

    Thread-safety: ao sair do bloco ``with`` a conexão é encerrada
    explicitamente (``con.close()``). Isso impede conexões penduradas quando
    BackgroundTasks são abortadas/encerradas abruptamente — evitando o erro
    "database is locked" por conexões nunca liberadas.
    """
    caminho = caminho_db()
    caminho.parent.mkdir(parents=True, exist_ok=True)
    con = sqlite3.connect(str(caminho), timeout=60)
    con.row_factory = sqlite3.Row
    con.execute("PRAGMA journal_mode=WAL")
    con.execute("PRAGMA synchronous=NORMAL")
    con.execute("PRAGMA busy_timeout=30000")
    try:
        yield con
    finally:
        con.close()


def init_db() -> None:
    """Cria as tabelas e índices (idempotente), lazily na primeira utilização."""
    global _ini_ok, _cerveja_lock
    if _ini_ok:
        return
    with _cerveja_lock:
        if _ini_ok:
            return
        with _conectar() as con:
            con.executescript(
                _TABELA_CANDIDATOS + ";\n" + _TABELA_EXECUCOES + ";\n" +
                _TABELA_EXECUCOES_TSE + ";\n" + _TABELA_EVENTOS + ";\n" +
                ";\n".join(_INDICES)
            )
            con.commit()
        _ini_ok = True


# ---------------------------------------------------------------------------
# Meta de execução / TTL
# ---------------------------------------------------------------------------

def info_cache(cache_key: str) -> Optional[Dict[str, Any]]:
    """Retorna os metadados da última execução para a chave, ou None."""
    try:
        init_db()
        with _conectar() as con:
            linha = con.execute(
                "SELECT * FROM tse_cache_execucoes WHERE cache_key = ?",
                (cache_key,),
            ).fetchone()
            return dict(linha) if linha else None
    except sqlite3.Error:
        return None


def cache_fresco(cache_key: str, ttl_segundos: int) -> bool:
    """True se há uma execução salva para a chave dentro da janela do TTL."""
    if not ttl_segundos or ttl_segundos <= 0:
        return False
    info = info_cache(cache_key)
    if not info:
        return False
    try:
        criado = datetime.fromisoformat(info["criado_em"])
        agora = datetime.now(timezone.utc)
        if criado.tzinfo is None:
            criado = criado.replace(tzinfo=timezone.utc)
        return (agora - criado).total_seconds() < ttl_segundos
    except (ValueError, TypeError):
        return False


def registrar_uso(cache_key: str) -> None:
    """Atualiza o último acesso (auditoria/depuração de hit no cache)."""
    try:
        init_db()
        with _conectar() as con:
            con.execute(
                "UPDATE tse_cache_execucoes SET ultimo_acesso = ? WHERE cache_key = ?",
                (_agora_utc(), cache_key),
            )
            con.commit()
    except sqlite3.Error:
        pass


# ---------------------------------------------------------------------------
# Escrita / leitura dos candidatos brutos
# ---------------------------------------------------------------------------

def _normalizar_valor(chave: str, valor: Any) -> Any:
    """Aplica coerção de tipo por coluna antes de gravar no SQLite."""
    if chave == "total_bens_declarados":
        if valor is None:
            return None
        try:
            return round(float(valor), 2)
        except (TypeError, ValueError):
            return None
    if chave == "tem_detalhe":
        return 1 if valor else 0
    if chave in ("ano",):
        try:
            return int(valor)
        except (TypeError, ValueError):
            return None
    if valor is None:
        return None
    return str(valor)


def salvar_candidatos_tse(
    cache_key: str,
    ano: int,
    uf: str,
    codigo_cargo: int,
    municipio: Optional[str],
    limite: Optional[int],
    candidatos: List[Dict[str, Any]],
    origem: str = "api",
    meta: Optional[Dict[str, Any]] = None,
) -> None:
    """(Re)grava a base bruta de candidatos e o registro de execução.

    Substituição atômica por chave: um novo pull elimina as linhas antigas da
    mesma extração dentro da mesma transação (nunca fica metade velha/metade
    nova servindo de cache).
    """
    init_db()
    capturado = _agora_utc()
    with _conectar() as con:
        con.execute("BEGIN")
        con.execute("DELETE FROM tse_candidatos_raw WHERE cache_key = ?", (cache_key,))
        con.executemany(
            "INSERT INTO tse_candidatos_raw (cache_key, linha, " + _CHAVES_SQL +
            ", capturado_em) VALUES (?, ?, " +
            ", ".join("?" for _ in CHAVES_DF) + ", ?)",
            [
                (cache_key, i,
                 *[_normalizar_valor(chave, candidato.get(chave)) for chave in CHAVES_DF],
                 capturado)
                for i, candidato in enumerate(candidatos)
            ],
        )
        con.execute(
            "INSERT INTO tse_cache_execucoes "
            "(cache_key, ano, uf, codigo_cargo, municipio, limite, origem, "
            " total_candidatos, criado_em, ultimo_acesso, meta) "
            "VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?) "
            "ON CONFLICT(cache_key) DO UPDATE SET "
            "ano = excluded.ano, uf = excluded.uf, "
            "codigo_cargo = excluded.codigo_cargo, municipio = excluded.municipio, "
            "limite = excluded.limite, origem = excluded.origem, "
            "total_candidatos = excluded.total_candidatos, "
            "criado_em = excluded.criado_em, ultimo_acesso = excluded.ultimo_acesso, "
            "meta = excluded.meta",
            (
                cache_key, ano, uf.upper(), codigo_cargo, municipio, limite,
                origem, len(candidatos), capturado, capturado,
                meta and json.dumps(meta, ensure_ascii=False, default=str) or None,
            ),
        )
        con.commit()


def carregar_candidatos_tse(cache_key: str) -> Optional[List[Dict[str, Any]]]:
    """Lê a base salva para a chave como lista de dicts (22 chaves do BI).

    Retorna None se não houver nenhuma linha gravada (nunca uma lista vazia para
    diferenciar "sem cache" de "extração legítima sem candidatos").
    """
    try:
        init_db()
        with _conectar() as con:
            linhas = con.execute(
                "SELECT " + _CHAVES_SQL + " FROM tse_candidatos_raw "
                "WHERE cache_key = ? ORDER BY linha ASC",
                (cache_key,),
            ).fetchall()
    except sqlite3.Error:
        return None
    if not linhas:
        return None
    return [dict(linha) for linha in linhas]


# ---------------------------------------------------------------------------
# Registro de execuções em segundo plano (jobs de extração do TSE)
# ---------------------------------------------------------------------------

def criar_execucao_tse(
    task_id: str,
    ano: int,
    uf: str,
    codigo_cargo: int,
    municipio: Optional[str] = None,
    limite: Optional[int] = None,
    forcar_atualizacao: bool = False,
) -> None:
    """Abre um registro de execução com status inicial 'Iniciado'."""
    init_db()
    agora = _agora_utc()
    with _conectar() as con:
        con.execute(
            "INSERT OR REPLACE INTO tse_execucoes "
            "(task_id, ano, uf, codigo_cargo, municipio, limite, "
            " forcar_atualizacao, status, etapas, criado_em, concluido_em) "
            "VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL)",
            (task_id, ano, uf.upper(), codigo_cargo, municipio, limite,
             1 if forcar_atualizacao else 0, "Iniciado", "[]", agora),
        )
        con.execute(
            "UPDATE tse_execucoes SET etapas = ? WHERE task_id = ?",
            (json.dumps([f"{agora} Iniciado"], ensure_ascii=False), task_id),
        )
        con.commit()


def atualizar_execucao_tse(
    task_id: str,
    *,
    status: Optional[str] = None,
    etapa: Optional[str] = None,
    detalhe: Optional[str] = None,
    total_candidatos: Optional[int] = None,
    origem: Optional[str] = None,
    cache_key: Optional[str] = None,
    caminho_arquivo: Optional[str] = None,
) -> None:
    """Atualiza status/etapa (append no log de etapas) de uma execução.

    Falhas de escrita nunca devem quebrar o worker: engolem sqlite.Error.
    """
    try:
        init_db()
        with _conectar() as con:
            agora = _agora_utc()
            campos = []
            parametros: list = []
            if status:
                campos.append("status = ?")
                parametros.append(status)
                if status in ("Concluído", "Falhou"):
                    campos.append("concluido_em = ?")
                    parametros.append(agora)
            if detalhe is not None:
                campos.append("detalhe = ?")
                parametros.append(str(detalhe)[:2000])
            if total_candidatos is not None:
                campos.append("total_candidatos = ?")
                parametros.append(total_candidatos)
            if origem:
                campos.append("origem = ?")
                parametros.append(origem)
            if cache_key:
                campos.append("cache_key = ?")
                parametros.append(cache_key)
            if caminho_arquivo is not None:
                campos.append("caminho_arquivo = ?")
                parametros.append(str(caminho_arquivo))

            if etapa:
                campos.append("etapas = json_insert(etapas, '$[#]', ?)")
                parametros.append(f"{agora} {etapa}")

            parametros.append(task_id)
            if campos:
                con.execute(
                    "UPDATE tse_execucoes SET " + ", ".join(campos) +
                    " WHERE task_id = ?",
                    parametros,
                )
            con.commit()
    except sqlite3.Error:
        pass


def obter_execucao_tse(task_id: str) -> Optional[Dict[str, Any]]:
    """Retorna o registro completo de uma execução (ou None)."""
    try:
        init_db()
        with _conectar() as con:
            linha = con.execute(
                "SELECT * FROM tse_execucoes WHERE task_id = ?", (task_id,)
            ).fetchone()
            if linha is None:
                return None
            registro = dict(linha)
            try:
                registro["etapas"] = json.loads(registro.get("etapas") or "[]")
            except (TypeError, ValueError):
                registro["etapas"] = []
            return registro
    except sqlite3.Error:
        return None


def listar_execucoes_tse(limite: int = 20) -> List[Dict[str, Any]]:
    """Lista as execuções mais recentes (para a rota geral de status)."""
    try:
        init_db()
        with _conectar() as con:
            linhas = con.execute(
                "SELECT task_id, ano, uf, codigo_cargo, status, criado_em, "
                "       concluido_em, total_candidatos, origem "
                "FROM tse_execucoes ORDER BY criado_em DESC LIMIT ?",
                (int(limite),),
            ).fetchall()
            return [dict(r) for r in linhas]
    except sqlite3.Error:
        return []


def execucao_ativa_tse(
    ano: int,
    uf: str,
    codigo_cargo: int,
    municipio: Optional[str] = None,
) -> Optional[Dict[str, Any]]:
    """Retorna a execução em andamento para o mesmo escopo (ou None).

    Usada pelo trigger para recusar (409) disparo concorrente, conforme
    exigência do AGENTS.md.
    """
    try:
        init_db()
        with _conectar() as con:
            linha = con.execute(
                "SELECT task_id, status, criado_em FROM tse_execucoes "
                "WHERE ano = ? AND uf = ? AND codigo_cargo = ? "
                "  AND IFNULL(municipio, '') = IFNULL(?, '') "
                "  AND status IN ('Iniciado', 'Executando') "
                "ORDER BY criado_em DESC LIMIT 1",
                (ano, uf.upper(), codigo_cargo, municipio),
            ).fetchone()
            return dict(linha) if linha else None
    except sqlite3.Error:
        return None


# ---------------------------------------------------------------------------
# Auditoria e registro estruturado de eventos
# ---------------------------------------------------------------------------

def registrar_evento(tipo: str, detalhe: str) -> None:
    """Registra um evento estruturado (Family Talks, Modelo Base, falhas).

    Falhas de escrita nunca devem quebrar o fluxo: engole sqlite.Error.
    Ex.: registrar_evento("family_talks", "37 aprovadas, 12 descartadas").
    """
    try:
        init_db()
        with _conectar() as con:
            con.execute(
                "INSERT INTO auditoria_eventos (tipo, detalhe, criado_em) "
                "VALUES (?, ?, ?)",
                (tipo, str(detalhe)[:2000], _agora_utc()),
            )
            con.commit()
    except sqlite3.Error:
        pass


def listar_eventos(limite: int = 50) -> List[Dict[str, Any]]:
    """Lista os eventos estruturados mais recentes (auditoria)."""
    try:
        init_db()
        with _conectar() as con:
            linhas = con.execute(
                "SELECT id, tipo, detalhe, criado_em FROM auditoria_eventos "
                "ORDER BY id DESC LIMIT ?",
                (max(1, int(limite)),),
            ).fetchall()
            return [dict(r) for r in linhas]
    except sqlite3.Error:
        return []


def resumo_metricas_tse() -> Dict[str, Any]:
    """Resumo operacional das extrações (taxa de sucesso, falhas, tempo médio)."""
    try:
        init_db()
        with _conectar() as con:
            linhas = con.execute(
                "SELECT status, criado_em, concluido_em, total_candidatos "
                "FROM tse_execucoes",
            ).fetchall()
    except sqlite3.Error:
        linhas = []

    total = len(linhas)
    concluidas = sum(1 for r in linhas if r["status"] == "Concluído")
    falhas = sum(1 for r in linhas if r["status"] == "Falhou")
    executando = sum(1 for r in linhas if r["status"] in ("Iniciado", "Executando"))

    def _segundos(criado: Optional[str], concluido: Optional[str]) -> Optional[float]:
        if not criado or not concluido:
            return None
        try:
            return round((datetime.fromisoformat(concluido) - datetime.fromisoformat(criado)).total_seconds(), 1)
        except (TypeError, ValueError):
            return None

    tempos = [
        t for t in (_segundos(r["criado_em"], r["concluido_em"]) for r in linhas if r["status"] == "Concluído")
        if t is not None
    ]
    totais_ok = [r["total_candidatos"] for r in linhas if r["status"] == "Concluído" and r["total_candidatos"] is not None]

    return {
        "total_execucoes": total,
        "em_execucao": executando,
        "concluidas": concluidas,
        "falhas": falhas,
        "taxa_sucesso": round((concluidas / total * 100), 1) if total else 0.0,
        "tempo_medio_segundos": (round(sum(tempos) / len(tempos), 1) if tempos else None),
        "total_candidatos_processados": sum(totais_ok) if totais_ok else 0,
    }


def historico_execucoes_tse(limite: int = 50) -> List[Dict[str, Any]]:
    """Panorama detalhado das últimas execuções (status, tempos, arquivo)."""
    try:
        init_db()
        with _conectar() as con:
            linhas = con.execute(
                "SELECT task_id, ano, uf, codigo_cargo, municipio, status, "
                "       criado_em, concluido_em, total_candidatos, origem, "
                "       cache_key, caminho_arquivo, detalhe, etapas "
                "FROM tse_execucoes ORDER BY criado_em DESC LIMIT ?",
                (max(1, int(limite)),),
            ).fetchall()
            registros = []
            for r in linhas:
                reg = dict(r)
                try:
                    reg["etapas"] = json.loads(reg.get("etapas") or "[]")
                except (TypeError, ValueError):
                    reg["etapas"] = []
                registros.append(reg)
            return registros
    except sqlite3.Error:
        return []