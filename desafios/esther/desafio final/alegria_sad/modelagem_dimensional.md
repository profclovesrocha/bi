# Documentação da Modelagem Dimensional
## SAD AlegrIA – Sistema de Apoio à Decisão
### IMIP / Classe Hospitalar Figueira

---

## 1. Visão Geral

O SAD AlegrIA adota um **Esquema Estrela (Star Schema)** como modelo físico do Data Warehouse, por sua superioridade em performance de leitura para consultas OLAP e simplicidade de compreensão pelos gestores não técnicos. A decisão entre Star, Snowflake e Galaxy considerou os seguintes fatores:

| Critério | Star Schema | Snowflake | Galaxy |
|---|---|---|---|
| Performance OLAP | ✅ Alta | ⚠️ Média | ✅ Alta |
| Facilidade de manutenção | ✅ Simples | ⚠️ Complexo | ❌ Muito complexo |
| Número de joins | ✅ Mínimo | ❌ Alto | ❌ Alto |
| Integridade referencial | ⚠️ Parcial | ✅ Total | ✅ Total |
| **Adequação ao projeto** | **✅ Escolhido** | | |

**Decisão**: Star Schema com dimensões desnormalizadas, pois as consultas dos gestores são majoritariamente predefinidas (KPIs mensais) e o volume de dados não justifica normalização adicional.

---

## 2. Diagrama do Esquema Estrela

```
                    ┌─────────────────────┐
                    │   DIM_TEMPO         │
                    │─────────────────────│
                    │ PK sk_tempo         │
                    │    data_completa    │
                    │    ano              │◄────────────┐
                    │    trimestre        │             │
                    │    mes / mes_nome   │             │
                    │    semana_ano       │             │
                    │    dia / dia_semana │             │
                    │    eh_fim_semana    │             │
                    └─────────────────────┘             │
                                                        │
┌──────────────────────┐                    ┌───────────┴────────────────────┐
│  DIM_PACIENTE        │                    │   FATO_SESSOES_PEDAGOGICAS     │
│──────────────────────│                    │────────────────────────────────│
│ PK sk_paciente       │◄──────────────────►│ PK id_sessao                   │
│    faixa_etaria      │                    │ FK sk_tempo                    │
│    diagnostico       │                    │ FK sk_paciente                 │
│    grupo_diagnostico │                    │ FK sk_modalidade               │
│    enfermaria        │                    │ FK sk_nivel_inicial            │
│    municipio_origem  │                    │ FK sk_nivel_final              │
│    sexo              │                    │────────────────────────────────│
│    dias_internacao   │                    │ MEDIDAS (Fatos numéricos):     │
└──────────────────────┘                    │  duracao_minutos               │
                                            │  engajamento_score             │
┌──────────────────────┐                    │  palavras_produzidas           │
│  DIM_MODALIDADE      │                    │  interacoes_ia                 │
│──────────────────────│                    │  indice_continuidade_escolar   │ ← ICE
│ PK sk_modalidade     │◄──────────────────►│  taxa_alfabetizacao_digital    │ ← TAD
│    modalidade        │                    │  bem_estar_emocional           │
│    tipo              │                    │  delta_nivel                   │
│    usa_ia            │                    │  houve_progresso               │
│    componente_princ. │                    └────────────────────────────────┘
└──────────────────────┘                                   ▲ ▲
                                                           │ │
┌──────────────────────┐           ┌────────────────────┐  │ │
│ DIM_NIVEL_ALFAB.     │           │ DIM_NIVEL_ALFAB.   │  │ │
│──────────────────────│           │ (sk_nivel_final)   │  │ │
│ PK sk_nivel          │◄──────────┤ (role-playing dim) │◄─┘ │
│    nivel             │           └────────────────────┘    │
│    ordem (1-4)       │                                      │
│    descricao         │◄─────────────────────────────────────┘
└──────────────────────┘  (sk_nivel_inicial)
```

> **Nota sobre Role-Playing Dimension**: A dimensão `DIM_NIVEL_ALFABETIZACAO` é referenciada duas vezes na tabela fato — uma para o nível no início da sessão (`sk_nivel_inicial`) e outra para o nível ao final (`sk_nivel_final`). Esta é uma técnica padrão de modelagem dimensional chamada *role-playing dimension*.

