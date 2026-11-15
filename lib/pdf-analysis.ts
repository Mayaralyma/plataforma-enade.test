import pdfParse from "pdf-parse";
import { numberedPageMarkerPrefix, visualContentMarker } from "./pdf-markers";

export type ImageDimensions = { width: number; height: number };
export type PageImage = ImageDimensions & { x1: number; y1: number; x2: number; y2: number };

type Matrix = [number, number, number, number, number, number];
type TextLine = { text: string; x: number; y: number };
type TextItem = { str?: string; transform?: number[] };
type TextContent = { items: TextItem[] };
type OperatorList = { fnArray?: number[]; argsArray?: unknown[] };
type PdfObjectStore = {
  has?: (id: string) => boolean;
  get: (id: string, callback: (value: unknown) => void) => void;
  objs?: Record<string, unknown>;
};
type PdfPageData = {
  getTextContent(options: { normalizeWhitespace: boolean; disableCombineTextItems: boolean }): Promise<TextContent>;
  getOperatorList(): Promise<OperatorList>;
  objs?: PdfObjectStore;
  commonObjs?: PdfObjectStore;
};
type PdfjsScope = { PDFJS?: { disableFontFace?: boolean; OPS?: Record<string, number> } };

const identityMatrix: Matrix = [1, 0, 0, 1, 0, 0];
const minimumImageDimension = 96;
const minimumImageArea = 12_000;
const repeatedImagePageRatio = 0.5;
const horizontalMarkerTolerance = 180;
const objectResolutionTimeoutMs = 250;

function getPdfjsScope() {
  return (globalThis as typeof globalThis & PdfjsScope).PDFJS;
}

function disablePdfjsFontFaceLoading() {
  const scope = getPdfjsScope();
  if (scope) scope.disableFontFace = true;
}

function getOperators() {
  return getPdfjsScope()?.OPS;
}

function asMatrix(value: unknown): Matrix {
  if (!Array.isArray(value) || value.length < 6) return identityMatrix;
  const values = value.slice(0, 6);
  if (values.some((entry) => typeof entry !== "number" || !Number.isFinite(entry))) return identityMatrix;
  return [values[0] as number, values[1] as number, values[2] as number, values[3] as number, values[4] as number, values[5] as number];
}

function multiplyMatrices(m1: Matrix, m2: Matrix): Matrix {
  return [
    m1[0] * m2[0] + m1[2] * m2[1],
    m1[1] * m2[0] + m1[3] * m2[1],
    m1[0] * m2[2] + m1[2] * m2[3],
    m1[1] * m2[2] + m1[3] * m2[3],
    m1[0] * m2[4] + m1[2] * m2[5] + m1[4],
    m1[1] * m2[4] + m1[3] * m2[5] + m1[5],
  ];
}

function imageBounds(matrix: Matrix) {
  const points = [
    [0, 0],
    [1, 0],
    [0, 1],
    [1, 1],
  ].map(([x, y]) => [matrix[0] * x + matrix[2] * y + matrix[4], matrix[1] * x + matrix[3] * y + matrix[5]]);
  return {
    x1: Math.min(...points.map(([x]) => x)),
    x2: Math.max(...points.map(([x]) => x)),
    y1: Math.min(...points.map(([, y]) => y)),
    y2: Math.max(...points.map(([, y]) => y)),
  };
}

function getNumericDimensions(width: unknown, height: unknown): ImageDimensions | null {
  if (typeof width !== "number" || typeof height !== "number" || !Number.isFinite(width) || !Number.isFinite(height)) return null;
  if (width <= 0 || height <= 0) return null;
  return { width, height };
}

function getImageDimensions(value: unknown): ImageDimensions | null {
  if (!value || typeof value !== "object") return null;
  const record = value as Record<string, unknown>;
  const dimensions = getNumericDimensions(record.width, record.height);
  if (!dimensions) return null;
  if (!("data" in record) && !("kind" in record) && !("imgData" in record)) return null;
  return dimensions;
}

function hasObject(store: PdfObjectStore | undefined, id: string) {
  if (!store) return false;
  if (typeof store.has === "function") return store.has(id);
  return Boolean(store.objs && id in store.objs);
}

function getObject(store: PdfObjectStore, id: string): Promise<unknown> {
  return new Promise((resolve) => {
    let settled = false;
    const settle = (value: unknown) => {
      if (settled) return;
      settled = true;
      resolve(value);
    };
    try {
      store.get(id, settle);
    } catch {
      settle(undefined);
    }
    if (!settled) setTimeout(() => settle(undefined), objectResolutionTimeoutMs);
  });
}

