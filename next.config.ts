import type { NextConfig } from "next";
import path from "node:path";
import { fileURLToPath } from "node:url";

const nextConfig: NextConfig = {
  serverExternalPackages: ["pdf-parse", "pdfjs-dist", "@napi-rs/canvas", "tesseract.js", "@tesseract.js-data/por"],
  outputFileTracingRoot: path.dirname(fileURLToPath(import.meta.url)),
};
export default nextConfig;
