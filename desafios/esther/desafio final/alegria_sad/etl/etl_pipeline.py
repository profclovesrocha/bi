"""
=============================================================================
SAD AlegrIA – IMIP | Pipeline ETL Principal
=============================================================================
Descrição: Extrai dados do DataSUS (simulado/real) e dos registros da
           Classe Figueira, transforma e carrega no Data Warehouse estrela.
Autor     : Equipe AlegrIA
Data      : 2026
LGPD      : Todos os dados de pacientes são anonimizados antes de qualquer
            persistência. Nenhum dado identificável é armazenado.
=============================================================================
"""

import sqlite3
import random
import hashlib
import datetime
import pandas as pd
import numpy as np
from pathlib import Path

# ---------------------------------------------------------------------------
# Configuração
# ---------------------------------------------------------------------------
DB_PATH = Path(__file__).parent.parent / "alegria_dw.db"

# Semente para reprodutibilidade dos dados simulados
random.seed(42)
np.random.seed(42)

# ---------------------------------------------------------------------------
# UTILITÁRIOS LGPD
# ---------------------------------------------------------------------------

def anonimizar_id(id_real: str) -> str:
    """
    Substitui qualquer identificador real por um hash SHA-256 truncado.
    Garante conformidade com o Art. 12 da LGPD (dados anonimizados não são
    dados pessoais).
    """
    return hashlib.sha256(id_real.encode()).hexdigest()[:16]


def validar_menor_idade(data_nascimento: datetime.date) -> bool:
    """Retorna True se o paciente for menor de 18 anos (proteção reforçada)."""
    hoje = datetime.date.today()
    idade = (hoje - data_nascimento).days // 365
    return idade < 18


# ---------------------------------------------------------------------------
# EXTRAÇÃO – Dados simulados (substituir por conexão DataSUS real via API)
# ---------------------------------------------------------------------------

def extrair_pacientes_datasus(n: int = 200) -> pd.DataFrame:
    """
    Simula extração do DataSUS (SIHSUS/SIASUS).
    Em produção: usar pydatasus ou requisição direta ao FTP público do DataSUS.
    Referência: https://datasus.saude.gov.br/transferencia-de-arquivos/
    """
    diagnosticos = [
        "Leucemia Linfoblástica Aguda", "Anemia Falciforme",
        "Cardiopatia Congênita", "Nefropatia Crônica",
        "Fibrose Cística", "Osteossarcoma", "Diabetes Mellitus Tipo 1",
        "Epilepsia Refratária", "Hidrocefalia", "Queimadura Grave"
    ]
    enfermarias = ["Oncologia", "Nefrologia", "Cardiologia",
                   "Ortopedia", "Clínica Geral", "UTI Pediátrica"]
    municipios = ["Recife", "Caruaru", "Olinda", "Jaboatão",
                  "Paulista", "Petrolina", "Garanhuns", "Cabo"]

    registros = []
    for i in range(n):
        data_nasc = datetime.date(2010, 1, 1) + datetime.timedelta(
            days=random.randint(0, 365 * 13)
        )
        internacao = datetime.date(2025, 1, 1) + datetime.timedelta(
            days=random.randint(0, 364)
        )
        dias = random.randint(5, 120)
        alta = internacao + datetime.timedelta(days=dias)

        registros.append({
            "id_anonimo": anonimizar_id(f"pac_{i:04d}"),
            "data_nascimento": data_nasc,
            "faixa_etaria": _calcular_faixa_etaria(data_nasc),
            "diagnostico": random.choice(diagnosticos),
            "enfermaria": random.choice(enfermarias),
            "municipio_origem": random.choice(municipios),
            "data_internacao": internacao,
            "data_alta_prevista": alta,
            "dias_internacao": dias,
            "sexo": random.choice(["M", "F"]),
        })

    df = pd.DataFrame(registros)
    print(f"[ETL] Extraídos {len(df)} registros do DataSUS (simulado).")
    return df


