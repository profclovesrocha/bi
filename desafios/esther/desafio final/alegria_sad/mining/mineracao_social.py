"""
=============================================================================
SAD AlegrIA – IMIP | Mineração da Web Social + Análise de Sentimento
=============================================================================
Descrição: Captura menções ao projeto AlegrIA em redes sociais, aplica
           análise de sentimento e clustering de engajamento de pacientes.
Módulos  : (1) Coleta simulada (substitui Tweepy em produção)
           (2) Pré-processamento NLP em Português
           (3) Análise de Sentimento (VADER adaptado / TextBlob)
           (4) Clustering K-Means dos pacientes por engajamento
           (5) Exportação de resultados para o DW
Ética    : Dados de redes sociais são PÚBLICOS. Nenhuma conta privada
           é rastreada. Dados de pacientes vêm apenas do DW anonimizado.
=============================================================================
"""

import re
import json
import sqlite3
import random
import datetime
import hashlib
from pathlib import Path
from collections import Counter

import numpy as np
import pandas as pd

# ---------------------------------------------------------------------------
# Opcional: instalação automática de dependências leves
# ---------------------------------------------------------------------------
try:
    from sklearn.cluster import KMeans
    from sklearn.preprocessing import StandardScaler
    from sklearn.metrics import silhouette_score
    SKLEARN_OK = True
except ImportError:
    SKLEARN_OK = False
    print("[AVISO] scikit-learn não disponível – clustering será manual.")

DB_PATH = Path(__file__).parent.parent / "alegria_dw.db"
random.seed(42)
np.random.seed(42)


# ===========================================================================
# MÓDULO 1 – COLETA DE DADOS SOCIAIS (simulado / Tweepy em produção)
# ===========================================================================

# Hashtags monitoradas
HASHTAGS_ALVO = [
    "#AlegrIA", "#ClasseHospitalar", "#EducacaoHospitalar",
    "#IMIP", "#AlegrIA_IMIP", "#AlfabetizacaoHospitalar",
    "#CriancaInternada", "#HumanizacaoHospitalar"
]

# Léxico de sentimento em Português (simplificado – substitua por VADER-pt)
LEXICO_POSITIVO = {
    "incrível", "maravilhoso", "feliz", "alegria", "superou",
    "ótimo", "excelente", "adorei", "lindo", "encantador",
    "esperança", "progresso", "evoluiu", "aprendeu", "sorriu",
    "brilhante", "carinho", "acolhimento", "gratidão", "transformação",
    "conquistou", "animado", "empolgado", "orgulho",
}
LEXICO_NEGATIVO = {
    "triste", "difícil", "sofrimento", "medo", "ansioso",
    "cansado", "preocupado", "saudade", "internado", "dor",
    "choro", "solitário", "angústia", "complicado", "ruim",
    "fraco", "perdeu", "regrediu", "resistência",
}
LEXICO_NEUTRO_BOOST = {
    "hospital", "leito", "enfermaria", "sessão", "atividade",
    "aula", "projeto", "extensão", "estudo",
}


