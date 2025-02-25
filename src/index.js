import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from '@google/generative-ai';
import TelegramBot from 'node-telegram-bot-api';
import dotenv from 'dotenv';

import * as prompts from './prompts.js';
import * as utils from './utils.js';
import * as messages from './messages.js';

dotenv.config();

/** 
 * Bot's id
 */
const selfId = 7895149812;

/**
 * @type {Message[]}
 * @global
 */
const messagesBuf = [];

/**
 * TG Bot instance
 *
 * @global
 */
const bot = new TelegramBot(process.env.TG_BOT_KEY ?? '', {
    polling: true,
});

/**
 * Gemini API client instance
 *
 * @global
 */
const gemini = new GoogleGenerativeAI(process.env.GEMINI_API_KEY ?? '')
    .getGenerativeModel({
        model: 'gemini-1.5-flash',
        safetySettings: [
            {
                category: HarmCategory.HARM_CATEGORY_HARASSMENT,
                threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH,
            },
        ],
        systemInstruction: prompts.systemPrompt,
    });

/**
 * Chat with Gemini
 *
 * @global
 */
const geminiChat = gemini.startChat();

/**
 * Chat model
 * @typedef {Object} Chat
 * @property {number} id - chat id
 * @property {number[]} admins - List of user ids of people who are admins of the chat
 */

/**
 * App message model
 * @typedef {Object} Message
 * @property {number} id - message id
 * @property {number} chatId - chat id
 * @property {number?} senderId - sender's id
 * @property {string?} senderName - sender's name
 * @property {Date} at - sent at
 * @property {string} text - message text
 * @property {boolean?} suspicious - is suspicious
 * @property {number?} aiConfidence - AI confidence in suspiciousness
 */

/**
 * Chats we're watching with their admins
 *
 * @type {Chat[]}
 * @global
 */
let chats = utils.importChats();
console.log(chats);

bot.on('new_chat_members', handleNewTgChatMember);
bot.on('text', handleTgChatMessage);
bot.on('callback_query', handleInlineKeyboard);
bot.on('my_chat_member', handleMyChatMember);
bot.onText(/\!prom/, handlePromote);
bot.onText(/\!spam/, handleReport);

/**
 * Handles new chat member
 *
 * @param {TelegramBot.Message} message
 * @returns {void}
 */
function handleNewTgChatMember(message) {}

/**
 * Handles new message
 *
 * @param {TelegramBot.Message} message
 * @returns {Promise<void>}
 */
async function handleTgChatMessage(message) {
    if (
        message.chat.type != 'group'
        && message.chat.type != 'supergroup'
    ) handleTgPrivateMessage(message);
    if (!chats.some(c => c.id === message.chat.id)) return; // Unknown chat

    const intMessage = buildMessage(message);
    const aiAnalyzed = await analyzeMessage(intMessage);

    if (!aiAnalyzed) return;
    
    judge(aiAnalyzed);
}

/**
 * Handles new message sent to bot's DM
 *
 * @param {TelegramBot.Message} message
 * @returns {void}
 */
function handleTgPrivateMessage(message) {
    // with this we're ignoring channels and superchats
    if (message.chat.type != 'private') return;

    if (message.text && message.text.includes('ping'))
        bot.sendMessage(
            message.chat.id,
            'pong',
        );
}

/**
 * Handle user's actions performed via inline keyboard
 *
 * @param {TelegramBot.CallbackQuery} query 
 * @returns {void}
 */
function handleInlineKeyboard(query) {
    if (!query.data) return;

    let payload = {
        action: query.data.split(';')[0],
        original_message: messagesBuf[+query.data.split(';')[1]],
    };
    console.log(payload);

    if (!payload.action) return;

    switch (payload.action) {
        case 'punish':
            punish(payload.original_message, true);
            break;
        case 'falsePositive':
            falsePositive(payload.original_message);
            break;
        case 'ban':
            ban(payload.original_message);
            break;
    }

    bot.editMessageReplyMarkup({
        inline_keyboard: [],
    }, {
        chat_id: query.from.id,
        message_id: query.message?.message_id,
    });

    bot.answerCallbackQuery({
        callback_query_id: query.id,
    });
}

/**
 * Handle change of bot's member status
 *
 * @param {TelegramBot.ChatMemberUpdated} message
 * @returns {void}
 */
function handleMyChatMember(message) {
    console.log(message);

    if (
        message.new_chat_member.user.id === selfId
        && (
            message.new_chat_member.status === 'member'
            || message.new_chat_member.status === 'administrator'
        )
    ) {
        const oldChat = chats.find(c => c.id === message.chat.id);
        if (oldChat) chats = chats.filter(c => c.id != oldChat.id);

        chats.push({
            id: message.chat.id,
            admins: [
                message.from.id,
            ],
        });
    }
}

/**
 * Promote user to admin
 *
 * @param {TelegramBot.Message} message
 * @param {any} match
 * @returns {void}
 */
function handlePromote(message, match) {
    console.log('prom', message);

    if (!message.reply_to_message) return;

    const chat = chats.find(c => c.id === message.chat.id);
    if (!chat) return;

    const admins = chat.admins;
    if (!admins || admins.length === 0) return;

    if (!message.from) return;
    if (!admins.includes(message.from.id)) return;

    if (!message.reply_to_message.from) return;
    if (!message.reply_to_message.from.id) return;

    chat.admins.push(message.reply_to_message.from.id);
    chats = [
        ...chats.filter(c => c.id != chat.id),
        chat,
    ];

    console.log(chats);

    bot.sendMessage(
        message.chat.id,
        messages.actionSuccess(),
        {
            reply_to_message_id: message.message_id,
        },
    );
}

