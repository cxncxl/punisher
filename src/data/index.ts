import { FieldValue, type DocumentSnapshot } from "firebase-admin/firestore";
import { DEFAULT_CONFIG } from "../shared/config";
import { RecordNotFoundError } from "../shared/errors";
import {
  db,
  getChatsCollection,
  getUsersCollection,
  getSpamCollection,
  getConfigCollection,
  getPendingReportsCollection,
} from "./db";
import type {
  Chat,
  User,
  UserRole,
  Spam,
  Config,
  PendingReport,
  PendingReportStatus,
} from "../shared/types";

/**
 * Retrieves a Chat document by its Telegram ID.
 */
export async function getChat(chatId: string): Promise<Chat | null> {
  const doc = await getChatsCollection().doc(chatId).get();
  return parseDocumentData<Chat>(doc);
}

/**
 * Creates or updates a Chat document.
 */
export async function upsertChat(chatId: string, title: string): Promise<void> {
  await getChatsCollection()
    .doc(chatId)
    .set(
      {
        title,
        createdAt: new Date(),
      } satisfies Partial<Chat>,
      { merge: true },
    );
}

/**
 * Retrieves a User document by Chat ID and User ID.
 */
export async function getUser(
  chatId: string,
  userId: string,
): Promise<User | null> {
  const doc = await getUsersCollection(chatId).doc(userId).get();
  return parseDocumentData(doc);
}

/**
 * Creates or updates a User document within a chat.
 */
export async function upsertUser(
  chatId: string,
  userId: string,
  name: string,
  role?: UserRole,
): Promise<void> {
  const userRef = getUsersCollection(chatId).doc(userId);
  await userRef.set(
    {
      name,
      joinedAt: new Date(),
      ...(role !== undefined ? { role } : { role: "user" satisfies UserRole }),
    },
    { merge: true },
  );
}

/**
 * Increments the message count of a user in a specific chat.
 */
export async function incrementUserMessageCount(
  chatId: string,
  userId: string,
): Promise<void> {
  const rawUserRef = db
    .collection("chats")
    .doc(chatId)
    .collection("users")
    .doc(userId);

  await rawUserRef.set(
    {
      name: "Unknown",
      joinedAt: new Date(),
      role: "user",
      messagesCount: FieldValue.increment(1),
    },
    { merge: true },
  );
}

/**
 * Promotes a user to an admin role in a specific chat.
 *
 * @throws {RecordNotFoundError} If the user does not exist in the chat.
 */
export async function promoteUserToAdmin(
  chatId: string,
  userId: string,
): Promise<void> {
  const userRef = getUsersCollection(chatId).doc(userId);
  const doc = await userRef.get();

  if (!doc.exists) {
    throw new RecordNotFoundError(`User ${userId} not found in chat ${chatId}`);
  }

  await userRef.update({
    role: "admin",
  } satisfies Partial<User>);
}

/**
 * Adds a new spam entry to the database.
 */
export async function addSpam(
  text: string,
  textEmbeddings: number[],
): Promise<string> {
  const coll = getSpamCollection();
  const docRef = coll.doc();
  await docRef.set({
    id: docRef.id,
    text,
    textEmbeddings: FieldValue.vector(textEmbeddings) as unknown as number[],
  } satisfies Spam);
  return docRef.id;
}

/**
 * Searches for a highly similar spam message in the spam collection.
 */
export async function searchSpam(
  textEmbeddings: number[],
  similarityThreshold: number,
): Promise<Spam | null> {
  const coll = getSpamCollection();
  try {
    const snap = await coll
      .findNearest({
        vectorField: "textEmbeddings",
        queryVector: textEmbeddings,
        distanceMeasure: "COSINE",
        limit: 1,
      })
      .get();

    if (snap.empty) {
      return null;
    }

    const doc = snap.docs[0];
    if (doc === undefined) {
      return null;
    }

    const distance = Number(doc.get("__distance__") ?? 1);
    const similarity = 1 - distance;

    if (similarity >= similarityThreshold) {
      return doc.data();
    }
    return null;
  } catch (err) {
    console.error("Vector search failed:", err);
    return null;
  }
}

/**
 * Retrieves the global bot configuration.
 */
export async function getConfig(): Promise<Config> {
  const doc = await getConfigCollection().doc("default").get();
  return parseDocumentData(doc) ?? DEFAULT_CONFIG;
}

/**
 * Creates a new pending spam report.
 */
export async function createPendingReport(
  report: Omit<PendingReport, "id" | "createdAt">,
): Promise<string> {
  const coll = getPendingReportsCollection();
  const docRef = coll.doc();
  await docRef.set({
    id: docRef.id,
    chatId: report.chatId,
    messageId: report.messageId,
    senderId: report.senderId,
    senderName: report.senderName,
    text: report.text,
    createdAt: new Date(),
    status: report.status,
  } satisfies PendingReport);

  return docRef.id;
}

/**
 * Retrieves a pending report by its ID.
 */
export async function getPendingReport(
  reportId: string,
): Promise<PendingReport | null> {
  const doc = await getPendingReportsCollection().doc(reportId).get();
  return parseDocumentData(doc);
}

/**
 * Updates the status of a pending report.
 */
export async function updatePendingReportStatus(
  reportId: string,
  status: PendingReportStatus,
): Promise<void> {
  const reportRef = getPendingReportsCollection().doc(reportId);
  await reportRef.update({ status } satisfies Partial<PendingReport>);
}

function parseDocumentData<T>(doc: DocumentSnapshot<T>): T | null {
  if (!doc.exists) {
    return null;
  }

  return (doc.data() as T) ?? null;
}
