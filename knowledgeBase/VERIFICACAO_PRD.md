# VerificaÃ§Ã£o de implementaÃ§Ã£o contra o PRD

Verificação consolidada até 14/11/2026, considerando as revalidações PB09 a PB16 abaixo. Resultados são locais, salvo quando indicado.

## Resultado dos comandos executados

| VerificaÃ§Ã£o | Resultado |
| --- | --- |
| `npx prisma validate` | Passou |
| `npm run typecheck` | Passou |
| `npm test` (Vitest) | 32 testes passaram em 3 arquivos (revalidação PB16) |
| `npm run lint` | Passou; a configuraÃ§Ã£o foi ajustada para ignorar artefatos gerados pelo Next.js |
| `npm run build` | Passou com segredo e URL de teste configurados |
| `npm run test:e2e` | 3 testes aprovados; encerrou com código 0 (revalidação PB16) | Fluxos de estudante, importação/curadoria, PDF protegido e viewport; usa PostgreSQL local e worker separado. |
| `npm run validate:official-enade` | Passou nas sete fixtures oficiais | 248/248 questões estruturais com cinco alternativas; manifesto verifica páginas, gabaritos e sinalizações visuais. Não substitui revisão semântica humana. Avisos de fonte do `pdf-parse` são não fatais. |

Os testes unitÃ¡rios cobrem a segmentaÃ§Ã£o bÃ¡sica de questÃµes e alternativas, incluindo alternativas Aâ€“E no formato textual observado na prova oficial do ENADE 2023 (sem pontuaÃ§Ã£o apÃ³s a letra), sinalizaÃ§Ã£o textual de conteÃºdo para revisÃ£o manual, leitura de gabarito TXT/CSV, polÃ­tica de papÃ©is e cÃ¡lculo da nota com questÃµes anuladas ou sem resposta. O Playwright contÃ©m um fluxo de cadastro de estudante, tentativa de acesso administrativo e conclusÃ£o de um simulado com a ediÃ§Ã£o de demonstraÃ§Ã£o.

## Requisitos funcionais

| Requisito | SituaÃ§Ã£o | ObservaÃ§Ã£o |
| --- | --- | --- |
| RF-IMP-01 | Implementado e validado ponta a ponta | Upload autenticado e criacao de job verificados com PostgreSQL. |
| RF-IMP-02 — Extrair enunciado, cinco alternativas e numeração | Validado estruturalmente nas sete provas oficiais | O parser identificou 248/248 questões objetivas (38/38 em 2023 e 35/35 em cada uma das seis provas de 2021), todas com cinco alternativas. A correção semântica e as questões com referência visual ainda requerem revisão humana. |
| RF-IMP-03 — Sinalizar imagem, gráfico ou tabela | Implementado e validado nas sete provas oficiais | O extrator detecta imagens embutidas, inclusive JPEG, ignora imagens decorativas repetidas e associa o marcador visual à questão mais próxima na mesma coluna. A calibração cobre as seis provas de 2021 e a de 2023; na de 2023, a questão 6 é sinalizada e a 7 não é, por estar em outra coluna. A conferência humana continua necessária. |
| RF-IMP-04 | Implementado e validado com worker | Estado do job acompanhou o processamento real no PostgreSQL. |
| RF-IMP-05 | Implementado e validado com PostgreSQL | ImportaÃ§Ã£o CSV gerada do gabarito oficial atualizou as respostas das 38 questÃµes. O teste tambÃ©m mantÃ©m o caso de questÃ£o anulada. |
| RF-IMP-06 â€” Marcar anuladas | Implementado | AssociaÃ§Ã£o por nÃºmero original e exclusÃ£o da nota coberta por teste unitÃ¡rio. |
| RF-REV-01 a RF-REV-05 | Implementado e validado com PostgreSQL | Edicao, publicacao, publicacao de anulada e descarte via endpoints protegidos. |
| RF-SIM-01 a RF-SIM-03 | Implementado e validado ponta a ponta | Persistencia, navegacao e conclusao verificadas com PostgreSQL local. |
| RF-SIM-04 e RF-SIM-05 â€” Corrigir e excluir anuladas do cÃ¡lculo | Implementado | CÃ¡lculo no servidor; casos cobertos nos testes unitÃ¡rios. |
| RF-SIM-06 — Impedir alteração após finalizar | Implementado e validado por E2E | O teste de estudante recebe 409 ao tentar alterar uma resposta depois de finalizar o simulado. |
| RF-SIM-07 — Histórico | Implementado e validado por E2E | O histórico lista apenas simulados do usuário autenticado; outro usuário recebe 404 ao consultar o simulado alheio. |
| RF-ACS-01 e RF-ACS-02 | Implementado e validado ponta a ponta | Cadastro/login de estudante e bloqueio do endpoint administrativo verificados. |
| RF-QLD-01 e RF-QLD-02 | Implementado e validado em runtime | Worker processou PDF, registrou falhas por questao e concluiu a reexecucao sem duplicar questoes. |
| RF-QLD-03 â€” Senhas protegidas | Implementado e validado via Better Auth | Cadastro/login ponta a ponta passou; `account.password` inspecionado e armazenado como hash scrypt, sem texto puro. |
| RF-QLD-04 | Implementado e validado com sessoes reais | Administrador recebeu PDF (`200`, `%PDF-`); estudante recebeu `403` no mesmo recurso. |
| RF-QLD-05 | Validado por E2E em 375 px e 768 px | Pratica, simulacao, resultado, historico e menu lateral sem overflow horizontal; controles do simulado passaram a quebrar linha em telas estreitas. |
| RF-QLD-06 | Implementado e validado com meta PA-02 | p95 <= 500 ms com 1.063+ questoes revisadas; p95 alto <= p95 baixo + 200 ms; 30 amostras por acao apos aquecimento. Ver BASELINE_DESEMPENHO_CURADORIA.md. |

