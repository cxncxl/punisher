import type { LLMAnalysisResult } from "../shared/types";
import * as gemini from "./gemini";

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

export function getAIService(): AIService {
  return GeminiAIService;
}
