import type { Config } from "./types.js";

/**
 * Utility to log messages based on the system logLevel configuration.
 *
 * @param config - The active system configuration.
 * @param level - The priority of the message: "standard" or "debug".
 * @param args - Arguments to log, matching console.log's signature.
 */
export function logMessage(
  config: Config,
  level: "standard" | "debug",
  ...args: any[]
): void {
  const currentLevel = config.logLevel ?? "off";

  if (currentLevel === "off") {
    return;
  }

  if (currentLevel === "standard" && level === "debug") {
    return;
  }

  console.log(`[${level.toUpperCase()}]`, ...args);
}
