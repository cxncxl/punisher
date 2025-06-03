import moment from 'moment'

/**
 * Possible spam message text
 *
 * @param {import('./index.js').Message} message
 * @returns {string}
 */
export function possibleSpam(message) {
    message.text = message.text.replace(/([\\`*_{}[\]()#+\-!.|>~])/g, '\\$1');

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
    message.text = message.text.replace(/([\\`*_{}[\]()#+\-!.|>~])/g, '\\$1');

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
    message.text = message.text.replace(/([\\`*_{}[\]()#+\-!.|>~])/g, '\\$1');

    return `**Deleted message and banned spammer:**

[${message.senderName}](tg://user?id=${message.senderId})
[${moment(message.at).format('YYYY/MM/DD HH:mm:ss')}]

>> ${message.text}
`;
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
