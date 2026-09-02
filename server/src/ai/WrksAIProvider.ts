import { AIAdapter, AIDraft, SYSTEM_PROMPT, buildUserPrompt } from "./AIAdapter";
import { parseDraft } from "./OpenAICompatProvider";

interface WrksChatResponse {
  choices?: Array<{ message?: { content?: string } }>;
  data?: { content?: string; text?: string };
}

export class WrksAIProvider implements AIAdapter {
  readonly kind = "wrks";

  constructor(
    private readonly baseUrl: string,
    private readonly apiKey: string,
    private readonly model: string
  ) {}

  async generateSheet(text: string): Promise<AIDraft> {
    if (this.baseUrl === "") {
      throw new Error(
        "Wrks AI 생성 엔드포인트 미설정 — support@wrks.ai에서 AI 생성 API base URL/형식을 확보한 뒤 AI_BASE_URL을 설정하세요."
      );
    }
    const res = await fetch(`${this.baseUrl.replace(/\/$/, "")}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "API-KEY": this.apiKey,
      },
      body: JSON.stringify({
        model: this.model,
        temperature: 0.2,
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: buildUserPrompt(text) },
        ],
      }),
    });
    if (!res.ok) {
      throw new Error(`Wrks AI 호출 실패: ${res.status} ${res.statusText}`);
    }
    const data = (await res.json()) as WrksChatResponse;
    const content =
      data.choices?.[0]?.message?.content ?? data.data?.content ?? data.data?.text ?? "";
    return parseDraft(content);
  }
}
