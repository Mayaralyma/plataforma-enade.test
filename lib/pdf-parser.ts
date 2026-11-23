import { pageBreakMarker, visualContentMarker } from "./pdf-markers";

export type ExtractedQuestion = { number: number; statement: string; options: { label: string; text: string }[]; needsReview: boolean; reviewNote?: string };
export type ExtractQuestionsOptions = { visualPages?: ReadonlySet<number> };

type QuestionCandidate = { number: number; lines: string[]; pages: number[]; visual: boolean };

const optionStart = /^\s*([A-E])\s*[).:\-]\s*(.*)$/;
const looseOptionStart = /^\s*([A-E])\s+(.*)$/;
const standaloneOptionStart = /^\s*([A-E])\s*$/;
const numberedPageMarker = /^__ENADE_PAGE_BREAK_(\d{1,3})__$/;
const numberedPageMarkerPattern = /__ENADE_PAGE_BREAK_\d{1,3}__/g;

function pageNumberFromLine(line: string) {
  const match = line.match(numberedPageMarker);
  return match ? Number(match[1]) : undefined;
}

function isPageBreakLine(line: string) {
  return line === pageBreakMarker || numberedPageMarker.test(line);
}

function stripPageMarkers(text: string) {
  return text.replaceAll(pageBreakMarker, " ").replaceAll(visualContentMarker, " ").replace(numberedPageMarkerPattern, " ");
}
const questionHeading = /(?:^|\b)QUEST[\s\S]{0,15}?O\s*(\d{1,3})\b/i;
const questionHeadingGlobal = /(?:^|\b)QUEST[\s\S]{0,15}?O\s*(\d{1,3})\b/gi;
const numberedQuestionStart = /^\s*(\d{1,3})\s*[.)\-:]\s*(.*)$/;

function splitQuestionHeadings(line: string, hasExplicitHeadings: boolean) {
  const compact = line.replace(/\s+/g, " ").trim();
  const matches: Array<{ index: number; end: number; number: number }> = [];
  let match: RegExpExecArray | null;
  questionHeadingGlobal.lastIndex = 0;
  while ((match = questionHeadingGlobal.exec(compact))) {
    const beforeRaw = compact.slice(0, match.index);
    const before = beforeRaw.replace(/[^A-Za-zÀ-ÿ0-9]+/g, " ").trim();
    const beforeIsHeadingOnly = /^(?:QUEST[\s\S]{0,15}?O\s*\d{1,3}[\s.)\-:]*)+$/i.test(beforeRaw.trim());
    if (match.index === 0 || (before.length <= 24 && !/[?!.;,]/.test(beforeRaw) && (!/[A-Za-zÀ-ÿ]{4,}/.test(before) || beforeIsHeadingOnly))) {
      matches.push({ index: match.index, end: questionHeadingGlobal.lastIndex, number: Number(match[1]) });
    }
  }
  if (matches.length) {
    if (matches.length > 1 && matches.every((entry, i) => {
      const nextIndex = i + 1 < matches.length ? matches[i + 1].index : compact.length;
      return compact.slice(entry.end, nextIndex).replace(/^[\s.)\-:]*/, "").trim() === "";
    })) {
      return { deferred: true, matches: [] as Array<{ number: number; content: string }> };
    }
    const normalized = matches.map((entry, i) => {
      const nextIndex = i + 1 < matches.length ? matches[i + 1].index : compact.length;
      const content = compact.slice(entry.end, nextIndex).replace(/^[\s.)\-:]*/, "").trim();
      return { number: entry.number, content };
    }).filter((entry, i, arr) => arr.findIndex((e) => e.number === entry.number && e.content === entry.content) === i);
    if (normalized.length > 1 && normalized.every((entry) => !entry.content)) return { deferred: true, matches: [] as Array<{ number: number; content: string }> };
    return { deferred: false, matches: normalized };
  }
  if (hasExplicitHeadings) return { deferred: false, matches: [] as Array<{ number: number; content: string }> };
  const numbered = compact.match(numberedQuestionStart);
  if (!numbered) return { deferred: false, matches: [] as Array<{ number: number; content: string }> };
  return { deferred: false, matches: [{ number: Number(numbered[1]), content: numbered[2] ?? "" }] };
}

