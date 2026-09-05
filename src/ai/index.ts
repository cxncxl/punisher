import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { GoogleGenAI } from "@google/genai";
import { z } from "zod";
import type { LLMAnalysisResult } from "../shared/types.js";
import { getConfig } from "../data/index.js";
import { logMessage } from "../shared/logger.js";
import { AIError } from "../shared/errors.js";

// Define the model name constants
const EMBEDDING_MODEL = "gemini-embedding-001";
const CHAT_MODEL = "gemini-3.5-flash";

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
  const config = await getConfig();
  logMessage(
    config,
    "debug",
    `Generating embeddings for text of length ${text.length}...`,
  );

  const apiKey = process.env["GEMINI_API_KEY"];
  const ai = new GoogleGenAI({
    ...(apiKey !== undefined ? { apiKey } : {}),
  });

  try {
    const response = await ai.models.embedContent({
      model: EMBEDDING_MODEL,
      contents: text,
      config: {
        outputDimensionality: 768,
      },
    });

    const result = response.embeddings?.[0]?.values;
    if (!result) {
      throw new Error(
        "Failed to generate embeddings: No embedding values returned from SDK.",
      );
    }

    logMessage(
      config,
      "debug",
      `Embeddings generated successfully (dimensions: ${result.length})`,
    );
    return result;
  } catch (e) {
    throw new AIError(`Failed to generate embeddings: ${e}`);
  }
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
  const config = await getConfig();
  logMessage(
    config,
    "debug",
    `Invoking Gemini LLM analysis for text of length ${text.length}...`,
  );
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

  try {
    const result = await structuredModel.invoke([
      ["system", systemPrompt],
      ["human", userPrompt],
    ]);

    logMessage(
      config,
      "debug",
      `Gemini LLM analysis complete: isSpam=${result.isSpam}, confidence=${result.confidence}`,
    );
    return result;
  } catch (e) {
    throw new AIError(`Message analysis with LLM failed: ${e}`);
  }
}
