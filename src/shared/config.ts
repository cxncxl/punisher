import type { Config } from "./types";

/**
 * The default system configuration settings.
 */
export const DEFAULT_CONFIG: Config = {
  trustMessagesNumber: 5,
  superAdmins: [],
  spamSimilarityThreshold: 0.8,
} satisfies Config;