---

## 3. Dicionário de Dados

### 3.1 Tabela Fato – `FATO_SESSOES_PEDAGOGICAS`

| Coluna | Tipo | Descrição | Origem |
|---|---|---|---|
| `id_sessao` | VARCHAR(16) | Chave primária anonimizada (SHA-256) | Sistema interno |
| `sk_tempo` | INTEGER | FK → DIM_TEMPO (formato YYYYMMDD) | ETL |
| `sk_paciente` | VARCHAR(16) | FK → DIM_PACIENTE (hash anonimizado) | ETL / DataSUS |
| `sk_modalidade` | INTEGER | FK → DIM_MODALIDADE | ETL |
| `sk_nivel_inicial` | INTEGER | FK → DIM_NIVEL_ALFAB. (nível pré-sessão) | Professor/Extensionista |
| `sk_nivel_final` | INTEGER | FK → DIM_NIVEL_ALFAB. (nível pós-sessão) | Professor/Extensionista |
| `delta_nivel` | INTEGER | Progressão no nível (0 ou 1) | Calculado |
| `duracao_minutos` | INTEGER | Duração da sessão em minutos | Registro pedagógico |
| `engajamento_score` | FLOAT | Score de engajamento [0,1] | Observação do extensionista |
| `palavras_produzidas` | INTEGER | Quantidade de palavras escritas/ditadas | Avaliação formativa |
| `interacoes_ia` | INTEGER | Nº de prompts/interações com a IA | Log do sistema |
| `indice_continuidade_escolar` | FLOAT | **KPI ICE** – [0,1] | Fórmula (ver §4) |
| `taxa_alfabetizacao_digital` | FLOAT | **KPI TAD** – [0,1] | Fórmula (ver §4) |
| `bem_estar_emocional` | FLOAT | Score de bem-estar [0,1] | Escala observacional |
| `houve_progresso` | BOOLEAN | Se houve avanço de nível | Calculado |
| `id_extensionista_anonimo` | VARCHAR(16) | Extensionista responsável (anonimizado) | Sistema |

**Granularidade**: Uma linha = uma sessão pedagógica de um paciente.

---

### 3.2 Dimensão Tempo – `DIM_TEMPO`

| Coluna | Tipo | Descrição |
|---|---|---|
| `sk_tempo` | INTEGER PK | Surrogate key (YYYYMMDD) |
| `data_completa` | DATE | Data completa |
| `ano` | INTEGER | Ex: 2025 |
| `trimestre` | VARCHAR | Ex: "T2/2025" |
| `mes` | INTEGER | 1–12 |
| `mes_nome` | VARCHAR | Ex: "maio" |
| `semana_ano` | INTEGER | Semana ISO (1–53) |
| `dia` | INTEGER | 1–31 |
| `dia_semana` | VARCHAR | Ex: "segunda-feira" |
| `eh_fim_semana` | BOOLEAN | True se sábado ou domingo |

**Hierarquia OLAP**: `Ano → Trimestre → Mês → Semana → Dia`

---

### 3.3 Dimensão Paciente – `DIM_PACIENTE`

| Coluna | Tipo | Descrição | LGPD |
|---|---|---|---|
| `sk_paciente` | VARCHAR(16) PK | Hash SHA-256 do ID real | ✅ Anonimizado |
| `faixa_etaria` | VARCHAR | Ex: "6-9 anos" | ✅ Agrupado |
| `diagnostico` | VARCHAR | CID-10 categorizado | ✅ Sem nome |
| `grupo_diagnostico` | VARCHAR | Oncológico / Crônico / Agudo | ✅ Generalizado |
| `enfermaria` | VARCHAR | Ex: "Oncologia" | ✅ |
| `municipio_origem` | VARCHAR | Município de origem | ✅ Sem endereço |
| `sexo` | VARCHAR | M / F | ✅ |
| `dias_internacao` | INTEGER | Duração prevista | ✅ |

