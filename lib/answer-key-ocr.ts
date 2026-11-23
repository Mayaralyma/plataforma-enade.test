import { createRequire } from "node:module";
import { createCanvas, DOMMatrix, ImageData, Path2D } from "@napi-rs/canvas";
import { createWorker, PSM } from "tesseract.js";

export const MAX_ANSWER_KEY_PAGES = 10;

export class AnswerKeyPageLimitError extends Error {}
export class AnswerKeyOcrError extends Error {}

const require = createRequire(import.meta.url);
const language = require("@tesseract.js-data/por") as { code: string; langPath: string; gzip: boolean };
const renderScale = 3;
const maxRenderSide = 8000;
const maxRenderPixels = 20_000_000;
const ocrParameters = {
  tessedit_pageseg_mode: PSM.AUTO,
  tessedit_char_whitelist: "0123456789ABCDNUL",
} as const;

let workerPromise: ReturnType<typeof createWorker> | undefined;

async function getOcrWorker() {
  workerPromise ??= createWorker(language.code, 1, {
    langPath: language.langPath,
    gzip: language.gzip,
    cacheMethod: "none",
  });
  try {
    return await workerPromise;
  } catch (error) {
    workerPromise = undefined;
    throw error;
  }
}

export async function terminateOcrWorker() {
  const pending = workerPromise;
  workerPromise = undefined;
  if (!pending) return;
  const worker = await pending.catch(() => undefined);
  await worker?.terminate().catch(() => undefined);
}

function scaleForPage(width: number, height: number) {
  if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) {
    throw new AnswerKeyOcrError("Não foi possível ler as dimensões do gabarito escaneado.");
  }
  const scale = Math.min(
    renderScale,
    maxRenderSide / width,
    maxRenderSide / height,
    Math.sqrt(maxRenderPixels / (width * height)),
  );
  if (scale <= 0) throw new AnswerKeyOcrError("A página do gabarito é grande demais para reconhecimento.");
  return scale;
}

export async function extractScannedPdfText(bytes: Buffer) {
  const canvasGlobals = globalThis as unknown as Record<"DOMMatrix" | "ImageData" | "Path2D", unknown>;
  canvasGlobals.DOMMatrix ??= DOMMatrix;
  canvasGlobals.ImageData ??= ImageData;
  canvasGlobals.Path2D ??= Path2D;

  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
  const loadingTask = pdfjs.getDocument({ data: new Uint8Array(bytes), useSystemFonts: true });
  try {
    const document = await loadingTask.promise;
    if (document.numPages > MAX_ANSWER_KEY_PAGES) {
      throw new AnswerKeyPageLimitError(`O gabarito em PDF aceita até ${MAX_ANSWER_KEY_PAGES} páginas.`);
    }

    const worker = await getOcrWorker();
    const pages: string[] = [];
    for (let pageNumber = 1; pageNumber <= document.numPages; pageNumber++) {
      const page = await document.getPage(pageNumber);
      const base = page.getViewport({ scale: 1 });
      const viewport = page.getViewport({ scale: scaleForPage(base.width, base.height) });
      const canvas = createCanvas(Math.ceil(viewport.width), Math.ceil(viewport.height));
      const context = canvas.getContext("2d");
      if (!context) throw new AnswerKeyOcrError("Não foi possível preparar a imagem do gabarito escaneado.");
      try {
        await page.render({ canvasContext: context as unknown as CanvasRenderingContext2D, viewport }).promise;
        await worker.setParameters(ocrParameters);
        const { data } = await worker.recognize(canvas.toBuffer("image/png"));
        pages.push(data.text);
      } finally {
        page.cleanup();
      }
    }
    return pages.join("\n");
  } catch (error) {
    if (error instanceof AnswerKeyPageLimitError || error instanceof AnswerKeyOcrError) throw error;
    await terminateOcrWorker();
    throw new AnswerKeyOcrError("Não foi possível reconhecer o gabarito escaneado.", { cause: error });
  } finally {
    await loadingTask.destroy();
  }
}
