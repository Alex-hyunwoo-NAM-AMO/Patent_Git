import { AIAdapter, AIDraft } from "./AIAdapter";
import { NEEDS_REVIEW } from "../types";

function findSection(text: string, patterns: RegExp[]): string {
  const lines = text.split("\n");
  for (let i = 0; i < lines.length; i++) {
    for (const p of patterns) {
      if (p.test(lines[i])) {
        const collected: string[] = [];
        const header = lines[i].replace(p, "").replace(/^[\s:·\-.0-9]+/, "").trim();
        if (header) collected.push(header);
        for (let j = i + 1; j < lines.length && collected.join(" ").length < 400; j++) {
          const next = lines[j].trim();
          if (next === "" || /^\d+\.\s/.test(next) || /^[0-9]+\s*$/.test(next)) break;
          collected.push(next);
        }
        const joined = collected.join(" ").replace(/\s+/g, " ").trim();
        if (joined) return joined;
      }
    }
  }
  return "";
}

export class MockAIProvider implements AIAdapter {
  readonly kind = "mock";

  async generateSheet(text: string): Promise<AIDraft> {
    const flags: string[] = [];

    const title = findSection(text, [/발명의?\s*명칭/, /^1\.\s*발명의?\s*명칭/]);
    const techField = findSection(text, [/기술\s*분야/, /적용\s*대상/, /^2\.\s*기술/]);
    const priorArtProblem = findSection(text, [/기술적?\s*과제/, /종래\s*기술/, /문제점/]);
    const problemToSolve = findSection(text, [/해결하?려는?\s*과제/, /과제/]);
    const coreComposition = findSection(text, [/발명의?\s*구성/, /^3\.\s*발명/, /핵심\s*구성/]);
    const effect = findSection(text, [/기대\s*효과/, /^5\.\s*기대/, /효과/]);
    const applications = findSection(text, [/적용\s*처/, /관련\s*제품/, /응용/]);

    const require = (v: string, label: string): string => {
      if (v === "") flags.push(`${NEEDS_REVIEW} ${label}`);
      return v;
    };

    return {
      title: require(title, "발명의 명칭"),
      applications,
      completeness: "",
      gist: {
        techField: require(techField, "기술분야/적용 대상"),
        priorArtProblem: require(priorArtProblem, "종래기술과 문제점"),
        problemToSolve: require(problemToSolve, "해결하려는 과제"),
        coreComposition: require(coreComposition, "핵심 구성과 작동원리"),
        effect: require(effect, "종래기술 대비 효과"),
      },
      flags,
    };
  }
}
