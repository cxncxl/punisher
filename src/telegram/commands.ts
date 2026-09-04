import type { Bot, CommandContext } from "grammy";
import {
  isChatAdminOrSuperadmin,
  promoteUserToAdmin,
  upsertUser,
  getChat,
  getChatAdmins,
  addSpam,
  createPendingReport,
  incrementChatDeletedMessages,
  incrementChatBannedSpammers,
  updateChatLocale,
} from "../data/index.js";
import { generateEmbeddings } from "../ai/index.js";
import { getLocaleMessages, type LocaleMessages } from "./messages.js";

/**
 * Executes direct administrative spam handling (deleting, banning, adding to KB).
 */
async function executeAdminSpamPunish(
  ctx: CommandContext<any>,
  chatId: string,
  replyTo: any,
  text: string,
  chatTitle: string,
  msgs: LocaleMessages,
  repliedName: string,
  repliedUserId: string,
): Promise<void> {
  try {
    await ctx.banChatMember(replyTo.from.id);
  } catch (err) {
    console.error("Failed to ban chat member:", err);
  }

  const embeddings = await generateEmbeddings(text);
  await addSpam(text, embeddings);

  await incrementChatDeletedMessages(chatId);
  await incrementChatBannedSpammers(chatId);

  const dateStr = new Date(replyTo.date * 1000).toLocaleString();
  const adminMsg = msgs.punishedAndBanned(
    chatTitle,
    repliedName,
    repliedUserId,
    dateStr,
    text,
  );

  const admins = await getChatAdmins(chatId);
  for (const admin of admins) {
    try {
      await ctx.api.sendMessage(Number(admin.id), adminMsg, {
        parse_mode: "MarkdownV2",
      });
    } catch {
      // Ignore
    }
  }

  try {
    await ctx.api.deleteMessage(ctx.chat.id, replyTo.message_id);
  } catch (err) {
    console.error("Failed to delete message:", err);
  }
}

/**
 * Registers a pending report for low-privilege spam flags from regular users.
 */
