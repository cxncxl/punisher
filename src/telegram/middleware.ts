import type { Bot, Context } from "grammy";
import type { Message as TGMessage } from "grammy/types";
import {
  isChatAdminOrSuperadmin,
  getUser,
  getConfig,
  addSpam,
  createPendingReport,
  incrementUserMessageCount,
  incrementChatProcessedMessages,
  incrementChatDeletedMessages,
  incrementChatBannedSpammers,
  getChatAdmins,
  getChat,
  upsertChat,
  upsertUser,
} from "../data/index.js";
import { evaluateMessage, type SpamCheckResult } from "../spam/index.js";
import { getLocaleMessages, type LocaleMessages } from "./messages.js";
import type { Chat, Config, User } from "../shared/types.js";
import { logMessage } from "../shared/logger.js";

/**
 * Ensures that the chat and user documents exist in Firestore.
 * Auto-registers them with default values if missing.
 */
async function ensureChatAndUser(
  ctx: Context,
  chatId: string,
  senderId: string,
  senderName: string,
): Promise<{ chat: Chat; user: User }> {
  let chat = await getChat(chatId);
  if (!chat) {
    const chatTitle = ctx.chat?.title ?? "Chat";
    await upsertChat(chatId, chatTitle);
    chat = (await getChat(chatId))!;
  }

  let user = await getUser(chatId, senderId);
  if (!user) {
    await upsertUser(chatId, senderId, senderName);
    user = (await getUser(chatId, senderId))!;
  }

  return { chat, user };
}

/**
 * Handles action for high-certainty spam matches from vector DB knowledge base.
 */
async function handleVectorSpamMatch(
  ctx: Context,
  chatId: string,
  senderId: string,
  senderName: string,
  text: string,
  messageId: number,
  date: number,
  chatTitle: string,
  msgs: LocaleMessages,
): Promise<void> {
  try {
    await ctx.api.deleteMessage(ctx.chat?.id ?? 0, messageId);
  } catch (err) {
    console.error("Failed to delete message:", err);
  }

  try {
    await ctx.banChatMember(Number(senderId));
  } catch (err) {
    console.error("Failed to ban chat member:", err);
  }

  await incrementChatDeletedMessages(chatId);
  await incrementChatBannedSpammers(chatId);

  const dateStr = new Date(date * 1000).toLocaleString();
  const adminMsg = msgs.punishedAndBanned(
    chatTitle,
    senderName,
    senderId,
    dateStr,
    text,
  );

  const admins = await getChatAdmins(chatId);
  const config = await getConfig();
  logMessage(
    config,
    "standard",
    `[Admin Notification] Found ${admins.length} registered admins in database for chat ${chatId}`,
  );
  if (admins.length === 0) {
    logMessage(
      config,
      "standard",
      `[Admin Notification] Hint: Admin users must send at least one message in the chat to be registered in the database, and they must start a DM with the bot to receive direct notifications.`,
    );
  }

  for (const admin of admins) {
    try {
      logMessage(
        config,
        "standard",
        `[Admin Notification] Attempting to send DM notification to admin ${admin.id} (${admin.name})`,
      );
      await ctx.api.sendMessage(Number(admin.id), adminMsg, {
        parse_mode: "MarkdownV2",
      });
      logMessage(
        config,
        "standard",
        `[Admin Notification] DM notification sent successfully to admin ${admin.id} (${admin.name})`,
      );
    } catch (err: any) {
      logMessage(
        config,
        "standard",
        `[Admin Notification] Failed to send DM notification to admin ${admin.id} (${admin.name}): ${err?.message || err}`,
      );
    }
  }

  await ctx.reply(msgs.punishedGroup(senderName, senderId), {
    parse_mode: "MarkdownV2",
  });
}

/**
 * Handles action for high-confidence spam classified by Gemini LLM.
 */