def coletar_tweets_simulados(n: int = 300) -> pd.DataFrame:
    """
    Simula coleta de tweets sobre o projeto AlegrIA.
    Em produção, substituir por:

        import tweepy
        client = tweepy.Client(bearer_token=BEARER_TOKEN)
        resposta = client.search_recent_tweets(
            query="#AlegrIA OR #ClasseHospitalar lang:pt",
            max_results=100,
            tweet_fields=["created_at","public_metrics","lang"]
        )

    Restrição ética: NÃO coletar tweets de contas privadas ou de menores.
    """
    templates_positivos = [
        "Que projeto lindo! A {hashtag} está transformando a vida de crianças no IMIP 😊",
        "Meu filho aprendeu a ler enquanto estava internado, tudo graças à {hashtag} ❤️",
        "A {hashtag} é um exemplo de inovação com humanização! Parabéns à equipe 👏",
        "Ver a alegria no rosto das crianças na Classe Figueira foi incrível! {hashtag}",
        "O projeto {hashtag} mostrou que hospital também pode ser espaço de aprendizado 🌟",
        "Gratidão enorme ao projeto {hashtag}. Minha filha saiu melhor do que entrou!",
        "A IA generativa usada na {hashtag} é simplesmente fantástica para as crianças 🤖📚",
        "Progresso real! A criança que mal segurava o lápis já escreve pequenas histórias {hashtag}",
    ]
    templates_negativos = [
        "Ainda é difícil ver as crianças longe da escola por tanto tempo {hashtag}",
        "O internamento é sempre sofrido, mas {hashtag} ajuda um pouco a amenizar",
        "Preocupado com a continuidade escolar do meu filho após a alta {hashtag}",
        "A saudade da escola é grande, a internação é longa {hashtag}",
        "Resistência inicial das crianças às atividades, mas depois engajaram {hashtag}",
    ]
    templates_neutros = [
        "Participando da sessão da {hashtag} hoje na enfermaria de oncologia",
        "Reunião de equipe do projeto {hashtag} para avaliar os KPIs do mês",
        "Nova turma de extensionistas iniciou na {hashtag} no IMIP",
        "Dados do {hashtag}: 120 sessões realizadas este mês na Classe Figueira",
        "Qual é a diferença entre {hashtag} e ensino hospitalar tradicional? 🤔",
    ]

    registros = []
    data_base = datetime.datetime(2025, 1, 1)

    for i in range(n):
        hashtag = random.choice(HASHTAGS_ALVO)

        # Distribuição: 60% positivo, 20% negativo, 20% neutro
        r = random.random()
        if r < 0.60:
            template = random.choice(templates_positivos)
            sentimento_real = "positivo"
        elif r < 0.80:
            template = random.choice(templates_negativos)
            sentimento_real = "negativo"
        else:
            template = random.choice(templates_neutros)
            sentimento_real = "neutro"

        texto = template.format(hashtag=hashtag)
        ts = data_base + datetime.timedelta(
            days=random.randint(0, 364),
            hours=random.randint(0, 23)
        )

        registros.append({
            "id_tweet": hashlib.md5(f"tw_{i}_{ts}".encode()).hexdigest()[:12],
            "texto": texto,
            "hashtag_principal": hashtag,
            "timestamp": ts,
            "likes": random.randint(0, 150),
            "retweets": random.randint(0, 40),
            "replies": random.randint(0, 20),
            "tipo_conta": random.choice(["familiar", "extensionista",
                                          "profissional_saude", "midia", "outro"]),
            "_sentimento_real": sentimento_real,  # apenas para validação interna
        })

    df = pd.DataFrame(registros)
    print(f"[MINERAÇÃO] {len(df)} tweets coletados (simulado).")
    return df


# ===========================================================================
# MÓDULO 2 – PRÉ-PROCESSAMENTO NLP
# ===========================================================================

STOPWORDS_PT = {
    "a", "o", "e", "de", "da", "do", "em", "que", "é", "se",
    "os", "as", "um", "uma", "com", "para", "por", "mas", "não",
    "na", "no", "ao", "das", "dos", "foi", "ser", "este", "esse",
    "isso", "pela", "pelo", "também", "já", "mais", "como", "até",
    "ou", "são", "nos", "nas", "sua", "seu", "meu", "minha",
}


def preprocessar_texto(texto: str) -> list[str]:
    """
    Pipeline NLP básico para Português:
    1. Lowercase
    2. Remove URLs, menções, caracteres especiais
    3. Tokenização simples
    4. Remoção de stopwords
    """
    texto = texto.lower()
    texto = re.sub(r"http\S+", "", texto)          # remove URLs
    texto = re.sub(r"@\w+", "", texto)             # remove menções
    texto = re.sub(r"#\w+", "", texto)             # remove hashtags do corpo
    texto = re.sub(r"[^\w\sáéíóúâêîôûãõçü]", "", texto)  # remove pontuação
    tokens = texto.split()
    tokens = [t for t in tokens if t not in STOPWORDS_PT and len(t) > 2]
    return tokens


# ===========================================================================
# MÓDULO 3 – ANÁLISE DE SENTIMENTO
# ===========================================================================

