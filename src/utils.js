import { readFileSync, appendFileSync } from 'fs';

import TelegramBot from 'node-telegram-bot-api';
import { Chat, createChat, getChats } from './database';

/**
 * Log an error / send notification to admin
 *
 * @param {TelegramBot} bot
 * @param {string} message
 */
export function log(bot, message) {
    bot.sendMessage(
        process.env.APP_ADMIN_TG_ID ?? '',
        message,
    );
}

/**
 * Save chats data in a file
 *
 * @param {Chat[]} chats
 * @returns {void}
 */
export function exportChats(chats) {
    console.log('export chats');
    chats.forEach(createChat);
}

/**
 * Import chats data from db
 *
 * @returns {Promise<Chat[]>}
 */
export function importChats() {
    return getChats();
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
