import { onRequest, type HttpsFunction } from "firebase-functions/v2/https";
import { webhookCallback } from "grammy";
import { bot } from "../telegram/bot";

export const punisher: HttpsFunction = onRequest(
  { secrets: ["TG_BOT_KEY", "GEMINI_API_KEY"] },
  (req, res) => {
    return webhookCallback(bot, "express")(req, res);
  },
);
