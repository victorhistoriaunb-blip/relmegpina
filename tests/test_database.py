"""Testes da camada de cache e do registro de execuções (backend/database.py)."""
import pytest

import database


def _candidato(n: int = 1) -> dict:
    return {
        "id_candidato": n,
        "nome_urna": "NOME",
        "nome_completo": "Nome Cidadão",
        "numero": 10000 + n,
        "partido_sigla": "PT",
        "situacao": "AGUARDANDO JULGAMENTO",
        "ocupacao": "Profissão",
        "genero": "MASCULINO",
        "cor_raca": "PARDA",
        "grau_instrucao": "SUPERIOR",
        "estado_civil": "CASADO",
        "data_nascimento": "1980-01-01",
        "municipio": None,
        "coligacao": "COLIGAÇÃO",
        "total_bens_declarados": 1000.50,
        "cpf": "00000000000",
        "cnpj": "",
        "foto_url": "",
        "tem_detalhe": True,
    }


def test_round_trip_com_caracteres_especiais():
    chave = "tse|2026|GO|7|completo"
    dados = [_candidato(1)]
    dados[0]["nome_urna"] = 'JOSÉ MARIA ç ñ & < > "s '
    database.salvar_candidatos_tse(chave, 2026, "GO", 7, None, None, dados, origem="api")

    saida = database.carregar_candidatos_tse(chave)
    assert saida is not None
    assert saida[0]["nome_urna"] == dados[0]["nome_urna"]
    assert database.cache_fresco(chave, 3600) is True


def test_cache_ttl_zero_rejeita_reuso():
    chave = "tse|2026|GO|7|completo"
    database.salvar_candidatos_tse(chave, 2026, "GO", 7, None, None, [_candidato(1)])
    assert database.cache_fresco(chave, 0) is False


def test_reescrita_atomica_atualiza_total():
    chave = "tse|2026|GO|7|completo"
    database.salvar_candidatos_tse(chave, 2026, "GO", 7, None, None, [_candidato(1)])
    database.salvar_candidatos_tse(
        chave, 2026, "GO", 7, None, None, [_candidato(1), _candidato(2)]
    )
    info = database.info_cache(chave)
    assert info is not None
    assert info["total_candidatos"] == 2


def test_carregar_sem_dados_retorna_none():
    assert database.carregar_candidatos_tse("tse|9999|ZZ|0|completo") is None


def test_registro_de_execucao_e_etapas():
    task_id = "task-test-1"
    database.criar_execucao_tse(task_id, 2026, "go", 7, forcar_atualizacao=False)
    database.atualizar_execucao_tse(task_id, status="Executando", etapa="Coletando dados da API")
    database.atualizar_execucao_tse(
        task_id, status="Concluído", etapa="Concluído",
        total_candidatos=2, origem="cache",
    )

    reg = database.obter_execucao_tse(task_id)
    assert reg is not None
    assert reg["status"] == "Concluído"
    assert reg["uf"] == "GO"
    assert len(reg["etapas"]) == 3
    assert reg["total_candidatos"] == 2
    assert reg["origem"] == "cache"
    assert reg["concluido_em"] is not None


def test_execucao_ativa_bloqueia_segundo_disparo():
    t1 = "task-ativa-1"
    database.criar_execucao_tse(t1, 2026, "GO", 7)
    database.atualizar_execucao_tse(t1, status="Executando")

    ativa = database.execucao_ativa_tse(2026, "GO", 7)
    assert ativa is not None and ativa["task_id"] == t1

    database.atualizar_execucao_tse(t1, status="Concluído")
    assert database.execucao_ativa_tse(2026, "GO", 7) is None


def test_execucao_ativa_ignora_outro_escopo():
    database.criar_execucao_tse("t-go", 2026, "GO", 7)
    database.atualizar_execucao_tse("t-go", status="Executando")
    assert database.execucao_ativa_tse(2026, "SP", 7) is None

    linha = database.listar_execucoes_tse(limite=10)
    assert any(r["task_id"] == "t-go" for r in linha)

    # Finaliza o registro para não contaminar testes de rota no mesmo banco.
    database.atualizar_execucao_tse("t-go", status="Concluído")
    assert database.execucao_ativa_tse(2026, "GO", 7) is None


def test_obter_execucao_desconhecida_retorna_none():
    assert database.obter_execucao_tse("task-nao-existe") is None


@pytest.mark.parametrize("task", ["", None])
def test_obter_execucao_entradas_atipicas(task):
    assert database.obter_execucao_tse(task) is None or isinstance(
        database.obter_execucao_tse(task), dict
    )