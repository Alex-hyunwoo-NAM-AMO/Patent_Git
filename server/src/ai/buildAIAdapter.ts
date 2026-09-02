import { AppConfig } from "../config";
import { AIAdapter } from "./AIAdapter";
import { MockAIProvider } from "./MockAIProvider";
import { OpenAICompatProvider } from "./OpenAICompatProvider";
import { WrksAIProvider } from "./WrksAIProvider";

export function buildAIAdapter(cfg: AppConfig): AIAdapter {
  switch (cfg.ai.provider) {
    case "openai-compat":
      return new OpenAICompatProvider(cfg.ai.baseUrl, cfg.ai.apiKey, cfg.ai.model);
    case "wrks":
      return new WrksAIProvider(cfg.ai.baseUrl, cfg.ai.apiKey, cfg.ai.model);
    case "mock":
    default:
      return new MockAIProvider();
  }
}