## Requisitos nÃ£o funcionais e regras de negÃ³cio

| Requisito | SituaÃ§Ã£o | ObservaÃ§Ã£o |
| --- | --- | --- |
| RNF-01 — Extração em até 3 minutos | Validado nas sete provas oficiais | O validador processou 248 questões em 7.250 ms isoladamente e 17.299 ms com o ambiente sob carga (lint, typecheck e testes em paralelo); o worker já havia processado 38 questões de 2023 em 1.246 ms e 35 de 2021 em 838 ms. Todos os tempos ficam abaixo do limite de 180.000 ms. Medição local; não estabelece SLA sob carga ou para PDFs digitalizados. |
| RNF-02 | Meta PA-02 validada em medicao local | p95 de 63,5 ms ao publicar e 59,9 ms ao descartar com 1.063 questoes revisadas; deltas de +21,9 ms e +19,3 ms contra o volume baixo. Sem carga controlada; nao e SLA de producao. |
| RNF-03 | Runtime validado localmente | Worker separado consumiu a fila pg-boss usando PostgreSQL local. |
| RNF-04 | Validado por endpoints com sessoes | Estudante recebeu 403 em endpoints admin; administrador operou curadoria e PDF. |
| RNF-05 â€” Hash seguro de senha | Implementado e validado via Better Auth | Cadastro/login ponta a ponta passou; `account.password` inspecionado e armazenado como hash scrypt, sem texto puro. |
| RNF-06 | PDF privado local validado | Acesso autenticado de administrador e bloqueio de estudante verificados. |
| RNF-07 — Integridade do simulado | Implementado e validado por E2E | Nota e anuladas têm testes unitários; a imutabilidade após finalizar tem teste E2E (409). A criação do simulado foi verificada por API/banco: rejeita edição sem questões publicadas e inclui somente questões publicadas em edição mista. |
| RNF-08 | Validado em runtime | Reexecucao manteve a quantidade de questoes; falhas parciais foram registradas por questao. |
| RNF-09 | Responsividade validada por viewport nos três navegadores | Pratica, menu lateral, simulacao, resultado e historico passaram em Chromium, Firefox e WebKit; testes verificam layout em 375 px e 768 px, overflow e controles dentro da viewport. Firefox precisa ser executado fora do sandbox restrito deste ambiente. |
| RNF-10 â€” TypeScript, lint, tipos e CI | Implementado | Typecheck e lint passaram; workflow GitHub Actions foi adicionado. |
| RNF-11 | Validado | 26 testes Vitest e 3 testes Playwright passaram; npm run test:e2e encerrou com codigo 0. |
| RNF-12 | Compose implementado; alternativa local validada | Docker indisponivel; PostgreSQL portatil local iniciou e recebeu migracao e seed. |
| RN-01 a RN-15 | Cobertura mista | Nota, anuladas, ediÃ§Ã£o visÃ­vel, estados e integridade estÃ£o no cÃ³digo. Regras de extraÃ§Ã£o e latÃªncia ainda dependem de prova real e mediÃ§Ã£o. |

## Revalidacao PB09 em 11/11/2026

Metodo: `npx playwright test tests/e2e/admin-import-flow.spec.ts`, executado tres vezes em ambiente local (Next.js em modo desenvolvimento, worker separado e PostgreSQL portatil). O tempo usa `startedAt`/`finishedAt` do job; o limite de RNF-01 e 180.000 ms.

