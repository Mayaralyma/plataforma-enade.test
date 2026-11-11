# VerificaÃ§Ã£o de implementaÃ§Ã£o contra o PRD

VerificaÃ§Ã£o realizada em 10/11/2026 sobre a versÃ£o atual do repositÃ³rio.

## Resultado dos comandos executados

| VerificaÃ§Ã£o | Resultado |
| --- | --- |
| `npx prisma validate` | Passou |
| `npm run typecheck` | Passou |
| `npm test` (Vitest) | 13 testes passaram em 3 arquivos |
| `npm run lint` | Passou; a configuraÃ§Ã£o foi ajustada para ignorar artefatos gerados pelo Next.js |
| `npm run build` | Passou com segredo e URL de teste configurados |
| `npm run test:e2e` | 3 testes aprovados; encerrou com codigo 0 | Estudante, curadoria, PDF protegido e viewport; quando os PDFs oficiais estÃ£o em `.local`, testa tambÃ©m importaÃ§Ã£o pelo endpoint, worker/PostgreSQL e aplicaÃ§Ã£o do gabarito. |
| `npm run validate:official-enade` | Passou com os PDFs oficiais em `data/official-enade/2023-engenharia-computacao/` | 40 pÃ¡ginas processadas; 38 questÃµes objetivas com cinco alternativas; 38 respostas do gabarito identificadas. Dez questÃµes foram sinalizadas com motivo para revisÃ£o manual por conteÃºdo visual/grÃ¡fico. O `pdf-parse` emite avisos de fonte nÃ£o fatais durante a leitura. |

Os testes unitÃ¡rios cobrem a segmentaÃ§Ã£o bÃ¡sica de questÃµes e alternativas, incluindo alternativas Aâ€“E no formato textual observado na prova oficial do ENADE 2023 (sem pontuaÃ§Ã£o apÃ³s a letra), sinalizaÃ§Ã£o textual de conteÃºdo para revisÃ£o manual, leitura de gabarito TXT/CSV, polÃ­tica de papÃ©is e cÃ¡lculo da nota com questÃµes anuladas ou sem resposta. O Playwright contÃ©m um fluxo de cadastro de estudante, tentativa de acesso administrativo e conclusÃ£o de um simulado com a ediÃ§Ã£o de demonstraÃ§Ã£o.

## Requisitos funcionais

| Requisito | SituaÃ§Ã£o | ObservaÃ§Ã£o |
| --- | --- | --- |
| RF-IMP-01 | Implementado e validado ponta a ponta | Upload autenticado e criacao de job verificados com PostgreSQL. |
| RF-IMP-02 â€” Extrair enunciado, cinco alternativas e numeraÃ§Ã£o | Validado estruturalmente no PDF oficial | O parser e o worker/PostgreSQL identificaram 38/38 questÃµes objetivas, cada uma com cinco alternativas; a correÃ§Ã£o semÃ¢ntica e dez questÃµes com referÃªncia visual ainda requerem revisÃ£o humana. |
| RF-IMP-03 â€” Sinalizar imagem, grÃ¡fico ou tabela | Parcial | A sinalizaÃ§Ã£o procura termos no texto. NÃ£o reconhece, por si sÃ³, dependÃªncia de imagem incorporada sem indicaÃ§Ã£o textual. |
| RF-IMP-04 | Implementado e validado com worker | Estado do job acompanhou o processamento real no PostgreSQL. |
| RF-IMP-05 | Implementado e validado com PostgreSQL | ImportaÃ§Ã£o CSV gerada do gabarito oficial atualizou as respostas das 38 questÃµes. O teste tambÃ©m mantÃ©m o caso de questÃ£o anulada. |
| RF-IMP-06 â€” Marcar anuladas | Implementado | AssociaÃ§Ã£o por nÃºmero original e exclusÃ£o da nota coberta por teste unitÃ¡rio. |
| RF-REV-01 a RF-REV-05 | Implementado e validado com PostgreSQL | Edicao, publicacao, publicacao de anulada e descarte via endpoints protegidos. |
| RF-SIM-01 a RF-SIM-03 | Implementado e validado ponta a ponta | Persistencia, navegacao e conclusao verificadas com PostgreSQL local. |
| RF-SIM-04 e RF-SIM-05 â€” Corrigir e excluir anuladas do cÃ¡lculo | Implementado | CÃ¡lculo no servidor; casos cobertos nos testes unitÃ¡rios. |
| RF-SIM-06 â€” Impedir alteraÃ§Ã£o apÃ³s finalizar | Implementado | Endpoint rejeita mudanÃ§as em simulado finalizado; falta teste HTTP de integraÃ§Ã£o. |
| RF-SIM-07 â€” HistÃ³rico | Implementado | Consultas limitadas ao usuÃ¡rio autenticado; falta teste HTTP de integraÃ§Ã£o. |
| RF-ACS-01 e RF-ACS-02 | Implementado e validado ponta a ponta | Cadastro/login de estudante e bloqueio do endpoint administrativo verificados. |
| RF-QLD-01 e RF-QLD-02 | Implementado e validado em runtime | Worker processou PDF, registrou falhas por questao e concluiu a reexecucao sem duplicar questoes. |
| RF-QLD-03 â€” Senhas protegidas | Implementado via Better Auth | Cadastro/login ponta a ponta passou; hash nao foi inspecionado no banco. |
| RF-QLD-04 | Implementado e validado com sessoes reais | Administrador recebeu PDF; estudante recebeu 403 no mesmo recurso. |
| RF-QLD-05 | Validado visualmente em 375 px e 768 px | Sem overflow horizontal; o banner mobile foi ajustado para evitar sobreposicao do texto com a ilustracao. |
| RF-QLD-06 | Implementado e medido em baseline exploratorio | p50 de publicar/descartar comparado com 3 e 1.033 questoes revisadas; PA-02 continua sem meta numerica. Ver BASELINE_DESEMPENHO_CURADORIA.md. |

