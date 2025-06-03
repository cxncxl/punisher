import { MongoClient } from 'mongodb';

const url = 'mongodb://localhost:27017';
const dbName = 'punisher';
const chatsCollectionName = 'chats';

const client = new MongoClient(url);
await client.connect();
const db = client.db(dbName);
const chats = db.collection(chatsCollectionName);

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
        doc.adminsIds,
        doc.hasPremium,
        doc.processedMessages,
        doc.deletedMessages,
        doc.bannedSpammers,
    );
}

/**
    * @returns {Promise<Chat[]>}
*/
export async function getChats() {
    const docs = await chats.find({}).toArray();

    return docs.map(doc => new Chat(
        doc.id,
        doc.adminsIds,
        doc.hasPremium,
        doc.processedMessages,
        doc.deletedMessages,
        doc.bannedSpammers,
    ));
}

/**
    * upsert
    *
    * @param {Chat} chat
*/
export async function createChat(chat) {
    if (await getChat(chat.id) !== null) {
        await chats.deleteOne({
            id: chat.id,
        });
    }

    await chats.insertOne(chat);
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
    ) {
        this.id = id;
        this.adminsIds = adminsIds;
        this.hasPremium = hasPremium;
        this.processedMessages = processedMessages;
        this.deletedMessages = deletedMessages;
        this.bannedSpammers = bannedSpammers;
    }
}

export class ReportEvent {
    /** @type string */
    messageText;

    /** @type boolean */
    isSpam;
}