export function removePdfArtifacts(text: string) {
  return text
    .replace(/(?:ENADE\d{4}){2,}/gi, " ")
    .replace(/\b[A-Z]\d{6,}[^\n]{0,100}\.indb\b[^\n]*/gi, " ")
    .replace(/\*\d{1,3}\*/g, " ")
    .replace(/(?:^|[^A-Z])\d{1,2}Sistemas[ \t]+de[ \t]+informa(?:ção|cao)\d{0,2}MAT.{0,2}RIA/gi, " ")
    .replace(/\*\d{1,2}\*[ \t]*\*R\d{7,}\*[ \t]*Engenharia[ \t]+de[ \t]+Computa.{0,8}[ \t]*\d{0,2}\b/gi, " ")
    .replace(/\*\d{1,2}\*[ \t]*LOGO[ \t]*\d*[ \t]*MAT.{0,2}RIA[ \t]*\d*/gi, " ")
    .replace(/\*R\d{7,}\*[ \t]*Engenharia[ \t]+de[ \t]+Computa.{0,8}[ \t]*\d{0,2}\b/gi, " ")
    .replace(/\*R\d{7,}\*/gi, " ")
    .replace(/VALIDIN[3E]P(?:2023)?\d*/gi, " ")
    .replace(/\b\d{1,2}Engenharia[ \t]+de[ \t]+Computa.{0,8}[ \t]*\d{0,2}\b/gi, " ")
    .replace(/\bEngenharia[ \t]+de[ \t]+Computa.{0,8}[ \t]*\d{1,2}\b/gi, " ")
    .replace(/\b\d{1,2}[ \t]*Sistemas[ \t]+de[ \t]+informa.{0,8}\b/gi, " ")
    .replace(/\bSistemas[ \t]+de[ \t]+informa.{0,8}[ \t]+\d{1,2}\b/gi, " ")
    .replace(/\b\d{1,2}[ \t]*(?:CI[ÊE]NCIA DA COMPUTA[ÇC][ÃA]O|LICENCIATURA EM COMPUTA[ÇC][ÃA]O|AN[ÁA]LISE E DESENVOLVIMENTO DE SISTEMAS|GEST[ÃA]O DA TECNOLOGIA DA INFORMA[ÇC][ÃA]O|REDES DE COMPUTADORES)[ \t]*\d{0,2}(?:[ \t]*MAT.{0,2}RIA)?/gi, " ")
    .replace(/\b(?:CI[ÊE]NCIA DA COMPUTA[ÇC][ÃA]O|LICENCIATURA EM COMPUTA[ÇC][ÃA]O|AN[ÁA]LISE E DESENVOLVIMENTO DE SISTEMAS|GEST[ÃA]O DA TECNOLOGIA DA INFORMA[ÇC][ÃA]O|REDES DE COMPUTADORES)[ \t]*\d{1,2}\b/gi, " ")
    .replace(/(?:^|[^A-Z])(?:ÁREA|AREA)[ \t]+LIVRE\b/gi, " ")
    .replace(/\bLOGO[ \t]*\d*[ \t]*MAT.{0,2}RIA[ \t]*\d*/gi, " ")
    .replace(/(?:^|[^A-Z])\d{1,2}MAT.{0,2}RIA\b/gi, " ")
    .replace(/\*\d{1,2}\*[ \t]*Engenharia[ \t]+de[ \t]+Computa.{0,8}[ \t]*\d{0,2}\b/gi, " ")
    .replace(/\b\d{1,2}(?:FORMA[ÇC][ÃA]O[ \t]+GERAL(?:[ \t]+DOCENTE)?|COMPONENTE[ \t]+ESPEC[IÍ]FICO)(?=[ \t]+(?:[A-ZÀ-ÿ]{2,}|$))(?![ \t]+(?:QUEST[ÃA]O|QUESTAO))/gim, " ");
}

const knownSplitWords: [RegExp, string][] = [
  [/\binjusti\s+Ã§as\b/gi, "injustiÃ§as"],
  [/\bsignifi\s+cati\s+va\b/gi, "significativa"],
  [/\bsignifi\s+cati\s+vo\b/gi, "significativo"],
  [/\binfanti\s+l\b/gi, "infantil"],
  [/\bÃºlti\s+mos\b/gi, "Ãºltimos"],
  [/\bprati\s+camente\b/gi, "praticamente"],
  [/\bdift\s+eria\b/gi, "difteria"],
  [/\bgrÃ¡fi\s+co\b/gi, "grÃ¡fico"],
  [/\bafi\s+rmaÃ§Ãµes\b/gi, "afirmaÃ§Ãµes"],
  [/\bconsti\s+tui\b/gi, "constitui"],
  [/\bdesafi\s+o\b/gi, "desafio"],
  [/\bpolÃ­ti\s+cas\b/gi, "polÃ­ticas"],
  [/\binvesti\s+mentos\b/gi, "investimentos"],
  [/\btransmiti\s+das\b/gi, "transmitidas"],
  [/\bdemocrati\s+zaÃ§Ã£o\b/gi, "democratizaÃ§Ã£o"],
  [/\bati\s+vidades\b/gi, "atividades"],
  [/\brepeti\s+tivas\b/gi, "repetitivas"],
  [/\bprofi\s+ssÃµes\b/gi, "profissÃµes"],
  [/\bprofi\s+ssionais\b/gi, "profissionais"],
  [/\bsubsti\s+tuir\b/gi, "substituir"],
  [/\bfi\s+lmes\b/gi, "filmes"],
  [/\bfi\s+xaÃ§Ã£o\b/gi, "fixaÃ§Ã£o"],
  [/\bidenti\s+fi\s+caÃ§Ã£o\b/gi, "identificaÃ§Ã£o"],
  [/\bgenerati\s+va\b/gi, "generativa"],
];

