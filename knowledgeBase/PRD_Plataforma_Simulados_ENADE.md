# Plataforma de Simulados Interativos do ENADE

## Documento de Requisitos do Produto (PRD)

*Requisitos funcionais, não funcionais, regras de negócio, arquitetura e plano de entrega*

| **Campo** | **Conteúdo** |
| --- | --- |
| **Projeto** | Plataforma de Simulados Interativos do ENADE |
| **Versão** | 1.0 (preliminar), 09/11/2026 |
| **Base** | Product Backlog e EAP (PB01 a PB12); documento de decisões técnicas e planejamento de sprints (Equipe 5, VFINAL); documento de Levantamento de Requisitos do Sistema de Bazar, usado apenas como base de estilo |
| **Equipe** | Jordan Fernandes de Carvalho<br>Henrique Veras Cordeiro<br>Mayara Lima Miranda<br>Irapuam Junio da Silva Santos |
| **Processo** | Scrum, sprints de aproximadamente uma semana, 6 sprints planejadas |
| **Status** | Preliminar. A stack e as estimativas de Story Points podem mudar após testes com provas reais e o Planning Poker |

## Sumário

- [1. Visão geral](#1-visão-geral)
    - [1.1 Contexto e objetivo](#11-contexto-e-objetivo)
    - [1.2 Público e proposta de valor](#12-público-e-proposta-de-valor)
    - [1.3 Métricas de sucesso](#13-métricas-de-sucesso)
    - [1.4 Premissas e restrições](#14-premissas-e-restrições)
- [2. Escopo](#2-escopo)
    - [2.1 Dentro do escopo](#21-dentro-do-escopo)
    - [2.2 Fora do escopo ou adiado](#22-fora-do-escopo-ou-adiado)
    - [2.3 Convenções](#23-convenções)
    - [2.4 Fontes](#24-fontes)
- [3. Atores e perfis](#3-atores-e-perfis)
- [4. Jornadas do usuário](#4-jornadas-do-usuário)
    - [4.1 Administrador](#41-administrador)
    - [4.2 Aluno](#42-aluno)
- [5. Visão geral dos módulos](#5-visão-geral-dos-módulos)
- [6. Requisitos funcionais](#6-requisitos-funcionais)
    - [6.1 Importação e extração de provas (IMP)](#61-importação-e-extração-de-provas-imp)
    - [6.2 Revisão e curadoria (REV)](#62-revisão-e-curadoria-rev)
    - [6.3 Aplicação do simulado (SIM)](#63-aplicação-do-simulado-sim)
    - [6.4 Autenticação e controle de acesso (ACS)](#64-autenticação-e-controle-de-acesso-acs)
    - [6.5 Qualidade e desempenho (QLD)](#65-qualidade-e-desempenho-qld)
- [7. Requisitos não funcionais](#7-requisitos-não-funcionais)
- [8. Regras de negócio](#8-regras-de-negócio)
    - [8.1 Glossário](#81-glossário)
- [9. Arquitetura e stack](#9-arquitetura-e-stack)
    - [9.1 Serviços do ambiente local](#91-serviços-do-ambiente-local)
    - [9.2 Fluxo de importação e extração](#92-fluxo-de-importação-e-extração)
    - [9.3 Stack tecnológica](#93-stack-tecnológica)
    - [9.4 Fluxo Git e integração contínua](#94-fluxo-git-e-integração-contínua)
    - [9.5 Pontos de integração entre as frentes](#95-pontos-de-integração-entre-as-frentes)
- [10. Plano de entrega](#10-plano-de-entrega)
    - [10.1 Épicos e estimativas](#101-épicos-e-estimativas)
    - [10.2 Divisão da equipe em frentes](#102-divisão-da-equipe-em-frentes)
    - [10.3 Sprints](#103-sprints)
    - [10.4 Ritos e definição de pronto (proposta do VF)](#104-ritos-e-definição-de-pronto-proposta-do-vf)
- [11. Riscos e dependências](#11-riscos-e-dependências)
- [12. Rastreabilidade](#12-rastreabilidade)
- [13. Decisões pendentes e tomadas](#13-decisões-pendentes-e-tomadas)
    - [13.1 Decisões pendentes](#131-decisões-pendentes)
    - [13.2 Decisões tomadas](#132-decisões-tomadas)

---

# 1. Visão geral

## 1.1 Contexto e objetivo

A Plataforma de Simulados Interativos do ENADE é uma aplicação web em que o administrador importa provas do ENADE em PDF, revisa as questões extraídas automaticamente e decide quais ficam disponíveis, e o aluno pratica com essas questões em simulados corrigidos automaticamente.

O objetivo do produto, conforme as histórias do Product Backlog, é permitir que o aluno escolha uma edição do ENADE, responda ao simulado correspondente e saiba imediatamente seus acertos e erros, acompanhando o próprio desempenho ao longo do tempo.

## 1.2 Público e proposta de valor

- **Administrador:** transforma PDFs de provas em questões estruturadas, com extração automática em segundo plano e controle de qualidade por revisão e publicação.

- **Aluno:** pratica com questões reais de provas anteriores, inclusive pelo celular, e recebe correção e histórico.

## 1.3 Métricas de sucesso

Os documentos de partida não definem métricas de sucesso do produto (por exemplo, volume de uso ou taxa de acerto da extração). Elas ficam registradas como pendência (PA-01) e não foram estimadas neste documento. As únicas metas numéricas existentes estão em RNF-01 (extração em até 3 minutos).

## 1.4 Premissas e restrições

- As provas de entrada são PDFs predominantemente digitais, com texto selecionável (não digitalizações).

- Princípio de projeto: simplicidade. Uma aplicação principal em Next.js, banco PostgreSQL e um worker separado para a extração, sem microsserviços nem infraestrutura desnecessária.

- Toda a stack é preliminar: nenhuma escolha é definitiva antes de testar as ferramentas com documentos reais e avaliar tempo, familiaridade da equipe e necessidades que surgirem.

- As estimativas de Story Points são sugestões do backlog; as finais serão definidas pela equipe no Planning Poker.

# 2. Escopo

## 2.1 Dentro do escopo

12 histórias de usuário (PB01 a PB12), organizadas em 5 épicos e somando 54 Story Points:

- Importação de provas em PDF, extração automática de questões e importação do gabarito oficial.

- Revisão, publicação e descarte de questões pelo administrador.

- Simulado do aluno com correção automática e histórico.

- Login por perfil (administrador e aluno).

- Qualidade: extração em segundo plano, senhas e PDFs protegidos, telas responsivas e resposta rápida na curadoria.

## 2.2 Fora do escopo ou adiado

- **OCR (Tesseract.js ou similar):** não previsto; só entra se os testes revelarem arquivos digitalizados ou páginas sem texto selecionável.

- **Exportação de resultados ou relatórios em PDF (pdf-lib):** não consta no backlog; condicional e adiada.

- **Hospedagem remota, CD e Cloudflare R2:** opcionais e adiados; sem hospedagem, o ambiente se mantém em Docker Compose.

- **Visualização da prova original no navegador (PDF.js):** condicional, a decidir com base na revisão.

## 2.3 Convenções

- **Prioridade:** segue o Backlog (Alta ou Média). O backlog não usa MoSCoW, então essa classificação não foi adotada.

- **IDs:** `RF-<módulo>-<nº>` (requisito funcional), `RNF-<nº>` (não funcional), `RN-<nº>` (regra de negócio), `PA-<nº>` (pendência ou decisão), `PB<nº>` (história do backlog).

- Nada foi estimado sem aviso: onde o documento de origem não traz a informação, o requisito aponta a pendência correspondente.

## 2.4 Fontes

| **Sigla** | **Fonte** |
| --- | --- |
| **BKL** | Product Backlog e EAP (Equipe_5 - Backlog.pdf): histórias PB01 a PB12, prioridades, critérios de aceitação e estimativas sugeridas |
| **VF** | Decisões técnicas e planejamento de sprints (Equipe_5_VFINAL.pdf): divisão em frentes, stack, arquitetura, sprints, riscos e pendências |
| **EQ** | Decisões da equipe registradas no VF (seção 1.3) |

# 3. Atores e perfis

| **Ator** | **Quem é** | **Usa o sistema para** |
| --- | --- | --- |
| **Administrador** | Responsável pela curadoria das provas | Enviar PDFs e gabaritos, acompanhar a extração, revisar, publicar ou descartar questões |
| **Aluno** | Estudante que pratica com as provas | Escolher uma edição, responder o simulado, ver a correção e consultar o histórico |
| **Sistema (worker)** | Processo em segundo plano | Executar a extração, gravar questões pendentes de revisão e registrar falhas por questão |

Matriz de acesso por perfil (derivada das histórias do Backlog; a autorização é verificada no backend, conforme RN-01):

| **Funcionalidade** | **Administrador** | **Aluno** |
| --- | --- | --- |
| Login e acesso à página inicial do perfil | Sim | Sim |
| Enviar PDF de prova e informar a edição | Sim | — |
| Importar gabarito oficial | Sim | — |
| Acompanhar o processamento da extração | Sim | — |
| Revisar questões extraídas | Sim | — |
| Publicar ou descartar questões | Sim | — |
| Escolher edição e responder simulado | — | Sim |
| Ver correção e histórico próprio | — | Sim |

# 4. Jornadas do usuário

## 4.1 Administrador

1.  Entra no sistema com suas credenciais e é levado à página inicial do administrador.

2.  Envia o PDF de uma prova e informa a edição (ano e área de avaliação).

3.  Acompanha o processamento enquanto continua usando o sistema; a extração roda em segundo plano.

4.  Importa o gabarito oficial vinculado à edição; as respostas corretas são associadas e as anuladas, marcadas.

5.  Revisa as questões pendentes: corrige enunciados e alternativas, trata as sinalizadas (imagem, gráfico ou tabela) e confirma ou altera a alternativa correta.

6.  Publica as questões revisadas ou descarta as que não foram extraídas corretamente.

## 4.2 Aluno

1.  Entra no sistema e é levado à página inicial do aluno.

2.  Escolhe uma edição do ENADE que tenha ao menos uma questão publicada.

3.  Responde as questões selecionando alternativas, navegando livremente (avançar, retroceder, pular).

4.  Finaliza o simulado e recebe acertos, erros e o gabarito de cada questão, sem contar as anuladas.

5.  Consulta o histórico e reabre o resultado de simulados anteriores, inclusive pelo celular.

# 5. Visão geral dos módulos

| **Sigla** | **Módulo (épico)** | **Histórias** | **Qtd. RF** | **Alta / Média** | **SP** |
| --- | --- | --- | --- | --- | --- |
| IMP | Importação e extração de provas | PB01, PB02 | 6 | 6 / 0 | 13 |
| REV | Revisão e curadoria | PB03, PB04 | 5 | 5 / 0 | 8 |
| SIM | Aplicação do simulado | PB05, PB06, PB07 | 7 | 6 / 1 | 16 |
| ACS | Autenticação e controle de acesso | PB08 | 2 | 2 / 0 | 5 |
| QLD | Qualidade e desempenho | PB09, PB10, PB11, PB12 | 6 | 4 / 2 | 12 |
| | **Total** | 12 histórias | **26** | **23 / 3** | **54** |

Cada módulo corresponde a um épico do Backlog. Nos requisitos, “Alta / Média” é a prioridade das histórias de origem; os SP são as estimativas sugeridas no Backlog (valores preliminares).

# 6. Requisitos funcionais

Cada módulo começa com um quadro-resumo e segue com a ficha de cada requisito: descrição, ator, prioridade, origem, entradas, regras de negócio, saídas e critérios de aceite. Os critérios derivam dos critérios de aceitação do Backlog e das decisões do VF.

## 6.1 Importação e extração de provas (IMP)

| **ID** | **Requisito** | **Ator** | **Prior.** | **Origem** |
| --- | --- | --- | --- | --- |
| RF-IMP-01 | O administrador deve poder enviar o arquivo PDF de uma prova do ENADE e informar a edição correspondente (ano e área de avaliação). | Administrador | Alta | BKL PB01 (critério 1) |
| RF-IMP-02 | O sistema deve extrair automaticamente o enunciado e as 5 alternativas de cada questão objetiva do PDF, preservando o número original da questão. | Sistema (worker) | Alta | BKL PB01 (critérios 2 e 3) |
| RF-IMP-03 | O sistema deve sinalizar, para tratamento manual, as questões cujo enunciado dependa de imagem, gráfico ou tabela. | Sistema (worker) | Alta | BKL PB01 (critério 4) |
| RF-IMP-04 | O administrador deve poder acompanhar o andamento e o resultado do processamento da prova enviada, sem conhecer os detalhes do parser. | Administrador | Alta (via PB01) | VF 3.2 (passo 6), 4.3, Sprint 3 |
| RF-IMP-05 | O administrador deve poder enviar o gabarito oficial vinculado a uma edição já importada, e o sistema deve associar automaticamente a alternativa correta a cada questão extraída dessa edição. | Administrador | Alta | BKL PB02 (critérios 1 e 2) |
| RF-IMP-06 | O sistema deve marcar como anuladas as questões indicadas como tal no gabarito oficial. | Sistema | Alta | BKL PB02 (critério 3) |

### RF-IMP-01 — Envio do PDF e informe da edição

| **Campo** | **Conteúdo** |
| --- | --- |
| **Descrição** | O administrador deve poder enviar o arquivo PDF de uma prova do ENADE e informar a edição correspondente (ano e área de avaliação). |
| **Ator / prioridade** | Administrador · Alta |
| **Origem** | BKL PB01 (critério 1); VF 3.2 |
| **Entradas de dados** | Arquivo PDF; ano; área de avaliação. |
| **Regras de negócio** | — |
| **Saídas** | Edição registrada; PDF armazenado; tarefa criada na fila de processamento. |
| **Critérios de aceite** | 1\. Envio válido — o sistema registra a edição, armazena o arquivo e cria a tarefa de extração |

### RF-IMP-02 — Extração de enunciados, alternativas e numeração

| **Campo** | **Conteúdo** |
| --- | --- |
| **Descrição** | O sistema deve extrair automaticamente o enunciado e as 5 alternativas de cada questão objetiva do PDF, preservando o número original da questão. |
| **Ator / prioridade** | Sistema (worker) · Alta |
| **Origem** | BKL PB01 (critérios 2 e 3); VF 2.3, 3.2 |
| **Entradas de dados** | PDF armazenado (texto selecionável). |
| **Regras de negócio** | RN-14: Cada questão objetiva é composta por um enunciado e 5 alternativas.<br>RN-06: O número original de cada questão, conforme consta na prova, é preservado na extração.<br>RN-13: As questões extraídas ficam pendentes de revisão até serem publicadas ou descartadas. |
| **Saídas** | Questões gravadas como pendentes de revisão, com número original. |
| **Critérios de aceite** | 1\. Extração — para cada questão objetiva, o sistema obtém o enunciado e as 5 alternativas<br>2. Numeração — o número original da questão é mantido como consta na prova<br>3. Resultado — as questões extraídas ficam pendentes de revisão |

### RF-IMP-03 — Sinalização de questões dependentes de imagem, gráfico ou tabela

| **Campo** | **Conteúdo** |
| --- | --- |
| **Descrição** | O sistema deve sinalizar, para tratamento manual, as questões cujo enunciado dependa de imagem, gráfico ou tabela. |
| **Ator / prioridade** | Sistema (worker) · Alta |
| **Origem** | BKL PB01 (critério 4); VF 2.3 |
| **Entradas de dados** | Conteúdo extraído da questão. |
| **Regras de negócio** | RN-07: Questões cujo enunciado dependa de imagem, gráfico ou tabela são sinalizadas para tratamento manual. |
| **Saídas** | Questão sinalizada para tratamento manual na revisão. |
| **Critérios de aceite** | 1\. Questão com imagem, gráfico ou tabela — o sistema a sinaliza para tratamento manual |

### RF-IMP-04 — Acompanhamento do estado do processamento

| **Campo** | **Conteúdo** |
| --- | --- |
| **Descrição** | O administrador deve poder acompanhar o andamento e o resultado do processamento da prova enviada, sem conhecer os detalhes do parser. |
| **Ator / prioridade** | Administrador · Alta (via PB01) |
| **Origem** | VF 3.2 (passo 6), 4.3, Sprint 3 |
| **Entradas de dados** | Edição enviada. |
| **Regras de negócio** | — |
| **Saídas** | Estado do processamento exibido (andamento ou resultado). |
| **Critérios de aceite** | 1\. Processamento em andamento — a tela mostra o estado atual<br>2. Processamento concluído — a tela mostra o resultado |

### RF-IMP-05 — Importação do gabarito oficial

| **Campo** | **Conteúdo** |
| --- | --- |
| **Descrição** | O administrador deve poder enviar o gabarito oficial vinculado a uma edição já importada, e o sistema deve associar automaticamente a alternativa correta a cada questão extraída dessa edição. |
| **Ator / prioridade** | Administrador · Alta |
| **Origem** | BKL PB02 (critérios 1 e 2); VF Sprint 4 |
| **Entradas de dados** | Arquivo do gabarito; edição. |
| **Regras de negócio** | RN-12: O gabarito oficial é vinculado a uma edição já importada. |
| **Saídas** | Alternativa correta associada a cada questão da edição. |
| **Critérios de aceite** | 1\. Gabarito de edição importada — o envio é aceito e vinculado à edição<br>2. Associação — a alternativa correta é associada automaticamente a cada questão extraída |

### RF-IMP-06 — Marcação de questões anuladas

| **Campo** | **Conteúdo** |
| --- | --- |
| **Descrição** | O sistema deve marcar como anuladas as questões indicadas como tal no gabarito oficial. |
| **Ator / prioridade** | Sistema · Alta |
| **Origem** | BKL PB02 (critério 3) |
| **Entradas de dados** | Gabarito oficial com indicação de anuladas. |
| **Regras de negócio** | RN-04: Questões anuladas ficam fora do cálculo do resultado. |
| **Saídas** | Questões anuladas marcadas. |
| **Critérios de aceite** | 1\. Questão anulada no gabarito — o sistema a marca como anulada |

## 6.2 Revisão e curadoria (REV)

| **ID** | **Requisito** | **Ator** | **Prior.** | **Origem** |
| --- | --- | --- | --- | --- |
| RF-REV-01 | O sistema deve exibir ao administrador a lista de questões extraídas pendentes de revisão. | Administrador | Alta | BKL PB03 (critério 1) |
| RF-REV-02 | O administrador deve poder editar o enunciado e o texto de qualquer alternativa de uma questão, corrigindo falhas da extração automática. | Administrador | Alta | BKL PB03 (critério 2) |
| RF-REV-03 | O administrador deve poder confirmar ou alterar a alternativa marcada como correta pelo sistema. | Administrador | Alta | BKL PB03 (critério 3) |
| RF-REV-04 | O administrador deve poder publicar uma questão revisada, tornando-a disponível para uso em simulados. | Administrador | Alta | BKL PB04 (critérios 1 e 3) |
| RF-REV-05 | O administrador deve poder descartar uma questão que não foi extraída corretamente. | Administrador | Alta | BKL PB04 (critério 2) |

### RF-REV-01 — Lista de questões pendentes de revisão

| **Campo** | **Conteúdo** |
| --- | --- |
| **Descrição** | O sistema deve exibir ao administrador a lista de questões extraídas pendentes de revisão. |
| **Ator / prioridade** | Administrador · Alta |
| **Origem** | BKL PB03 (critério 1) |
| **Entradas de dados** | Edição (filtro). |
| **Regras de negócio** | RN-13: As questões extraídas ficam pendentes de revisão até serem publicadas ou descartadas. |
| **Saídas** | Lista de questões pendentes. |
| **Critérios de aceite** | 1\. Lista — são exibidas as questões extraídas que aguardam revisão |

### RF-REV-02 — Edição de enunciado e alternativas

| **Campo** | **Conteúdo** |
| --- | --- |
| **Descrição** | O administrador deve poder editar o enunciado e o texto de qualquer alternativa de uma questão, corrigindo falhas da extração automática. |
| **Ator / prioridade** | Administrador · Alta |
| **Origem** | BKL PB03 (critério 2) |
| **Entradas de dados** | Questão; novo texto do enunciado ou da alternativa. |
| **Regras de negócio** | — |
| **Saídas** | Questão atualizada. |
| **Critérios de aceite** | 1\. Edição do enunciado — o texto alterado é salvo<br>2. Edição de alternativa — o texto de qualquer alternativa pode ser alterado |

### RF-REV-03 — Confirmação ou alteração da alternativa correta

| **Campo** | **Conteúdo** |
| --- | --- |
| **Descrição** | O administrador deve poder confirmar ou alterar a alternativa marcada como correta pelo sistema. |
| **Ator / prioridade** | Administrador · Alta |
| **Origem** | BKL PB03 (critério 3) |
| **Entradas de dados** | Questão; alternativa correta. |
| **Regras de negócio** | — |
| **Saídas** | Alternativa correta confirmada ou alterada. |
| **Critérios de aceite** | 1\. Confirmação — a alternativa marcada é mantida<br>2. Alteração — a nova alternativa passa a ser a correta |

### RF-REV-04 — Publicação de questão revisada

| **Campo** | **Conteúdo** |
| --- | --- |
| **Descrição** | O administrador deve poder publicar uma questão revisada, tornando-a disponível para uso em simulados. |
| **Ator / prioridade** | Administrador · Alta |
| **Origem** | BKL PB04 (critérios 1 e 3); VF 3.3 |
| **Entradas de dados** | Questão revisada. |
| **Regras de negócio** | RN-02: Questão não publicada não aparece para nenhum aluno em nenhuma tela do sistema.<br>RN-01: Autorização verificada no backend em cada operação protegida, e não apenas ocultando telas. |
| **Saídas** | Questão publicada e disponível para simulados. |
| **Critérios de aceite** | 1\. Publicar — a questão fica disponível para uso em simulados<br>2. Questão não publicada — não aparece para nenhum aluno em nenhuma tela |

### RF-REV-05 — Descarte de questão

| **Campo** | **Conteúdo** |
| --- | --- |
| **Descrição** | O administrador deve poder descartar uma questão que não foi extraída corretamente. |
| **Ator / prioridade** | Administrador · Alta |
| **Origem** | BKL PB04 (critério 2) |
| **Entradas de dados** | Questão. |
| **Regras de negócio** | RN-02: Questão não publicada não aparece para nenhum aluno em nenhuma tela do sistema. |
| **Saídas** | Questão descartada, fora de qualquer simulado. |
| **Critérios de aceite** | 1\. Descartar — a questão deixa de ser considerada e não aparece para nenhum aluno |

## 6.3 Aplicação do simulado (SIM)

| **ID** | **Requisito** | **Ator** | **Prior.** | **Origem** |
| --- | --- | --- | --- | --- |
| RF-SIM-01 | O sistema deve listar para o aluno apenas as edições do ENADE com ao menos uma questão publicada. | Aluno | Alta | BKL PB05 (critério 1) |
| RF-SIM-02 | O aluno deve poder responder cada questão do simulado selecionando uma alternativa. | Aluno | Alta | BKL PB05 (critério 2) |
| RF-SIM-03 | O aluno deve poder navegar livremente entre as questões (avançar, retroceder e pular) antes de finalizar o simulado. | Aluno | Alta | BKL PB05 (critério 3) |
| RF-SIM-04 | Ao finalizar o simulado, o sistema deve calcular e exibir o número de acertos e erros e o gabarito de cada questão respondida. | Aluno | Alta | BKL PB06 (critérios 1 e 2) |
| RF-SIM-05 | O sistema não deve considerar as questões anuladas no cálculo do resultado do simulado. | Sistema | Alta | BKL PB06 (critério 3) |
| RF-SIM-06 | Um simulado finalizado não pode mais ser alterado, preservando o resultado obtido pelo aluno. | Sistema | Alta | BKL PB06 (critério 4) |
| RF-SIM-07 | O sistema deve listar os simulados já finalizados pelo aluno e permitir reabrir e visualizar o resultado de qualquer um deles. | Aluno | Média | BKL PB07 |

### RF-SIM-01 — Listagem de edições disponíveis

| **Campo** | **Conteúdo** |
| --- | --- |
| **Descrição** | O sistema deve listar para o aluno apenas as edições do ENADE com ao menos uma questão publicada. |
| **Ator / prioridade** | Aluno · Alta |
| **Origem** | BKL PB05 (critério 1) |
| **Entradas de dados** | — |
| **Regras de negócio** | RN-05: O aluno só vê edições que tenham ao menos uma questão publicada.<br>RN-02: Questão não publicada não aparece para nenhum aluno em nenhuma tela do sistema. |
| **Saídas** | Lista de edições disponíveis. |
| **Critérios de aceite** | 1\. Edição com questão publicada — aparece na lista<br>2. Edição sem questão publicada — não aparece |

### RF-SIM-02 — Resposta às questões

| **Campo** | **Conteúdo** |
| --- | --- |
| **Descrição** | O aluno deve poder responder cada questão do simulado selecionando uma alternativa. |
| **Ator / prioridade** | Aluno · Alta |
| **Origem** | BKL PB05 (critério 2) |
| **Entradas de dados** | Edição escolhida; alternativa selecionada. |
| **Regras de negócio** | — |
| **Saídas** | Resposta registrada. |
| **Critérios de aceite** | 1\. Seleção de alternativa — a resposta da questão fica registrada |

### RF-SIM-03 — Navegação livre entre questões

| **Campo** | **Conteúdo** |
| --- | --- |
| **Descrição** | O aluno deve poder navegar livremente entre as questões (avançar, retroceder e pular) antes de finalizar o simulado. |
| **Ator / prioridade** | Aluno · Alta |
| **Origem** | BKL PB05 (critério 3) |
| **Entradas de dados** | Ação de navegação. |
| **Regras de negócio** | — |
| **Saídas** | Questão exibida conforme a navegação. |
| **Critérios de aceite** | 1\. Avançar, retroceder e pular — o aluno acessa qualquer questão antes de finalizar |

### RF-SIM-04 — Finalização e correção automática

| **Campo** | **Conteúdo** |
| --- | --- |
| **Descrição** | Ao finalizar o simulado, o sistema deve calcular e exibir o número de acertos e erros e o gabarito de cada questão respondida. |
| **Ator / prioridade** | Aluno · Alta |
| **Origem** | BKL PB06 (critérios 1 e 2) |
| **Entradas de dados** | Simulado com respostas. |
| **Regras de negócio** | RN-03: A correção é calculada no backend. Um simulado finalizado não pode mais ser alterado, preservando o resultado do aluno. |
| **Saídas** | Resultado com acertos, erros e gabarito por questão. |
| **Critérios de aceite** | 1\. Finalização — o sistema calcula e exibe o número de acertos e de erros<br>2. Gabarito — é exibido para cada questão respondida |

### RF-SIM-05 — Anuladas fora do cálculo

| **Campo** | **Conteúdo** |
| --- | --- |
| **Descrição** | O sistema não deve considerar as questões anuladas no cálculo do resultado do simulado. |
| **Ator / prioridade** | Sistema · Alta |
| **Origem** | BKL PB06 (critério 3) |
| **Entradas de dados** | Simulado finalizado. |
| **Regras de negócio** | RN-04: Questões anuladas ficam fora do cálculo do resultado. |
| **Saídas** | Resultado calculado sem as questões anuladas. |
| **Critérios de aceite** | 1\. Questão anulada — não entra no cálculo de acertos e erros |

### RF-SIM-06 — Simulado finalizado imutável

| **Campo** | **Conteúdo** |
| --- | --- |
| **Descrição** | Um simulado finalizado não pode mais ser alterado, preservando o resultado obtido pelo aluno. |
| **Ator / prioridade** | Sistema · Alta |
| **Origem** | BKL PB06 (critério 4); VF 3.3 |
| **Entradas de dados** | Tentativa de alteração. |
| **Regras de negócio** | RN-03: A correção é calculada no backend. Um simulado finalizado não pode mais ser alterado, preservando o resultado do aluno. |
| **Saídas** | Resultado preservado. |
| **Critérios de aceite** | 1\. Alteração após finalizar — o sistema não permite e o resultado se mantém |

### RF-SIM-07 — Histórico de simulados

| **Campo** | **Conteúdo** |
| --- | --- |
| **Descrição** | O sistema deve listar os simulados já finalizados pelo aluno e permitir reabrir e visualizar o resultado de qualquer um deles. |
| **Ator / prioridade** | Aluno · Média |
| **Origem** | BKL PB07 |
| **Entradas de dados** | — |
| **Regras de negócio** | — |
| **Saídas** | Lista de simulados finalizados; resultado reaberto. |
| **Critérios de aceite** | 1\. Lista — são exibidos os simulados já finalizados pelo aluno<br>2. Reabertura — o aluno visualiza o resultado de qualquer simulado do histórico |

## 6.4 Autenticação e controle de acesso (ACS)

| **ID** | **Requisito** | **Ator** | **Prior.** | **Origem** |
| --- | --- | --- | --- | --- |
| RF-ACS-01 | O sistema deve autenticar o usuário por credenciais válidas e impedir o acesso, informando que o login não foi realizado, quando as credenciais forem inválidas. | Administrador, Aluno | Alta | BKL PB08 (critérios 1 e 3) |
| RF-ACS-02 | Após a autenticação, o sistema deve conceder acesso apenas às funcionalidades do perfil do usuário (administrador ou aluno) e redirecioná-lo à página inicial correspondente. | Administrador, Aluno | Alta | BKL PB08 (critério 2) |

### RF-ACS-01 — Login por credenciais

| **Campo** | **Conteúdo** |
| --- | --- |
| **Descrição** | O sistema deve autenticar o usuário por credenciais válidas e impedir o acesso, informando que o login não foi realizado, quando as credenciais forem inválidas. |
| **Ator / prioridade** | Administrador, Aluno · Alta |
| **Origem** | BKL PB08 (critérios 1 e 3) |
| **Entradas de dados** | Credenciais do usuário. |
| **Regras de negócio** | RN-10: Senhas nunca são guardadas em texto puro nem com criptografia reversível; usa-se hash seguro. |
| **Saídas** | Sessão aberta ou mensagem de login não realizado. |
| **Critérios de aceite** | 1\. Credenciais válidas — o usuário acessa o sistema<br>2. Credenciais inválidas — o acesso é impedido e o sistema informa que o login não foi realizado |

### RF-ACS-02 — Acesso restrito ao perfil

| **Campo** | **Conteúdo** |
| --- | --- |
| **Descrição** | Após a autenticação, o sistema deve conceder acesso apenas às funcionalidades do perfil do usuário (administrador ou aluno) e redirecioná-lo à página inicial correspondente. |
| **Ator / prioridade** | Administrador, Aluno · Alta |
| **Origem** | BKL PB08 (critério 2); VF 2.2, 3.3 |
| **Entradas de dados** | Perfil do usuário autenticado; função solicitada. |
| **Regras de negócio** | RN-01: Autorização verificada no backend em cada operação protegida, e não apenas ocultando telas. |
| **Saídas** | Página inicial do perfil; acesso liberado ou negado. |
| **Critérios de aceite** | 1\. Administrador — acessa as funções administrativas e vai à página inicial do administrador<br>2. Aluno — acessa as funções do aluno e vai à página inicial do aluno<br>3. Função de outro perfil — o backend nega o acesso |

## 6.5 Qualidade e desempenho (QLD)

| **ID** | **Requisito** | **Ator** | **Prior.** | **Origem** |
| --- | --- | --- | --- | --- |
| RF-QLD-01 | A extração de uma prova deve ocorrer em segundo plano, sem bloquear o uso do sistema pelo administrador. A meta de tempo está em RNF-01. | Administrador | Alta | BKL PB09 (critério 2) |
| RF-QLD-02 | Uma falha na extração de uma questão específica não deve interromper o processamento das demais questões da mesma prova. | Sistema | Alta | BKL PB09 (critério 3) |
| RF-QLD-03 | As senhas dos usuários devem ser armazenadas de forma protegida (hash seguro), nunca em texto puro nem com criptografia reversível. | Todos os usuários | Alta | BKL PB10 (critério 1) |
| RF-QLD-04 | O arquivo PDF original de cada prova importada deve ser preservado no sistema, permitindo consulta posterior com acesso controlado pelo backend. | Administrador | Alta | BKL PB10 (critério 2) |
| RF-QLD-05 | As telas destinadas ao aluno devem ser responsivas, adaptando-se corretamente a smartphones. | Aluno | Média | BKL PB11 |
| RF-QLD-06 | As ações de publicar e descartar uma questão na tela de revisão devem responder em tempo curto, que não aumente com o volume de questões já revisadas. A meta numérica está pendente (PA-02). | Administrador | Média | BKL PB12 |

### RF-QLD-01 — Extração em segundo plano

| **Campo** | **Conteúdo** |
| --- | --- |
| **Descrição** | A extração de uma prova deve ocorrer em segundo plano, sem bloquear o uso do sistema pelo administrador. A meta de tempo está em RNF-01. |
| **Ator / prioridade** | Administrador · Alta |
| **Origem** | BKL PB09 (critério 2); VF 2.4, 3.2 |
| **Entradas de dados** | Tarefa de extração na fila. |
| **Regras de negócio** | RN-09: A reexecução de uma tarefa de extração não pode gerar registros duplicados. |
| **Saídas** | Extração executada pelo worker; sistema disponível durante o processamento. |
| **Critérios de aceite** | 1\. Extração em andamento — o administrador continua usando o sistema<br>2. Reexecução da tarefa — não gera registros duplicados |

### RF-QLD-02 — Isolamento de falhas por questão

| **Campo** | **Conteúdo** |
| --- | --- |
| **Descrição** | Uma falha na extração de uma questão específica não deve interromper o processamento das demais questões da mesma prova. |
| **Ator / prioridade** | Sistema · Alta |
| **Origem** | BKL PB09 (critério 3); VF 3.2 |
| **Entradas de dados** | Questões da prova em processamento. |
| **Regras de negócio** | RN-08: Uma falha na extração de uma questão não interrompe as demais; as falhas são registradas por questão. |
| **Saídas** | Questões válidas gravadas; falhas registradas por questão. |
| **Critérios de aceite** | 1\. Falha em uma questão — as demais são processadas e a falha fica registrada |

### RF-QLD-03 — Senhas armazenadas de forma protegida

| **Campo** | **Conteúdo** |
| --- | --- |
| **Descrição** | As senhas dos usuários devem ser armazenadas de forma protegida (hash seguro), nunca em texto puro nem com criptografia reversível. |
| **Ator / prioridade** | Todos os usuários · Alta |
| **Origem** | BKL PB10 (critério 1); VF 2.2 |
| **Entradas de dados** | Senha do usuário. |
| **Regras de negócio** | RN-10: Senhas nunca são guardadas em texto puro nem com criptografia reversível; usa-se hash seguro. |
| **Saídas** | Hash da senha armazenado. |
| **Critérios de aceite** | 1\. Armazenamento — a senha não é guardada em texto puro nem com criptografia reversível |

### RF-QLD-04 — Preservação do PDF original

| **Campo** | **Conteúdo** |
| --- | --- |
| **Descrição** | O arquivo PDF original de cada prova importada deve ser preservado no sistema, permitindo consulta posterior com acesso controlado pelo backend. |
| **Ator / prioridade** | Administrador · Alta |
| **Origem** | BKL PB10 (critério 2); VF 2.5, 3.3 |
| **Entradas de dados** | PDF enviado. |
| **Regras de negócio** | RN-11: O PDF original de cada prova importada é preservado para consulta posterior, com acesso controlado pelo backend. |
| **Saídas** | PDF armazenado; metadados e referência no banco. |
| **Critérios de aceite** | 1\. Consulta posterior — o PDF original continua disponível, com acesso controlado pelo backend |

### RF-QLD-05 — Telas do aluno responsivas

| **Campo** | **Conteúdo** |
| --- | --- |
| **Descrição** | As telas destinadas ao aluno devem ser responsivas, adaptando-se corretamente a smartphones. |
| **Ator / prioridade** | Aluno · Média |
| **Origem** | BKL PB11 |
| **Entradas de dados** | — |
| **Regras de negócio** | — |
| **Saídas** | Telas do aluno utilizáveis em smartphone. |
| **Critérios de aceite** | 1\. Acesso por smartphone — as telas do aluno se adaptam corretamente |

### RF-QLD-06 — Publicar e descartar com resposta rápida

| **Campo** | **Conteúdo** |
| --- | --- |
| **Descrição** | As ações de publicar e descartar uma questão na tela de revisão devem responder em tempo curto, que não aumente com o volume de questões já revisadas. A meta numérica está pendente (PA-02). |
| **Ator / prioridade** | Administrador · Média |
| **Origem** | BKL PB12; VF 4.3 |
| **Entradas de dados** | Questão; ação (publicar ou descartar). |
| **Regras de negócio** | RN-15: O tempo de resposta de publicar e descartar uma questão não cresce com o volume de questões já revisadas na prova. |
| **Saídas** | Ação concluída com feedback imediato. |
| **Critérios de aceite** | 1\. Publicar ou descartar — a resposta é rápida<br>2. Prova com muitas questões já revisadas — o tempo de resposta não aumenta |

# 7. Requisitos não funcionais

Metas numéricas só existem onde o Backlog ou o VF as trazem. Onde o documento de origem diz apenas “rápido” ou “curto”, a meta fica pendente (PA-02).

| **ID** | **Categoria** | **Descrição** | **Critério de verificação** | **Origem** |
| --- | --- | --- | --- | --- |
| RNF-01 | Desempenho | O processamento de um PDF de prova deve ser concluído em até 3 minutos. | Medir o tempo de extração em provas reais contra o limite de 3 minutos (Sprint 6). O limite não é garantido pela biblioteca de fila. | BKL PB09; VF 3.2, Sprint 6 |
| RNF-02 | Desempenho | Publicar e descartar questões respondem em tempo curto, que não cresce com o volume de questões já revisadas. | Operações pontuais por identificador, índices adequados e medição com volume maior (Sprints 5 e 6). Meta numérica: PA-02. | BKL PB12; VF 6 |
| RNF-03 | Disponibilidade | A extração roda em segundo plano, em processo worker separado da aplicação web, sem bloquear o uso do sistema. | Enviar uma prova e continuar usando as telas do administrador durante o processamento. | BKL PB09; VF 2.4 |
| RNF-04 | Segurança | A autorização por perfil é verificada no backend em cada operação protegida. | Testes de permissões e de integração com perfil sem permissão (Vitest); revisão das permissões na Sprint 6. | VF 2.2, 3.3 |
| RNF-05 | Segurança | Senhas com hash seguro (via Better Auth); nunca em texto puro nem com criptografia reversível. | Validar o hash das senhas na Sprint 6. | BKL PB10; VF 2.2 |
| RNF-06 | Segurança | PDFs originais preservados com acesso controlado pelo backend; em implantação remota, em bucket privado. | Validar o acesso aos PDFs originais apenas pelo backend (Sprint 6). | BKL PB10; VF 2.5, 3.3 |
| RNF-07 | Integridade | Correção calculada no backend; simulado finalizado não pode ser alterado; questão não publicada não aparece ao aluno. | Testes das regras que podem comprometer resultados: gabarito da edição correta, anuladas, cálculo de acertos e erros, bloqueio após finalização. | BKL PB04, PB06; VF 2.6, 3.3 |
| RNF-08 | Confiabilidade | A reexecução de uma tarefa de extração não gera registros duplicados; falhas são registradas por questão. | Reexecutar a mesma tarefa e conferir ausência de duplicidade; testar falhas isoladas. | VF 3.2, Sprint 6 |
| RNF-09 | Compatibilidade | Telas do aluno responsivas em smartphones, tratada desde o início do desenvolvimento. | Testes E2E dos fluxos do aluno e verificação em smartphone (Sprint 6). | BKL PB11; VF Sprints 3 e 6 |
| RNF-10 | Manutenibilidade | TypeScript em todo o código; ESLint e verificação de tipos (tsc --noEmit); alterações na main por Pull Request com revisão. | CI em cada Pull Request para a main: npm ci, ESLint, tipos, Vitest e build do Next.js. | VF 2.6, 3.4 |
| RNF-11 | Testabilidade | Regras de extração, gabarito, correção e permissões cobertas por testes unitários e de integração (Vitest) e fluxos completos por ponta a ponta (Playwright). | Fluxos prioritários cobertos ao fim da Sprint 6: login, revisão de questões e realização de simulado. | VF 2.6 |
| RNF-12 | Portabilidade | Ambiente local padronizado para toda a equipe com Docker Compose (serviços web, worker e db). | Todos executam o mesmo projeto localmente, com o CI passando (resultado da Sprint 1). | VF 2.7, 3.1 |

# 8. Regras de negócio

| **ID** | **Regra** | **Origem** |
| --- | --- | --- |
| RN-01 | Autorização verificada no backend em cada operação protegida, e não apenas ocultando telas. | VF 2.2, 3.3 |
| RN-02 | Questão não publicada não aparece para nenhum aluno em nenhuma tela do sistema. | BKL PB04; VF 3.3 |
| RN-03 | A correção é calculada no backend. Um simulado finalizado não pode mais ser alterado, preservando o resultado do aluno. | BKL PB06; VF 3.3 |
| RN-04 | Questões anuladas ficam fora do cálculo do resultado. | BKL PB02, PB06; VF 3.3 |
| RN-05 | O aluno só vê edições que tenham ao menos uma questão publicada. | BKL PB05 |
| RN-06 | O número original de cada questão, conforme consta na prova, é preservado na extração. | BKL PB01 |
| RN-07 | Questões cujo enunciado dependa de imagem, gráfico ou tabela são sinalizadas para tratamento manual. | BKL PB01 |
| RN-08 | Uma falha na extração de uma questão não interrompe as demais; as falhas são registradas por questão. | BKL PB09; VF 3.2 |
| RN-09 | A reexecução de uma tarefa de extração não pode gerar registros duplicados. | VF 3.2 |
| RN-10 | Senhas nunca são guardadas em texto puro nem com criptografia reversível; usa-se hash seguro. | BKL PB10; VF 2.2 |
| RN-11 | O PDF original de cada prova importada é preservado para consulta posterior, com acesso controlado pelo backend. | BKL PB10; VF 3.3 |
| RN-12 | O gabarito oficial é vinculado a uma edição já importada. | BKL PB02 |
| RN-13 | As questões extraídas ficam pendentes de revisão até serem publicadas ou descartadas. | BKL PB03; VF 3.2 |
| RN-14 | Cada questão objetiva é composta por um enunciado e 5 alternativas. | BKL PB01 |
| RN-15 | O tempo de resposta de publicar e descartar uma questão não cresce com o volume de questões já revisadas na prova. | BKL PB12 |

## 8.1 Glossário

| **Termo** | **Definição** |
| --- | --- |
| **Edição** | Prova do ENADE de um determinado ano e área de avaliação. |
| **Questão objetiva** | Questão com enunciado e 5 alternativas, uma delas correta. |
| **Gabarito oficial** | Relação das alternativas corretas de uma edição, incluindo as questões anuladas. |
| **Questão anulada** | Questão indicada como anulada no gabarito; fica fora do cálculo do resultado. |
| **Pendente de revisão** | Estado da questão extraída que ainda não foi publicada nem descartada. |
| **Publicar / descartar** | Publicar torna a questão disponível para simulados; descartar retira questão extraída incorretamente. |
| **Simulado** | Conjunto das questões publicadas de uma edição, respondido pelo aluno. |
| **Worker** | Processo Node.js/TypeScript separado da aplicação web que executa a extração. |
| **Fila (pg-boss)** | Mecanismo que enfileira as tarefas de extração usando o PostgreSQL. |
| **Épico / PB / SP** | Épico: agrupamento de histórias; PB: item do Product Backlog; SP: Story Points, estimativa sugerida. |

# 9. Arquitetura e stack

## 9.1 Serviços do ambiente local

| **Serviço** | **Responsabilidade** |
| --- | --- |
| **web** | Aplicação Next.js (telas e Route Handlers). |
| **worker** | Processo de extração e execução das tarefas da fila. |
| **db** | Banco PostgreSQL, também usado pela fila pg-boss. |

O compose.yaml define variáveis de ambiente, rede entre os serviços e a persistência do banco e, se necessário, dos PDFs locais. O PostgreSQL guarda os metadados e a referência ao arquivo; o conteúdo binário do PDF fica no armazenamento de arquivos.

## 9.2 Fluxo de importação e extração

1.  O administrador envia o PDF e informa a edição (ano e área).

2.  A aplicação registra a edição e armazena o arquivo.

3.  A aplicação cria uma tarefa na fila do pg-boss.

4.  O worker obtém a tarefa e executa a extração com pdf-parse e as regras desenvolvidas pela equipe.

5.  As questões identificadas são gravadas como pendentes de revisão.

6.  O estado do processamento é atualizado para que o frontend mostre o andamento ou o resultado.

O pdf-parse extrai texto, mas não identifica a estrutura lógica das questões. A frente de extração precisa implementar regras para localizar início e fim de cada questão, separar enunciado e alternativas, preservar a numeração e sinalizar conteúdo que dependa de imagem, gráfico ou tabela.

## 9.3 Stack tecnológica

Situação: Adotada e Recomendada (ponto de partida), Condicional (depende de necessidade a confirmar), Opcional ou Adiada (pode ficar para depois).

| **Função** | **Ferramenta** | **Situação** | **Utilização no projeto** |
| --- | --- | --- | --- |
| Framework web | Next.js | Adotada | Estrutura da aplicação, páginas, navegação e integração frontend/backend |
| Interface | React | Adotada | Telas e componentes reutilizáveis |
| Linguagem | TypeScript | Adotada | Código tipado em frontend, backend, worker e regras de negócio |
| Estilização | Tailwind CSS | Adotada | Construção e padronização dos estilos |
| Componentes | shadcn/ui | Adotada | Botões, diálogos, formulários, tabelas e navegação |
| API | Next.js Route Handlers | Adotada | Endpoints da API, sem servidor Express separado |
| Banco relacional | PostgreSQL | Adotada | Usuários, perfis, edições, questões, alternativas, gabaritos, simulados e resultados |
| ORM e migrações | Prisma ORM | Adotada | Modelos, consultas tipadas e controle do esquema |
| Autenticação | Better Auth | Adotada (validar integração) | Login, sessões, credenciais e hash seguro de senhas |
| Validação | Zod | Recomendada | Dados de formulários e endpoints |
| Administração do banco | DBeaver Community | Opcional | Consulta visual de tabelas e registros |
| Extração de texto | pdf-parse | Adotada (protótipo) | Extrai texto dos PDFs digitais |
| Visualização de PDF | PDF.js (pdfjs-dist) | Condicional | Exibir a prova original na revisão, se necessário |
| Criação de PDFs | pdf-lib | Condicional / adiada | Eventual exportação de resultados; não consta no backlog |
| OCR | Tesseract.js (ou similar) | Não previsto | Somente se houver arquivos digitalizados |
| Fila de tarefas | pg-boss | Recomendada (PB09) | Enfileira e gerencia o processamento usando o PostgreSQL |
| Execução em segundo plano | Worker Node.js/TypeScript | Adotada | Processo separado, no mesmo repositório, que executa a extração |
| Armazenamento (dev) | Volume Docker ou diretório local | Adotada | Mantém os PDFs entre reinicializações |
| Armazenamento (remoto) | Cloudflare R2 | Opcional | Etapa posterior, se houver implantação remota; bucket privado |
| Testes | Vitest; Playwright | Recomendada | Unitários e integração; ponta a ponta |
| Qualidade de código | ESLint; tsc --noEmit | Adotada | Análise estática e verificação de tipos |
| Versionamento | Git; GitHub | Adotada | Repositório, branches, Pull Requests e revisão |
| Tarefas | GitHub Projects | Opcional | Acompanhamento de histórias e responsáveis |
| CI/CD | GitHub Actions | Recomendada | Verificações em commits e Pull Requests; CD só se houver hospedagem |
| Contêineres | Docker + Docker Compose | Recomendada | Ambiente local padronizado |
| Hospedagem | Render | Alternativa secundária (não confirmada) | Avaliar custos, limites, persistência do banco e armazenamento de PDFs antes de adotar |

## 9.4 Fluxo Git e integração contínua

- A branch main é a referência do código integrado; evitar alterações diretas nela.

- Cada responsável trabalha em branch própria ou por funcionalidade (por exemplo: feature/frontend-aluno, feature/frontend-admin, feature/backend-api, feature/pdf-extraction) e as alterações entram por Pull Request, com revisão de outro integrante sempre que possível.

- Em cada Pull Request para a main, o GitHub Actions executa npm ci, ESLint, verificação de tipos, Vitest e build do Next.js.

## 9.5 Pontos de integração entre as frentes

- **Frontend e backend:** endpoints, formatos de requisição e resposta e códigos de erro definidos previamente, para o frontend trabalhar sobre o contrato.

- **Frontend administrativo e extração:** o frontend envia o documento e consulta o estado do processamento, sem conhecer o parser.

- **Extração e backend:** modelo de dados de questões, alternativas, gabaritos, edições e estados de processamento combinado entre as frentes.

- **Frontend aluno e backend:** o frontend apresenta e envia respostas; a correção é calculada no backend e o resultado final fica protegido.

- **PB12:** o frontend administrativo cuida da interação de publicar e descartar; o backend garante operações pontuais e eficientes.

# 10. Plano de entrega

## 10.1 Épicos e estimativas

| **Épico** | **Histórias** | **SP** |
| --- | --- | --- |
| Importação e extração de provas | PB01, PB02 | 13 |
| Revisão e curadoria | PB03, PB04 | 8 |
| Aplicação do simulado | PB05, PB06, PB07 | 16 |
| Autenticação e controle de acesso | PB08 | 5 |
| Qualidade e desempenho | PB09, PB10, PB11, PB12 | 12 |
| **Total** | **12 histórias** | **54** |

## 10.2 Divisão da equipe em frentes

| **Frente** | **Responsável** | **Escopo** | **SP** |
| --- | --- | --- | --- |
| Frontend aluno | Mayara Lima Miranda | PB05; PB06 (telas); PB07; PB11 | 11 |
| Frontend administrador | Jordan Fernandes de Carvalho | PB01 e PB02 (telas); PB03; PB04 (telas); PB12 (resposta rápida); tela de login (PB08) | 11 |
| Backend | Henrique Veras Cordeiro | PB08; PB12 (desempenho); APIs de PB03, PB04, PB05, PB06 e PB07; banco de dados; hash de senhas (PB10) | 18 |
| Tratamento de dados e extração | Irapuam Junio da Silva Santos | PB01; PB02; PB09; APIs de PB01 e PB02 (upload, fila, gabarito); preservação do PDF original (PB10) | 14 |

O Backend concentra a maior carga (18 SP, contra 11 a 14 nas demais frentes), o que está registrado como risco na seção 11.

## 10.3 Sprints

| **Sprint** | **Foco** | **Histórias** | **SP** | **Resultado esperado** |
| --- | --- | --- | --- | --- |
| 1 | Preparação e infraestrutura compartilhada | Tarefas técnicas | — | Todos executam a mesma base localmente e integram via GitHub, com o CI passando |
| 2 | Autenticação, modelagem e base das telas | PB08; PB05 (telas e API) | 11 | Login com acesso por perfil; contratos de API e modelo de dados definidos |
| 3 | Importação e extração de provas | PB01; PB09 (parte) | 11 | Administrador envia uma prova e a extração roda em segundo plano |
| 4 | Gabarito e curadoria | PB02; PB03; PB04; PB06 (telas) | 15 | Administrador importa o gabarito, revisa, publica ou descarta questões |
| 5 | Aplicação do simulado e histórico | PB05 (integração); PB06; PB07; PB12 | 10 | Aluno faz o simulado, vê a correção e consulta o histórico |
| 6 | Qualidade e estabilização | PB09 (medição); PB10; PB11 | 7 | Versão integrada, testada e estável |
| | **Total** | **12 histórias** | **54** | |

A distribuição de SP é indicativa e deve ser recalibrada no Planning Poker e conforme a velocidade real. A Sprint 4 é a mais densa (15 SP); se estourar, as telas da PB06 são as primeiras candidatas a passar para a Sprint 5.

## 10.4 Ritos e definição de pronto (proposta do VF)

Seção sugerida no VF, sem origem nos materiais de partida; pode ser ajustada ou removida pela equipe.

- **Planning:** escolher as histórias, estimar com Planning Poker e dividir tarefas por frente.

- **Daily:** cerca de 10 minutos ou assíncrona (o que foi feito, o que será feito, bloqueios).

- **Review e Retrospectiva:** demonstrar o incremento funcionando e definir ações para a sprint seguinte.

- **Definição de pronto:** critérios de aceitação atendidos; Pull Request revisado e integrado à main; CI verde; testes automatizados das regras de negócio; contrato de API atualizado quando houver mudança.

# 11. Riscos e dependências

| **Risco ou ponto a validar** | **Como tratar** | **Quando** |
| --- | --- | --- |
| O pdf-parse extrai corretamente as provas reais escolhidas? | Spike com provas reais; se falhar, reavaliar a ferramenta ou considerar OCR | Sprint 2 |
| As regras de segmentação separam questões, enunciados, alternativas e numeração com precisão? | Iterar o parser com provas reais e sinalizar casos para revisão manual (imagem, gráfico, tabela) | Sprints 3 a 5 |
| O pg-boss atende o fluxo e o worker cumpre o limite de 3 minutos? | Medir em provas reais, tratar reexecução sem duplicar registros e testar falhas isoladas | Sprints 3 e 6 |
| Há necessidade de R2, PDF.js ou pdf-lib? | Decidir com base na revisão (PDF.js) e nas solicitações da disciplina (R2, pdf-lib) | Sprints 4 a 6 |
| O sistema será hospedado ou demonstrado localmente? | Decidir antes da Sprint 6; sem hospedagem, manter Docker Compose | Sprint 5 |
| Sobrecarga do Backend (18 SP) | Frontend aluno e demais membros apoiam testes e validações nas sprints com folga (2 e 3) | Todas |
| Sprint 4 concentra 15 SP | Adiar as telas da PB06 para a Sprint 5, se necessário | Sprint 4 |
| Frontend aluno depende de questões publicadas | Usar mocks e dados de seed até a PB04 estar pronta | Sprints 2 a 4 |
| PB12 exige tempo de resposta que não cresça com o volume revisado | Operações pontuais por identificador, índices adequados e medição com volume maior | Sprints 5 e 6 |

# 12. Rastreabilidade

| **PB** | **História** | **Requisitos** | **Sprint** | **Responsáveis** |
| --- | --- | --- | --- | --- |
| PB01 | Enviar PDF e extrair questões | RF-IMP-01 a 04 | 3 | Jordan (telas); Irapuam (API e extração) |
| PB02 | Importar gabarito oficial | RF-IMP-05, 06 | 4 | Jordan (telas); Irapuam (importação) |
| PB03 | Revisar questões extraídas | RF-REV-01 a 03 | 4 | Jordan (telas); Henrique (API) |
| PB04 | Publicar ou descartar questão | RF-REV-04, 05 | 4 | Jordan (telas); Henrique (API) |
| PB05 | Escolher edição e responder | RF-SIM-01 a 03 | 2 (telas e API); 5 (integração) | Mayara (telas); Henrique (API) |
| PB06 | Correção automática | RF-SIM-04 a 06 | 4 (telas); 5 (API e integração) | Mayara (telas); Henrique (API) |
| PB07 | Histórico de simulados | RF-SIM-07 | 5 | Mayara (telas); Henrique (API) |
| PB08 | Login por perfil (admin/aluno) | RF-ACS-01, 02 | 2 | Henrique (autenticação); Jordan (tela de login) |
| PB09 | Extração em segundo plano | RF-QLD-01, 02 | 3 (parte); 6 (medição) | Irapuam |
| PB10 | Senhas e PDF protegidos | RF-QLD-03, 04 | 6 | Henrique (hash); Irapuam (PDF original) |
| PB11 | Telas responsivas (celular) | RF-QLD-05 | 6 | Mayara |
| PB12 | Publicar/descartar rápido | RF-QLD-06 | 5 | Jordan (resposta rápida); Henrique (desempenho) |

# 13. Decisões pendentes e tomadas

## 13.1 Decisões pendentes

| **ID** | **Pergunta** | **Afeta** |
| --- | --- | --- |
| PA-01 | Quais são as métricas de sucesso do produto? Os documentos de partida não as definem. | Seção 1.3 |
| PA-02 | Qual é a meta numérica de “tempo curto” para publicar e descartar questões (PB12)? | RF-QLD-06, RNF-02 |
| PA-03 | Recalibrar os SP de cada sprint após o Planning Poker. | Seção 10 |
| PA-04 | Confirmar a tela de login com o Frontend administrador ou trocar para o Frontend aluno. | RF-ACS-01 |
| PA-05 | Escolher as provas reais do ENADE usadas nos testes de extração. | RF-IMP-02, RNF-01 |
| PA-06 | Decidir sobre hospedagem remota, R2, PDF.js e pdf-lib. | Seções 2.2, 9.3 e 11 |
| PA-07 | Validar a integração do Better Auth (decisão adotada, com validação pendente). | RF-ACS-01, RNF-05 |
| PA-08 | O Backlog/EAP lista outra equipe (João Pedro Veras, Enzo Rios Veras Ost Lopes, Arthur Gabriel Santos Lopes, Antônio Lucas de Oliveira Neto e Fernando Levy). Este PRD adota a equipe do VF; confirmar. | Capa, seção 10.2 |
| PA-09 | Na seção 1.2 do VF, Henrique aparece em Backend e em Extração, mas as seções 4.1 e 5 colocam a Extração com Irapuam. Este PRD segue a versão das sprints; confirmar. | Seções 10.2 e 12 |
| PA-10 | Os documentos de partida não definem requisitos de sessão, política de senha, retenção de dados ou backup. Definir se serão necessários. | RNF-04, RNF-05 |

## 13.2 Decisões tomadas

| **Tema** | **Decisão** | **Origem** |
| --- | --- | --- |
| Processo | Scrum, sprints de cerca de 1 semana, 6 sprints planejadas | VF 1, 5 |
| Arquitetura | Next.js, PostgreSQL e worker separado, sem microsserviços | VF 1 |
| APIs de PB03 e PB05 | Ficam com o Backend, junto às APIs de PB04, PB06 e PB07 | VF 1.3 |
| APIs de PB01 e PB02 | Ficam com a frente de extração (upload, fila e gabarito), por estarem ligadas ao worker | VF 1.3 |
| PB10 | Hash de senha com o Backend (Better Auth); preservação do PDF original com a extração | VF 1.3 |
| Tela de login (PB08) | Frontend administrador (sugestão para equilibrar a carga); pode ser trocada | VF 1.3 |
| Armazenamento de PDFs | Volume Docker ou diretório local em desenvolvimento; R2 opcional | VF 2.5 |
