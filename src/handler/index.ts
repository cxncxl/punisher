import "./init.js";
import { onRequest, type HttpsFunction } from "firebase-functions/v2/https";
import { webhookCallback } from "grammy";
import express from "express";
import { bot } from "../telegram/bot.js";
import { AppError } from "../shared/errors.js";
import { getConfig } from "../data/index.js";

const app = express();
app.use(express.json());

// Pass requests to grammY bot webhook adapter
app.use(webhookCallback(bot, "express"));

// Express error-handling middleware
app.use(
  (
    err: unknown,
    _req: express.Request,
    res: express.Response,
    _next: express.NextFunction,
  ) => {
    console.error("Unhandled error in webhook handler:", err);

    if (err instanceof AppError) {
      void (async () => {
        try {
          const config = await getConfig();
          const errStack = err.stack !== undefined ? err.stack : err.message;
          const escapedStack = errStack.replace(
            /[_*[\]()~`>#+-=|{}.!]/g,
            "\\$&",
          );
          const message = `⚠️ *Punisher 4.0 Application Error*:\n\`\`\`\n${escapedStack}\n\`\`\``;

          for (const adminId of config.superAdmins) {
            try {
              await bot.api.sendMessage(Number(adminId), message, {
                parse_mode: "MarkdownV2",
              });
            } catch {
              // Ignore
            }
          }
        } catch (getConfigErr) {
          console.error(
            "Failed to retrieve config for error reporting:",
            getConfigErr,
          );
        }
      })();
    }

    // Always respond with 200 OK to Telegram to avoid infinite retries
    res.status(200).json({ ok: true });
  },
);

export const punisher: HttpsFunction = onRequest(
  { secrets: ["TG_BOT_KEY", "GEMINI_API_KEY"] },
  app,
);