const unicodeSplitWords: [RegExp, string][] = [
  [/(?<!\p{L})ati\s+ngissem(?!\p{L})/giu, "atingissem"],
  [/(?<!\p{L})esti\s+mati\s+va(?!\p{L})/giu, "estimativa"],
  [/(?<!\p{L})difi\s+culdade(?!\p{L})/giu, "dificuldade"],
  [/(?<!\p{L})qualifi\s+cação(?!\p{L})/giu, "qualificação"],
  [/(?<!\p{L})demográfi\s+co(?!\p{L})/giu, "demográfico"],
  [/(?<!\p{L})efi\s+cácia(?!\p{L})/giu, "eficácia"],
  [/(?<!\p{L})repeti\s+ndo(?!\p{L})/giu, "repetindo"],
  [/(?<!\p{L})confl\s+itos(?!\p{L})/giu, "conflitos"],
  [/(?<!\p{L})afi\s+rmar(?!\p{L})/giu, "afirmar"],
  [/(?<!\p{L})parti\s+r(?!\p{L})/giu, "partir"],
  [/(?<!\p{L})estéti\s+co(?!\p{L})/giu, "estético"],
  [/(?<!\p{L})alternati\s+vas(?!\p{L})/giu, "alternativas"],
  [/(?<!\p{L})alternati\s+va(?!\p{L})/giu, "alternativa"],
  [/(?<!\p{L})esteti\s+camente(?!\p{L})/giu, "esteticamente"],
  [/(?<!\p{L})desperdí\s+cio(?!\p{L})/giu, "desperdício"],
  [/(?<!\p{L})conscienti\s+zar(?!\p{L})/giu, "conscientizar"],
  [/(?<!\p{L})produti\s+va(?!\p{L})/giu, "produtiva"],
  [/(?<!\p{L})produti\s+vas(?!\p{L})/giu, "produtivas"],
  [/(?<!\p{L})justi\s+fi\s+cati\s+va(?!\p{L})/giu, "justificativa"],
  [/(?<!\p{L})aplicati\s+vos(?!\p{L})/giu, "aplicativos"],
  [/(?<!\p{L})empregatí\s+cio(?!\p{L})/giu, "empregatício"],
  [/(?<!\p{L})benefí\s+cios(?!\p{L})/giu, "benefícios"],
  [/(?<!\p{L})ati\s+vidade(?!\p{L})/giu, "atividade"],
  [/(?<!\p{L})moti\s+vos(?!\p{L})/giu, "motivos"],
  [/(?<!\p{L})negati\s+vos(?!\p{L})/giu, "negativos"],
  [/(?<!\p{L})expectati\s+vas(?!\p{L})/giu, "expectativas"],
  [/(?<!\p{L})expectati\s+va(?!\p{L})/giu, "expectativa"],
  [/(?<!\p{L})lati\s+na(?!\p{L})/giu, "latina"],
  [/(?<!\p{L})lati\s+no(?!\p{L})/giu, "latino"],
  [/(?<!\p{L})lati\s+nos(?!\p{L})/giu, "latinos"],
  [/(?<!\p{L})intensifi\s+cando(?!\p{L})/giu, "intensificando"],
  [/(?<!\p{L})verifi\s+cou(?!\p{L})/giu, "verificou"],
  [/(?<!\p{L})diagnósti\s+cos(?!\p{L})/giu, "diagnósticos"],
  [/(?<!\p{L})preventi\s+vos(?!\p{L})/giu, "preventivos"],
  [/(?<!\p{L})profi\s+laxias(?!\p{L})/giu, "profilaxias"],
  [/(?<!\p{L})Esti\s+ma(?=-se)/gu, "Estima"],
  [/(?<!\p{L})esti\s+ma(?=-se)/giu, "estima"],
  [/(?<!\p{L})ú\s+lti\s+ma(?!\p{L})/giu, "última"],
  [/últi ma/giu, "última"],
  [/(?<!\p{L})u\s+\u0301?\s+lti\s+ma(?!\p{L})/giu, "última"],
  [/(?<!\p{L})positi\s+va(?!\p{L})/giu, "positiva"],
  [/(?<!\p{L})objeti\s+vo(?!\p{L})/giu, "objetivo"],
  [/(?<!\p{L})uti\s+lizam(?!\p{L})/giu, "utilizam"],
  [/(?<!\p{L})deco\s+difi\s+cada(?!\p{L})/giu, "decodificada"],
  [/(?<!\p{L})decodifi\s+cada(?!\p{L})/giu, "decodificada"],
  [/(?<!\p{L})amplifi\s+cando(?!\p{L})/giu, "amplificando"],
  [/(?<!\p{L})refl\s+exos(?!\p{L})/giu, "reflexos"],
  [/(?<!\p{L})autodiagnósti\s+co(?!\p{L})/giu, "autodiagnóstico"],
  [/(?<!\p{L})relati\s+vas(?!\p{L})/giu, "relativas"],
  [/(?<!\p{L})sinteti\s+za(?!\p{L})/giu, "sintetiza"],
  [/(?<!\p{L})disti\s+nti\s+vos(?!\p{L})/giu, "distintivos"],
  [/(?<!\p{L})alimentí\s+cios(?!\p{L})/giu, "alimentícios"],
  [/(?<!\p{L})estéti\s+cos(?!\p{L})/giu, "estéticos"],
  [/(?<!\p{L})ti\s+po(?!\p{L})/giu, "tipo"],
  [/(?<!\p{L})afi\s+rma(\p{L}*)(?!\p{L})/giu, "afirma$1"],
  [/(?<!\p{L})políti\s+ca(?!\p{L})/giu, "política"],
  [/(?<!\p{L})ti\s+rania(?!\p{L})/giu, "tirania"],
  [/(?<!\p{L})á\s+rea(?!\p{L})/giu, "área"],
  [/(?<!\p{L})ati\s+vidades(?!\p{L})/giu, "atividades"],
  [/(?<!\p{L})autoriz\s+ados(?!\p{L})/giu, "autorizados"],
  [/(?<!\p{L})Garanti\s+a(?!\p{L})/gu, "Garantia"],
  [/(?<!\p{L})garanti\s+a(?!\p{L})/giu, "garantia"],
  [/(?<!\p{L})fi\s+cam(?!\p{L})/giu, "ficam"],
  [/(?<!\p{L})Gett\s+ysburg(?!\p{L})/giu, "Gettysburg"],
  [/(?<!\p{L})defi\s+nição(?!\p{L})/giu, "definição"],
  [/(?<!\p{L})esti\s+ver(?!\p{L})/giu, "estiver"],
  [/(?<!\p{L})ti\s+ver(?!\p{L})/giu, "tiver"],
  [/(?<!\p{L})senti\s+do(?!\p{L})/giu, "sentido"],
  [/(?<!\p{L})competi\s+ti\s+vidade(?!\p{L})/giu, "competitividade"],
  [/(?<!\p{L})combati\s+vidade(?!\p{L})/giu, "combatividade"],
  [/(?<!\p{L})á\s+reas(?!\p{L})/giu, "áreas"],
  [/(?<!\p{L})ciê\s+ncia(?!\p{L})/giu, "ciência"],
  [/(?<!\p{L})dispositi\s+vos(?!\p{L})/giu, "dispositivos"],
  [/(?<!\p{L})prá\s+ticas(?!\p{L})/giu, "práticas"],
  [/(?<!\p{L})proati\s+vo(?!\p{L})/giu, "proativo"],
  [/(?<!\p{L})injusti\s+(?:\u00e7as|\u00c3\u00a7as)(?!\p{L})/giu, "injusti\u00e7as"],
  [/(?<!\p{L})(?:\u00falti|\u00c3\u00bAlti)\s+mos(?!\p{L})/giu, "\u00faltimos"],
  [/(?<!\p{L})gr(?:\u00e1|\u00c3\u00a1)fi\s+co(?!\p{L})/giu, "gr\u00e1fico"],
  [/(?<!\p{L})pol(?:\u00ed|\u00c3\u00ad)ti\s+cas(?!\p{L})/giu, "pol\u00edticas"],
];

export function repairKnownSplitWords(text: string) {
  return [...unicodeSplitWords, ...knownSplitWords].reduce((result, [pattern, replacement]) => result.replace(pattern, replacement), text);
}