async function handleHighConfidenceLLMSpam(
  ctx: Context,
  chatId: string,
  senderId: string,
  senderName: string,
  text: string,
  messageId: number,
  date: number,
  chatTitle: string,
  msgs: LocaleMessages,
  confidence: number,
  textEmbeddings: number[],
): Promise<void> {
  try {
    await ctx.api.deleteMessage(ctx.chat?.id ?? 0, messageId);
  } catch (err) {
    console.error("Failed to delete message:", err);
  }

  await addSpam(text, textEmbeddings);
  await incrementChatDeletedMessages(chatId);
  await incrementChatProcessedMessages(chatId);

  const isBan = confidence === 1.0;
  if (isBan) {
    try {
      await ctx.banChatMember(Number(senderId));
    } catch (err) {
      console.error("Failed to ban member:", err);
    }
    await incrementChatBannedSpammers(chatId);
  }

  const dateStr = new Date(date * 1000).toLocaleString();
  const adminMsg = isBan
    ? msgs.punishedAndBanned(chatTitle, senderName, senderId, dateStr, text)
    : msgs.punished(chatTitle, senderName, senderId, dateStr, text);

  const reportId = await createPendingReport({
    chatId,
    messageId: String(messageId),
    senderId,
    senderName,
    text,
    status: isBan ? "punished" : "ignored",
  });

  const admins = await getChatAdmins(chatId);
  const config = await getConfig();
  logMessage(
    config,
    "standard",
    `[Admin Notification] Found ${admins.length} registered admins in database for chat ${chatId}`,
  );
  if (admins.length === 0) {
    logMessage(
      config,
      "standard",
      `[Admin Notification] Hint: Admin users must send at least one message in the chat to be registered in the database, and they must start a DM with the bot to receive direct notifications.`,
    );
  }

  const inlineKeyboard = [
    [
      ...(isBan
        ? []
        : [
            {
              text: msgs.ban(),
              callback_data: `punish;${reportId}`,
            },
          ]),
      {
        text: msgs.falsePositive(),
        callback_data: `ignore;${reportId}`,
      },
    ],
  ];

  for (const admin of admins) {
    try {
      logMessage(
        config,
        "standard",
        `[Admin Notification] Attempting to send DM notification to admin ${admin.id} (${admin.name})`,
      );
      await ctx.api.sendMessage(Number(admin.id), adminMsg, {
        reply_markup: { inline_keyboard: inlineKeyboard },
        parse_mode: "MarkdownV2",
      });
      logMessage(
        config,
        "standard",
        `[Admin Notification] DM notification sent successfully to admin ${admin.id} (${admin.name})`,
      );
    } catch (err: any) {
      logMessage(
        config,
        "standard",
        `[Admin Notification] Failed to send DM notification to admin ${admin.id} (${admin.name}): ${err?.message || err}`,
      );
    }
  }

  await ctx.reply(msgs.punishedGroup(senderName, senderId), {
    parse_mode: "MarkdownV2",
  });
}

/**
 * Handles action for low-confidence spam classified by Gemini LLM.
 */
async function handleLowConfidenceLLMSpam(
  ctx: Context,
  chatId: string,
  senderId: string,
  senderName: string,
  text: string,
  messageId: number,
  date: number,
  chatTitle: string,
  msgs: LocaleMessages,
): Promise<void> {
  const reportId = await createPendingReport({
    chatId,
    messageId: String(messageId),
    senderId,
    senderName,
    text,
    status: "pending",
  });

  await incrementChatProcessedMessages(chatId);

  const dateStr = new Date(date * 1000).toLocaleString();
  const reportMsg = msgs.possibleSpam(
    chatTitle,
    senderName,
    senderId,
    dateStr,
    text,
  );

  const inlineKeyboard = [
    [
      {
        text: msgs.punish(),
        callback_data: `punish;${reportId}`,
      },
      {
        text: msgs.falsePositive(),
        callback_data: `ignore;${reportId}`,
      },
    ],
  ];

  const admins = await getChatAdmins(chatId);
  const config = await getConfig();
  logMessage(
    config,
    "standard",
    `[Admin Notification] Found ${admins.length} registered admins in database for chat ${chatId}`,
  );
  if (admins.length === 0) {
    logMessage(
      config,
      "standard",
      `[Admin Notification] Hint: Admin users must send at least one message in the chat to be registered in the database, and they must start a DM with the bot to receive direct notifications.`,
    );
  }

  for (const admin of admins) {
    try {
      logMessage(
        config,
        "standard",
        `[Admin Notification] Attempting to send DM notification to admin ${admin.id} (${admin.name})`,
      );
      await ctx.api.sendMessage(Number(admin.id), reportMsg, {
        reply_markup: { inline_keyboard: inlineKeyboard },
        parse_mode: "MarkdownV2",
      });
      logMessage(
        config,
        "standard",
        `[Admin Notification] DM notification sent successfully to admin ${admin.id} (${admin.name})`,
      );
    } catch (err: any) {
      logMessage(
        config,
        "standard",
        `[Admin Notification] Failed to send DM notification to admin ${admin.id} (${admin.name}): ${err?.message || err}`,
      );
    }
  }
}

/**
 * Main middleware function for incoming messages in a Telegram chat.
 * Implements the hybrid spam-detection pipeline (Vector Search + LLM).
 *
 * @param ctx - Telegram context.
 */
