# Baseline local de desempenho da curadoria

Medicoes exploratorias repetidas em 10/11/2026 contra Next.js em modo desenvolvimento e PostgreSQL portatil local. O tempo inclui a ida e volta HTTP local para cada operacao autenticada.

## Metodo

- Uma edicao iniciou com tres questoes revisadas.
- Foram feitas 15 operacoes de publicar e 15 de descartar, sequenciais em cada rodada. A primeira amostra de cada rodada iniciou com tres questoes revisadas e terminou com 33.
- Foram adicionadas outras 1.000 questoes publicadas na mesma edicao.
- Cada amostra de volume alto iniciou com 1.033 questoes revisadas e terminou com 1.063.
- O benchmark foi executado tres vezes para observar a variacao entre rodadas.
- Cada questao da amostra tinha cinco alternativas. Todas as respostas HTTP tiveram sucesso.

## Resultados

Tempos em milissegundos:

| Rodada | Acao | Questoes revisadas no inicio | p50 | p95 |
| --- | --- | ---: | ---: | ---: |
| 1 | Publicar | 3 | 71,5 | 139,8 |
| 1 | Publicar | 1.033 | 86,2 | 185,1 |
| 1 | Descartar | 3 | 65,4 | 90,3 |
| 1 | Descartar | 1.033 | 59,7 | 178,6 |
| 2 | Publicar | 3 | 63,6 | 211,3 |
| 2 | Publicar | 1.033 | 70,4 | 107,3 |
| 2 | Descartar | 3 | 75,3 | 127,4 |
| 2 | Descartar | 1.033 | 132,3 | 214,3 |
| 3 | Publicar | 3 | 76,1 | 104,0 |
| 3 | Publicar | 1.033 | 76,7 | 110,8 |
| 3 | Descartar | 3 | 71,8 | 233,5 |
| 3 | Descartar | 1.033 | 89,8 | 168,1 |

As medianas de publicar ficaram quase iguais na terceira rodada; as duas primeiras variaram em sentidos diferentes. Descartar teve maior mediana no volume alto nas rodadas 2 e 3, mas os p95 foram maiores no volume baixo na terceira rodada. Cada percentil usa apenas 15 observacoes, em ambiente local compartilhado e sem carga controlada; nao e possivel atribuir as variacoes ao volume ou certificar uma meta de producao.

O resultado serve como ponto inicial para comparar implementacoes. PA-02 continua pendente: a equipe precisa definir um limite numerico e repetir a medicao em ambiente representativo, com mais amostras e carga controlada.