/**
 * Report spam message
 *
 * @param {TelegramBot.Message} message
 * @param {any} match
 * @returns {void}
 */
function handleReport(message, match) {
    if (!message.reply_to_message) return;

    const chat = chats.find(c => c.id === message.chat.id);
    if (!chat) return;

    const admins = chat.admins;
    if (!admins || admins.length === 0) return;

    if (!message.from) return;
    if (!admins.includes(message.from.id)) return;

    if (!message.reply_to_message.from) return;
    if (!message.reply_to_message.from.id) return;

    const intMessage = buildMessage(message.reply_to_message);
    punish(intMessage, true);
}

/**
 * Convert TG message into internal model
 *
 * @param {TelegramBot.Message} tgMessage
 * @returns {Message}
 */
function buildMessage(tgMessage) {
    return {
        id: tgMessage.message_id,
        chatId: tgMessage.chat.id,
        senderId: tgMessage.from?.id ?? null,
        senderName: tgMessage.from ? 
            `${tgMessage.from.first_name} ${tgMessage.from.last_name ?? ''}`
            : null, 
        at: new Date(tgMessage.date),
        text: tgMessage.text ?? '',
        suspicious: null,
        aiConfidence: null,
    };
}

/**
 * Scan message with AI
 *
 * @param {Message} message
 * @returns {Promise<Message | undefined>}
 */
async function analyzeMessage(message) {
    const prompt = prompts.analyzePrompt + message.text;

    const aiRes = await geminiChat.sendMessage(prompt);

    const answer = aiRes.response.text()
        .replace('```json', '').replace('```', '');

    try {
        const answerParsed = JSON.parse(answer);

        if (!Object.keys(answerParsed).includes('is_suspicious')) {
            utils.log(bot, `Gemini sent JSON but without data: ${answer}`);
            return;
        }

        return {
            ...message,
            suspicious: answerParsed.is_suspicious,
            aiConfidence: answerParsed.confident ?? 0,
        };
    }
    catch (e) {
        if (e instanceof SyntaxError)
            utils.log(bot, `Gemini sent non-JSON response: ${answer}`); 
    }
}

/**
 * Main function of the spam-filter logic
 * Decides what to do with a message and its author and performs actions
 *
 * @param {Message} message
 * @returns {void}
 */
function judge(message) {
    if (message.suspicious === null) return;
    if (message.suspicious === false) return;

    if (!message.aiConfidence) message.aiConfidence = 0;

    if (message.aiConfidence < 1) {
        notifyAdminsAboutPossibleSpam(message);
        return;
    }

    punish(message, false);
}

/**
 * Notifies admins about possible spam
 *
 * @param {Message} message
 */
function notifyAdminsAboutPossibleSpam(message) {
    const chat = chats.find(c => c.id === message.chatId);
    if (!chat) return;

    const admins = chat.admins;
    if (!admins || admins.length === 0) return;

    console.log('notifyPossibleSpam', message);
    messagesBuf.push(message);

    for (const admin of admins) {
        bot.sendMessage(
            admin,
            messages.possibleSpam(message),
            {
                reply_markup: {
                    inline_keyboard: [[
                        {
                            text: messages.punish(),
                            callback_data: `punish;${messagesBuf.length - 1}`,
                        },
                        {
                            text: messages.falsePositive(),
                            callback_data: `falsePositive;${messagesBuf.length - 1}`,
                        },
                    ]],
                },
            }
        );
    }
}

/**
 * Punish spammer
 *
 * @param {Message} message
 * @param {boolean} report - if to report message as good finding
 * @returns {void}
 */
function punish(message, report) {
    if (!message.senderId) return;

    if (report) {
        geminiChat.sendMessage(prompts.goodFinding(message.text));
    }

    const chat = chats.find(c => c.id === message.chatId);
    if (!chat) return;

    const admins = chat.admins;
    if (!admins || admins.length === 0) return;

    bot.deleteMessage(
        message.chatId,
        message.id,
    );

    // bot.banChatMember(
    //     message.chatId,
    //     message.senderId,
    // );
    
    messagesBuf.push(message);

    for (const admin of admins) {
        bot.sendMessage(
            admin,
            messages.punished(message),
            {
                reply_markup: {
                    inline_keyboard: [[
                        {
                            text: messages.ban(),
                            callback_data: `ban;${messagesBuf.length - 1}`,
                        },
                    ]],
                },
            },
        );
    }
}

/**
 * Ban sender
 *
 * @param {Message} message
 * @returns {void}
 */
function ban(message) {
    if (!message.senderId) return;

    bot.banChatMember(
        message.chatId,
        message.senderId,
    );

    const chat = chats.find(c => c.id === message.chatId);
    if (!chat) return;

    const admins = chat.admins;
    if (!admins || admins.length === 0) return;

    for (const admin of admins) {
        bot.sendMessage(
            admin,
            messages.punishedAndBanned(message),
        );
    }
}

/**
 * Let LLM know that it found false positive
 *
 * @param {Message} message
 * @returns {void}
 */
function falsePositive(message) {
    geminiChat.sendMessage(prompts.falsePositive(message.text));
}

function exit() {
    utils.exportChats(chats);
    process.exit();
}

process.on('exit', () => exit());
process.on('SIGINT', () => exit());
process.on('SIGUSR1', () => exit()); 
process.on('SIGUSR2', () => exit());
process.on('uncaughtException', () => exit());