def extrair_sessoes_classe_figueira(pacientes_ids: list, n_sessoes: int = 800) -> pd.DataFrame:
    """
    Extrai registros pedagógicos da Classe Hospitalar Figueira (EMTI Semear).
    Campos alinhados com o KPI do projeto AlegrIA.
    """
    modalidades = ["Co-criação Narrativa", "Quiz Gamificado",
                   "Leitura Assistida por IA", "Atividade Sensorial",
                   "Produção Textual"]
    niveis = ["Pré-silábico", "Silábico", "Silábico-Alfabético", "Alfabético"]
    extensionistas = [anonimizar_id(f"ext_{j}") for j in range(8)]

    registros = []
    data_base = datetime.date(2025, 1, 1)

    for k in range(n_sessoes):
        pac = random.choice(pacientes_ids)
        data_sessao = data_base + datetime.timedelta(days=random.randint(0, 364))

        nivel_inicial = random.randint(0, 3)
        # Simula progressão: há 60% de chance de avançar no nível
        nivel_final = min(3, nivel_inicial + (1 if random.random() < 0.6 else 0))

        duracao = random.randint(20, 60)  # minutos
        engajamento = round(random.uniform(0.4, 1.0), 2)
        palavras = random.randint(5, 80)
        interacoes_ia = random.randint(3, 30)

        # KPI: Índice de Continuidade Escolar (ICE)
        ice = round(min(1.0, (palavras / 50) * engajamento * (duracao / 45)), 3)
        # KPI: Taxa de Alfabetização Digital (TAD)
        tad = round(min(1.0, interacoes_ia / 20 * engajamento), 3)

        registros.append({
            "id_sessao": anonimizar_id(f"sess_{k:05d}"),
            "id_paciente_anonimo": pac,
            "data_sessao": data_sessao,
            "modalidade": random.choice(modalidades),
            "nivel_alfabetizacao_inicial": niveis[nivel_inicial],
            "nivel_alfabetizacao_final": niveis[nivel_final],
            "houve_progresso": nivel_final > nivel_inicial,
            "duracao_minutos": duracao,
            "engajamento_score": engajamento,
            "palavras_produzidas": palavras,
            "interacoes_ia": interacoes_ia,
            "id_extensionista_anonimo": random.choice(extensionistas),
            "indice_continuidade_escolar": ice,
            "taxa_alfabetizacao_digital": tad,
            "bem_estar_emocional": round(random.uniform(0.5, 1.0), 2),
        })

    df = pd.DataFrame(registros)
    print(f"[ETL] Extraídas {len(df)} sessões pedagógicas da Classe Figueira.")
    return df


def _calcular_faixa_etaria(data_nasc: datetime.date) -> str:
    hoje = datetime.date.today()
    idade = (hoje - data_nasc).days // 365
    if idade < 6:
        return "0-5 anos"
    elif idade < 10:
        return "6-9 anos"
    elif idade < 14:
        return "10-13 anos"
    else:
        return "14-17 anos"


# ---------------------------------------------------------------------------
# TRANSFORMAÇÃO – Dimensões e Tabela Fato
# ---------------------------------------------------------------------------

def transformar_dim_tempo(datas: pd.Series) -> pd.DataFrame:
    """Gera a dimensão tempo com hierarquia completa."""
    datas_unicas = pd.to_datetime(datas).dt.date.unique()
    registros = []
    for d in sorted(datas_unicas):
        dt = pd.Timestamp(d)
        trimestre = (dt.month - 1) // 3 + 1
        registros.append({
            "sk_tempo": int(dt.strftime("%Y%m%d")),
            "data_completa": d,
            "ano": dt.year,
            "trimestre": f"T{trimestre}/{dt.year}",
            "mes": dt.month,
            "mes_nome": dt.strftime("%B"),
            "semana_ano": dt.isocalendar()[1],
            "dia": dt.day,
            "dia_semana": dt.strftime("%A"),
            "eh_fim_semana": dt.weekday() >= 5,
        })
    return pd.DataFrame(registros)