function referencesVisualContent(text: string) {
  const normalized = text.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  const pattern = /\b(?:figuras?|imagens?|graficos?)\s+(?:a seguir|abaixo|acima|seguinte|apresentad[ao]s?|mostrad[ao]s?)\b|\b(?:na|nesta|conforme)\s+(?:a\s+)?(?:figuras?|imagens?|graficos?|tabelas?)\b|\b(?:tabelas?)\s+(?:resultante\s+)?(?:pode ser vista\s+)?(?:a seguir|abaixo|acima|seguinte|apresentada|mostrada)\b|\bobserve\s+(?:a\s+)?(?:seguinte\s+)?(?:figuras?|imagens?|graficos?|tabelas?)\b|\b(?:diagramas?|mapas?|charges?)\b|\bmodelos?\s+de\s+entidades\s+e\s+relacionamentos\b/i;
  return pattern.test(normalized);
}

function hasNumericOptionAnomaly(options: Record<string, string[]>) {
  const values = Object.values(options).map((lines) => lines.join(" ").trim());
  const numericOnly = /^[\s\d.,;:+\-âˆ’()/%]+$/u;
  const numericValues = values.filter((value) => numericOnly.test(value));
  const tokenCounts = numericValues.map((value) => value.split(/\s+/).filter(Boolean).length);
  const tokenCountFrequencies = tokenCounts.map((tokenCount) => tokenCounts.filter((candidate) => candidate === tokenCount).length);
  const mostCommonTokenCount = Math.max(0, ...tokenCountFrequencies);
  return numericValues.length >= 4 && (numericValues.length < values.length || mostCommonTokenCount >= 4 && mostCommonTokenCount < numericValues.length);
}

function findCompleteOptionSequences(lines: string[], minLabels = 5) {
  const labels = lines.map((line, index) => ({
    index,
    label: line.match(optionStart)?.[1] ?? line.match(looseOptionStart)?.[1] ?? line.match(standaloneOptionStart)?.[1],
  }));
  const required = ["A", "B", "C", "D", "E"].slice(0, minLabels);
  const sequences: { start: number; end: number; labels: string[] }[] = [];
  for (const start of labels.filter((entry) => entry.label === "A")) {
    let after = start.index;
    let complete = true;
    for (const label of required.slice(1)) {
      const next = labels.find((entry) => entry.index > after && entry.label === label);
      if (!next) { complete = false; break; }
      after = next.index;
    }
    if (complete) sequences.push({ start: start.index, end: after, labels: required });
  }
  return sequences;
}

