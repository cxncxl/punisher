import type { Config } from "./types.js";

/**
 * The default system configuration settings.
 */
export const DEFAULT_CONFIG: Config = {
  trustMessagesNumber: 5,
  superAdmins: [],
  spamSimilarityThreshold: 0.8,
  llmSpamConfidenceThreshold: 0.75,
} satisfies Config;