def transformar_dim_paciente(df_pacientes: pd.DataFrame) -> pd.DataFrame:
    """Gera dimensão paciente – sem dados identificáveis."""
    dim = df_pacientes[[
        "id_anonimo", "faixa_etaria", "diagnostico",
        "enfermaria", "municipio_origem", "sexo",
        "dias_internacao"
    ]].copy()
    dim.rename(columns={"id_anonimo": "sk_paciente"}, inplace=True)
    dim["grupo_diagnostico"] = dim["diagnostico"].apply(_agrupar_diagnostico)
    return dim.drop_duplicates("sk_paciente")


def transformar_dim_modalidade() -> pd.DataFrame:
    """Dimensão das modalidades pedagógicas."""
    return pd.DataFrame([
        {"sk_modalidade": 1, "modalidade": "Co-criação Narrativa",
         "tipo": "Produção", "usa_ia": True, "componente_principal": "Escrita"},
        {"sk_modalidade": 2, "modalidade": "Quiz Gamificado",
         "tipo": "Avaliação", "usa_ia": True, "componente_principal": "Cognição"},
        {"sk_modalidade": 3, "modalidade": "Leitura Assistida por IA",
         "tipo": "Recepção", "usa_ia": True, "componente_principal": "Leitura"},
        {"sk_modalidade": 4, "modalidade": "Atividade Sensorial",
         "tipo": "Socioemocional", "usa_ia": False, "componente_principal": "Afeto"},
        {"sk_modalidade": 5, "modalidade": "Produção Textual",
         "tipo": "Produção", "usa_ia": False, "componente_principal": "Escrita"},
    ])


def transformar_dim_nivel_alfabetizacao() -> pd.DataFrame:
    """Dimensão com hierarquia de níveis de alfabetização (Emília Ferreiro)."""
    return pd.DataFrame([
        {"sk_nivel": 1, "nivel": "Pré-silábico", "ordem": 1,
         "descricao": "Não há correspondência letra-som"},
        {"sk_nivel": 2, "nivel": "Silábico", "ordem": 2,
         "descricao": "Uma letra por sílaba"},
        {"sk_nivel": 3, "nivel": "Silábico-Alfabético", "ordem": 3,
         "descricao": "Transição: algumas letras com valor sonoro"},
        {"sk_nivel": 4, "nivel": "Alfabético", "ordem": 4,
         "descricao": "Correspondência completa fonema-grafema"},
    ])


def construir_tabela_fato(df_sessoes: pd.DataFrame,
                          dim_tempo: pd.DataFrame,
                          dim_paciente: pd.DataFrame,
                          dim_modalidade: pd.DataFrame,
                          dim_nivel: pd.DataFrame) -> pd.DataFrame:
    """
    Monta a tabela fato central do esquema estrela.
    Chaves estrangeiras apontam para as dimensões.
    """
    # Mapa data → sk_tempo
    mapa_tempo = {row["data_completa"]: row["sk_tempo"]
                  for _, row in dim_tempo.iterrows()}
    # Mapa modalidade → sk_modalidade
    mapa_modal = {row["modalidade"]: row["sk_modalidade"]
                  for _, row in dim_modalidade.iterrows()}
    # Mapa nivel → sk_nivel
    mapa_nivel = {row["nivel"]: row["sk_nivel"]
                  for _, row in dim_nivel.iterrows()}

    fato = df_sessoes.copy()
    fato["sk_tempo"] = fato["data_sessao"].map(mapa_tempo)
    fato["sk_paciente"] = fato["id_paciente_anonimo"]
    fato["sk_modalidade"] = fato["modalidade"].map(mapa_modal)
    fato["sk_nivel_inicial"] = fato["nivel_alfabetizacao_inicial"].map(mapa_nivel)
    fato["sk_nivel_final"] = fato["nivel_alfabetizacao_final"].map(mapa_nivel)
    fato["delta_nivel"] = fato["sk_nivel_final"] - fato["sk_nivel_inicial"]

    colunas_fato = [
        "id_sessao", "sk_tempo", "sk_paciente", "sk_modalidade",
        "sk_nivel_inicial", "sk_nivel_final", "delta_nivel",
        "duracao_minutos", "engajamento_score", "palavras_produzidas",
        "interacoes_ia", "indice_continuidade_escolar",
        "taxa_alfabetizacao_digital", "bem_estar_emocional",
        "houve_progresso", "id_extensionista_anonimo",
    ]
    return fato[colunas_fato]


