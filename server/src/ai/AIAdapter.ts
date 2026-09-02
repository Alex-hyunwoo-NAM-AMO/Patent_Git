import { InventionSheet } from "../types";

export interface AIAdapter {
  readonly kind: string;
  generateSheet(extractedText: string): Promise<AIDraft>;
}

export interface AIDraft {
  title: string;
  applications: string;
  completeness: InventionSheet["basic"]["completeness"];
  gist: InventionSheet["gist"];
  flags: string[];
}

export const SYSTEM_PROMPT = [
  "당신은 대한민국 특허 실무에 밝은 직무발명 신고서 작성 보조자입니다.",
  "발명자가 업로드한 자유형식 문서에서 아래 항목을 한국어로 추출·정리합니다.",
  "규칙:",
  "1. 일반적인 기술용어를 사용하고, 사내 약어는 최초 1회 전체 명칭을 병기합니다.",
  "2. 같은 구성요소는 문서 전체에서 동일한 용어로 지칭합니다.",
  "3. 문서에서 확인되지 않은 수치·효과·성능은 절대 만들어내지 않습니다(환각 금지).",
  "4. 정보가 부족한 항목은 값을 비우고 flags 배열에 '[발명자 확인 필요] <항목명>'을 추가합니다.",
  "다음 JSON 스키마로만 응답합니다:",
  JSON.stringify(
    {
      title: "발명의 명칭(국문)",
      applications: "관련 제품·적용처",
      completeness: "착상 | 실험 진행 | 시제품 | 양산 중 하나 또는 빈 문자열",
      gist: {
        techField: "1. 기술분야/적용 대상",
        priorArtProblem: "2. 종래기술과 문제점(가능하면 선행자료 출처)",
        problemToSolve: "3. 해결하려는 과제",
        coreComposition: "4. 핵심 구성과 작동원리",
        effect: "5. 종래기술 대비 효과(확인된 정량 데이터만)",
      },
      flags: ["[발명자 확인 필요] ..."],
    },
    null,
    0
  ),
].join("\n");

export function buildUserPrompt(extractedText: string): string {
  return `다음은 발명자가 업로드한 문서에서 추출한 텍스트입니다.\n\n---\n${extractedText}\n---\n\n위 스키마의 JSON만 출력하세요.`;
}
