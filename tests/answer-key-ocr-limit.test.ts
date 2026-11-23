import { expect, it, vi } from "vitest";

const { destroy } = vi.hoisted(() => ({ destroy: vi.fn().mockResolvedValue(undefined) }));

vi.mock("pdfjs-dist/legacy/build/pdf.mjs", () => ({
  getDocument: () => ({
    promise: Promise.resolve({ numPages: 11 }),
    destroy,
  }),
}));

import { AnswerKeyPageLimitError, extractScannedPdfText } from "../lib/answer-key-ocr";

it("rejeita gabaritos em PDF com mais de 10 páginas antes de tentar OCR", async () => {
  await expect(extractScannedPdfText(Buffer.from("%PDF-1.4"))).rejects.toBeInstanceOf(AnswerKeyPageLimitError);
  expect(destroy).toHaveBeenCalled();
});
