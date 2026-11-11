# Provas oficiais usadas na validação

Estes PDFs públicos do INEP são mantidos no repositório para tornar reproduzíveis as validações locais dos parsers.

| Edição | Prova | Gabarito | Origem |
| --- | --- | --- | --- |
| 2021 — Sistemas de Informação | `2021-sistemas-informacao/prova-2021-sistemas-informacao.pdf` | `2021-sistemas-informacao/gabarito-2021-sistemas-informacao.pdf` | [INEP — prova](https://download.inep.gov.br/enade/provas_e_gabaritos/2021_PV_bacharelado_sistema_informacao.pdf) · [INEP — gabarito](https://download.inep.gov.br/enade/provas_e_gabaritos/2021_GB_bacharelado_sistema_informacao.pdf) |
| 2023 — Engenharia de Computação | `2023-engenharia-computacao/enade-2023-engenharia-computacao.pdf` | `2023-engenharia-computacao/gabarito-2023-engenharia-computacao.pdf` | PDFs oficiais baixados do portal do INEP; usados por `npm run validate:official-enade`. |

Os validadores esperam os arquivos nestes caminhos dentro de `data/official-enade/`.
