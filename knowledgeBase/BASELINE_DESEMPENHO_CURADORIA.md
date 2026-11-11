# Baseline local de desempenho da curadoria

Medicao de 11/11/2026 contra Next.js em modo desenvolvimento e PostgreSQL portatil local. O tempo inclui a ida e volta HTTP local para cada operacao autenticada via `page.request` do Playwright.

## Meta PA-02

- p95 de publicar e descartar <= 500 ms com 1.000+ questoes revisadas.
- p95 em alto volume <= p95 em baixo volume + 200 ms.
- 30 amostras por acao em cada volume, apos aquecimento.
- Medicao local, sem carga controlada; nao representa SLA de producao.

## Metodo

- Uma edicao iniciou com tres questoes revisadas.
- Foram executadas 10 operacoes de aquecimento (5 publicar e 5 descartar), descartadas da estatistica.
- Volume baixo: 60 questoes pendentes (30 publicar e 30 descartar), iniciando com 3 revisadas e terminando com 63.
- Foram adicionadas 1.000 questoes publicadas na mesma edicao.
- Volume alto: 60 questoes pendentes (30 publicar e 30 descartar), iniciando com 1.063 revisadas e terminando com 1.123.
- Cada questao tinha cinco alternativas e `correctOption` quando necessario. Todas as respostas HTTP retornaram `200`.

## Resultados

Tempos em milissegundos:

| Volume | Questoes revisadas no inicio | Acao | p50 | p95 |
| --- | ---: | --- | ---: | ---: |
| Baixo | 3 | Publicar | 33,1 | 41,7 |
| Baixo | 3 | Descartar | 33,3 | 40,7 |
| Alto | 1.063 | Publicar | 33,1 | 63,5 |
| Alto | 1.063 | Descartar | 33,5 | 59,9 |

Deltas de p95 do alto em relacao ao baixo: publicar +21,9 ms; descartar +19,3 ms.

## Conclusao

A meta PA-02 passou nesta medicao: os p95 ficaram abaixo de 500 ms e os deltas ficaram abaixo de 200 ms. A execucao e automatizada em `tests/e2e/admin-curation-and-mobile.spec.ts` e grava `.local/curation-benchmark.json` (ignorado pelo Git). O resultado ainda e local e sem carga controlada; repetir em ambiente representativo antes de tratar como garantia de producao.