export function extractQuestions(text: string, extractOptions?: ExtractQuestionsOptions): ExtractedQuestion[] {
  const markedPageBreaks = text
    .replace(/\*\d{1,2}\*[ \t]*\*R\d{7,}\*/gi, "\n" + pageBreakMarker + "\n")
    .replace(/\*R\d{7,}\*/gi, "\n" + pageBreakMarker + "\n");
  const normalized = repairKnownSplitWords(removePdfArtifacts(markedPageBreaks)).replace(/\r/g, "").replace(/[\t ]+/g, " ");
  let lines = normalized.split("\n").map((line) => line.trim()).filter(Boolean);
  
  const perceptionMarker = /(?:QUESTION.{0,5}RIO\s+DE\s+PERCEP.{0,5}O\s+DA\s+PROVA|AVALIA.{0,8}GLOBAL\s+DA\s+PROVA)/i;
  const tableOfContentsMarker = /(?:OBJETIVAS|DISCURSIVA|N[ÚU]MERO\s+DAS\s+QUEST|COMPOSI[ÇC][ÃA]O)/i;
  const sectionRangeMarker = /\d{1,3}\s*(?:a|-|–)\s*\d{1,3}/i;
  let perceptionStart = -1;
  for (let index = 0; index < lines.length; index += 1) {
if (perceptionMarker.test(lines[index]) && !tableOfContentsMarker.test(lines[index]) && !sectionRangeMarker.test(lines[index])) {
      perceptionStart = index;
      break;
    }
  }
  if (perceptionStart >= 0) {
    
    const markerIndex = lines[perceptionStart].search(perceptionMarker);
    const questionEnd = lines[perceptionStart].slice(0, markerIndex).trim();
    const beforePerception = lines.slice(0, perceptionStart);
    const beforeQuestionCount = beforePerception.filter((line) => /(?:^|\b)QUEST[\s\S]{0,15}?O\s*\d{1,3}\b/i.test(line.replace(/\s+/g, " "))).length;
    const afterPerception = lines.slice(perceptionStart);
    
    const afterQuestionCount = afterPerception.filter((line) => /(?:^|\b)QUEST[\s\S]{0,15}?O\s*\d{1,3}\b/i.test(line.replace(/\s+/g, " "))).length;
    
    if (beforeQuestionCount >= 10 || afterQuestionCount < 3) {
      lines = [...beforePerception, ...(questionEnd ? [questionEnd] : [])];
    }
  }
  const sawVisualMarkers = lines.includes(visualContentMarker);
  const hasExplicitHeadings = lines.some((line) => questionHeading.test(line.replace(/\s+/g, " ")));
    const candidates: QuestionCandidate[] = [];
  let current: QuestionCandidate | undefined;
  let currentPage = 1;
  let pendingVisual = false;
  let deferredHeadings: number[] = [];
  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
if (line === visualContentMarker) {
      pendingVisual = true;
      continue;
    }
    const numberedPage = pageNumberFromLine(line);
    if (numberedPage !== undefined) {
      if (current) {
        current.lines.push(line);
        current.pages.push(numberedPage);
      }
      currentPage = numberedPage + 1;
      continue;
    }
    if (line === pageBreakMarker) {
      if (current) {
        current.lines.push(line);
        current.pages.push(currentPage);
      }
      continue;
    }
    const split = splitQuestionHeadings(line, hasExplicitHeadings);
if (split.deferred) {
      deferredHeadings = line.replace(/\s+/g, " ").match(/QUEST[\s\S]{0,15}?O\s*(\d{1,3})/gi)?.map((m) => Number(m.match(/\d{1,3}/)?.[0])) ?? deferredHeadings;
      if (current) {
        current.lines.push(line);
        current.pages.push(currentPage);
      }
      continue;
    }
    if (split.matches.length) {
const matches = [...split.matches];
      if (deferredHeadings.length) {
        for (const deferred of deferredHeadings) {
          if (!matches.some((m) => m.number === deferred)) matches.unshift({ number: deferred, content: "" });
        }
        deferredHeadings = [];
      }
      for (let matchIndex = 0; matchIndex < matches.length; matchIndex += 1) {
        const match = matches[matchIndex];
        if (current) candidates.push(current);
        const content = match.content;
        const firstLines = content ? [content] : [];
        current = {
          number: match.number,
          lines: pendingVisual && matchIndex === 0 ? [visualContentMarker, ...firstLines] : firstLines,
          pages: [...(pendingVisual && matchIndex === 0 ? [currentPage] : []), ...(content ? [currentPage] : [])],
          visual: pendingVisual && matchIndex === 0,
        };
      }
      pendingVisual = false;
    } else if (current) {
      if (pendingVisual) {
        current.lines.push(visualContentMarker);
        current.pages.push(currentPage);
        current.visual = true;
        pendingVisual = false;
      }
      current.lines.push(line);
      current.pages.push(currentPage);
    }
  }
  if (current) candidates.push(current);
  

  const objectiveCandidates = candidates.map((candidate) => {
    const discursiveStart = candidate.lines.findIndex((line) =>
      /QUEST.{0,5}O\s+DISC.{0,10}\b\d{1,2}\b/i.test(line) || /COMPONENTE\s+ESPEC.{0,5}FICO/i.test(line),
    );
    if (discursiveStart < 0) return candidate;
    const lines = candidate.lines.slice(0, discursiveStart);
    return { ...candidate, lines, pages: candidate.pages.slice(0, discursiveStart), visual: lines.includes(visualContentMarker) };
  });

  const candidatesWithDetachedHeadings = objectiveCandidates.flatMap((candidate, index) => {
const followingHeading = objectiveCandidates[index + 1];
    const sequences5 = findCompleteOptionSequences(candidate.lines, 5);
    const sequences4 = findCompleteOptionSequences(candidate.lines, 4);
    const sequences = sequences5.length >= 2 ? sequences5 : sequences4.length >= 2 ? sequences4 : [];
    if (sequences.length < 2) return [candidate];
    const first = sequences[0];
    const second = sequences.find((sequence) => sequence.start > first.end);
    if (!second) return [candidate];
    const pageBreakIndex = candidate.lines.findIndex((line, lineIndex) => isPageBreakLine(line) && lineIndex > first.end && lineIndex < second.start);
    const splitIndex = pageBreakIndex >= 0 ? pageBreakIndex : second.start;
    const betweenSequences = candidate.lines.slice(pageBreakIndex >= 0 ? pageBreakIndex + 1 : first.end + 1, second.start).join(" ").trim();
    const looksLikeHeading = (line: string) => /(?:^|\b)(?:QUEST[ÃA]O|TEXTO|SITUA[ÇC][ÃA]O|O\s+cen[áa]rio|Leia\s+o\s+texto|Com\s+base\s+no\s+texto)\b/i.test(line.replace(/\s+/g, " "));
    const betweenHasHeading = candidate.lines.slice(first.end + 1, second.start).some((line) => looksLikeHeading(line));
    const seqContentful = (seq: {start:number;end:number}) => {
      const req = ["A","B","C","D","E"];
      let count=0, after=seq.start-1;
      for(const label of req){
        const idx = candidate.lines.findIndex((l,li)=> li>after && (l.match(optionStart)?.[1]??l.match(looseOptionStart)?.[1]??l.match(standaloneOptionStart)?.[1])===label);
        if(idx<0) continue;
        after=idx;
        const m = candidate.lines[idx].match(optionStart) ?? candidate.lines[idx].match(looseOptionStart);
        const content = m?.[2]?.trim() ?? "";
        if(content) count++;
      }
      return count;
    };
    const firstContentful = seqContentful(first);
    const secondContentful = seqContentful(second);
    if (firstContentful===0 && secondContentful>0) return [candidate];
    if (betweenSequences.length < 40 && !betweenHasHeading) return [candidate];
    const inferredNumber = followingHeading?.number === candidate.number + 1 ? followingHeading.number : candidate.number + 1;
    if (followingHeading && inferredNumber !== followingHeading.number) {
      // Missing heading case: only split when the gap strongly suggests the next sequential question.
      if (followingHeading.number !== candidate.number + 2) return [candidate];
    }
    const firstLines = candidate.lines.slice(0, splitIndex);
    const secondLines = candidate.lines.slice(splitIndex, second.end + 1).filter((line, idx) => idx !== 0 || !isPageBreakLine(line));
    const splitCandidate = { number: inferredNumber, lines: secondLines, pages: candidate.pages.slice(splitIndex, second.end + 1), visual: secondLines.includes(visualContentMarker) || Boolean(followingHeading?.visual) };
    if (followingHeading && inferredNumber === followingHeading.number) {
      return [
        { number: candidate.number, lines: firstLines, pages: candidate.pages.slice(0, splitIndex), visual: firstLines.includes(visualContentMarker) },
        splitCandidate,
        followingHeading,
      ];
    }
    return [
      { number: candidate.number, lines: firstLines, pages: candidate.pages.slice(0, splitIndex), visual: firstLines.includes(visualContentMarker) },
      splitCandidate,
    ];
  });

  const result: ExtractedQuestion[] = [];
  for (const candidate of candidatesWithDetachedHeadings) {
    const options: Record<string, string[]> = {};
    const statement: string[] = [];
    const looseOptionLines = new Map<number, string>();
    const looseLabels = candidate.lines.map((line, index) => {
      const m = line.match(optionStart) ?? line.match(looseOptionStart);
      const content = m?.[2]?.trim() ?? "";
      const label = line.match(optionStart)?.[1] ?? line.match(looseOptionStart)?.[1] ?? line.match(standaloneOptionStart)?.[1];
      return { index, label, content };
    });
    const usedOptionIndexes = new Set<number>();

    let bestSequence: typeof looseLabels = [];
    let bestScore = -1;
    for (const start of looseLabels.filter((entry) => entry.label === "A" && !usedOptionIndexes.has(entry.index))) {
      const sequence = [start];
      let after = start.index;
      for (const label of ["B", "C", "D", "E"]) {
        const next = looseLabels.find((entry) => entry.index > after && entry.label === label && !usedOptionIndexes.has(entry.index));
        if (!next) break;
        sequence.push(next);
        after = next.index;
      }
      if (sequence.length < 2) continue;
      const nonEmpty = sequence.filter((e) => e.content).length;
      const longContent = sequence.filter((e) => e.content.length >= 12 || /[.!?;,]/.test(e.content)).length;
      const shortNumeric = sequence.filter((e) => e.content && e.content.length <= 6 && /^[0-9A-G:.,\s-]+$/.test(e.content)).length;
      const graphLike = sequence.filter((e) => /^(?:[A-G](?::\s*-?\d+)?(?:\s+|$)){3,}/.test(e.content.trim())).length;
      const tableAnswer = sequence.filter((e) => /(?:[A-G]\s*:\s*-?\d+[\s,;]*){3,}/.test(e.content)).length;
      const embeddedNextOption = sequence.filter((e) => /\b[B-E]\s+[A-ZÀ-ÿ0-9]/.test(e.content) && e.content.length > 35).length;
      const lowerStart = sequence.filter((e) => /^[a-zà-ÿ]/.test(e.content)).length;
      const earlyA = start.index < 3 && sequence.at(-1)!.index - start.index > 8 ? 120 : 0;
      const statementLikeA = start.index <= 1 && start.content.length > 20 && (/^[a-zà-ÿ]/.test(start.content) || (/^[A-ZÀ-Ý]/.test(start.content) && start.content.length > 60 && /[,;.]\s+[a-zà-ÿ]/.test(start.content))) ? 140 : 0;
      const score = sequence.length * 100 + nonEmpty * 20 + longContent * 30 + tableAnswer * 40 - shortNumeric * 40 - (graphLike - tableAnswer) * 30 - embeddedNextOption * 25 - lowerStart * 15 - earlyA - statementLikeA - (sequence.at(-1)!.index - sequence[0].index) / 1000;
      if (score > bestScore) { bestSequence = sequence; bestScore = score; }
    }
    if (bestSequence.length >= 2) {
      const contentful = bestSequence.filter((e) => e.content).length;
      if (contentful === 0) {
        for (const entry of bestSequence) usedOptionIndexes.add(entry.index);
        // try to find a better sequence after this graph/figure label block
        let alt: typeof looseLabels = [];

        let altScore = -1;
        for (const start of looseLabels.filter((entry) => entry.label === "A" && !usedOptionIndexes.has(entry.index))) {
          const sequence = [start];
          let after = start.index;
          for (const label of ["B","C","D","E"]) {
            const next = looseLabels.find((entry) => entry.index > after && entry.label === label && !usedOptionIndexes.has(entry.index));
            if (!next) break; sequence.push(next); after = next.index;
          }
          if (sequence.length < 2) continue;
          const nonEmpty = sequence.filter((e)=>e.content).length;
          const longContent = sequence.filter((e)=>e.content.length>=12 || /[.!?;,]/.test(e.content)).length;
          const shortNumeric = sequence.filter((e)=>e.content && e.content.length<=6 && /^[0-9A-G:.,\s-]+$/.test(e.content)).length;
          const graphLike = sequence.filter((e)=> /^(?:[A-G](?::\s*-?\d+)?(?:\s+|$)){3,}/.test(e.content.trim())).length;
          const tableAnswer = sequence.filter((e)=> /(?:[A-G]\s*:\s*-?\d+[\s,;]*){3,}/.test(e.content)).length;
          const embeddedNextOption = sequence.filter((e)=> /\b[B-E]\s+[A-ZÀ-ÿ0-9]/.test(e.content) && e.content.length>35).length;
          const lowerStart = sequence.filter((e)=> /^[a-zà-ÿ]/.test(e.content)).length;
          const earlyA = start.index < 3 && sequence.at(-1)!.index - start.index > 8 ? 120 : 0;
          const statementLikeA = start.index <= 1 && start.content.length > 20 && (/^[a-zà-ÿ]/.test(start.content) || (/^[A-ZÀ-Ý]/.test(start.content) && start.content.length > 60 && /[,;.]s+[a-zà-ÿ]/.test(start.content))) ? 140 : 0;
          const score = sequence.length*100 + nonEmpty*20 + longContent*30 + tableAnswer*40 - shortNumeric*40 - (graphLike-tableAnswer)*30 - embeddedNextOption*25 - lowerStart*15 - earlyA - statementLikeA - (sequence.at(-1)!.index-sequence[0].index)/1000;
          if (score>altScore) { alt=sequence; altScore=score; }
        }
        if (alt.length>=2 && alt.some(e=>e.content)) for (const entry of alt) looseOptionLines.set(entry.index, entry.label!);
        else for (const entry of bestSequence) looseOptionLines.set(entry.index, entry.label!);
      } else {
        for (const entry of bestSequence) looseOptionLines.set(entry.index, entry.label!);
      }
    }
    const labels = ["A", "B", "C", "D", "E"];
    const hasEmptyOption = () => labels.some((label) => !options[label] || options[label].join(" ").trim() === "");
    const detachedLines: string[] = [];
    let collectingDetached = false;
    let active: string | undefined;
    const swallowedA = bestSequence.length>=4 ? (() => {
      const a = bestSequence.find(s=>s.label==='A');
      const others = bestSequence.filter(s=>s.label!=='A');
      if (a && a.index<=1 && a.content.length>80 && /^[A-ZÀ-Ý]/.test(a.content) && !/^[A-ZÀ-Ý]\s*[:)\-]/.test(a.content) && others.filter(o=>o.content.length>20).length>=3) return a;
      return undefined;
    })() : undefined;
    if (swallowedA) {
      looseOptionLines.delete(swallowedA.index);
      statement.push(swallowedA.content);
    }
    for (const [index, line] of candidate.lines.entries()) {
      if (isPageBreakLine(line)) {
        const lastLabel = [...labels].reverse().find((label) => options[label]) ?? "E";
if (!collectingDetached && active === lastLabel && hasEmptyOption()) {
          collectingDetached = true;
          active = undefined;
        }
        continue;
      }
      if (line === visualContentMarker) continue;
      if (collectingDetached) {
        detachedLines.push(line);
        continue;
      }
      const sectionHeader = /^(?:FORMA[ÇC][ÃA]O\s+GERAL\s+DOCENTE|COMPONENTE\s+ESPEC[IÍ]FICO)\b/i.test(line.replace(/\s+/g, " ").trim());
      const footerArtifact = /^\*R\d+\*$/i.test(line.trim()) || /\.indb\b/i.test(line);
      if (sectionHeader || footerArtifact) {
        const lastLabel = [...labels].reverse().find((label) => options[label]) ?? "E";
        if (active === lastLabel) { collectingDetached = true; active = undefined; }
        continue;
      }
      const match = line.match(optionStart);
      const looseLabel = looseOptionLines.get(index);
      if (looseLabel) {
        active = looseLabel;
        const content = match?.[2] ?? line.match(looseOptionStart)?.[2] ?? "";
        options[active] = [content];

      }
      else if (active) options[active].push(line);
      else statement.push(line);
    }
