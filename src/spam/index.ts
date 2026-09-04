import { getConfig, searchSpam } from "../data/index.js";
import { generateEmbeddings, analyzeMessageWithLLM } from "../ai/index.js";
import { logMessage } from "../shared/logger.js";

/**
 * Represents the classification outcome of a spam evaluation pipeline check.
 */
export type SpamCheckResult =
  | {
      /**
       * The message is classified as safe.
       */
      type: "safe";
    }
  | {
      /**
       * The message has a high similarity score to an entry in the vector DB.
       */
      type: "vector_match";
    }
  | {
      /**
       * The message is classified as spam by the LLM.
       */
      type: "llm_spam";
      /**
       * The confidence level of the LLM analysis (between 0 and 1).
       */
      confidence: number;
      /**
       * The reasoning behind the LLM's classification.
       */
      reason: string;
      /**
       * The generated embeddings vector of the text.
       */
      textEmbeddings: number[];
    };

/**
 * Evaluates whether a text message is spam using a hybrid model.
 * It first tests vector similarity, then falls back to Gemini LLM analysis.
 *
 * @param text - The message text to analyze.
 * @param contextInfo - Optional contextual information of the message for logging.
 * @returns A promise resolving to the spam check classification result.
 */
export async function evaluateMessage(
  text: string,
  contextInfo?: { messageId?: string | number; senderName?: string },
): Promise<SpamCheckResult> {
  const config = await getConfig();
  const prefix = contextInfo
    ? `${contextInfo.messageId} (${contextInfo.senderName}): `
    : "";

  logMessage(config, "debug", `${prefix}checking against vector search...`);
  const textEmbeddings = await generateEmbeddings(text);

  const isSimilar = await similarToKnownSpamMessages(textEmbeddings, config);
  logMessage(config, "debug", `${prefix}vector search result: ${isSimilar}`);

  if (isSimilar) {
    return { type: "vector_match" };
  }

  logMessage(config, "debug", `${prefix}checking against LLM analysis...`);
  const llmResult = await validateMessageWithLlm(text, textEmbeddings);
  logMessage(
    config,
    "debug",
    `${prefix}LLM analysis result: ${
      llmResult && llmResult.type === "llm_spam"
        ? `spam (confidence: ${llmResult.confidence}, reason: ${llmResult.reason})`
        : "safe"
    }`,
  );

  return llmResult ?? { type: "safe" };
}

async function similarToKnownSpamMessages(
  textEmbeddings: number[],
  config: {
    spamSimilarityThreshold: number;
  },
) {
  const matchedSpam = await searchSpam(
    textEmbeddings,
    config.spamSimilarityThreshold,
  );

  if (matchedSpam) {
    return true;
  }

  return false;
}

async function validateMessageWithLlm(
  text: string,
  textEmbeddings: number[],
): Promise<SpamCheckResult | undefined> {
  const analysis = await analyzeMessageWithLLM(text);

  if (analysis.isSpam) {
    return {
      type: "llm_spam",
      confidence: analysis.confidence,
      reason: analysis.reason,
      textEmbeddings,
    };
  }
}
