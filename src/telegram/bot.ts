import { Bot } from "grammy";

// Bot instance will use the TG_BOT_KEY from the environment (loaded from Firebase Secrets)
export const bot = new Bot(process.env["TG_BOT_KEY"] || "PLACEHOLDER_TOKEN");