const emptyLabels = labels.filter((label) => !options[label] || options[label].join(" ").trim() === "");
    if (emptyLabels.length && detachedLines.length) {
      const labeled: Partial<Record<string, string[]>> = {};
      let current: string | undefined;
      for (const line of detachedLines) {
        const m = line.match(/^([A-E])\s+(.+)$/);
        const loose = line.match(/^([A-E])\s*$/);
        if (m && emptyLabels.includes(m[1])) { current = m[1]; labeled[current] = [m[2]]; continue; }
        if (loose && emptyLabels.includes(loose[1])) { current = loose[1]; labeled[current] = []; continue; }
        if (current) (labeled[current] ??= []).push(line);
      }
      for (const label of emptyLabels) {
        if (labeled[label]?.length) options[label] = labeled[label];
      }
      const still = emptyLabels.filter((l) => !options[l] || options[l].join(" ").trim() === "");
      if (still.length === 1) {
        const label = still[0];
        const content = detachedLines.map((line) => {
          const m = line.match(/^([A-E])\s+(.+)$/);
          if (m && m[1] === label) return m[2];
          if (/^([A-E])\s*$/.test(line) && line.trim() === label) return "";
          return line;
        }).filter((line) => line !== "" && !/^([A-E])\s*$/.test(line));
        if (content.length) options[label] = [content.join(" ")];
      } else if (still.length > 1) {
        const last = still.at(-1)!;
        if (!options[last]?.join("").trim()) {
          const content = detachedLines.filter((line) => !/^([A-E])\s*$/.test(line));
          if (content.length) options[last] = [content.join(" ")];
        }
      }
    }