| Prova oficial | Questoes | Tempo por execucao (ms) | Pior caso (ms) |
| --- | ---: | --- | ---: |
| 2023 Engenharia de Computacao | 38 | 1.039; 1.156; 1.154 | 1.156 |
| 2021 Sistemas de Informacao | 35 | 698; 736; 750 | 750 |

Na execucao completa de `npm.cmd run test:e2e`, os tempos foram 1.246 ms (2023) e 838 ms (2021). Todas as questoes das duas provas foram gravadas com cinco alternativas e nenhuma falha isolada foi registrada. PA-05 fica resolvido com as provas de 2021 e 2023 ja versionadas em `data/official-enade/`.

## Revalidacao PB10 em 11/11/2026

`npx playwright test tests/e2e/student-flow.spec.ts` passou. O teste confirmou que `account.password` contem hash scrypt no formato `salt:hash` e nao o texto puro. O mesmo fluxo manteve o PDF privado com `200` para administrador e `403` para estudante.

## Revalidacao PB11 em 11/11/2026

`npx playwright test tests/e2e/student-flow.spec.ts` passou com o fluxo de estudante validado em 375x812 e 768x1024. A cobertura agora inclui pratica, menu lateral, simulado, resultado e historico, com verificacao de overflow horizontal, conteudo nao cortado e controles dentro da viewport. O ajuste CSS permite que os controles do simulado quebrem linha entre 761 e 1050 px. A conferencia em dispositivos reais e outros navegadores permanece pendente.

## Revalidacao PB12 em 11/11/2026

`npx playwright test tests/e2e/admin-curation-and-mobile.spec.ts` passou com a meta PA-02: 30 amostras de publicar e 30 de descartar em volume baixo (3 revisadas) e em volume alto (1.063 revisadas), apos 10 operacoes de aquecimento. O p95 foi 41,7/40,7 ms no volume baixo e 63,5/59,9 ms no volume alto, com deltas de +21,9 ms e +19,3 ms; todos abaixo dos limites de 500 ms e 200 ms. O mesmo teste cobre feedback de publicacao/descarte e remocao do cartao da lista de pendentes. A medicao e local, em modo desenvolvimento e sem carga controlada; nao representa SLA de producao.

## Validacoes pendentes

1. **Operação da curadoria:** a revisão das questões é responsabilidade do administrador dentro do fluxo de curadoria previsto no PRD; não é uma validação externa que o desenvolvimento precise executar para cada fixture. O sistema oferece sinalização, editor e link privado para o PDF original. A publicação agora exige uma revisão salva, registrada em `reviewedAt`, tanto na interface quanto na API. As questões de 2021 continuam como conteúdo a ser curado pelo administrador no sistema; os rascunhos em `corrections.json` são auxiliares, não uma revisão concluída.
2. **Cobertura do parser:** validar PDFs digitalizados, caso entrem no escopo, e ampliar provas para outros anos. As sete fixtures atuais cobrem seis áreas de 2021 e Engenharia de Computação de 2023; não cobrem digitalizações.
3. **Desempenho:** repetir RNF-01 e PA-02 com carga controlada em ambiente representativo. As medições atuais passaram localmente, mas não estabelecem SLA de produção.
4. **Operação:** definir e documentar requisitos de sessão, política de senha, retenção de dados e backup (PA-10) antes de operação continuada.

## Decisões do PRD atualizadas

### Auditoria de PA-10 em 14/11/2026