def analisar_sentimento(texto: str) -> dict:
    """
    Análise léxico-baseada em Português.
    Substitua por: transformers (BERTimbau) para produção com maior acurácia.

    Exemplo produção:
        from transformers import pipeline
        clf = pipeline("sentiment-analysis",
                       model="neuralmind/bert-base-portuguese-cased")
        resultado = clf(texto)
    """
    tokens = preprocessar_texto(texto)

    pos = sum(1 for t in tokens if t in LEXICO_POSITIVO)
    neg = sum(1 for t in tokens if t in LEXICO_NEGATIVO)
    total = len(tokens) if tokens else 1

    score = (pos - neg) / total  # range aprox. [-1, 1]
    score = max(-1.0, min(1.0, score * 3))  # amplifica sinal

    if score > 0.1:
        polaridade = "positivo"
    elif score < -0.1:
        polaridade = "negativo"
    else:
        polaridade = "neutro"

    return {
        "polaridade": polaridade,
        "score_sentimento": round(score, 4),
        "tokens_positivos": pos,
        "tokens_negativos": neg,
        "n_tokens": len(tokens),
    }


def aplicar_sentimento_corpus(df: pd.DataFrame) -> pd.DataFrame:
    """Aplica análise de sentimento a todo o corpus de tweets."""
    resultados = df["texto"].apply(analisar_sentimento)
    df_sent = pd.DataFrame(resultados.tolist())
    df = pd.concat([df, df_sent], axis=1)

    # Métricas de engajamento social
    df["engajamento_social"] = (
        df["likes"] * 1 + df["retweets"] * 3 + df["replies"] * 2
    )
    # Acurácia do modelo no corpus simulado
    acertos = (df["polaridade"] == df["_sentimento_real"]).sum()
    print(f"[SENTIMENTO] Acurácia no corpus simulado: {acertos/len(df)*100:.1f}%")

    df.drop(columns=["_sentimento_real"], inplace=True)
    return df


def resumo_sentimento(df: pd.DataFrame) -> dict:
    """Gera resumo executivo do sentimento."""
    contagem = df["polaridade"].value_counts()
    total = len(df)
    resumo = {
        "total_tweets": total,
        "positivos": int(contagem.get("positivo", 0)),
        "negativos": int(contagem.get("negativo", 0)),
        "neutros": int(contagem.get("neutro", 0)),
        "pct_positivo": round(contagem.get("positivo", 0) / total * 100, 1),
        "score_medio": round(df["score_sentimento"].mean(), 4),
        "engajamento_total": int(df["engajamento_social"].sum()),
        "hashtag_mais_citada": df["hashtag_principal"].value_counts().idxmax(),
        "top_palavras_positivas": _top_palavras(df, "positivo"),
        "top_palavras_negativas": _top_palavras(df, "negativo"),
    }
    print(f"\n[SENTIMENTO] Resumo executivo:")
    for k, v in resumo.items():
        print(f"  {k}: {v}")
    return resumo


def _top_palavras(df: pd.DataFrame, polaridade: str, n: int = 5) -> list:
    subset = df[df["polaridade"] == polaridade]["texto"]
    todos_tokens = []
    for t in subset:
        todos_tokens.extend(preprocessar_texto(t))
    return [w for w, _ in Counter(todos_tokens).most_common(n)]


# ===========================================================================
# MÓDULO 4 – CLUSTERING DE PACIENTES POR ENGAJAMENTO
# ===========================================================================

