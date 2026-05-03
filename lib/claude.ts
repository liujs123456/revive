import Anthropic from "@anthropic-ai/sdk";
import { getConfig } from "./config";

export function getClaude(): Anthropic {
  const apiKey = getConfig().anthropicApiKey;
  if (!apiKey) {
    throw new Error(
      "Anthropic API key is not configured. Visit /setup to add it."
    );
  }
  return new Anthropic({ apiKey });
}

export const MODELS = {
  fast: "claude-haiku-4-5-20251001",
  smart: "claude-sonnet-4-6",
} as const;
