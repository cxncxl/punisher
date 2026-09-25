import { z } from "zod";
import { getConfig } from "../data/index.js";
import { InternalError } from "../shared/errors.js";
import { logMessage } from "../shared/logger.js";
import type { Config, LLMAnalysisResult } from "../shared/types.js";
import { spamAnalysisSystemPrompt } from "./prompts/index.js";

export async function analyzeMessageWithLLM(
  text: string,
): Promise<LLMAnalysisResult> {
  const config = await getConfig();
  logMessage(config, "debug", {
    message: "querying jev for spam analysis",
  });

  const instanceUrl = process.env.JEV_CLOUD_RUN_URL;
  if (!instanceUrl) {
    throw new InternalError("JEV_CLOUD_RUN_URL env variable is not set");
  }

  const jevResponse = await queryJev(instanceUrl, text, config);

  const result = jevResponseSchema.safeParse(jevResponse);
  if (!result.success) {
    throw new InternalError(
      "JEV returned invalid response: " + result.error.message,
    );
  }

  const { noul: spamProbability } = result.data.answers.isSpam;
  return {
    // TODO: de-hardcode the fallback
    isSpam: spamProbability > (config.llmSpamConfidenceThreshold ?? 0.5),
    confidence: spamProbability,
    reason: "jev",
  };
}

async function queryJev(instanceUrl: string, text: string, config: Config) {
  try {
    const res = await fetch(`${instanceUrl}/v1/systemone`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(buildPayload(text)),
    });

    if (!res.ok) {
      throw new InternalError(
        "JEV returned non-200 status code: " +
          res.status +
          " : " +
          (await res.text()),
      );
    }

    return await res.json();
  } catch (error) {
    logMessage(config, "standard", {
      where: "fetching JEV",
      error,
    });
    throw error;
  }
}

function buildPayload(messageText: string) {
  return {
    state: messageText,
    questions: {
      isSpam: {
        type: "noul",
        instructions: spamAnalysisSystemPrompt,
      },
    },
  };
}

const jevResponseSchema = z.object({
  answers: z.object({
    isSpam: z.object({
      noul: z.number(),
    }),
  }),
});
