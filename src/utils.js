import { readFileSync, writeFileSync, appendFileSync } from 'fs';

import TelegramBot from 'node-telegram-bot-api';

/**
 * Log an error / send notification to admin
 *
 * @param {TelegramBot} bot
 * @param {string} message
 */
export function log(bot, message) {
    bot.sendMessage(
        process.env.APP_ADMIN_TG_ID,
        message,
    );
}

/**
 * Save chats data in a file
 *
 * @param {Object} chats
 * @returns {void}
 */
export function exportChats(chats) {
    console.log('export chats');
    writeFileSync(
        './chats.json',
        JSON.stringify(chats),
    );
}

/**
 * Import chats data from file
 *
 * @returns {Object}
 */
export function importChats() {
    let chatsJson = readFileSync('./chats.json').toString('utf8');
    if (chatsJson.length === 0) chatsJson = '{}';

    return JSON.parse(chatsJson);
}

/**
 * Append message that is 100% spam to spam library
 *
 * @param {string} message
 */
export function appendSpamHistory(message) {
    appendFileSync('spam.txt', `\n${message}`);
}

/**
 * Read saved spam messages
 *
 * @returns {string}
 */
export function loadSpamHistory() {
    return readFileSync('spam.txt').toString();
}
