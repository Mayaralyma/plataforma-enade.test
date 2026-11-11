import { describe, expect, it } from "vitest";
import { extractQuestions, parseAnswerKey } from "../lib/pdf-parser";

describe("parser de provas ENADE", () => {
it("extracts numbered questions, wrapped statements and five alternatives", () => {
  const questions = extractQuestions(`
    CADERNO DE PROVA ENADE
    QUESTÃƒÆ’O 12
    Qual alternativa descreve uma prÃ¡tica adequada para manter a qualidade
    de um sistema durante o desenvolvimento?
    A) Fazer revisÃµes frequentes
       e executar testes automatizados.
    B) Adiar a validaÃ§Ã£o para o fim.
    C) Ignorar os registros de alteraÃ§Ã£o.
    D) Remover toda documentaÃ§Ã£o.
    E) Publicar sem revisÃ£o.
  `);

  expect(questions).toHaveLength(1);
  expect(questions[0].number).toBe(12);
  expect(questions[0].statement).toMatch(/manter a qualidade de um sistema durante o desenvolvimento/);
  expect(questions[0].options).toHaveLength(5);
  expect(questions[0].options[0].text).toMatch(/testes automatizados/);
  expect(questions[0].needsReview).toBe(false);
});

it("marks incomplete alternatives and references to figures for manual review", () => {
  const questions = extractQuestions(`
    QUESTÃƒO 3
    Observe a figura e responda Ã  questÃ£o.
    A) Primeira alternativa.
    B) Segunda alternativa.
  `);

  expect(questions).toHaveLength(1);
  expect(questions[0].number).toBe(3);
  expect(questions[0].needsReview).toBe(true);
  expect(questions[0].reviewNote).toMatch(/cinco alternativas/);
});

it("explains when a complete question is flagged for a visual reference", () => {
  const questions = extractQuestions(`
    QUESTÃƒO 14
    Com base na figura apresentada, assinale a alternativa correta.
    A) Alternativa A.
    B) Alternativa B.
    C) Alternativa C.
    D) Alternativa D.
    E) Alternativa E.
  `);

  expect(questions[0].needsReview).toBe(true);
  expect(questions[0].reviewNote).toMatch(/elemento visual/);
});

it("flags tables that are presented as part of the question but ignores ordinary technical mentions", () => {
  const questions = extractQuestions(`
    QUESTÃƒO 12
    A tabela resultante pode ser vista a seguir.
    A) A1
    B) B1
    C) C1
    D) D1
    E) E1
    QUESTÃƒÆ’O 13
    O protocolo produz tabelas de rotas e consulta a tabela de pÃ¡ginas.
    A) A2
    B) B2
    C) C2
    D) D2
    E) E2
  `);

  expect(questions[0].needsReview).toBe(true);
  expect(questions[1].needsReview).toBe(false);
});

it("removes repeated INEP watermark and page footer text from alternatives", () => {
  const questions = extractQuestions(`
    QUESTÃƒÆ’O 15
    Enunciado de teste.
    A) Alternativa A.
    B) Alternativa B.
    C) Alternativa C.
    D) Alternativa D.
    E) Alternativa E. *R08202315* VALIDINEP2023VALIDINEP2023 Engenharia de ComputaÃ§Ã£o16
  `);

  expect(questions[0].options[4].text).toBe("Alternativa E.");
});

it("removes real ENADE footer fragments from statements and alternatives without eating nearby text", () => {
  const questions = extractQuestions(`
    QUESTAO 16
    A partir das informaÃ§Ãµes apresentadas, *8* LOGO MATÃ‰RIA9 assinale a opÃ§Ã£o correta.
    A 10 1 0
    B 10 1 11
    C 11 11 11
    D 15 12 2
    E 15 13 0 *5**R0820234* Engenharia de ComputaÃ§Ã£o5 LOGO 4MATÃ‰RIA
    QUESTAO 17
    Segundo item: tabela examinada. 16Engenharia de ComputaÃ§Ã£o
    A) A
    B) B
    C) C
    D) D
    E) E
  `);

  expect(questions).toHaveLength(2);
  expect(questions[0].statement).toContain("apresentadas, assinale");
  expect(questions[0].options[4].text).toBe("15 13 0");
  expect(questions[1].statement).toBe("Segundo item: tabela examinada.");
  expect(questions[0].needsReview).toBe(false);
});

it("keeps the final answer when the perception questionnaire starts on the same line", () => {
  const questions = extractQuestions(`
    QUESTAO 38
    Qual benefÃ­cio Ã© associado Ã  arquitetura de microsserviÃ§os?
    A Capacidade de escalabilidade.
    B Garantia de consistÃªncia.
    C Melhor desempenho.
    D Menor consumo de recursos.
    E ReduÃ§Ã£o da complexidade de comunicaÃ§Ã£o. AVALIAÃ‡ÃƒO GLOBAL DA PROVA QUESTIONÃRIO DE PERCEPÃ‡ÃƒO DA PROVA QUESTÃƒO 01 Qual foi o tempo?
  `);

  expect(questions).toHaveLength(1);
  expect(questions[0].options[4].text).toBe("ReduÃ§Ã£o da complexidade de comunicaÃ§Ã£o.");
});

it("splits a question whose heading is detached from its statement by a page footer", () => {
  const questions = extractQuestions(`
    QUESTAO 30
    Enunciado da questão 30.
    A Opção A da questão trinta.
    B Opção B da questão trinta.
    C Opção C da questão trinta.
    D Opção D da questão trinta.
    E Opção E da questão trinta.
    continuação da alternativa E na linha seguinte.
    *R27202133*
    34Sistemas de informação
    Uma finalidade da Governança de Tecnologia da Informação é monitorar o cumprimento de regras de negócio por meio de um catálogo de serviços. O enunciado continua na página seguinte e explica o papel dos modelos de referência para a gestão de TI.
    I. Norma ISO/IEC 38500.
    II. CobiT.
    III. BSC.
    IV. CMMI.
    São modelos corretos apenas os apresentados em
    A I e II.
    B I e IV.
    C II e III.
    D I, III e IV.
    E II, III e IV.
    QUESTAO 31
    35Sistemas de informação
    QUESTAO 32
    Enunciado da questão 32.
    A) Opção A.
    B) Opção B.
    C) Opção C.
    D) Opção D.
    E) Opção E.
  `);

  const question30 = questions.find(({ number }) => number === 30);
  const question31 = questions.find(({ number }) => number === 31);
  expect(question30?.statement).toBe("Enunciado da questão 30.");
  expect(question30?.options[4].text).toBe("Opção E da questão trinta. continuação da alternativa E na linha seguinte.");
  expect(question31?.statement).toContain("Uma finalidade da Governança");
  expect(question31?.options.map(({ label }) => label)).toEqual(["A", "B", "C", "D", "E"]);
});

it("removes ENADE 2021 area-free and page headers from the previous answer", () => {
  const questions = extractQuestions(`
    QUESTAO 1
    Enunciado completo.
    A. Primeira.
    B. Segunda.
    C. Terceira.
    D. Quarta.
    E. Esta é a alternativa completa. Área livre *5**R2720215* 6SiStemaS de informação6MATÉRIA
    QUESTAO 2
    Outro enunciado.
    A. A
    B. B
    C. C
    D. D
    E. E
  `);

  expect(questions[0].options[4].text).toBe("Esta é a alternativa completa.");
  expect(questions[1].statement).toBe("Outro enunciado.");
});

it("flags maps, charges, and technical diagrams that carry question content", () => {
  const questions = extractQuestions(`
    QUESTAO 3
    Considere o texto e a charge a seguir.
    A. A
    B. B
    C. C
    D. D
    E. E
    QUESTAO 5
    O mapa a seguir apresenta os dados.
    A. A
    B. B
    C. C
    D. D
    E. E
    QUESTAO 29
    Foi proposto um modelo de entidades e relacionamentos.
    A. A
    B. B
    C. C
    D. D
    E. E
    QUESTAO 32
    Analise o diagrama de sequência.
    A. A
    B. B
    C. C
    D. D
    E. E
  `);

  expect(questions.map(({ needsReview }) => needsReview)).toEqual([true, true, true, true]);
});

it("stops an objective question before the discursive section starts", () => {
  const questions = extractQuestions(`
    QUESTAO 8
    Enunciado objetivo.
    A. A
    B. B
    C. C
    D. D
    E. E
    Área livre *13*
    QUESTAO DISCURSIVA 03
    O enunciado discursivo não deve entrar na alternativa E.
    Elabore um diagrama e apresente sua resposta.
    COMPONENTE ESPECÍFICO
    QUESTAO 9
    Outro enunciado objetivo.
    A. A
    B. B
    C. C
    D. D
    E. E
  `);

  expect(questions.map(({ number }) => number)).toEqual([8, 9]);
  expect(questions[0].options[4].text).toBe("E");
  expect(questions[0].needsReview).toBe(false);
});

it("keeps diagram and chart labels out of the final answer choice", () => {
  const questions = extractQuestions(`
    QUESTAO 9
    O diagrama UML apresentado na figura a seguir descreve as classes.
    Em relação ao que é proposto no diagrama, avalie as afirmações.
    A. I e III.
    B. II e III.
    C. II e IV.
    D. I, II e IV.
    E. I, III e IV. Segurado 1..1 0..n Seguro Residencial Automotivo Vida
    QUESTAO 10
    O gráfico a seguir apresenta os benefícios.
    Considerando as informações apresentadas, avalie as afirmações.
    A. I e IV.
    B. II e III.
    C. III e IV.
    D. I, II e III.
    E. I, II e IV. Divulgação da marca 53,0% Engajamento 44,2% Outro 0,3%
  `);

  expect(questions[0].options[4].text).toBe("I, III e IV.");
  expect(questions[0].statement.indexOf("Conteúdo visual extraído para conferência: Segurado")).toBeLessThan(questions[0].statement.indexOf("Em relação ao que é proposto"));
  expect(questions[1].options[4].text).toBe("I, II e IV.");
  expect(questions[1].statement.indexOf("Conteúdo visual extraído para conferência: Divulgação da marca 53,0%")).toBeLessThan(questions[1].statement.indexOf("Considerando as informações"));
  expect(questions.every(({ needsReview }) => needsReview)).toBe(true);
});

it("does not mistake a SQL table alias for answer option E", () => {
  const questions = extractQuestions(`
    QUESTAO 21
    Avalie os comandos SQL a seguir.
    III. SELECT P.CodPeca, P.NomePeca FROM Peca P JOIN Embarque E ON P.CodPeca = E.CodPeca AND
    E.QuantidadeEmbarque > 100;
    IV. SELECT CodPeca, NomePeca FROM Peca JOIN Embarque ON P.CodPeca = E.CodPeca AND
    Embarque.QuantidadeEmbarque > 100;
    Sao comandos apenas os descritos em
    A. I e II.
    B. I e IV.
    C. II e III.
    D. I, III e IV.
    E. II, III e IV.
  `);

  expect(questions[0].statement).toContain("E.QuantidadeEmbarque > 100;");
  expect(questions[0].statement).toContain("Embarque.QuantidadeEmbarque > 100;");
  expect(questions[0].options.map(({ text }) => text)).toEqual(["I e II.", "I e IV.", "II e III.", "I, III e IV.", "II, III e IV."]);
});

it("flags a numeric option with a missing or unreadable field", () => {
  const questions = extractQuestions(`
    QUESTAO 16
    Qual Ã© a saÃ­da do programa?
    A 10 1 0
    B 10 1 11
    C 11 11 11
    D 15 12 2
    E 15 13
  `);

  expect(questions[0].needsReview).toBe(true);
  expect(questions[0].reviewNote).toMatch(/alternativa numÃ©rica/);
});

it("repairs common split words produced by the official PDF text extraction", () => {
  const questions = extractQuestions(`
    QUESTAO 03
    O grÃ¡fi co mostra a populaÃ§Ã£o infanti l e as polÃ­ti cas pÃºblicas.
    A) A
    B) B
    C) C
    D) D
    E) E
  `);

  expect(questions[0].statement).toContain("gr\u00e1fico");
  expect(questions[0].statement).toContain("infantil");
  expect(questions[0].statement).toContain("pol\u00edticas");

  const correctlyEncoded = extractQuestions(`
    QUESTAO 04
    O gráfi co mostra a população infanti l, as políti cas e injusti ças.
    A) A
    B) B
    C) C
    D) D
    E) E
  `);
  expect(correctlyEncoded[0].statement).toContain("gráfico");
  expect(correctlyEncoded[0].statement).toContain("infantil");
  expect(correctlyEncoded[0].statement).toContain("políticas");
  expect(correctlyEncoded[0].statement).toContain("injustiças");

  const extracted2021Words = extractQuestions(`
    QUESTAO 1
    Os descendentes ati ngissem o nível de renda; a esti mati va considera a difi culdade e a qualifi cação.
    A. A
    B. B
    C. C
    D. D
    E. E
  `);
  expect(extracted2021Words[0].statement).toContain("atingissem");
  expect(extracted2021Words[0].statement).toContain("estimativa");
  expect(extracted2021Words[0].statement).toContain("dificuldade");
  expect(extracted2021Words[0].statement).toContain("qualificação");
});

it("keeps question numbering and splits adjacent questions", () => {
  const questions = extractQuestions(`
    8. Primeiro enunciado.
    A) A1
    B) B1
    C) C1
    D) D1
    E) E1
    21. Segundo enunciado.
    A) A2
    B) B2
    C) C2
    D) D2
    E) E2
  `);

  expect(questions.map((question) => question.number)).toEqual([8, 21]);
});

it("recognizes INEP-style alternatives without punctuation", () => {
  const questions = extractQuestions(`
    QUESTÃƒO 01
    A fome e a inseguranÃ§a alimentar sÃ£o agravadas pela desigualdade.
    A As duas asserÃ§Ãµes sÃ£o verdadeiras.
    B As duas asserÃ§Ãµes sÃ£o falsas.
    C Apenas a primeira asserÃ§Ã£o Ã© verdadeira.
    D Apenas a segunda asserÃ§Ã£o Ã© verdadeira.
    E As asserÃ§Ãµes nÃ£o tÃªm relaÃ§Ã£o.
  `);

  expect(questions).toHaveLength(1);
  expect(questions[0].statement).toContain("A fome e a inseguranÃ§a alimentar");
  expect(questions[0].options.map((option) => option.label)).toEqual(["A", "B", "C", "D", "E"]);
  expect(questions[0].needsReview).toBe(false);
});

it("recognizes alternatives when the PDF puts each letter on its own line", () => {
  const questions = extractQuestions(`
    QUESTÃƒO 18
    Determine a ordem do tempo mÃ©dio e total.
    A
    O(log n) e O(n log n)
    B
    O(1) e O(n)
    C
    O(1) e O(nÂ²)
    D
    O(n) e O(nÂ²)
    E
    O(log n) e O(nÂ²)
  `);

  expect(questions).toHaveLength(1);
  expect(questions[0].options.map((option) => option.label)).toEqual(["A", "B", "C", "D", "E"]);
  expect(questions[0].options[0].text).toContain("O(log n)");
  expect(questions[0].needsReview).toBe(false);
});

it("ignores incidental numbering, duplicate page text and the perception questionnaire", () => {
  const questions = extractQuestions(`
    QUESTÃƒO 01
    Considere os passos 1. e 2. do algoritmo abaixo.
    A) A1
    B) B1
    C) C1
    D) D1
    E) E1
    QUESTÃƒO 01
    Considere os passos 1. e 2. do algoritmo abaixo.
    A) A1
    B) B1
    C) C1
    D) D1
    E) E1
    QUESTÃƒO 02
    Segunda questÃ£o.
    A) A2
    B) B2
    C) C2
    D) D2
    E) E2
    QUESTIONÃRIO DE PERCEPÃ‡ÃƒO DA PROVA
    QUESTÃƒO 01
    Pergunta de percepÃ§Ã£o, fora da prova objetiva.
  `);

  expect(questions.map((question) => question.number)).toEqual([1, 2]);
  expect(questions.every((question) => question.options.length === 5)).toBe(true);
});

it("parses answer keys, case-insensitive labels and annulled questions", () => {
  const answers = parseAnswerKey("1; A\n2, c\n3; ANULADA\nlinha invÃ¡lida");

  expect([...answers.entries()]).toEqual([[1, "A"], [2, "C"], [3, null]]);
});

it("parses official answer-key rows with the question label attached to the answer", () => {
  const answers = parseAnswerKey("QUESTÃO 32C\nQUESTÃO 33ANULADA\nQUESTÃO DISCURSIVA 3***");

  expect([...answers.entries()]).toEqual([[32, "C"], [33, null]]);
});
});

