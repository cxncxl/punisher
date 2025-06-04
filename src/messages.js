import moment from 'moment'

/** 
 * @param {string} local
 */
export function localization(local) {
    switch (local) {
        case 'en':
            return {
                possibleSpam,
                punished,
                punishedAndBanned,
                stats,
                punish,
                falsePositive,
                actionSuccess,
                ban,
                noPremium,
            };
        default:
            return {
                possibleSpam: possibleSpamUa,
                punished: punishedUa,
                punishedAndBanned: punishedAndBannedUa,
                stats: statsUa,
                punish: punishUa,
                falsePositive: falsePositiveUa,
                actionSuccess: actionSuccess,
                ban: banUa,
                noPremium: noPremiumUa,
            };
    }
}

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
 * Possible spam message text [UA]
 *
 * @param {import('./index.js').Message} message
 * @returns {string}
 */
export function possibleSpamUa(message) {
    message.text = escapeMarkdownOnce(message.text);

    return `**Повідомлення виглядає як спам:** 

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
 * Punished spammer message [UA]
 *
 * @param {import('./index.js').Message} message
 * @returns {string}
 */
export function punishedUa(message) {
    message.text = escapeMarkdownOnce(message.text);

    return `**Видалив повідомлення:**

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
 * Punished spammer message and deleted user [UA]
 *
 * @param {import('./index.js').Message} message
 * @returns {string}
 */
export function punishedAndBannedUa(message) {
    message.text = escapeMarkdownOnce(message.text);

    return `**Видалив повідомлення і заблокував спамера:**

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
Since ${moment(chat.addedOn).format('DD.MM.YYYY')} I've

Processed messages: ${chat.processedMessages}
Deleted spam messages: ${chat.deletedMessages}
Banned spammers: ${chat.bannedSpammers}
`);
}

/**
 * Chat statistic [UA]
 *
 * @param {import('./database.js').Chat} chat
 * @returns {string}
 */
export function statsUa(chat) {
    return escapeMarkdownOnce(`
З ${moment(chat.addedOn).format('DD.MM.YYYY')} я

Проаналізував повідомлень: ${chat.processedMessages}
Видалив повідомлень зі спамом: ${chat.deletedMessages}
Забанив спамерів: ${chat.bannedSpammers}
`);
}

export function punish() {
    return 'Punish';
}

export function punishUa() {
    return 'Покарати';
}

export function falsePositive() {
    return 'Not a spam';
}

export function falsePositiveUa() {
    return 'Не спам';
}

export function actionSuccess() {
    return '+';
}

export function ban() {
    return 'Ban user';
}

export function banUa() {
    return 'Забанити';
}

/**
 * @param {import('./database.js').Chat} chat
 */
export function noPremium(chat) {
    return escapeMarkdownOnce(`
You don't have premium subscription active. I've already deleted ${chat.deletedMessages} spam messages in this chat. If you want to continue using me, please contact support for purchasing premium
`);
}

/**
 * @param {import('./database.js').Chat} chat
 */
export function noPremiumUa(chat) {
    return escapeMarkdownOnce(`
В цьому чаті неактивний преміум. Наразі я видалив ${chat.deletedMessages} повідомлень зі спамом. Якщо ви і надалі бажаєте користуватися моїми послугами, зверніться в підтримку за контактами в мене в біо щоб купити преміум (насправді зовсім не дорого)
`);
}

const insertAt = (str, sub, pos) => `${str.slice(0, pos)}${sub}${str.slice(pos)}`;

function escapeMarkdownOnce(text) {
    const charsToEscape = ['_', '*', '[', ']', '(', ')', '~', '`', '>', '#', '+', '-', '=', '|', '{', '}', '.', '!'];

    const escapeRegExp = new RegExp(`([${charsToEscape.map(c => '\\' + c).join('')}])`, 'g');

    return text.replace(escapeRegExp, '');
}
