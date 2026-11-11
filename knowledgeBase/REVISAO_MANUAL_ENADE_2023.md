# Revisao manual â€” ENADE 2023, Engenharia de Computacao

Revisao aplicada em 10/11/2026 usando os arquivos oficiais versionados em `data/official-enade/2023-engenharia-computacao/`.

## Resultado no banco local

- Edicao criada: 2023 â€” Engenharia de Computacao.
- PDF da prova e gabarito oficial associados a edicao.
- 38 questoes importadas; todas com cinco alternativas e resposta do gabarito.
- Nove questoes com transcricao/correcao manual: 1, 10, 12, 13, 22, 23, 24, 25 e 29.
- As nove permanecem `PENDING`; nenhuma questao foi publicada.
- As outras 29 passaram por segunda revisao contra o PDF oficial e o gabarito definitivo; todas continuam `PENDING`.

## Itens conferidos e transcricoes aplicadas

| Questao | Gabarito | Correcao aplicada |
| ---: | :---: | --- |
| 1 | D | Removido texto de outra questao que havia sido anexado a alternativa E. As tres imagens foram descritas por suas legendas: conflito e pessoas vulneraveis; colheita de trigo na Ucrania; seca em Madagascar. |
| 10 | B | Restauradas as colunas da tabela: Carbono (40,00; 1,00 m; 2,50 mm2), Grafite (13,00; 1,50 m; 1,50 mm2), Niquel-cromo (1,10; 5,00 m; 0,50 mm2). Incluida a definicao de L e A. |
| 12 | A | Restaurados os pares da tabela: (1,5), (2,8), (5,7), (7,10), (2,9), (3,4), (10,1), (5,10), (7,1), (9,8). Corrigida a representacao textual de pertencimento e equivalencia. |
| 13 | D | Descrito o grafo: arcos 1 A-C, 2 A-B, 3 B-D, 4 B-C, 5 C-D e 6 D-A. Removido o diagrama que havia sido anexado a alternativa E. |
| 22 | E | Reorganizado o esquema das tabelas `pessoa`, `cliente` e `funcionario`, incluindo as chaves estrangeiras de cliente e funcionario para pessoa. Removido o rodape da alternativa E. |
| 23 | A | Descrita a topologia dos dois filtros e corrigidas unidades lidas incorretamente: 180 pF, 10 kOhm, 100 pF, 1,8 kOhm e 18 kOhm. Removidos os componentes graficos anexados a alternativa E. |
| 24 | D | Registrado o mapeamento conferido: P3/SPK1, P2/CH2, P1/LED1 e P0/CH1. Removido o diagrama anexado a alternativa E. |
| 25 | D | Restaurada a leitura do diagrama e a separacao/indentacao dos codigos Verilog e VHDL. A diferenca presente na prova entre o contador de 4 bits do diagrama e as saidas de 2 bits/faixa 0â€“3 dos codigos foi mantida, pois pertence ao enunciado oficial. |
| 29 | B | Restaurada a formula por partes, o pseudocodigo e os dados da tabela: x=(3,6,4,5,1), y=(7,6,4,3,2). Removidos rodape e caracteres de diagramacao. |

## Segunda revisao das outras 29 questoes

- Removidos artefatos de rodape de 24 alternativas e dos enunciados das questoes 6, 29 e 32. Na questao 38, a alternativa E foi separada do questionario de percepcao que vinha depois da prova.
- Corrigida a alternativa E da questao 16 para `15 13 0`, conferida no PDF oficial.
- Transcritos os dados do grafico da questao 3, a tabela de sentimentos por meio de mobilidade da questao 5, a ilustracao da questao 6 e as conexoes/estimativas do grafo da questao 32.
- A verificacao final encontrou 38 questoes com cinco alternativas e gabarito, todas `PENDING`, nenhuma publicada, sem rodapes detectados nas alternativas.
- Verificacoes executadas: `npm test` (19 testes aprovados), `npm run validate:official-enade` (38 questoes e 38 respostas identificadas) e `npm run typecheck` (aprovado). O validador ainda sinaliza dez itens com dependencia visual para a curadoria, conforme seu criterio automatico.

## Limites e acesso ao original

As imagens nao foram incorporadas ao texto da questao. As descricoes e transcricoes tornam os dados legiveis para o simulado, e o PDF original continua privado, associado a edicao e acessivel pela curadoria administrativa. Antes de publicar, o administrador deve conferir cada transcricao pelo link `Abrir PDF original` no editor da questao.

Fonte: PDF oficial `data/official-enade/2023-engenharia-computacao/enade-2023-engenharia-computacao.pdf` e gabarito definitivo `data/official-enade/2023-engenharia-computacao/gabarito-2023-engenharia-computacao.pdf`.