**⚠️ Conformidade LGPD (Art. 5º, XI)**: Nenhum dado direto de identificação (nome, CPF, data de nascimento exata, endereço, prontuário) é armazenado. A anonimização é irreversível — o hash não permite re-identificação sem a tabela de correlação, que é mantida exclusivamente no sistema operacional do IMIP, separado do DW.

---

### 3.4 Dimensão Modalidade – `DIM_MODALIDADE`

| Coluna | Tipo | Descrição |
|---|---|---|
| `sk_modalidade` | INTEGER PK | Surrogate key |
| `modalidade` | VARCHAR | Ex: "Co-criação Narrativa" |
| `tipo` | VARCHAR | Produção / Avaliação / Recepção / Socioemocional |
| `usa_ia` | BOOLEAN | Se a modalidade utiliza IA generativa |
| `componente_principal` | VARCHAR | Escrita / Leitura / Cognição / Afeto |

---

### 3.5 Dimensão Nível de Alfabetização – `DIM_NIVEL_ALFABETIZACAO`

Baseada na psicogênese da língua escrita (Emília Ferreiro):

| sk_nivel | nivel | ordem | descricao |
|---|---|---|---|
| 1 | Pré-silábico | 1 | Não há correspondência letra-som |
| 2 | Silábico | 2 | Uma letra representa cada sílaba |
| 3 | Silábico-Alfabético | 3 | Transição: algumas letras com valor sonoro |
| 4 | Alfabético | 4 | Correspondência completa fonema-grafema |

---

## 4. Fórmulas dos KPIs Principais

### 4.1 Índice de Continuidade Escolar (ICE)

Mede o quanto o paciente está avançando em relação ao seu potencial máximo durante a internação.

```
ICE = min(1.0,  (palavras_produzidas / 50)
              × engajamento_score
              × (duracao_minutos / 45) )
```

- **Palavras produzidas**: normalizado por 50 (referência de sessão padrão)
- **Engajamento**: multiplicador de qualidade
- **Duração**: normalizado por 45 min (sessão ideal)
- **Intervalo**: [0, 1] – quanto mais próximo de 1, maior a continuidade

**Meta**: ICE médio ≥ 0,65 por enfermaria por mês.

---

### 4.2 Taxa de Alfabetização Digital (TAD)

Mede a proficiência na interação com ferramentas digitais de IA.

```
TAD = min(1.0,  (interacoes_ia / 20) × engajamento_score )
```

- **Interações com IA**: normalizado por 20 (benchmark de sessão)
- **Engajamento**: qualificador
- **Intervalo**: [0, 1]

**Meta**: TAD médio ≥ 0,60 em sessões com IA.

---

### 4.3 Segmentação de Engajamento (E)

Baseada no ICE médio acumulado do paciente ao longo das sessões:

| Cluster | Critério (ICE médio) | Interpretação |
|---|---|---|
| Alto Engajamento | ≥ 0,75 | Paciente respondem bem às intervenções |
| Engajamento Moderado | 0,55 – 0,74 | Progresso consistente, com suporte |
| Baixo Engajamento | < 0,55 | Requer estratégia pedagógica diferenciada |

---

## 5. Visões Materializadas

### 5.1 `VM_PROGRESSO_MENSAL`

**Finalidade**: Responde à pergunta do gestor: *"Como está o progresso pedagógico mês a mês por enfermaria?"*

**Consulta base**:
```sql
SELECT
    t.ano, t.mes, t.mes_nome, p.enfermaria,
    COUNT(f.id_sessao)                         AS total_sessoes,
    AVG(f.indice_continuidade_escolar)         AS ice_medio,
    AVG(f.taxa_alfabetizacao_digital)          AS tad_medio,
    AVG(f.engajamento_score)                   AS engajamento_medio,
    100.0 * SUM(CASE WHEN f.houve_progresso
               THEN 1 ELSE 0 END) / COUNT(*)   AS pct_progresso
FROM fato_sessoes_pedagogicas f
JOIN dim_tempo t ON f.sk_tempo = t.sk_tempo
JOIN dim_paciente p ON f.sk_paciente = p.sk_paciente
GROUP BY t.ano, t.mes, t.mes_nome, p.enfermaria
```

**Atualização**: Mensal (batch no 1º dia útil de cada mês).