const optionKeys = labels.filter((label) => options[label]);
    const lastOption = optionKeys.at(-1);
    if (lastOption) {
      const tailLines = options[lastOption].join("\n").split(/\n+/);
      const cutIdx = tailLines.findIndex((l, i) => i > 0 && /^(?:QUEST[ÃA]O\s*\d{1,3}\b|TEXTO\s+\d+\b|SITUA[ÇC][ÃA]O-PROBLEMA\b|COMPONENTE\s+ESPEC[IÍ]FICO\b)/i.test(l.replace(/\s+/g, " ").trim()));
      if (cutIdx > 0) options[lastOption] = [tailLines.slice(0, cutIdx).join(" ")];
    }
for (const label of ["E","D","C","B","A"]) {
      const t = (options[label] ?? []).join(" ").trim();
      if (!t) { delete options[label]; continue; }
      if (/^(FORMA[ÇC][ÃA]O\s+GERAL\s+DOCENTE|COMPONENTE\s+ESPEC[IÍ]FICO)\b/i.test(t)) { delete options[label]; continue; }
      break;
    }
if (!statement.length && !Object.keys(options).length) continue;
    const missingOptions = labels.some((label) => !options[label]);
    const hasStatement = statement.length > 0;
    const finalOptionText = options.E?.join(" ").trim() ?? "";
    const visualTail = finalOptionText.match(/^(.+?[.!?])\s+(.+)$/u);
    let trailingVisualContent = "";
    if (visualTail && /(?:%|\b(?:Segurado|Residencial|Automotivo|Vida)\b)/iu.test(visualTail[2])) {
      options.E = [visualTail[1].trim()];
      trailingVisualContent = visualTail[2].trim();
      const visualNote = `Conteúdo visual extraído para conferência: ${trailingVisualContent}`;
      const promptIndex = statement.findIndex((line) => /\b(?:Considerando|Em relação|Com relação|A partir|Acerca)\b/i.test(line));
      if (promptIndex < 0) statement.push(visualNote);
      else statement.splice(promptIndex, 0, visualNote);
    }
    const extractedStatement = stripPageMarkers(repairKnownSplitWords(removePdfArtifacts(statement.join(" ")))).replace(/\s+/g, " ").trim();
    let extractedOptions = labels
      .filter((label) => options[label])
      .map((label) => ({ label, text: stripPageMarkers(repairKnownSplitWords(removePdfArtifacts(options[label].join(" ")))).replace(/\s+/g, " ").trim() }));
    while (extractedOptions.length) {
      const last = extractedOptions.at(-1)!;
      const t = last.text.trim();
      if (!t || /^(FORMA[ÇC][ÃA]O\s+GERAL\s+DOCENTE|COMPONENTE\s+ESPEC[IÍ]FICO)\b/i.test(t) || /^(?:PND\d+)+$/i.test(t.replace(/\s+/g,""))) { extractedOptions.pop(); continue; }
      break;
    }
    if (extractedOptions.length >= 4 && extractedOptions[0].label !== "A") {
      const relabel = ["A","B","C","D","E"];
      extractedOptions = extractedOptions.map((o,i)=>({ ...o, label: relabel[i] ?? o.label }));
    }
    const cleanedOptions = Object.fromEntries(extractedOptions.map(({ label, text }) => [label, [text]]));
    const candidateText = [extractedStatement, ...extractedOptions.map(({ text }) => text)].join(" ");
    const referencesVisual = referencesVisualContent(candidateText);
    const visualPages = extractOptions?.visualPages;
    const visualQuestionPages = !sawVisualMarkers && visualPages
      ? [...new Set(candidate.pages.filter((page) => visualPages.has(page)))].sort((a, b) => a - b)
      : [];
    const numericOptionAnomaly = hasNumericOptionAnomaly(cleanedOptions);
    const hasUnknownGlyph = /[\uFFFD\uE000-\uF8FF]/u.test(candidateText);
    const hasPdfFooterResidue = /VALIDIN[3E]P|\*R\d{7,}\*|LOGO\s*\d*\s*MAT.{0,2}RIA/iu.test(candidateText);
    const reviewNote = missingOptions
      ? "A extraÃ§Ã£o nÃ£o identificou todas as cinco alternativas."
      : !hasStatement
        ? "A extraÃ§Ã£o nÃ£o identificou o enunciado."
        : referencesVisual
          ? "O enunciado pode depender de elemento visual; confira o PDF original."
          : candidate.visual
            ? "Há imagem ou gráfico nesta questão; confira se o elemento faz parte dela no PDF original."
            : visualQuestionPages.length
              ? `Há imagem ou gráfico na(s) página(s) ${visualQuestionPages.join(", ")}; confira se o elemento faz parte desta questão no PDF original.`
              : numericOptionAnomaly
            ? "Uma alternativa numÃ©rica parece conter erro de leitura; confira o PDF original."
            : hasUnknownGlyph
              ? "O texto contÃ©m caracteres nÃ£o reconhecidos pelo extrator; confira o PDF original."
              : hasPdfFooterResidue
                ? "O texto ainda contÃ©m marcas de rodapÃ© do PDF."
                : undefined;
    result.push({
      number: candidate.number,
      statement: extractedStatement,
      options: extractedOptions,
      needsReview: Boolean(reviewNote),
      reviewNote,
    });
  }
  const bestByNumber = new Map<number, ExtractedQuestion>();
  for (const question of result) {
    const previous = bestByNumber.get(question.number);
    const quality = question.options.length * 100_000 + question.statement.length;
    const previousQuality = previous ? previous.options.length * 100_000 + previous.statement.length : -1;
    if (!previous || quality > previousQuality) bestByNumber.set(question.number, question);
  }
  return [...bestByNumber.values()];
}

