/**
 * Possible spam message text
 *
 * @param {import('./index.js').Message} message
 * @returns {string}
 */
export function possibleSpam(message) {
    return `Possible spam message: 

        *${message.senderName}* [${message.at.toLocaleString()}]:
 
        ${message.text}
    `;
}

/**
 * Punished spammer message
 *
 * @param {import('./index.js').Message} message
 * @returns {string}
 */
export function punished(message) {
    return `Deleted message and banned sender:


        *${message.senderName}* [${message.at.toLocaleString()}]:
 
        ${message.text}
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