async function registerUserSpamReport(
  ctx: CommandContext<any>,
  chatId: string,
  replyTo: any,
  text: string,
  chatTitle: string,
  msgs: LocaleMessages,
  repliedName: string,
  repliedUserId: string,
): Promise<void> {
  const reportId = await createPendingReport({
    chatId,
    messageId: String(replyTo.message_id),
    senderId: repliedUserId,
    senderName: repliedName,
    text,
    status: "pending",
  });

  const dateStr = new Date(replyTo.date * 1000).toLocaleString();
  const reportMsg = msgs.possibleSpam(
    chatTitle,
    repliedName,
    repliedUserId,
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
  for (const admin of admins) {
    try {
      await ctx.api.sendMessage(Number(admin.id), reportMsg, {
        reply_markup: { inline_keyboard: inlineKeyboard },
        parse_mode: "MarkdownV2",
      });
    } catch {
      // Ignore
    }
  }
}

/**
 * Handle the /promote command.
 * Only available to admins/superadmins.
 *
 * @param ctx - Command Context.
 */
async function handlePromote(ctx: CommandContext<any>): Promise<void> {
  if (!ctx.message) {
    return;
  }
  const chatId = String(ctx.chat.id);
  const senderId = String(ctx.message.from?.id ?? "");
  const replyTo = ctx.message.reply_to_message;

  if (!replyTo || !replyTo.from) {
    return;
  }

  const authorized = await isChatAdminOrSuperadmin(chatId, senderId);
  if (!authorized) {
    return;
  }

  const repliedUserId = String(replyTo.from.id);
  const firstName = replyTo.from.first_name;
  const lastName =
    replyTo.from.last_name !== undefined ? ` ${replyTo.from.last_name}` : "";
  const repliedName = `${firstName}${lastName}`;

  try {
    await promoteUserToAdmin(chatId, repliedUserId);
  } catch {
    await upsertUser(chatId, repliedUserId, repliedName, "admin");
  }

  try {
    await ctx.api.deleteMessage(ctx.chat.id, ctx.message.message_id);
  } catch {
    // Ignore
  }
}

/**
 * Handle the /spam command.
 * Admin execution deletes the message, bans the user, and adds spam to KB.
 * User execution creates a pending spam report for admin evaluation.
 *
 * @param ctx - Command Context.
 */
async function handleSpam(ctx: CommandContext<any>): Promise<void> {
  if (!ctx.message) {
    return;
  }
  const chatId = String(ctx.chat.id);
  const senderId = String(ctx.message.from?.id ?? "");
  const replyTo = ctx.message.reply_to_message;

  if (!replyTo || !replyTo.from) {
    return;
  }

  const text = replyTo.text ?? replyTo.caption ?? "";
  if (!text) {
    return;
  }

  const chat = await getChat(chatId);
  const chatTitle = chat?.title ?? ctx.chat.title ?? "Chat";
  const locale = chat?.locale ?? "ua";
  const msgs = getLocaleMessages(locale);

  const firstName = replyTo.from.first_name;
  const lastName =
    replyTo.from.last_name !== undefined ? ` ${replyTo.from.last_name}` : "";
  const repliedName = `${firstName}${lastName}`;
  const repliedUserId = String(replyTo.from.id);

  const authorized = await isChatAdminOrSuperadmin(chatId, senderId);

  if (authorized) {
    await executeAdminSpamPunish(
      ctx,
      chatId,
      replyTo,
      text,
      chatTitle,
      msgs,
      repliedName,
      repliedUserId,
    );

    try {
      await ctx.api.deleteMessage(ctx.chat.id, ctx.message.message_id);
    } catch {
      // Ignore
    }
  } else {
    await registerUserSpamReport(
      ctx,
      chatId,
      replyTo,
      text,
      chatTitle,
      msgs,
      repliedName,
      repliedUserId,
    );
  }
}

/**
 * Handle the /stats command.
 *
 * @param ctx - Command Context.
 */
async function handleStats(ctx: CommandContext<any>): Promise<void> {
  if (!ctx.message) {
    return;
  }
  const chatId = String(ctx.chat.id);
  const chat = await getChat(chatId);

  const locale = chat?.locale ?? "ua";
  const msgs = getLocaleMessages(locale);

  const addedOnStr = (chat?.createdAt ?? new Date()).toLocaleDateString();
  const statsMsg = msgs.stats(
    addedOnStr,
    chat?.processedMessages ?? 0,
    chat?.deletedMessages ?? 0,
    chat?.bannedSpammers ?? 0,
  );

  await ctx.reply(statsMsg, {
    parse_mode: "MarkdownV2",
    reply_parameters: { message_id: ctx.message.message_id },
  });
}

/**
 * Set chat locale to Ukrainian (/ua).
 *
 * @param ctx - Command Context.
 */
async function handleSetUa(ctx: CommandContext<any>): Promise<void> {
  if (!ctx.message) {
    return;
  }
  const chatId = String(ctx.chat.id);
  const senderId = String(ctx.message.from?.id ?? "");

  const authorized = await isChatAdminOrSuperadmin(chatId, senderId);
  if (!authorized) {
    return;
  }

  await updateChatLocale(chatId, "ua");
}

/**
 * Set chat locale to English (/en).
 *
 * @param ctx - Command Context.
 */
async function handleSetEn(ctx: CommandContext<any>): Promise<void> {
  if (!ctx.message) {
    return;
  }
  const chatId = String(ctx.chat.id);
  const senderId = String(ctx.message.from?.id ?? "");

  const authorized = await isChatAdminOrSuperadmin(chatId, senderId);
  if (!authorized) {
    return;
  }

  await updateChatLocale(chatId, "en");
}

/**
 * Registers commands to the bot.
 *
 * @param bot - GrammY bot instance.
 */
export function registerCommands(bot: Bot<any>): void {
  bot.command("promote", handlePromote);
  bot.command("spam", handleSpam);
  bot.command("stats", handleStats);
  bot.command("ua", handleSetUa);
  bot.command("en", handleSetEn);
}