const ANSWER_KEY_PAIR = /(\d{1,3})\s*[;,:|\-]?\s*([A-E]|\*|ANULAD[AO])(?=\s+\d{1,3}\s*[;,:|\-]?\s*(?:[A-E]|\*|ANULAD[AO])|$)/gi;
const ANSWER_KEY_NUMBER_ROW = /^\s*(?:\d{1,3}\s+){1,}\d{1,3}\s*$/;
const ANSWER_KEY_VALUE_TOKEN = /^(?:ANULAD[AO]|[A-E]|\*)$/i;

function answerKeyTableAnswers(lines: string[]) {
  const answers = new Map<number, string | null>();
  for (let index = 0; index < lines.length - 1; index += 1) {
    const numbers = lines[index].trim().split(/\s+/).map(Number);
    if (!ANSWER_KEY_NUMBER_ROW.test(lines[index]) || numbers.some((number) => !Number.isInteger(number))) continue;
    const values = lines[index + 1].trim().split(/\s+/);
    if (values.length !== numbers.length || values.some((value) => !ANSWER_KEY_VALUE_TOKEN.test(value))) continue;
    for (const [offset, number] of numbers.entries()) {
      const value = values[offset];
      answers.set(number, /^ANULAD/i.test(value) || value === "*" ? null : value.toUpperCase());
    }
    index += 1;
  }
  return answers;
}

export function parseAnswerKey(raw: string) {
  const result = new Map<number, string | null>();
  const normalized = raw.normalize("NFKC").replace(/^\uFEFF/, "").replace(/\r/g, "");
  const lines = normalized.split("\n");
  const tableAnswers = answerKeyTableAnswers(lines);
  for (const [number, answer] of tableAnswers) result.set(number, answer);
  for (const line of lines) {
    const pairs = [...line.matchAll(ANSWER_KEY_PAIR)];
    if (pairs.length > 1) {
      for (const pair of pairs) {
        const number = Number(pair[1]);
        if (tableAnswers.has(number)) continue;
        result.set(number, /^ANULAD/i.test(pair[2]) || pair[2] === "*" ? null : pair[2].toUpperCase());
      }
      continue;
    }
    const match = line.match(/^\s*(\d{1,3})\s*[;,:\t\s| -]+(?:\s*([A-E])\b|\s*(ANULAD[AO])\b|\s*\*\s*)/i);
    if (match) {
      result.set(Number(match[1]), match[3] ? null : (match[2] ? match[2].toUpperCase() : null));
      continue;
    }
    if (/QUEST.{0,5}O\s+DISCURSIVA/i.test(line)) continue;
    const namedMatches = [...line.matchAll(/(?:QUEST.{0,5}O\s*)?(\d{1,3})\s*[;,:|\-\s]*\s*(ANULAD[AO]\b|[A-E]|\*)(?![A-Za-z*])/gi)]
      .sort((a, b) => (a.index ?? 0) - (b.index ?? 0) || b[0].length - a[0].length);
    if (namedMatches.length) {
      let cursor = -1;
      for (const namedMatch of namedMatches) {
        const start = namedMatch.index ?? 0;
        if (start < cursor) continue;
        cursor = start + namedMatch[0].length;
        result.set(Number(namedMatch[1]), /^ANULAD/i.test(namedMatch[2]) || namedMatch[2] === "*" ? null : namedMatch[2].toUpperCase());
      }
    }
  }
  return result;
}



