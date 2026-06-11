"""
=============================================================================
SAD AlegrIA – IMIP | Executor Principal
=============================================================================
Executa: ETL → Mineração → Exporta JSON para o Dashboard
=============================================================================
"""
import os
import sys

# Força o Python a usar UTF-8 no Windows para subprocessos e no console
if os.environ.get("PYTHONUTF8") != "1":
    os.environ["PYTHONUTF8"] = "1"
    os.execv(sys.executable, [sys.executable] + sys.argv)

if sys.stdout.encoding.lower() != "utf-8":
    sys.stdout.reconfigure(encoding="utf-8")
if sys.stderr.encoding.lower() != "utf-8":
    sys.stderr.reconfigure(encoding="utf-8")

import json, sqlite3
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))

from etl.etl_pipeline import executar_pipeline
from mining.mineracao_social import executar_mineracao

DB_PATH = Path(__file__).parent / "alegria_dw.db"
OUT_PATH = Path(__file__).parent / "dashboard_data.json"


def exportar_dados_dashboard():
    """Consolida todos os dados necessários para o dashboard em JSON."""
    conn = sqlite3.connect(DB_PATH)

    def q(sql):
        import pandas as pd
        return pd.read_sql(sql, conn).to_dict(orient="records")

    dados = {
        "progresso_mensal": q("""
            SELECT ano, mes, mes_nome, enfermaria,
                   total_sessoes, ice_medio, tad_medio,
                   engajamento_medio, pct_progresso
            FROM vm_progresso_mensal
            ORDER BY ano, mes, enfermaria
        """),
        "kpi_modalidade": q("""
            SELECT modalidade, tipo, usa_ia, total_sessoes,
                   ice_medio, tad_medio, bem_estar_medio,
                   duracao_media_min, interacoes_ia_media
            FROM vm_kpi_modalidade
            ORDER BY ice_medio DESC
        """),
        "segmentacao": q("""
            SELECT faixa_etaria, grupo_diagnostico, enfermaria,
                   cluster_engajamento,
                   COUNT(*) as n_pacientes,
                   ROUND(AVG(ice_medio),3) as ice_medio,
                   ROUND(AVG(engajamento_medio),3) as eng_medio
            FROM vm_segmentacao_pacientes
            GROUP BY faixa_etaria, grupo_diagnostico, enfermaria, cluster_engajamento
            ORDER BY faixa_etaria, cluster_engajamento
        """),
        "resumo_geral": q("""
            SELECT
                COUNT(DISTINCT sk_paciente) as total_pacientes,
                COUNT(*) as total_sessoes,
                ROUND(AVG(indice_continuidade_escolar),3) as ice_geral,
                ROUND(AVG(taxa_alfabetizacao_digital),3) as tad_geral,
                ROUND(AVG(engajamento_score),3) as engajamento_geral,
                ROUND(AVG(bem_estar_emocional),3) as bem_estar_geral,
                SUM(CASE WHEN houve_progresso THEN 1 ELSE 0 END) as sessoes_com_progresso,
                ROUND(100.0*SUM(CASE WHEN houve_progresso THEN 1 ELSE 0 END)/COUNT(*),1) as pct_progresso
            FROM fato_sessoes_pedagogicas
        """),
    }

    # Agrega sentimento se existir
    try:
        dados["sentimento"] = q("""
            SELECT polaridade, COUNT(*) as n,
                   ROUND(AVG(score_sentimento),4) as score_medio,
                   ROUND(AVG(engajamento_social),1) as eng_social_medio
            FROM mineracao_tweets
            GROUP BY polaridade
        """)
        dados["sentimento_temporal"] = q("""
            SELECT strftime('%Y-%m', timestamp) as mes,
                   polaridade, COUNT(*) as n
            FROM mineracao_tweets
            GROUP BY mes, polaridade
            ORDER BY mes
        """)
    except Exception:
        dados["sentimento"] = []
        dados["sentimento_temporal"] = []

    conn.close()

    with open(OUT_PATH, "w", encoding="utf-8") as f:
        json.dump(dados, f, ensure_ascii=False, indent=2, default=str)

    print(f"[DASHBOARD] Dados exportados → {OUT_PATH}")
    return dados


if __name__ == "__main__":
    print("Iniciando pipeline completo do SAD AlegrIA...\n")
    executar_pipeline()
    print()
    executar_mineracao()
    print()
    exportar_dados_dashboard()
    print("\n✓ Todos os entregáveis gerados com sucesso!")