async function handleIncomingMessage(ctx: Context): Promise<void> {
  const message = ctx.message;
  if (!message || !message.from) {
    return;
  }

  const text = message.text ?? message.caption ?? "";
  if (!text || text.startsWith("/") || text.startsWith("!")) {
    return;
  }

  const chatId = String(ctx.chat?.id ?? "");
  const senderId = String(message.from.id);
  const senderName = getSenderName(message);

  // Run the heavy database and AI classification pipeline in the background.
  // This acknowledges the webhook request with '200 OK' immediately to prevent Telegram retries.
  void (async () => {
    try {
      const config = await getConfig();
      const prefix = `${message.message_id} (${senderName}): `;
      logMessage(
        config,
        "standard",
        `${prefix}Received message in chat ${chatId}: "${text.substring(0, 60)}"`,
      );

      const { chat, user } = await ensureChatAndUser(
        ctx,
        chatId,
        senderId,
        senderName,
      );

      const msgs = getLocaleMessages(
        chat.locale ?? ("ua" satisfies Chat["locale"]),
      );

      if (
        await shouldBypassSpamDetection(chatId, senderId, user, config, prefix)
      ) {
        return;
      }

      const result = await evaluateMessage(text, {
        messageId: message.message_id,
        senderName,
      });
      await handleMessageAnalysis(result, chat, message, user, ctx, msgs);
    } catch (err) {
      console.error("Spam evaluation failed:", err);
      try {
        await incrementUserMessageCount(chatId, senderId);
        await incrementChatProcessedMessages(chatId);
      } catch (innerErr) {
        console.error("Failed to update message counts after error:", innerErr);
      }
    }
  })();
}

/**
 * Registers incoming message pipeline middleware to the bot.
 *
 * @param bot - GrammY bot instance.
 */
export function registerMiddleware(bot: Bot<any>): void {
  bot.on("message:text", handleIncomingMessage);
}

function getSenderName(message: TGMessage): string {
  const firstName = message.from?.first_name;
  const lastName =
    message.from?.last_name !== undefined ? ` ${message.from.last_name}` : "";
  return `${firstName}${lastName}`;
}

async function shouldBypassSpamDetection(
  chatId: string,
  senderId: string,
  user: User,
  config: Config,
  prefix: string,
) {
  const isSenderAdmin = await isChatAdminOrSuperadmin(chatId, senderId);
  if (isSenderAdmin) {
    logMessage(
      config,
      "standard",
      `${prefix}Bypassed spam detection (user is admin/superadmin)`,
    );
    return true;
  }

  if (user.messagesCount >= config.trustMessagesNumber) {
    logMessage(
      config,
      "standard",
      `${prefix}Bypassed spam detection (user is trusted, message count ${user.messagesCount} >= ${config.trustMessagesNumber})`,
    );
    await incrementUserMessageCount(chatId, senderId);
    await incrementChatProcessedMessages(chatId);
    return true;
  }

  return false;
}

async function handleMessageAnalysis(
  analysisResult: SpamCheckResult,
  chat: Chat,
  message: TGMessage,
  sender: User,
  ctx: Context,
  templates: LocaleMessages,
) {
  const config = await getConfig();
  const prefix = `${message.message_id} (${sender.name}): `;

  if (analysisResult.type === "safe") {
    logMessage(config, "standard", `${prefix}Message classified as safe`);
    return await handleSafeMessage(chat, sender);
  }

  if (analysisResult.type === "vector_match") {
    logMessage(
      config,
      "standard",
      `${prefix}Message matches known spam in vector DB! Punishing...`,
    );
    return handleVectorSpamMatch(
      ctx,
      chat.id,
      sender.id,
      sender.name,
      message.text ?? "",
      message.message_id,
      message.date,
      chat.title,
      templates,
    );
  }

  if (analysisResult.type === "llm_spam") {
    const threshold = config.llmSpamConfidenceThreshold ?? 0.75;

    if (analysisResult.confidence >= threshold) {
      logMessage(
        config,
        "standard",
        `${prefix}High-confidence LLM spam detected (confidence: ${analysisResult.confidence} >= threshold ${threshold})! Punishing...`,
      );
      await handleHighConfidenceLLMSpam(
        ctx,
        chat.id,
        sender.id,
        sender.name,
        message.text ?? "",
        message.message_id,
        message.date,
        chat.title,
        templates,
        analysisResult.confidence,
        analysisResult.textEmbeddings,
      );
    } else {
      logMessage(
        config,
        "standard",
        `${prefix}Low-confidence LLM spam detected (confidence: ${analysisResult.confidence} < threshold ${threshold})! Creating pending report...`,
      );
      await handleLowConfidenceLLMSpam(
        ctx,
        chat.id,
        sender.id,
        sender.name,
        message.text ?? "",
        message.message_id,
        message.date,
        chat.title,
        templates,
      );
    }
  }
}

async function handleSafeMessage(chat: Chat, sender: User) {
  await incrementUserMessageCount(chat.id, sender.id);
  await incrementChatProcessedMessages(chat.id);
  return;
}
