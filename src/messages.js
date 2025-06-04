import moment from 'moment'

/**
 * Possible spam message text
 *
 * @param {import('./index.js').Message} message
 * @returns {string}
 */
export function possibleSpam(message) {
    message.text = escapeMarkdownOnce(message.text);

    return `**Possible spam message:** 

[${message.senderName}](tg://user?id=${message.senderId})
[${moment(message.at).format('YYYY/MM/DD HH:mm:ss')}]

>> ${message.text}
`;
}

/**
 * Punished spammer message
 *
 * @param {import('./index.js').Message} message
 * @returns {string}
 */
export function punished(message) {
    message.text = escapeMarkdownOnce(message.text);

    return `**Deleted message:**

[${message.senderName}](tg://user?id=${message.senderId})
[${moment(message.at).format('YYYY/MM/DD HH:mm:ss')}]

>> ${message.text}
`;
}

/**
 * Punished spammer message and deleted user
 *
 * @param {import('./index.js').Message} message
 * @returns {string}
 */
export function punishedAndBanned(message) {
    message.text = escapeMarkdownOnce(message.text);

    return `**Deleted message and banned spammer:**

[${message.senderName}](tg://user?id=${message.senderId})
[${moment(message.at).format('YYYY/MM/DD HH:mm:ss')}]

>> ${message.text}
`;
}

/**
 * Chat statistic
 *
 * @param {import('./database.js').Chat} chat
 * @returns {string}
 */
export function stats(chat) {
    return escapeMarkdownOnce(`
Since ${moment(chat.addedOn).format('dd.MM.YYYY')} I've

Processed messages: ${chat.processedMessages}
Deleted spam messages: ${chat.deletedMessages}
Banned spammers: ${chat.bannedSpammers}
`);
}

export function punish() {
    return 'Punish';
}

export function falsePositive() {
    return 'Not a spam';
}

export function actionSuccess() {
    return '+';
}

export function ban() {
    return 'Ban user';
}

function escapeMarkdownOnce(text) {
  const markdownSpecialChars = [
    '\\', '`', '*', '_', '{', '}', '[', ']', '(', ')', '#', '+', '-', '.', '!', '|', '>', '~'
  ];

  const escaped = text.replace(
    new RegExp(`(?<!\\\\)([${markdownSpecialChars.map(c => '\\' + c).join('')}])`, 'g'),
    '\\$1'
  );

  return escaped;
}
