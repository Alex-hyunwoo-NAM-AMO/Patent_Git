export interface Inventor {
  role: "primary" | "co";
  name: string;
  employeeId: string;
  department: string;
  position: string;
  email: string;
  contributionPct: number;
}

export type CompletenessLevel = "착상" | "실험 진행" | "시제품" | "양산" | "";

export type DisclosureStatus = "미공개" | "공개" | "공개 예정" | "";

export interface BasicInfo {
  title: string;
  corporation: string;
  completionDate: string;
  reportType: string;
  completeness: CompletenessLevel;
  applications: string;
  filingWish: string;
}

export interface LegalRequired {
  nationalRnd: string;
  externalCoDev: string;
  disclosure: DisclosureStatus;
}

export interface Gist {
  techField: string;
  priorArtProblem: string;
  problemToSolve: string;
  coreComposition: string;
  effect: string;
}

export interface InventionSheet {
  basic: BasicInfo;
  inventors: Inventor[];
  legal: LegalRequired;
  gist: Gist;
  flags: string[];
}

export interface ExtractedSlide {
  index: number;
  text: string;
}

export interface ExtractedDocument {
  slides: ExtractedSlide[];
  fullText: string;
  sourcePath: string;
  mediaCount: number;
}

export const NEEDS_REVIEW = "[발명자 확인 필요]";
