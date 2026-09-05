import { logger } from "firebase-functions";
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

  const message = args
    .map((arg) => (typeof arg === "object" ? JSON.stringify(arg) : arg))
    .join(" ");

  if (level === "debug") {
    logger.debug(message);
  } else {
    logger.info(message);
  }
}
