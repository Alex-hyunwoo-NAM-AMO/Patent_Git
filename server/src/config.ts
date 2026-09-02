import * as dotenv from "dotenv";
import * as path from "path";

dotenv.config();

function required(name: string, value: string | undefined): string {
  if (!value || value.trim() === "") {
    throw new Error(`필수 환경변수 누락: ${name}`);
  }
  return value.trim();
}

function optional(value: string | undefined, fallback: string): string {
  return value && value.trim() !== "" ? value.trim() : fallback;
}

const serverRoot = path.resolve(__dirname, "..");

export type AiProvider = "mock" | "openai-compat" | "wrks";
export type AuthProvider = "email-directory" | "wrks-sso";

export interface AppConfig {
  wrks: { apiKey: string; gateway: string };
  ai: { provider: AiProvider; baseUrl: string; apiKey: string; model: string };
  auth: { provider: AuthProvider; sessionSecret: string; wrksSsoSecret: string };
  server: { port: number; basePath: string; maxUploadBytes: number };
  paths: { template: string; outputDir: string; pythonBin: string; serverRoot: string };
}

function resolveFromServer(p: string): string {
  return path.isAbsolute(p) ? p : path.resolve(serverRoot, p);
}

export function loadConfig(): AppConfig {
  const provider = optional(process.env.AI_PROVIDER, "mock") as AiProvider;
  const authProvider = optional(process.env.AUTH_PROVIDER, "email-directory") as AuthProvider;

  const cfg: AppConfig = {
    wrks: {
      apiKey: optional(process.env.WRKS_API_KEY, ""),
      gateway: optional(process.env.WRKS_GATEWAY, "https://gateway-api.wrks.ai"),
    },
    ai: {
      provider,
      baseUrl: optional(process.env.AI_BASE_URL, ""),
      apiKey: optional(process.env.AI_API_KEY, ""),
      model: optional(process.env.AI_MODEL, "gpt-4.1"),
    },
    auth: {
      provider: authProvider,
      sessionSecret: optional(process.env.SESSION_SECRET, "dev-insecure-secret"),
      wrksSsoSecret: optional(process.env.WRKS_SSO_SECRET, ""),
    },
    server: {
      port: parseInt(optional(process.env.PORT, "8080"), 10),
      basePath: normalizeBasePath(optional(process.env.BASE_PATH, "")),
      maxUploadBytes: parseInt(optional(process.env.MAX_UPLOAD_BYTES, "26214400"), 10),
    },
    paths: {
      template: resolveFromServer(optional(process.env.TEMPLATE_PATH, "../template/standard_form.pptx")),
      outputDir: resolveFromServer(optional(process.env.OUTPUT_DIR, "../output")),
      pythonBin: resolveFromServer(optional(process.env.PYTHON_BIN, "./python/venv/bin/python")),
      serverRoot,
    },
  };

  if (provider !== "mock" && cfg.ai.baseUrl === "") {
    console.warn(`[config] AI_PROVIDER=${provider} 인데 AI_BASE_URL 미설정 — AI 호출 시 실패합니다.`);
  }
  return cfg;
}

function normalizeBasePath(bp: string): string {
  if (!bp || bp === "/") return "";
  let s = bp.startsWith("/") ? bp : `/${bp}`;
  if (s.endsWith("/")) s = s.slice(0, -1);
  return s;
}

export { required };
