# DATAS DAS ENTREGAS:
- DESAFIO 1: 05/MAR/2026.
- DESAFIO 2: 19/MAR/2026 (da AULA 3).
- DESAFIO 3: 26/MAR/2026 (da AULA 4).
- DEASFIO 4: 02/ABR/2026 (da AULA 5).
- DESAFIO FINAL: 11/JUNHO/2026 (REF.: PRÁTICAS NO LAB.)
- Link em destaque INSCRIÇÕES | FACEPE E SECTI EDITAL COMPET 14/2026: https://forms.gle/zD3ZLcyEcpTMdEfn7

Com base nos conteúdos avançados das aulas 3, 4 e 5 e no projeto "Alfabetizando com AlegrIA", apresento a estrutura para o **Desafio Final (AV2)**. Este desafio foca na implementação técnica e na mineração de dados para apoio à decisão no **IMIP** OU OUTRO HOSPITAL INFANTIL.

---

### **Desafio Final (AV2): "SAD Alfabetizando com AlegrIA - Do Data Warehouse à Sabedoria Digital"**

**Objetivo:** Desenvolver e apresentar um **Sistema de Apoio à Decisão (SAD)** completo que integre modelagem multidimensional (OLAP), mineração de dados da web social e análise de indicadores de saúde e educação para o projeto no IMIP.

---

#### **1. Estrutura do Desafio (Atividades em Equipe)**

As equipes de até 5 pessoas devem realizar as seguintes etapas técnicas:

*   **Modelagem Avançada e Materialização (Aula 3 e 4):**
    *   Criar um **Esquema Estrela** otimizado para o IMIP, incluindo uma tabela de fatos com métricas como o *Índice de Continuidade Escolar* e a *Taxa de Alfabetização Digital*.
    *   Propor a criação de **Visões Materializadas** para acelerar consultas frequentes de gestores sobre o progresso pedagógico mensal dos pacientes.
*   **Mineração e Sentimento (Aula 5):**
    *   Delinear um fluxo de **mineração de dados** (usando APIs como Twitter ou Instagram) para monitorar a percepção social do projeto ou o estado emocional (análise de sentimento) das famílias atendidas.
    *   Aplicar conceitos de **Aprendizagem de Máquina** (ex: agrupamento/clustering) para segmentar pacientes por níveis de engajamento ($E$) baseados na interatividade com a IA.
*   **Arquitetura do SAD (Aula 2):**
    *   Desenvolver um protótipo de dashboard no **Power BI ou Tableau** que permita operações de *drill-down* (do hospital para o leito) e análises *what-if* (ex: "Se aumentarmos a carga horária de IA, qual o impacto no aprendizado?").

---

#### **2. Critérios de Avaliação (AV2)**

A avaliação será baseada nos seguintes pesos:

1.  **Excelência Técnica (40%):** Correção da modelagem dimensional (tabelas fato/dimensão), uso de hierarquias e proposta de implementação OLAP (MOLAP, ROLAP ou HOLAP).
2.  **Inovação e Mineração (20%):** Qualidade da estratégia de extração de dados sociais e lógica da análise de sentimento para humanização do cuidado.
3.  **Ética e LGPD (10%):** Demonstração de conformidade com o tratamento de dados sensíveis de menores no ambiente hospitalar.
4.  **Apresentação no Seminário (30%):** Clareza, capacidade de extrair insights acionáveis e domínio das ferramentas utilizadas.

---

#### **3. Exemplo de Solução em Equipe**

Para solucionar o desafio, a equipe pode se organizar da seguinte forma:

*   **Estudante 1 (Líder de Dados):** Responsável pelo processo **ETL** e pela garantia de integridade dos dados integrados do DataSUS com os registros da Classe Figueira.
*   **Estudante 2 (Analista OLAP):** Constrói o cubo multidimensional e define as hierarquias (ex: Ano $\rightarrow$ Mês $\rightarrow$ Dia da Aula).
*   **Estudante 3 (Minerador Social):** Utiliza Python (biblioteca Tweepy ou similar) para capturar hashtags relacionadas ao projeto e aplicar modelos de análise de sentimento.
*   **Estudante 4 (Especialista em Visualização):** Cria o dashboard interativo com KPIs de engajamento e progresso escolar.
*   **Estudante 5 (Jurídico/Ética):** Garante que o SAD utilize apenas dados anonimizados e segue os protocolos de privacidade.

---

#### **4. Formato do Seminário Avaliativo**

O seminário será a vitrine do conhecimento adquirido. Cada equipe terá **15 a 20 minutos** para apresentar:

1.  **Pitch Inicial:** Problema de negócio (evasão escolar hospitalar) e como o SAD ajuda a resolvê-lo.
2.  **Demonstração Técnica:** Apresentação da arquitetura do Data Warehouse e do fluxo de mineração de dados.
3.  **Navegação no Dashboard:** Realização ao vivo de operações de *Slice, Dice e Drill-down* para responder perguntas da banca examinadora.
4.  **Discussão de Insights:** O que os dados minerados dizem sobre o impacto da IA no IMIP?.

**Entregável:** Um link para o repositório GitHub contendo os scripts de mineração, a documentação da modelagem e o arquivo do dashboard/protótipo.

# SUGESTÃO - FERRAMENTAS COMPLEMENTAR
- Tableau: https://www.tableau.com/pt-br
- Power BI: https://www.microsoft.com/pt-br/power-platform/products/power-bi/getting-started-with-power-bi
- FONTE DE DADOS: https://datasus.saude.gov.br/
- FONTE DE DADOS EDUCACIONAIS: https://app.powerbi.com/view?r=eyJrIjoiODhhNmI1ZWYtMmZmYy00NjVlLTk4MjQtYjlmMTUxZTJlYTI0IiwidCI6IjA0ZTcxZThlLTUwZDMtNDU1ZC04ODAzLWM3ZGI4ODhkNjRiYiJ9
- Sugestão Final | Selenium automates browsers: https://www.selenium.dev/

# SUGESTÃO de Desafios para Smart City 
- https://docs.google.com/document/d/1C0nNNBLqCDSXJoIcvWlhaoC26HUpmbETfKGtKsIpeJs/edit?usp=sharing
