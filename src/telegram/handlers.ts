import type { Bot, Context } from "grammy";
import {
  upsertChat,
  upsertUser,
  getPendingReport,
  getChat,
  addSpam,
  updatePendingReportStatus,
  incrementChatDeletedMessages,
  incrementChatBannedSpammers,
  incrementUserSpamReportedCount,
} from "../data/index.js";
import { generateEmbeddings } from "../ai/index.js";
import { getLocaleMessages } from "./messages.js";

/**
 * Handle when the bot status in a chat is updated (added/removed/promoted).
 *
 * @param ctx - ChatMemberUpdated Context.
 */
async function handleMyChatMember(ctx: Context): Promise<void> {
  const newMember = ctx.myChatMember?.new_chat_member;
  const botId = ctx.me?.id;

  if (!newMember || botId === undefined) {
    return;
  }

  // Check if the bot itself was added as a member or administrator
  if (
    newMember.user.id === botId &&
    (newMember.status === "member" || newMember.status === "administrator")
  ) {
    const chatId = String(ctx.chat?.id ?? "");
    const chatTitle = ctx.chat?.title ?? "Chat";

    await upsertChat(chatId, chatTitle);

    // Register the person who added the bot as an admin of this chat
    const fromUser = ctx.from;
    if (fromUser !== undefined) {
      const firstName = fromUser.first_name;
      const lastName =
        fromUser.last_name !== undefined ? ` ${fromUser.last_name}` : "";
      const name = `${firstName}${lastName}`;

      await upsertUser(chatId, String(fromUser.id), name, "admin");
    }
  }
}

/**
 * Handle inline button callback queries (e.g. Punish or Not spam/Ignore).
 *
 * @param ctx - CallbackQuery Context.
 */
async function handleCallbackQuery(ctx: Context): Promise<void> {
  const data = ctx.callbackQuery?.data;
  if (!data) {
    return;
  }

  const parts = data.split(";");
  const action = parts[0];
  const reportId = parts[1];

  if (!action || !reportId) {
    return;
  }

  const report = await getPendingReport(reportId);
  if (!report || report.status !== "pending") {
    await ctx.answerCallbackQuery({
      text: "Report already processed or not found.",
    });
    return;
  }

  const chat = await getChat(report.chatId);
  const msgs = getLocaleMessages(chat?.locale ?? "ua");

  if (action === "punish") {
    // Delete the spam message
    try {
      await ctx.api.deleteMessage(
        Number(report.chatId),
        Number(report.messageId),
      );
    } catch (err) {
      console.error("Failed to delete reported message:", err);
    }

    // Ban the spammer
    try {
      await ctx.api.banChatMember(
        Number(report.chatId),
        Number(report.senderId),
      );
    } catch (err) {
      console.error("Failed to ban reported user:", err);
    }

    // Generate embeddings and store text in spam KB
    const embeddings = await generateEmbeddings(report.text);
    await addSpam(report.text, embeddings);

    // Update state and statistics
    await updatePendingReportStatus(reportId, "punished");
    await incrementChatDeletedMessages(report.chatId);
    await incrementChatBannedSpammers(report.chatId);

    // Increment reporter count if exists
    if (report.reporterId) {
      try {
        await incrementUserSpamReportedCount(report.chatId, report.reporterId);
      } catch (err) {
        console.error("Failed to increment user spam reported count:", err);
      }
    }

    // Inform the admin who clicked
    await ctx.answerCallbackQuery({ text: "Spammer punished!" });

    // Send group chat notification about punishment
    try {
      await ctx.api.sendMessage(
        Number(report.chatId),
        msgs.punishedGroup(report.senderName, report.senderId),
        { parse_mode: "MarkdownV2" },
      );
    } catch (err) {
      console.error("Failed to send group notification:", err);
    }
  } else if (action === "ignore") {
    await updatePendingReportStatus(reportId, "ignored");
    await ctx.answerCallbackQuery({ text: "Report ignored." });
  }

  // Remove the inline buttons from the admin DM
  try {
    await ctx.editMessageReplyMarkup({ reply_markup: { inline_keyboard: [] } });
  } catch (err) {
    console.error("Failed to clear inline keyboard:", err);
  }
}

/**
 * Registers member status update and callback query event handlers to the bot.
 *
 * @param bot - GrammY bot instance.
 */
export function registerHandlers(bot: Bot<any>): void {
  bot.on("my_chat_member", handleMyChatMember);
  bot.on("callback_query", handleCallbackQuery);
}
