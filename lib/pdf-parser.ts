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
const explicitQuestionStart = /^\s*QUEST.{0,5}O\s*(\d{1,3})\b(?:\s*[.)\-:]\s*(.*)|\s+(.*)|\s*)$/i;
const numberedQuestionStart = /^\s*(\d{1,3})\s*[.)\-:]\s*(.*)$/;
const flexibleQuestionStart = /^\s*QUEST.{0,5}O\s*(\d{1,3})\b(?:\s*[.)\-:]\s*(.*)|\s+(.*)|\s*)$/i;

function removePdfArtifacts(text: string) {
  return text
    .replace(/\*\d{1,2}\*/g, " ")
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
    .replace(/\*\d{1,2}\*[ \t]*Engenharia[ \t]+de[ \t]+Computa.{0,8}[ \t]*\d{0,2}\b/gi, " ");
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

function repairKnownSplitWords(text: string) {
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

function findCompleteOptionSequences(lines: string[]) {
  const labels = lines.map((line, index) => ({
    index,
    label: line.match(optionStart)?.[1] ?? line.match(looseOptionStart)?.[1] ?? line.match(standaloneOptionStart)?.[1],
  }));
  const sequences: { start: number; end: number }[] = [];
  for (const start of labels.filter((entry) => entry.label === "A")) {
    let after = start.index;
    let complete = true;
    for (const label of ["B", "C", "D", "E"]) {
      const next = labels.find((entry) => entry.index > after && entry.label === label);
      if (!next) { complete = false; break; }
      after = next.index;
    }
    if (complete) sequences.push({ start: start.index, end: after });
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
  const perceptionStart = lines.findIndex((line) => perceptionMarker.test(line));
  if (perceptionStart >= 0) {
    const markerIndex = lines[perceptionStart].search(perceptionMarker);
    const questionEnd = lines[perceptionStart].slice(0, markerIndex).trim();
    lines = [...lines.slice(0, perceptionStart), ...(questionEnd ? [questionEnd] : [])];
  }
  const sawVisualMarkers = lines.includes(visualContentMarker);
  const hasExplicitHeadings = lines.some((line) => explicitQuestionStart.test(line) || flexibleQuestionStart.test(line));
  const candidates: QuestionCandidate[] = [];
  let current: QuestionCandidate | undefined;
  let currentPage = 1;
  let pendingVisual = false;
  for (const line of lines) {
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
    const match = line.match(explicitQuestionStart) ?? line.match(flexibleQuestionStart) ?? (!hasExplicitHeadings ? line.match(numberedQuestionStart) : null);
    if (match && Number(match[1]) <= 100) {
      if (current) candidates.push(current);
      const firstLine = match[2] ?? match[3] ?? "";
      const firstLines = firstLine ? [firstLine] : [];
      current = {
        number: Number(match[1]),
        lines: pendingVisual ? [visualContentMarker, ...firstLines] : firstLines,
        pages: [...(pendingVisual ? [currentPage] : []), ...(firstLine ? [currentPage] : [])],
        visual: pendingVisual,
      };
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
    if (!followingHeading || followingHeading.number !== candidate.number + 1) return [candidate];
    const sequences = findCompleteOptionSequences(candidate.lines);
    if (sequences.length < 2) return [candidate];
    const first = sequences[0];
    const second = sequences.find((sequence) => sequence.start > first.end);
    if (!second) return [candidate];
    const pageBreakIndex = candidate.lines.findIndex((line, lineIndex) => isPageBreakLine(line) && lineIndex > first.end && lineIndex < second.start);
    if (pageBreakIndex < 0) return [candidate];
    const betweenSequences = candidate.lines.slice(pageBreakIndex + 1, second.start).join(" ").trim();
    if (betweenSequences.length < 80) return [candidate];
    const firstLines = candidate.lines.slice(0, pageBreakIndex);
    const secondLines = candidate.lines.slice(pageBreakIndex + 1, second.end + 1);
    return [
      { number: candidate.number, lines: firstLines, pages: candidate.pages.slice(0, pageBreakIndex), visual: firstLines.includes(visualContentMarker) },
      { number: followingHeading.number, lines: secondLines, pages: candidate.pages.slice(pageBreakIndex + 1, second.end + 1), visual: secondLines.includes(visualContentMarker) || followingHeading.visual },
      followingHeading,
    ];
  });

  const result: ExtractedQuestion[] = [];
  for (const candidate of candidatesWithDetachedHeadings) {
    const options: Record<string, string[]> = {};
    const statement: string[] = [];
    const looseOptionLines = new Map<number, string>();
    const looseLabels = candidate.lines.map((line, index) => ({
      index,
      label: line.match(optionStart)?.[1] ?? line.match(looseOptionStart)?.[1] ?? line.match(standaloneOptionStart)?.[1],
    }));
    let bestSequence: typeof looseLabels = [];
    for (const start of looseLabels.filter((entry) => entry.label === "A")) {
      const sequence = [start];
      let after = start.index;
      for (const label of ["B", "C", "D", "E"]) {
        const next = looseLabels.find((entry) => entry.index > after && entry.label === label);
        if (!next) break;
        sequence.push(next);
        after = next.index;
      }
      if (sequence.length > bestSequence.length || (sequence.length === bestSequence.length && sequence.length >= 2 && sequence.at(-1)!.index - sequence[0].index < bestSequence.at(-1)!.index - bestSequence[0].index)) {
        bestSequence = sequence;
      }
    }
    if (bestSequence.length >= 2) for (const entry of bestSequence) looseOptionLines.set(entry.index, entry.label!);
    const labels = ["A", "B", "C", "D", "E"];
    const hasEmptyOption = () => labels.some((label) => !options[label] || options[label].join(" ").trim() === "");
    const detachedLines: string[] = [];
    let collectingDetached = false;
    let active: string | undefined;
    for (const [index, line] of candidate.lines.entries()) {
      if (isPageBreakLine(line)) {
        if (!collectingDetached && active === "E" && hasEmptyOption()) {
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
      const match = line.match(optionStart);
      const looseLabel = looseOptionLines.get(index);
      if (looseLabel) {
        active = looseLabel;
        options[active] = [match?.[2] ?? line.match(looseOptionStart)?.[2] ?? ""];
      }
      else if (active) options[active].push(line);
      else statement.push(line);
    }
    const emptyLabel = labels.find((label) => !options[label] || options[label].join(" ").trim() === "");
    if (emptyLabel && detachedLines.length) options[emptyLabel] = [detachedLines.join(" ")];
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
    const extractedOptions = labels
      .filter((label) => options[label])
      .map((label) => ({ label, text: stripPageMarkers(repairKnownSplitWords(removePdfArtifacts(options[label].join(" ")))).replace(/\s+/g, " ").trim() }));
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

export function parseAnswerKey(raw: string) {
  const result = new Map<number, string | null>();
  for (const line of raw.replace(/\r/g, "").split("\n")) {
    const match = line.match(/^\s*(\d{1,3})\s*[;,:\t\s]+(?:\s*([A-E])\b|\s*(ANULAD[AO])\b)/i);
    if (match) {
      result.set(Number(match[1]), match[3] ? null : match[2].toUpperCase());
      continue;
    }
    const namedMatch = line.match(/^\s*QUEST.{0,5}O\s+(\d{1,3})\s*(ANULAD[AO]\b|[A-E])/i);
    if (namedMatch) {
      result.set(Number(namedMatch[1]), /^ANULAD/i.test(namedMatch[2]) ? null : namedMatch[2].toUpperCase());
    }
  }
  return result;
}


