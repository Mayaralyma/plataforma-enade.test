# Provas oficiais usadas na validação

Estes PDFs públicos do INEP são mantidos no repositório para tornar reproduzíveis as validações locais dos parsers.

O `manifest.json` é a fonte de verdade das fixtures: páginas esperadas, questões anuladas, sinalizações visuais e checks de regressão.

| Edição | Prova | Gabarito | Origem |
| --- | --- | --- | --- |
| 2021 — Sistemas de Informação | `2021-sistemas-informacao/prova-2021-sistemas-informacao.pdf` | `2021-sistemas-informacao/gabarito-2021-sistemas-informacao.pdf` | [INEP — prova](https://download.inep.gov.br/enade/provas_e_gabaritos/2021_PV_bacharelado_sistema_informacao.pdf) · [INEP — gabarito](https://download.inep.gov.br/enade/provas_e_gabaritos/2021_GB_bacharelado_sistema_informacao.pdf) |
| 2021 — Ciência da Computação | `2021-ciencia-computacao/prova-2021-ciencia-computacao.pdf` | `2021-ciencia-computacao/gabarito-2021-ciencia-computacao.pdf` | INEP — prova e gabarito oficiais de 2021 |
| 2021 — Computação (Licenciatura) | `2021-licenciatura-computacao/prova-2021-licenciatura-computacao.pdf` | `2021-licenciatura-computacao/gabarito-2021-licenciatura-computacao.pdf` | INEP — prova e gabarito oficiais de 2021 |
| 2021 — Análise e Desenvolvimento de Sistemas | `2021-analise-desenvolvimento-sistemas/prova-2021-analise-desenvolvimento-sistemas.pdf` | `2021-analise-desenvolvimento-sistemas/gabarito-2021-analise-desenvolvimento-sistemas.pdf` | INEP — prova e gabarito oficiais de 2021 |
| 2021 — Gestão da Tecnologia da Informação | `2021-gestao-tecnologia-informacao/prova-2021-gestao-tecnologia-informacao.pdf` | `2021-gestao-tecnologia-informacao/gabarito-2021-gestao-tecnologia-informacao.pdf` | INEP — prova e gabarito oficiais de 2021 |
| 2021 — Redes de Computadores | `2021-redes-computadores/prova-2021-redes-computadores.pdf` | `2021-redes-computadores/gabarito-2021-redes-computadores.pdf` | INEP — prova e gabarito oficiais de 2021 |
| 2023 — Engenharia de Computação | `2023-engenharia-computacao/enade-2023-engenharia-computacao.pdf` | `2023-engenharia-computacao/gabarito-2023-engenharia-computacao.pdf` | PDFs oficiais baixados do portal do INEP; usados por `npm run validate:official-enade`. |
| 2025 — Computação (Licenciatura) | `2025-licenciatura-computacao/2025_computacao_PV_4.pdf` | `2025-licenciatura-computacao/2025_computacao_GB_4.pdf` | Prova e gabarito do PND 2025. O gabarito tem texto selecionável apenas na marca d'água; a tabela de respostas é imagem e serve de fixture para o OCR. Não entra no manifesto do validador de extração de questões. |

Os validadores e o teste E2E de importação oficial usam estes caminhos dentro de `data/official-enade/`. O E2E oficial importa as edições de 2021 e 2023 pelo worker; o validador percorre todas as fixtures do manifesto.

A prova de 2025 é extraída em 80 questões numeradas, mas o texto selecionável só traz as alternativas A–D; a quinta alternativa precisa ser adicionada na curadoria, por isso todas ficam sinalizadas para revisão. O sumário cita “Questionário de Percepção da Prova” com “Objetivas01 a 09”; o parser ignora essa ocorrência de sumário e só corta no cabeçalho real da avaliação de percepção.

O gabarito de 2025 é usado pelos testes `tests/answer-key-ocr.test.ts` e `tests/e2e/answer-key-ocr.spec.ts`: o OCR recupera 79 das 80 respostas (a questão 9 é perdida na tabela e deve ser preenchida na curadoria); todas as respostas reconhecidas ficam sinalizadas para conferência.

Para carregar uma edição revisada no banco, use `npm run import:official -- --fixture <id> [--publish]`. O importador copia prova e gabarito para `PDF_STORAGE_DIR`, processa a extração, aplica o gabarito e, se existir, aplica `<diretório-da-fixture>/corrections.json` antes de publicar. `--publish` também exige que nenhuma questão permaneça marcada `needsReview`. `2023-engenharia-computacao/corrections.json` registra as 38 questões revisadas; `2021-sistemas-informacao/corrections.json` contém rascunhos auxiliares para nove questões, todas ainda marcadas `needsReview: true` e pendentes de curadoria. Mantenha os arquivos atualizados quando o parser ou a revisão mudar.
