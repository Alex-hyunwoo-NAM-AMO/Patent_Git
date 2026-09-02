import { AIAdapter, AIDraft, SYSTEM_PROMPT, buildUserPrompt } from "./AIAdapter";
import { NEEDS_REVIEW } from "../types";

interface OpenAIChatResponse {
  choices?: Array<{ message?: { content?: string } }>;
}

export class OpenAICompatProvider implements AIAdapter {
  readonly kind = "openai-compat";

  constructor(
    private readonly baseUrl: string,
    private readonly apiKey: string,
    private readonly model: string
  ) {}

  async generateSheet(text: string): Promise<AIDraft> {
    const url = `${this.baseUrl.replace(/\/$/, "")}/chat/completions`;
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: this.model,
        temperature: 0.2,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: buildUserPrompt(text) },
        ],
      }),
    });
    if (!res.ok) {
      throw new Error(`AI 호출 실패: ${res.status} ${res.statusText} — ${await res.text()}`);
    }
    const data = (await res.json()) as OpenAIChatResponse;
    const content = data.choices?.[0]?.message?.content ?? "";
    return parseDraft(content);
  }
}

export function parseDraft(content: string): AIDraft {
  let obj: Record<string, unknown>;
  try {
    obj = JSON.parse(stripFences(content));
  } catch {
    return {
      title: "",
      applications: "",
      completeness: "",
      gist: { techField: "", priorArtProblem: "", problemToSolve: "", coreComposition: "", effect: "" },
      flags: [`${NEEDS_REVIEW} AI 응답 파싱 실패 — 수동 작성 필요`],
    };
  }
  const gist = (obj.gist ?? {}) as Record<string, unknown>;
  const str = (v: unknown): string => (typeof v === "string" ? v.trim() : "");
  return {
    title: str(obj.title),
    applications: str(obj.applications),
    completeness: normalizeCompleteness(str(obj.completeness)),
    gist: {
      techField: str(gist.techField),
      priorArtProblem: str(gist.priorArtProblem),
      problemToSolve: str(gist.problemToSolve),
      coreComposition: str(gist.coreComposition),
      effect: str(gist.effect),
    },
    flags: Array.isArray(obj.flags) ? obj.flags.filter((f): f is string => typeof f === "string") : [],
  };
}

function normalizeCompleteness(v: string): AIDraft["completeness"] {
  const allowed = ["착상", "실험 진행", "시제품", "양산"] as const;
  return (allowed.find((a) => v.includes(a)) ?? "") as AIDraft["completeness"];
}

function stripFences(s: string): string {
  return s.replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/i, "").trim();
}
