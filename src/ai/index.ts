import type { LLMAnalysisResult } from "../shared/types.js";
import * as gemini from "./gemini.js";
import * as jev from "./jev.js";

export interface AIService {
  /** generates embeddings for the given text */
  generateEmbeddings(text: string): Promise<number[]>;

  /** decides whether the given message is a spam */
  analyzeMessageWithLLM(text: string): Promise<LLMAnalysisResult>;
}

const GeminiAIService: AIService = {
  generateEmbeddings: gemini.generateEmbeddings,
  analyzeMessageWithLLM: gemini.analyzeMessageWithLLM,
};

const JevAIService: AIService = {
  generateEmbeddings: gemini.generateEmbeddings,
  analyzeMessageWithLLM: jev.analyzeMessageWithLLM,
};

export function getAIService(): AIService {
  const provider = process.env.AI_SERVICE?.toLowerCase();

  if (provider === "jev") {
    return JevAIService;
  }

  return GeminiAIService;
}
