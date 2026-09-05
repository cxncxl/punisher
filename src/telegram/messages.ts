/**
 * Replaces characters that might break Telegram MarkdownV2 parsing with empty string.
 *
 * @param text - The raw text to sanitize.
 * @returns The sanitized text.
 */
export function escapeMarkdown(text: string): string {
  const charsToEscape = [
    "_",
    "*",
    "[",
    "]",
    "(",
    ")",
    "~",
    "`",
    ">",
    "#",
    "+",
    "-",
    "=",
    "|",
    "{",
    "}",
    ".",
    "!",
  ];

  const escapeRegExp = new RegExp(
    `([${charsToEscape.map((c) => "\\" + c).join("")}])`,
    "g",
  );

  return text.replace(escapeRegExp, "");
}

/**
 * Interface representing a localization message set.
 */
export interface LocaleMessages {
  possibleSpam: (
    chatName: string,
    senderName: string,
    senderId: string,
    dateStr: string,
    text: string,
  ) => string;
  punished: (
    chatName: string,
    senderName: string,
    senderId: string,
    dateStr: string,
    text: string,
  ) => string;
  punishedGroup: (senderName: string, senderId: string) => string;
  punishedAndBanned: (
    chatName: string,
    senderName: string,
    senderId: string,
    dateStr: string,
    text: string,
  ) => string;
  stats: (
    addedOnStr: string,
    processed: number,
    deleted: number,
    banned: number,
    topReporterName?: string,
    topReporterId?: string,
    topReporterCount?: number,
  ) => string;
  punish: () => string;
  falsePositive: () => string;
  actionSuccess: () => string;
  ban: () => string;
  noPremium: (deleted: number) => string;
}

const enMessages: LocaleMessages = {
  possibleSpam: (chatName, senderName, senderId, dateStr, text) =>
    `*Possible spam message:*\n` +
    `In chat ${escapeMarkdown(chatName)}\n\n` +
    `[${escapeMarkdown(senderName)}](tg://user?id=${senderId})\n` +
    `[${escapeMarkdown(dateStr)}]\n\n` +
    `>> ${escapeMarkdown(text)}\n`,

  punished: (chatName, senderName, senderId, dateStr, text) =>
    `*Deleted message:*\n` +
    `In chat ${escapeMarkdown(chatName)}\n\n` +
    `[${escapeMarkdown(senderName)}](tg://user?id=${senderId})\n` +
    `[${escapeMarkdown(dateStr)}]\n\n` +
    `>> ${escapeMarkdown(text)}\n`,

  punishedGroup: (senderName, senderId) =>
    `[${escapeMarkdown(senderName)}](tg://user?id=${senderId}), ` +
    `your message has been deleted because it looked like spam.`,

  punishedAndBanned: (chatName, senderName, senderId, dateStr, text) =>
    `*Deleted message and banned spammer:*\n` +
    `In chat ${escapeMarkdown(chatName)}\n\n` +
    `[${escapeMarkdown(senderName)}](tg://user?id=${senderId})\n` +
    `[${escapeMarkdown(dateStr)}]\n\n` +
    `>> ${escapeMarkdown(text)}\n`,

  stats: (
    addedOnStr,
    processed,
    deleted,
    banned,
    topReporterName,
    topReporterId,
    topReporterCount,
  ) => {
    let base =
      `Since ${escapeMarkdown(addedOnStr)} I've\n\n` +
      `Processed messages: ${processed}\n` +
      `Deleted spam messages: ${deleted}\n` +
      `Banned spammers: ${banned}\n`;
    if (topReporterName && topReporterId && topReporterCount !== undefined) {
      base += `Top reporter: [${escapeMarkdown(topReporterName)}](tg://user?id=${topReporterId}) (${topReporterCount})\n`;
    }
    return base;
  },

  punish: () => "Punish",
  falsePositive: () => "Not spam",
  actionSuccess: () => "+",
  ban: () => "Ban user",
  noPremium: (deleted) =>
    `You don't have premium subscription active. ` +
    `I've already deleted ${deleted} spam messages in this chat. ` +
    `If you want to continue using me, please contact support for ` +
    `purchasing premium.`,
};

const uaMessages: LocaleMessages = {
  possibleSpam: (chatName, senderName, senderId, dateStr, text) =>
    `*Повідомлення виглядає як спам:*\n` +
    `у чаті ${escapeMarkdown(chatName)}\n\n` +
    `[${escapeMarkdown(senderName)}](tg://user?id=${senderId})\n` +
    `[${escapeMarkdown(dateStr)}]\n\n` +
    `>> ${escapeMarkdown(text)}\n`,

  punished: (chatName, senderName, senderId, dateStr, text) =>
    `*Видалив повідомлення:*\n` +
    `у чаті ${escapeMarkdown(chatName)}\n\n` +
    `[${escapeMarkdown(senderName)}](tg://user?id=${senderId})\n` +
    `[${escapeMarkdown(dateStr)}]\n\n` +
    `>> ${escapeMarkdown(text)}\n`,

  punishedGroup: (senderName, senderId) =>
    `[${escapeMarkdown(senderName)}](tg://user?id=${senderId}), ` +
    `ваше повідомлення було видалено, оскільки виглядало як спам.`,

  punishedAndBanned: (chatName, senderName, senderId, dateStr, text) =>
    `*Видалив повідомлення і заблокував спамера:*\n` +
    `У чаті ${escapeMarkdown(chatName)}\n\n` +
    `[${escapeMarkdown(senderName)}](tg://user?id=${senderId})\n` +
    `[${escapeMarkdown(dateStr)}]\n\n` +
    `>> ${escapeMarkdown(text)}\n`,

  stats: (
    addedOnStr,
    processed,
    deleted,
    banned,
    topReporterName,
    topReporterId,
    topReporterCount,
  ) => {
    let base =
      `З ${escapeMarkdown(addedOnStr)} я\n\n` +
      `Проаналізував повідомлень: ${processed}\n` +
      `Видалив повідомлень зі спамом: ${deleted}\n` +
      `Забанив спамерів: ${banned}\n`;
    if (topReporterName && topReporterId && topReporterCount !== undefined) {
      base += `Найактивніший репортер: [${escapeMarkdown(topReporterName)}](tg://user?id=${topReporterId}) (${topReporterCount})\n`;
    }
    return base;
  },

  punish: () => "Покарати",
  falsePositive: () => "Не спам",
  actionSuccess: () => "+",
  ban: () => "Забанити",
  noPremium: (deleted) =>
    `В цьому чаті неактивний преміум. Наразі я видалив ${deleted} ` +
    `повідомлень зі спамом. Якщо ви і надалі бажаєте користуватися ` +
    `моїми послугами, зверніться в підтримку за контактами в мене в біо, ` +
    `щоб купити преміум (насправді зовсім не дорого).`,
};

/**
 * Retrieves the messages set for a given locale (defaults to Ukrainian).
 *
 * @param locale - The locale string (e.g., "en" or "ua").
 * @returns The messages set.
 */
export function getLocaleMessages(locale?: string): LocaleMessages {
  return locale === "en" ? enMessages : uaMessages;
}
