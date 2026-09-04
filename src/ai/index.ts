import {
  GoogleGenerativeAIEmbeddings,
  ChatGoogleGenerativeAI,
} from "@langchain/google-genai";
import { z } from "zod";
import type { LLMAnalysisResult } from "../shared/types";

// Define the model name constants
const EMBEDDING_MODEL = "text-embedding-004";
const CHAT_MODEL = "gemini-3.5-flash";

/**
 * Creates an instance of GoogleGenerativeAIEmbeddings using GEMINI_API_KEY.
 */
function getEmbeddingsInstance(): GoogleGenerativeAIEmbeddings {
  const apiKey = process.env["GEMINI_API_KEY"];
  return new GoogleGenerativeAIEmbeddings({
    ...(apiKey !== undefined ? { apiKey } : {}),
    modelName: EMBEDDING_MODEL,
  });
}

/**
 * Creates an instance of ChatGoogleGenerativeAI using GEMINI_API_KEY.
 */
function getChatModelInstance(): ChatGoogleGenerativeAI {
  const apiKey = process.env["GEMINI_API_KEY"];
  return new ChatGoogleGenerativeAI({
    ...(apiKey !== undefined ? { apiKey } : {}),
    model: CHAT_MODEL,
    temperature: 0,
  });
}

/**
 * Generates high-quality vector embeddings for the given text.
 *
 * @param text - The text content to generate embeddings for.
 * @returns A promise resolving to an array of floating point numbers.
 */
export async function generateEmbeddings(text: string): Promise<number[]> {
  const embeddings = getEmbeddingsInstance();
  return embeddings.embedQuery(text);
}

/**
 * Analyzes a message using Gemini LLM to determine if it is spam.
 *
 * @param text - The plain text of the message to analyze.
 * @returns A promise resolving to the LLM structured analysis result.
 */
export async function analyzeMessageWithLLM(
  text: string,
): Promise<LLMAnalysisResult> {
  const model = getChatModelInstance();

  const analysisSchema = z.object({
    isSpam: z
      .boolean()
      .describe("True if classified as spam/scam, false otherwise."),
    confidence: z
      .number()
      .describe("Confidence score of the classification from 0 to 1."),
    reason: z
      .string()
      .describe("A brief justification for the classification."),
  });

  const structuredModel = model.withStructuredOutput(analysisSchema);

  const systemPrompt = `You are a security-oriented Telegram moderation bot.
Your main task is to analyze chat messages and classify them as spam or not.
Common spam types:
1. Fake job offers promising easy money/working from home/high weekly pay.
2. Unwanted ads about cryptocurrency, tokens, stocks, or NFT schemes.
3. Nudity, pornography, or explicit sexual content.
4. Donation requests that look unverified (e.g. military/child medical bills).

IMPORTANT:
- Do NOT flag slurs, simple profanity, or jokes as spam unless they contain scam.
- Internal bot commands starting with '/' or '!' are NEVER spam.
- Pay attention to weird spelling patterns/ASCII art hiding spam/scams.
- Main criteria: can a regular user be scammed/harmed by following the message?`;

  const userPrompt = `Analyze the following Telegram message:
---
${text}
---`;

  const result = await structuredModel.invoke([
    ["system", systemPrompt],
    ["human", userPrompt],
  ]);

  return result;
}
