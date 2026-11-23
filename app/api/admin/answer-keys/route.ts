import { mkdir, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import pdfParse from "pdf-parse";
import { AnswerKeyOcrError, AnswerKeyPageLimitError, extractScannedPdfText, MAX_ANSWER_KEY_PAGES } from "@/lib/answer-key-ocr";
import { applyAnswerKey, type AnswerKeySource } from "@/lib/answer-key";
import { prisma } from "@/lib/prisma";
import { parseAnswerKey } from "@/lib/pdf-parser";
import { requireRole } from "@/lib/session";

const maxBytes = 5 * 1024 * 1024;
const sizeError = "Envie um arquivo de gabarito de até 5 MB.";

export async function POST(request: Request) {
  const access = await requireRole("ADMIN");
  if (access.error) return access.error;

  if (Number(request.headers.get("content-length") || 0) > maxBytes) {
    return Response.json({ error: sizeError }, { status: 413 });
  }
  let data: FormData;
  try {
    data = await request.formData();
  } catch {
    return Response.json({ error: "O formulário enviado é inválido." }, { status: 400 });
  }
  const editionId = String(data.get("editionId") || "");
  const file = data.get("file");
  if (!(file instanceof File) || file.size > maxBytes) return Response.json({ error: sizeError }, { status: 400 });
  const edition = await prisma.edition.findUnique({ where: { id: editionId } });
  if (!edition) return Response.json({ error: "Edição não encontrada." }, { status: 404 });

  const bytes = Buffer.from(await file.arrayBuffer());
  const looksLikePdf = bytes.subarray(0, 1024).includes(Buffer.from("%PDF-"));
  const extension = path.extname(file.name).toLowerCase();
  const declaredPdf = extension === ".pdf" || file.type === "application/pdf";
  const declaredText = [".txt", ".csv"].includes(extension) || ["text/plain", "text/csv", "application/csv"].includes(file.type);
  const isPdf = looksLikePdf || declaredPdf;
  if (!isPdf && !declaredText) return Response.json({ error: "Envie o gabarito em PDF, CSV ou TXT." }, { status: 400 });
  if (declaredPdf && !looksLikePdf) return Response.json({ error: "O arquivo enviado não parece ser um PDF válido." }, { status: 400 });

  let raw: string;
  if (isPdf) {
    let parsed;
    try {
      parsed = await pdfParse(bytes);
    } catch {
      return Response.json({ error: "Não foi possível ler o PDF do gabarito." }, { status: 400 });
    }
    if (parsed.numpages > MAX_ANSWER_KEY_PAGES) {
      return Response.json({ error: `O gabarito em PDF aceita até ${MAX_ANSWER_KEY_PAGES} páginas.` }, { status: 400 });
    }
    raw = parsed.text;
  } else {
    raw = bytes.toString("utf8").replace(/^\uFEFF/, "");
  }

  let key = parseAnswerKey(raw);
  let source: AnswerKeySource = isPdf ? "PDF_TEXT" : "TEXT";
  if (!key.size && isPdf) {
    try {
      raw = await extractScannedPdfText(bytes);
      key = parseAnswerKey(raw);
      source = "PDF_OCR";
    } catch (error) {
      if (error instanceof AnswerKeyPageLimitError || error instanceof AnswerKeyOcrError) {
        return Response.json({ error: error.message }, { status: 400 });
      }
      console.error("[answer-keys] falha no OCR", { editionId, fileName: file.name, error });
      return Response.json({ error: "Falha interna no reconhecimento do gabarito. Tente novamente ou envie um CSV/TXT." }, { status: 500 });
    }
  }
  if (!key.size) return Response.json({ error: "Não encontrei respostas. Confira a qualidade do PDF ou envie uma linha por questão: número; alternativa (A–E ou ANULADA)." }, { status: 400 });

  const storage = path.resolve(process.env.PDF_STORAGE_DIR || "./uploads");
  await mkdir(storage, { recursive: true });
  const keyPath = path.join(storage, `${randomUUID()}-${file.name.replace(/[^\w.-]/g, "_")}`);
  await writeFile(keyPath, bytes);
  try {
    const result = await applyAnswerKey(editionId, key, { source });
    await prisma.edition.update({ where: { id: editionId }, data: { answerKeyPath: keyPath } });
    return Response.json({
      ...result,
      ...(source === "PDF_OCR" ? { source, warning: "Confira as respostas reconhecidas antes de publicar as questões." } : {}),
    });
  } catch (error) {
    await unlink(keyPath).catch(() => undefined);
    console.error("[answer-keys] falha ao aplicar gabarito", { editionId, error });
    return Response.json({ error: "Não foi possível aplicar o gabarito." }, { status: 500 });
  }
}