def clusterizar_pacientes() -> pd.DataFrame:
    """
    Aplica K-Means nos dados de engajamento dos pacientes.
    Features: ICE médio, TAD médio, interações com IA, bem-estar emocional.
    Retorna DataFrame com cluster atribuído a cada paciente.
    """
    conn = sqlite3.connect(DB_PATH)
    try:
        df = pd.read_sql("""
            SELECT sk_paciente, engajamento_medio, ice_medio, ia_media,
                   total_sessoes, cluster_engajamento
            FROM vm_segmentacao_pacientes
        """, conn)
    except Exception:
        # Se DW ainda não existir, gera dados simulados
        print("[CLUSTERING] DW não encontrado, usando dados simulados.")
        n = 180
        df = pd.DataFrame({
            "sk_paciente": [f"pac_{i:04d}" for i in range(n)],
            "engajamento_medio": np.random.uniform(0.4, 1.0, n),
            "ice_medio": np.random.uniform(0.3, 0.9, n),
            "ia_media": np.random.uniform(3, 28, n),
            "total_sessoes": np.random.randint(1, 15, n),
        })
    finally:
        conn.close()

    features = ["engajamento_medio", "ice_medio", "ia_media", "total_sessoes"]
    X = df[features].fillna(0).values

    if SKLEARN_OK and len(X) >= 9:
        scaler = StandardScaler()
        X_scaled = scaler.fit_transform(X)

        # Determina k ótimo via silhouette (k de 2 a 5)
        melhor_k, melhor_score = 3, -1
        for k in range(2, min(6, len(X) // 3)):
            km = KMeans(n_clusters=k, random_state=42, n_init=10)
            labels = km.fit_predict(X_scaled)
            s = silhouette_score(X_scaled, labels)
            if s > melhor_score:
                melhor_k, melhor_score = k, s

        km_final = KMeans(n_clusters=melhor_k, random_state=42, n_init=10)
        df["cluster_km"] = km_final.fit_predict(X_scaled)
        print(f"[CLUSTERING] K-Means: {melhor_k} clusters (silhouette={melhor_score:.3f})")
    else:
        # Fallback manual por quartis de engajamento
        q1, q3 = np.percentile(X[:, 0], [33, 66])
        df["cluster_km"] = np.where(X[:, 0] >= q3, 2,
                             np.where(X[:, 0] >= q1, 1, 0))
        print("[CLUSTERING] Fallback por quartis de engajamento.")

    # Nomear clusters pelo centroide de engajamento
    mapa_cluster = {}
    for c in df["cluster_km"].unique():
        eng_medio = df[df["cluster_km"] == c]["engajamento_medio"].mean()
        if eng_medio >= 0.70:
            mapa_cluster[c] = "Alto Engajamento"
        elif eng_medio >= 0.55:
            mapa_cluster[c] = "Engajamento Moderado"
        else:
            mapa_cluster[c] = "Baixo Engajamento"

    df["perfil_engajamento"] = df["cluster_km"].map(mapa_cluster)

    contagem = df["perfil_engajamento"].value_counts()
    print(f"[CLUSTERING] Distribuição dos clusters:\n{contagem.to_string()}")
    return df


# ===========================================================================
# MÓDULO 5 – EXPORTAÇÃO PARA O DW
# ===========================================================================

def exportar_resultados(df_tweets: pd.DataFrame, df_clusters: pd.DataFrame,
                        resumo: dict):
    """Salva resultados de mineração no DW e em JSON."""
    conn = sqlite3.connect(DB_PATH)

    # Tabela de tweets analisados
    df_tweets.to_sql("mineracao_tweets", conn, if_exists="replace", index=False)
    print(f"[EXPORT] {len(df_tweets)} tweets exportados para o DW.")

    # Tabela de clusters de pacientes
    df_clusters.to_sql("clustering_pacientes", conn, if_exists="replace", index=False)
    print(f"[EXPORT] {len(df_clusters)} perfis de pacientes exportados.")

    # Resumo JSON (para dashboard)
    resumo_path = Path(__file__).parent.parent / "resumo_sentimento.json"
    with open(resumo_path, "w", encoding="utf-8") as f:
        json.dump(resumo, f, ensure_ascii=False, indent=2)
    print(f"[EXPORT] Resumo gravado em: {resumo_path}")

    conn.commit()
    conn.close()


# ===========================================================================
# PONTO DE ENTRADA
# ===========================================================================

def executar_mineracao():
    print("=" * 60)
    print("  SAD AlegrIA – Mineração Web Social + Sentimento")
    print("=" * 60)

    # 1. Coleta
    df_tweets = coletar_tweets_simulados(n=300)

    # 2. Sentimento
    df_tweets = aplicar_sentimento_corpus(df_tweets)
    resumo = resumo_sentimento(df_tweets)

    # 3. Clustering
    df_clusters = clusterizar_pacientes()

    # 4. Exportação
    exportar_resultados(df_tweets, df_clusters, resumo)

    print("\n[MINERAÇÃO] Concluído com sucesso!")
    return df_tweets, df_clusters, resumo


if __name__ == "__main__":
    executar_mineracao()