---

### 5.2 `VM_KPI_MODALIDADE`

**Finalidade**: *"Qual modalidade pedagógica gera maior impacto no ICE e TAD?"*

Agrega KPIs por tipo de atividade pedagógica, permitindo decisões de alocação de carga horária.

**Atualização**: Semanal.

---

### 5.3 `VM_SEGMENTACAO_PACIENTES`

**Finalidade**: *"Quais pacientes precisam de intervenção pedagógica adicional?"*

Aplica a lógica de clustering e expõe o perfil de engajamento de cada paciente anonimizado.

**Atualização**: Diária (incremental).

---

## 6. Tipo de OLAP Adotado

### Recomendação: **HOLAP (Hybrid OLAP)**

| Camada | Abordagem | Tecnologia |
|---|---|---|
| Agregações frequentes (gestores) | MOLAP | Visões Materializadas em PostgreSQL |
| Consultas ad-hoc (pesquisadores) | ROLAP | SQL direto no DW via Power BI / Tableau |
| Drill-down para dados brutos | ROLAP | Tabela fato com índices bitmap |

**Justificativa**: Os gestores do IMIP consultam principalmente dashboards pré-definidos (MOLAP puro seria suficiente), mas pesquisadores acadêmicos precisam de flexibilidade para cruzar dimensões não previstas (exige ROLAP). O HOLAP satisfaz ambos.

---

## 7. Conformidade Ética e LGPD

| Requisito | Implementação |
|---|---|
| **Art. 7º – Base legal** | Pesquisa científica e interesse público em saúde |
| **Art. 12 – Anonimização** | SHA-256 truncado; sem tabela de correlação no DW |
| **Art. 14 – Dados de crianças** | Consentimento dos responsáveis legais; dados extra-protegidos |
| **Art. 46 – Segurança** | Acesso por perfil (gestor / pesquisador / extensionista) |
| **Art. 48 – Incidentes** | Protocolo de notificação à ANPD em até 72h |
| **ECA Art. 17** | Imagem e identidade das crianças preservadas integralmente |

**Auditoria**: Todos os acessos ao DW são logados. O Comitê de Ética do IMIP revisa os protocolos semestralmente.

---

## 8. Operações OLAP Suportadas

| Operação | Exemplo no contexto do IMIP |
|---|---|
| **Roll-Up** | De sessão diária → mensal → trimestral |
| **Drill-Down** | De hospital → enfermaria → leito → paciente |
| **Slice** | Filtrar apenas sessões de "Co-criação Narrativa" |
| **Dice** | ICE alto + IA ativa + Oncologia + 1º trimestre |
| **Pivot** | Cruzar modalidade × faixa etária no dashboard |

---

## 9. Arquitetura de Dados (Fluxo ETL)

```
┌──────────────────┐   ┌──────────────────┐   ┌──────────────────┐
│   FONTES         │   │    ETL LAYER     │   │  DATA WAREHOUSE  │
│──────────────────│   │──────────────────│   │──────────────────│
│ DataSUS (FTP)    │──►│ Extração (Python)│──►│ Dim_Tempo        │
│ Classe Figueira  │   │ Limpeza / Dedupe │   │ Dim_Paciente     │
│ (Planilhas EMTI) │   │ Anonimização     │   │ Dim_Modalidade   │
│ Sistema IMIP     │   │ Transformação    │   │ Dim_Nivel_Alfab. │
└──────────────────┘   │ Carga incremental│──►│ Fato_Sessoes     │
                        └──────────────────┘   │──────────────────│
                                               │ VM_Prog_Mensal   │
                                               │ VM_KPI_Modal.    │
                                               │ VM_Segmentação   │
                                               └────────┬─────────┘
                                                        │
                                               ┌────────▼─────────┐
                                               │   APRESENTAÇÃO   │
                                               │──────────────────│
                                               │ Power BI Desktop │
                                               │ Dashboard Web    │
                                               │ Relatórios PDF   │
                                               └──────────────────┘
```

---

*Documento gerado pela equipe SAD AlegrIA | IMIP · Recife, 2026*
*Revisão: Comitê de Ética Institucional — aprovação pendente*
