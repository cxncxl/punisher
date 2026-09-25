import type { LLMAnalysisResult } from "../shared/types";
import * as gemini from "./gemini";
import * as jev from "./jev";

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