## Requisitos nÃ£o funcionais e regras de negÃ³cio

| Requisito | SituaÃ§Ã£o | ObservaÃ§Ã£o |
| --- | --- | --- |
| RNF-01 â€” ExtraÃ§Ã£o em atÃ© 3 minutos | Validado em uma execuÃ§Ã£o local | O worker processou as 38 questÃµes da prova oficial de 40 pÃ¡ginas em 2.391 ms. Ã‰ uma mediÃ§Ã£o Ãºnica em ambiente local; nÃ£o estabelece SLA sob carga ou para PDFs digitalizados. |
| RNF-02 | Baseline exploratorio registrado | Medianas semelhantes entre 3 e 1.033 questoes; caudas variaram e a amostra curta nao certifica ausencia de degradacao. |
| RNF-03 | Runtime validado localmente | Worker separado consumiu a fila pg-boss usando PostgreSQL local. |
| RNF-04 | Validado por endpoints com sessoes | Estudante recebeu 403 em endpoints admin; administrador operou curadoria e PDF. |
| RNF-05 â€” Hash seguro de senha | Implementado via Better Auth | Cadastro/login ponta a ponta passou; hash nao foi inspecionado no banco. |
| RNF-06 | PDF privado local validado | Acesso autenticado de administrador e bloqueio de estudante verificados. |
| RNF-07 â€” Integridade do simulado | Implementado parcialmente validado | Nota e anuladas tÃªm testes unitÃ¡rios; imutabilidade e filtro de questÃµes publicadas precisam de teste de API/banco. |
| RNF-08 | Validado em runtime | Reexecucao manteve a quantidade de questoes; falhas parciais foram registradas por questao. |
| RNF-09 | Validacao de navegador parcial | Viewports 375 px e 768 px inspecionados, sem overflow; faltam dispositivos reais e outras telas. |
| RNF-10 â€” TypeScript, lint, tipos e CI | Implementado | Typecheck e lint passaram; workflow GitHub Actions foi adicionado. |
| RNF-11 | Validado | 13 testes Vitest e 3 testes Playwright passaram; npm run test:e2e encerrou com codigo 0. |
| RNF-12 | Compose implementado; alternativa local validada | Docker indisponivel; PostgreSQL portatil local iniciou e recebeu migracao e seed. |
| RN-01 a RN-15 | Cobertura mista | Nota, anuladas, ediÃ§Ã£o visÃ­vel, estados e integridade estÃ£o no cÃ³digo. Regras de extraÃ§Ã£o e latÃªncia ainda dependem de prova real e mediÃ§Ã£o. |

## Validacoes pendentes

1. Validar a extracao em outras provas e PDFs digitalizados; elementos visuais ainda precisam de conferencia manual. Repetir a medicao de RNF-01 com carga representativa.
2. Definir PA-02 e repetir benchmark de publicar/descartar com mais amostras, carga controlada e ambiente representativo.
3. Conferir os demais fluxos/telas em dispositivos moveis reais e diferentes navegadores.

## Atualizacao apos revisao manual da prova oficial
- O questionario de percepcao e cortado mesmo quando comeca na mesma linha da ultima alternativa; o texto da alternativa e preservado.
- Artefatos de separacao em palavras frequentes do PDF oficial sao reparados. Alternativas numericas com campos divergentes e caracteres nao reconhecidos recebem alerta de revisao.


Revalidacao em 10/11/2026 apos ajustes no parser e na tela de curadoria:

- A sinalizacao visual passou a exigir referencias mais explicitas. As questoes 11 e 28 deixaram de ser falsos positivos; a questao 1, que inclui imagens, passou a ser sinalizada.
- A limpeza de rodapes cobre codigos R do INEP, marcas VALIDINEP, logotipos/cabecalhos e numeros de pagina anexados ao texto, sem consumir quebras de linha nem digitos da alternativa.
- A curadoria oferece acesso ao PDF original privado da edicao para comparar e corrigir a questao.
- A validacao oficial continua encontrando 38/38 questoes com cinco alternativas e 38 respostas; sinaliza dez itens para revisao (1, 3, 10, 12, 13, 22, 23, 24, 25 e 29). Tabelas e diagramas ainda requerem conferencia manual; o parser nao incorpora imagens.
- A validacao de regressao confere a questao 16 (alternativa E 15 13 0), o corte da questao 38 e ausencia de rodapes nas alternativas.
- npm run typecheck, npm run lint, npm test (19 testes) e npm run validate:official-enade passaram. pdf-parse ainda emite avisos nao fatais ao ler o PDF oficial.

As 38 questoes da edicao local de 2023 foram conferidas contra a prova e o gabarito oficiais; corrigiram-se rodapes, uma alternativa numerica e transcricoes de elementos visuais. Todas permanecem pendentes de publicacao. A validacao em outras provas e a medicao com carga representativa continuam pendentes.