| Tema | Estado atual observado | Decisão operacional ainda necessária |
| --- | --- | --- |
| Sessão | `lib/auth.ts` não define duração. Better Auth 1.3.34 aplica o padrão de 7 dias com renovação após 1 dia de uso; a sessão pode se estender enquanto usada. | Definir duração máxima, política de renovação e procedimento de revogação para operação. [Padrões de sessão do Better Auth](https://www.better-auth.com/docs/concepts/session-management). |
| Senha | Cadastro exige mínimo de 8 caracteres. Não há configuração de envio/fluxo de recuperação de senha. | Definir requisitos de senha e como recuperar acesso (o que exige serviço de e-mail e interface). |
| Retenção | Não há rotina de expurgo nem interface de exclusão de conta. Simulados e registros associados são removidos em cascata se a conta for apagada diretamente no banco; provas e PDFs ficam nos volumes até remoção manual. | Definir prazos e fluxo de exclusão para contas, simulados, sessões, importações e PDFs. |
| Backup e restauração | Compose mantém banco e PDFs em volumes persistentes; não há rotina versionada de backup ou procedimento testado de restauração. Persistência de volume não é backup. | Definir frequência, retenção, destino, responsável e objetivo de recuperação; automatizar e testar restauração antes de operação continuada. |

Esses itens descrevem o comportamento atual para apoiar a decisão; não configuram uma política de produção. PA-10 continua aberta até que os responsáveis definam os critérios operacionais.

- PA-04 (tela de login), PA-05 (provas oficiais de validação) e PA-07 (Better Auth) foram resolvidas pelas decisões e revalidações registradas neste documento.
- PA-01 (métricas de sucesso), PA-03 (Planning Poker), PA-06 (funcionalidades adiadas), PA-08/PA-09 (equipe e divisão de responsabilidades) e PA-10 (políticas operacionais) permanecem abertas. PA-03, PA-08 e PA-09 são pendências de planejamento/documentação, não falhas técnicas identificadas.

## Revalidação PB17 em 14/11/2026

- A publicação administrativa agora requer que a revisão tenha sido salva pelo editor; a API rejeita publicação sem `reviewedAt`.
- A ação no cartão abre o editor quando a questão ainda não tem revisão salva. Descartar continua disponível sem revisão.
- Reprocessar extração, reaplicar gabarito ou correções invalida `reviewedAt` nas questões pendentes; o importador oficial bloqueia `--publish` se alguma questão continuar com `needsReview`.

## Revalidacao PB18 em 14/11/2026

- `npm run test:e2e` executou os três fluxos em Chromium, Firefox e WebKit, usando PostgreSQL local (`localhost`, banco `enade`).
- Chromium passou 3/3 e WebKit passou 3/3. No Firefox, os três casos falharam ao criar a página (`browserContext.newPage: Target crashed`), antes de executar as asserções do fluxo.
- Um script mínimo reproduziu a falha sem abrir a aplicação nem acessar o banco. Firefox 159 inicia e conecta ao Playwright, mas não consegue criar o subprocesso da aba (`Failed to launch tab subprocess`, erro `-2147024809`), seguido de `Target crashed`.
- O mesmo script mínimo criou uma página quando executado fora do sandbox restrito; a falha é causada pela restrição do ambiente de execução, não pela aplicação ou pela instalação do Firefox.

## Revalidacao PB19 em 14/11/2026

- `npm.cmd run test:e2e -- --project=firefox`, executado fora do sandbox com o banco local, passou os três fluxos: curadoria, importação e estudante (3/3).
- Firefox validado. Para repetir esse navegador no ambiente restrito atual, o processo precisa ser executado fora do sandbox; Chromium e WebKit não tiveram essa restrição.

## Revalidacao PB20 em 14/11/2026

- A responsividade é verificada nos E2E por viewports de 375x812 e 768x1024, com checagens de overflow horizontal, conteúdo visível e controles dentro da tela.
- Os fluxos de estudante passaram nessas dimensões em Chromium, Firefox e WebKit. Para o requisito atual de layout responsivo, a simulação de viewport cobre a validação; teste em aparelho físico fica fora do escopo, salvo se forem adicionados requisitos específicos de hardware ou interação móvel.
- Adicionada a coluna nullable `Question.reviewedAt` pela migração `20261114165838_require_question_review`.
- `npm run typecheck` passou.
- `npm run test:e2e:chromium -- tests/e2e/admin-curation-and-mobile.spec.ts` passou (1/1), cobrindo a tentativa de publicação prematura, revisão salva pelo editor, publicação, descarte e PDF protegido. O benchmark local integrado ao fluxo também passou.

## Atualizacao apos revisao manual da prova oficial
- O questionario de percepcao e cortado mesmo quando comeca na mesma linha da ultima alternativa; o texto da alternativa e preservado.
- Artefatos de separacao em palavras frequentes do PDF oficial sao reparados. Alternativas numericas com campos divergentes e caracteres nao reconhecidos recebem alerta de revisao.


Revalidacao em 10/11/2026 apos ajustes no parser e na tela de curadoria:

- A sinalizacao visual passou a exigir referencias mais explicitas. As questoes 11 e 28 deixaram de ser falsos positivos; a questao 1, que inclui imagens, passou a ser sinalizada.
- A limpeza de rodapes cobre codigos R do INEP, marcas VALIDINEP, logotipos/cabecalhos e numeros de pagina anexados ao texto, sem consumir quebras de linha nem digitos da alternativa.
- A curadoria oferece acesso ao PDF original privado da edicao para comparar e corrigir a questao.
- A validacao oficial continua encontrando 38/38 questoes com cinco alternativas e 38 respostas; sinaliza dez itens para revisao (1, 3, 10, 12, 13, 22, 23, 24, 25 e 29). Tabelas e diagramas ainda requerem conferencia manual; naquela rodada, o parser nao incorporava imagens. A deteccao de imagens embutidas foi adicionada no PB13.
- A validacao de regressao confere a questao 16 (alternativa E 15 13 0), o corte da questao 38 e ausencia de rodapes nas alternativas.
- npm run typecheck, npm run lint, npm test (26 testes) e npm run validate:official-enade passaram. pdf-parse ainda emite avisos nao fatais ao ler o PDF oficial.

As 38 questoes da edicao local de 2023 foram conferidas contra a prova e o gabarito oficiais; corrigiram-se rodapes, uma alternativa numerica e transcricoes de elementos visuais. Todas permanecem pendentes de publicacao. A validacao em outras provas e a medicao com carga representativa continuam pendentes.

## Revalidacao PB13 em 12/11/2026

- `npm run typecheck`, `npm run lint` e `npm test` passaram; a suite Vitest agora tem 29 testes em 3 arquivos.
- `npm run validate:official-enade` passou com 38/38 questoes e 38 respostas. A deteccao de imagens embutidas sinalizou a questao 6 (imagem na coluna esquerda da pagina 8) e nao a questao 7 (coluna direita), corrigindo o falso positivo da abordagem por pagina.
- `npm run validate:official-enade:2021` passou com 35/35 questoes, 35 respostas e a questao 33 anulada. A nova deteccao acrescentou a questao 2, que contem imagem de campanha, as sinalizacoes visuais ja existentes.
- A associacao usa marcadores de pagina e de conteudo visual no texto extraido; quando nao ha marcador visual, a sinalizacao por pagina continua como fallback. A calibracao foi feita apenas com as provas de 2021 e 2023.

## Revalidacao PB14 em 13/11/2026

- `npm run validate:official-enade` passou com as sete fixtures e 248/248 questões: 2021 Sistemas de Informação, Ciência da Computação, Licenciatura em Computação, Análise e Desenvolvimento de Sistemas, Gestão da Tecnologia da Informação e Redes de Computadores (35 cada) e 2023 Engenharia de Computação (38).
- O crash `Image is not defined` ao ler JPEGs foi corrigido com um stub de `Image` durante o `parseExamPdf` e com o uso das dimensões do operador `paintJpegXObject`. A prova de Gestão passou a ser validada, com imagens detectadas nas páginas 6, 8 e 10.
- A questão 14 de Ciência e Licenciatura passou a extrair a alternativa C correta, sem anexar o texto órfão nem o cabeçalho da área à alternativa E.
- A duração máxima observada no validador foi 7.250 ms isoladamente e 17.299 ms com o ambiente sob carga, abaixo do limite de RNF-01.
- `npm run lint`, `npm run typecheck`, `npm test` (32 testes), `npm run build` e `npm run test:e2e` (3/3) passaram com `.env` local e PostgreSQL portátil.
- O fluxo E2E do estudante ganhou timeouts maiores para a primeira compilação das rotas no servidor de desenvolvimento.
- O manifesto ganhou páginas esperadas, sinalizações visuais e checks das sete fixtures; o CI passou a executar o validador.

## Revalidacao PB15 em 14/11/2026

- Adicionado `npm run user:role -- --email <email> --role <ADMIN|STUDENT>` para promover ou rebaixar contas existentes; `ADMIN_EMAILS` continua valendo apenas no cadastro.
- O comando normaliza o e-mail, aceita a busca sem diferenciar maiúsculas de minúsculas, valida o papel, falha com código 1 para usuário inexistente ou papel inválido e é idempotente.
- O teste manual criou um usuário temporário como `STUDENT`, promoveu para `ADMIN`, rebaixou para `STUDENT` e removeu a conta; os casos de e-mail em maiúsculas, repetição do mesmo papel, usuário inexistente e papel inválido também foram cobertos.
- `npm run lint`, `npm run typecheck` e `npm test` (32 testes) passaram.

## Revalidacao PB16 em 14/11/2026

- As views administrativas foram extraídas de `components/dashboard.tsx` para `components/admin-views.tsx`; tipos, `api`, `Metric` e `EmptyState` foram movidos para `components/dashboard-shared.tsx`.
- A extração não alterou API, schema, CSS ou comportamento; o shell e as views de estudante continuam em `components/dashboard.tsx`.
- `npm run lint`, `npm run typecheck`, `npm test` (32 testes), `npm run build` e `npm run test:e2e` (3/3) passaram.