async function resolveImageObject(stores: PdfObjectStore[], id: string) {
  for (const store of stores) {
    if (!hasObject(store, id)) continue;
    const dimensions = getImageDimensions(await getObject(store, id));
    if (dimensions) return dimensions;
  }
  return null;
}

async function imagesForOperation(fn: number, args: unknown[], operators: Record<string, number>, stores: PdfObjectStore[]) {
  const paintImageXObject = operators.paintImageXObject;
  const paintJpegXObject = operators.paintJpegXObject;
  const paintInlineImageXObject = operators.paintInlineImageXObject;
  const paintImageMaskXObject = operators.paintImageMaskXObject;
  const paintImageMaskXObjectGroup = operators.paintImageMaskXObjectGroup;
  const paintImageXObjectRepeat = operators.paintImageXObjectRepeat;

  if (fn === paintJpegXObject) {
    const dimensions = getNumericDimensions(args[1], args[2]);
    if (dimensions) return [dimensions];
  }

  if (fn === paintImageXObject || fn === paintJpegXObject || fn === paintImageXObjectRepeat) {
    const imageId = args[0];
    if (typeof imageId === "string") {
      const dimensions = await resolveImageObject(stores, imageId);
      return dimensions ? [dimensions] : [];
    }
    const dimensions = getImageDimensions(imageId);
    return dimensions ? [dimensions] : [];
  }

  if (fn === paintInlineImageXObject || fn === paintImageMaskXObject) {
    const dimensions = getImageDimensions(args[0]);
    return dimensions ? [dimensions] : [];
  }

  if (fn === paintImageMaskXObjectGroup && Array.isArray(args[0])) {
    return args[0].flatMap((image) => {
      const dimensions = getImageDimensions(image);
      return dimensions ? [dimensions] : [];
    });
  }

  return [];
}

async function detectPageImages(pageData: PdfPageData, operators: Record<string, number>): Promise<PageImage[]> {
  const operatorList = await pageData.getOperatorList();
  const fnArray = Array.isArray(operatorList.fnArray) ? operatorList.fnArray : [];
  const argsArray = Array.isArray(operatorList.argsArray) ? operatorList.argsArray : [];
  const stores = [pageData.objs, pageData.commonObjs].filter((store): store is PdfObjectStore => Boolean(store));
  const images: PageImage[] = [];
  const matrixStack: Matrix[] = [];
  let currentMatrix = identityMatrix;

  for (let index = 0; index < fnArray.length; index += 1) {
    const fn = fnArray[index];
    const rawArgs = argsArray[index];
    const args: unknown[] = Array.isArray(rawArgs) ? rawArgs : [];
    if (fn === operators.save) {
      matrixStack.push(currentMatrix);
      continue;
    }
    if (fn === operators.restore) {
      currentMatrix = matrixStack.pop() ?? identityMatrix;
      continue;
    }
    if (fn === operators.transform) {
      currentMatrix = multiplyMatrices(currentMatrix, asMatrix(args));
      continue;
    }
    if (operators.paintFormXObjectBegin !== undefined && fn === operators.paintFormXObjectBegin) {
      matrixStack.push(currentMatrix);
      currentMatrix = multiplyMatrices(currentMatrix, asMatrix(args[0]));
      continue;
    }
    if (operators.paintFormXObjectEnd !== undefined && fn === operators.paintFormXObjectEnd) {
      currentMatrix = matrixStack.pop() ?? identityMatrix;
      continue;
    }

    const dimensions = await imagesForOperation(fn, args, operators, stores);
    if (!dimensions.length) continue;
    const bounds = imageBounds(currentMatrix);
    for (const image of dimensions) images.push({ ...image, ...bounds });
  }

  return images;
}

function buildTextLines(textContent: TextContent) {
  const lines: TextLine[] = [];
  let lastY: number | undefined;
  let current: TextLine | undefined;

  for (const item of textContent.items) {
    const y = item.transform?.[5] ?? 0;
    const x = item.transform?.[4] ?? 0;
    if (!current) {
      current = { text: item.str ?? "", x, y };
    } else if (lastY === y || !lastY) {
      current.text += item.str ?? "";
    } else {
      lines.push(current);
      current = { text: item.str ?? "", x, y };
    }
    lastY = y;
  }
  if (current) lines.push(current);
  return lines;
}

function isContentImage(image: ImageDimensions) {
  return image.width >= minimumImageDimension && image.height >= minimumImageDimension && image.width * image.height >= minimumImageArea;
}

function imageSignature(image: ImageDimensions) {
  return `${image.width}x${image.height}`;
}