def _agrupar_diagnostico(diag: str) -> str:
    oncologicos = ["Leucemia", "Osteossarcoma"]
    cronicos = ["Fibrose", "Nefropatia", "Diabetes", "Epilepsia", "Anemia"]
    for o in oncologicos:
        if o in diag:
            return "Oncológico"
    for c in cronicos:
        if c in diag:
            return "Condição Crônica"
    return "Cirúrgico/Agudo"


# ---------------------------------------------------------------------------
# CARGA – SQLite (substitui por PostgreSQL/SQL Server em produção)
# ---------------------------------------------------------------------------

def carregar_dw(dim_tempo, dim_paciente, dim_modalidade,
                dim_nivel, fato_sessoes):
    """Persiste todas as tabelas no Data Warehouse."""
    conn = sqlite3.connect(DB_PATH)
    tabelas = {
        "dim_tempo": dim_tempo,
        "dim_paciente": dim_paciente,
        "dim_modalidade": dim_modalidade,
        "dim_nivel_alfabetizacao": dim_nivel,
        "fato_sessoes_pedagogicas": fato_sessoes,
    }
    for nome, df in tabelas.items():
        df.to_sql(nome, conn, if_exists="replace", index=False)
        print(f"[ETL] Tabela '{nome}' carregada – {len(df)} registros.")

    # Índices para performance OLAP
    cursor = conn.cursor()
    indices = [
        "CREATE INDEX IF NOT EXISTS idx_fato_tempo ON fato_sessoes_pedagogicas(sk_tempo)",
        "CREATE INDEX IF NOT EXISTS idx_fato_pac ON fato_sessoes_pedagogicas(sk_paciente)",
        "CREATE INDEX IF NOT EXISTS idx_fato_modal ON fato_sessoes_pedagogicas(sk_modalidade)",
    ]
    for idx in indices:
        cursor.execute(idx)
    conn.commit()
    conn.close()
    print(f"[ETL] DW gravado em: {DB_PATH}")


# ---------------------------------------------------------------------------
# VISÕES MATERIALIZADAS (simuladas via tabelas pré-calculadas)
# ---------------------------------------------------------------------------

