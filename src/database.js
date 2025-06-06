import { MongoClient } from 'mongodb';

const url = 'mongodb://localhost:27017';
const dbName = 'punisher';
const chatsCollectionName = 'chats';

const client = new MongoClient(url);
await client.connect();
export const db = client.db(dbName);
export const chats = db.collection(chatsCollectionName);

export function close() {
    client.close();
}

/** 
    * @param {number} id 
    * @returns {Promise<Chat | null>}
*/
export async function getChat(id) {
    const doc = await chats.findOne({
        id,
    });

    if (!doc) return null;

    return new Chat(
        doc.id,
        doc.adminsIds ?? [],
        doc.hasPremium ?? false,
        doc.processedMessages ?? 0,
        doc.deletedMessages ?? 0,
        doc.bannedSpammers ?? 0,
        doc.addedOn ?? new Date(),
        doc.premiumedOn ?? undefined,
        doc.locale ?? 'ua',
    );
}

/**
    * @returns {Promise<Chat[]>}
*/
export async function getChats() {
    const docs = await chats.find({}).toArray();

    return docs.map(doc => new Chat(
        doc.id,
        doc.adminsIds ?? [],
        doc.hasPremium ?? false,
        doc.processedMessages ?? 0,
        doc.deletedMessages ?? 0,
        doc.bannedSpammers ?? 0,
        doc.addedOn ?? new Date(),
        doc.premiumedOn ?? undefined,
        doc.locale ?? 'ua',
    ));
}

/**
    * upsert
    *
    * @param {Chat} chat
*/
export async function createChat(chat) {
    const ch = await getChat(chat.id);
    console.log('saved chat', ch);
    if (ch !== null) {
        const toUpdate = { ...chat, id: undefined };
        delete toUpdate.id;
        delete toUpdate._id;

        await chats.updateOne({
            id: chat.id
        }, { $set: { ...toUpdate } });

        return;
    }

    await chats.insertOne(chat);
}

/**
    * @param {Chat} chat
*/
export async function makeChatPremium(chat) {
    chat.hasPremium = true;
    chat.premiumedOn = new Date();
    createChat(chat);
}

export class Chat {
    constructor(
        /** @type number */
        id,
        /** @type number[] */
        adminsIds,
        /** @type boolean */
        hasPremium,
        /** @type number */
        processedMessages,
        /** @type number */
        deletedMessages,
        /** @type number */
        bannedSpammers,
        /** @type Date */
        addedOn,
        /** @type Date | undefined */
        premiumedOn,
        /** @type string | undefined */
        locale = 'ua',
    ) {
        this.id = id;
        this.adminsIds = adminsIds;
        this.hasPremium = hasPremium;
        this.processedMessages = processedMessages;
        this.deletedMessages = deletedMessages;
        this.bannedSpammers = bannedSpammers;
        this.addedOn = addedOn;
        this.premiumedOn = premiumedOn;
        this.locale = locale;
    }
}

export class ReportEvent {
    /** @type string */
    messageText;

    /** @type boolean */
    isSpam;
}
