import "./init.js";
import { onRequest, type HttpsFunction } from "firebase-functions/v2/https";
import { webhookCallback } from "grammy";
import express from "express";
import { bot } from "../telegram/bot.js";

const app = express();
app.use(express.json());

// Pass requests to grammY bot webhook adapter
app.use(webhookCallback(bot, "express"));

// Express error-handling middleware (empty handler for now)
app.use(
  (
    _err: unknown,
    _req: express.Request,
    _res: express.Response,
    _next: express.NextFunction,
  ) => {
    // Empty for now
  },
);

export const punisher: HttpsFunction = onRequest(
  { secrets: ["TG_BOT_KEY", "GEMINI_API_KEY"] },
  app,
);