def criar_visoes_materializadas():
    """
    Cria visões materializadas para consultas frequentes de gestores.
    Em produção (PostgreSQL): usar CREATE MATERIALIZED VIEW.
    """
    conn = sqlite3.connect(DB_PATH)

    visoes = {
        # VM 1 – Progresso mensal por enfermaria
        "vm_progresso_mensal": """
            SELECT
                t.ano,
                t.mes,
                t.mes_nome,
                p.enfermaria,
                COUNT(f.id_sessao)                          AS total_sessoes,
                ROUND(AVG(f.indice_continuidade_escolar),3) AS ice_medio,
                ROUND(AVG(f.taxa_alfabetizacao_digital),3)  AS tad_medio,
                ROUND(AVG(f.engajamento_score),3)           AS engajamento_medio,
                SUM(CASE WHEN f.houve_progresso THEN 1 ELSE 0 END) AS sessoes_com_progresso,
                ROUND(100.0 * SUM(CASE WHEN f.houve_progresso THEN 1 ELSE 0 END)
                      / COUNT(f.id_sessao), 1)              AS pct_progresso
            FROM fato_sessoes_pedagogicas f
            JOIN dim_tempo t ON f.sk_tempo = t.sk_tempo
            JOIN dim_paciente p ON f.sk_paciente = p.sk_paciente
            GROUP BY t.ano, t.mes, t.mes_nome, p.enfermaria
        """,
        # VM 2 – KPIs por modalidade pedagógica
        "vm_kpi_modalidade": """
            SELECT
                m.modalidade,
                m.tipo,
                m.usa_ia,
                COUNT(f.id_sessao)                          AS total_sessoes,
                ROUND(AVG(f.indice_continuidade_escolar),3) AS ice_medio,
                ROUND(AVG(f.taxa_alfabetizacao_digital),3)  AS tad_medio,
                ROUND(AVG(f.bem_estar_emocional),3)         AS bem_estar_medio,
                ROUND(AVG(f.duracao_minutos),1)             AS duracao_media_min,
                ROUND(AVG(f.interacoes_ia),1)               AS interacoes_ia_media
            FROM fato_sessoes_pedagogicas f
            JOIN dim_modalidade m ON f.sk_modalidade = m.sk_modalidade
            GROUP BY m.modalidade, m.tipo, m.usa_ia
        """,
        # VM 3 – Segmentação de pacientes por engajamento (clusters manuais)
        "vm_segmentacao_pacientes": """
            SELECT
                p.sk_paciente,
                p.faixa_etaria,
                p.diagnostico,
                p.grupo_diagnostico,
                p.enfermaria,
                COUNT(f.id_sessao)                          AS total_sessoes,
                ROUND(AVG(f.engajamento_score),3)           AS engajamento_medio,
                ROUND(AVG(f.indice_continuidade_escolar),3) AS ice_medio,
                ROUND(AVG(f.interacoes_ia),1)               AS ia_media,
                CASE
                    WHEN AVG(f.engajamento_score) >= 0.75 THEN 'Alto Engajamento'
                    WHEN AVG(f.engajamento_score) >= 0.55 THEN 'Engajamento Moderado'
                    ELSE 'Baixo Engajamento'
                END AS cluster_engajamento
            FROM fato_sessoes_pedagogicas f
            JOIN dim_paciente p ON f.sk_paciente = p.sk_paciente
            GROUP BY p.sk_paciente, p.faixa_etaria, p.diagnostico,
                     p.grupo_diagnostico, p.enfermaria
        """,
    }

    cursor = conn.cursor()
    for nome, sql in visoes.items():
        cursor.execute(f"DROP TABLE IF EXISTS {nome}")
        cursor.execute(f"CREATE TABLE {nome} AS {sql}")
        n = cursor.execute(f"SELECT COUNT(*) FROM {nome}").fetchone()[0]
        print(f"[VM] Visão materializada '{nome}' criada – {n} linhas.")

    conn.commit()
    conn.close()


# ---------------------------------------------------------------------------
# PONTO DE ENTRADA
# ---------------------------------------------------------------------------

def executar_pipeline():
    print("=" * 60)
    print("  SAD AlegrIA – Pipeline ETL")
    print("=" * 60)

    # 1. Extração
    df_pac = extrair_pacientes_datasus(n=200)
    ids_pac = df_pac["id_anonimo"].tolist()
    df_sess = extrair_sessoes_classe_figueira(ids_pac, n_sessoes=1000)

    # 2. Transformação
    dim_tempo = transformar_dim_tempo(df_sess["data_sessao"])
    dim_pac = transformar_dim_paciente(df_pac)
    dim_modal = transformar_dim_modalidade()
    dim_nivel = transformar_dim_nivel_alfabetizacao()
    fato = construir_tabela_fato(df_sess, dim_tempo, dim_pac, dim_modal, dim_nivel)

    # 3. Carga
    carregar_dw(dim_tempo, dim_pac, dim_modal, dim_nivel, fato)

    # 4. Visões Materializadas
    criar_visoes_materializadas()

    print("\n[ETL] Pipeline concluído com sucesso!")
    return True


if __name__ == "__main__":
    executar_pipeline()