function classifyContentImages(pageImages: Map<number, PageImage[]>, totalPages: number) {
  const pagesBySignature = new Map<string, Set<number>>();
  for (const [pageNumber, images] of pageImages) {
    const signatures = new Set(images.map(imageSignature));
    for (const signature of signatures) {
      const pages = pagesBySignature.get(signature) ?? new Set<number>();
      pages.add(pageNumber);
      pagesBySignature.set(signature, pages);
    }
  }

  const repeatedThreshold = Math.max(3, Math.ceil(totalPages * repeatedImagePageRatio));
  const decorativeSignatures = new Set(
    [...pagesBySignature.entries()]
      .filter(([, pages]) => pages.size >= repeatedThreshold)
      .map(([signature]) => signature),
  );

  const contentImages = new Map<number, PageImage[]>();
  for (const [pageNumber, images] of pageImages) {
    const content = images.filter((image) => isContentImage(image) && !decorativeSignatures.has(imageSignature(image)));
    if (content.length) contentImages.set(pageNumber, content);
  }
  return contentImages;
}

function isNoiseLine(line: TextLine) {
  if (line.y > 720 || line.y < 30) return true;
  return /VALIDIN|\*R\d{7,}|\bLOGO\b|MAT.{0,3}RIA|Engenharia de Computa|Sistemas de informa/i.test(line.text);
}

function findMarkerLineIndex(lines: TextLine[], image: PageImage) {
  const candidates = lines
    .map((line, index) => ({ line, index }))
    .filter(({ line }) => line.text.trim() && !isNoiseLine(line))
    .filter(({ line }) => line.x >= image.x1 - horizontalMarkerTolerance && line.x <= image.x2 + horizontalMarkerTolerance);
  const pool = candidates.length
    ? candidates
    : lines.map((line, index) => ({ line, index })).filter(({ line }) => line.text.trim() && !isNoiseLine(line));
  if (!pool.length) return -1;

  const imageCenterY = (image.y1 + image.y2) / 2;
  pool.sort((a, b) => Math.abs(a.line.y - imageCenterY) - Math.abs(b.line.y - imageCenterY));
  return pool[0].index;
}

function buildPageText(lines: TextLine[], images: PageImage[], pageNumber: number) {
  const markerIndexes = new Set<number>();
  for (const image of images) {
    const markerIndex = findMarkerLineIndex(lines, image);
    if (markerIndex >= 0) markerIndexes.add(markerIndex);
  }

  const parts: string[] = [];
  if (images.length && !lines.length) parts.push(visualContentMarker);
  for (let index = 0; index < lines.length; index += 1) {
    if (markerIndexes.has(index)) parts.push(visualContentMarker);
    parts.push(lines[index].text);
  }
  parts.push(`${numberedPageMarkerPrefix}${pageNumber}__`);
  return parts.join("\n");
}

type GlobalWithImage = typeof globalThis & { Image?: typeof Image };

function installImageStub() {
  const scope = globalThis as GlobalWithImage;
  const original = scope.Image;
  if (original) return () => undefined;

  class NodeImage {
    onload: (() => void) | null = null;
    onerror: (() => void) | null = null;

    set src(_value: string) {
      queueMicrotask(() => this.onload?.());
    }
  }

  scope.Image = NodeImage as unknown as typeof Image;
  return () => {
    Reflect.deleteProperty(scope, "Image");
  };
}

export async function parseExamPdf(dataBuffer: Buffer) {
  const pageLines = new Map<number, TextLine[]>();
  const pageImages = new Map<number, PageImage[]>();
  let renderedPages = 0;

  const result = await (async () => {
    const restoreImage = installImageStub();
    try {
      return await pdfParse(dataBuffer, {
        pagerender: async (pageData: PdfPageData) => {
          const pageNumber = (renderedPages += 1);
          disablePdfjsFontFaceLoading();
          const textContent = await pageData.getTextContent({ normalizeWhitespace: false, disableCombineTextItems: false });
          const lines = buildTextLines(textContent);
          pageLines.set(pageNumber, lines);

          let images: PageImage[] = [];
          const operators = getOperators();
          if (operators) {
            try {
              images = await detectPageImages(pageData, operators);
            } catch {
              images = [];
            }
          }
          pageImages.set(pageNumber, images);
          return lines.map((line) => line.text).join("\n");
        },
      });
    } finally {
      restoreImage();
    }
  })();

  const contentImages = classifyContentImages(pageImages, result.numpages);
  const pageTexts = Array.from({ length: result.numpages }, (_, index) => {
    const pageNumber = index + 1;
    return buildPageText(pageLines.get(pageNumber) ?? [], contentImages.get(pageNumber) ?? [], pageNumber);
  });

  return {
    text: pageTexts.join("\n\n"),
    numpages: result.numpages,
    pageImages,
    visualPages: new Set(contentImages.keys()),
  };
}
