import * as path from "path";
import { AppConfig } from "../config";
import { ExtractedDocument } from "../types";
import { runPython } from "../pptx/runPython";

const SUPPORTED = new Set([".pptx", ".pdf"]);

export function isSupported(filename: string): boolean {
  return SUPPORTED.has(path.extname(filename).toLowerCase());
}

export async function parseDocument(cfg: AppConfig, filePath: string): Promise<ExtractedDocument> {
  const raw = await runPython(cfg, "python/parse.py", [filePath]);
  const parsed = JSON.parse(raw) as ExtractedDocument & { error?: string };
  if (parsed.error) {
    throw new Error(parsed.error);
  }
  return {
    slides: parsed.slides ?? [],
    fullText: parsed.fullText ?? "",
    sourcePath: parsed.sourcePath ?? filePath,
    mediaCount: parsed.mediaCount ?? 0,
  };
}
