import {
  getFirestore,
  QueryDocumentSnapshot,
  Timestamp,
  FieldValue,
} from "firebase-admin/firestore";
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
 * Shared Firestore database client instance.
 */
export const db = getFirestore();

/**
 * Firestore converter for the Chat entity.
 */
const chatConverter = {
  toFirestore(chat: Chat) {
    return {
      title: chat.title,
      createdAt: chat.createdAt,
      ...(chat.premiumExpiresOn !== undefined
        ? { premiumExpiresOn: chat.premiumExpiresOn }
        : {}),
      ...(chat.processedMessages !== undefined
        ? { processedMessages: chat.processedMessages }
        : {}),
      ...(chat.deletedMessages !== undefined
        ? { deletedMessages: chat.deletedMessages }
        : {}),
      ...(chat.bannedSpammers !== undefined
        ? { bannedSpammers: chat.bannedSpammers }
        : {}),
      ...(chat.locale !== undefined ? { locale: chat.locale } : {}),
    };
  },
  fromFirestore(snapshot: QueryDocumentSnapshot): Chat {
    const data = snapshot.data();
    const createdAtVal = data["createdAt"];
    const premiumExpiresOnVal = data["premiumExpiresOn"];

    return {
      id: snapshot.id,
      title: String(data["title"] ?? ""),
      createdAt:
        createdAtVal instanceof Timestamp
          ? createdAtVal.toDate()
          : new Date(String(createdAtVal ?? "")),
      ...(premiumExpiresOnVal !== undefined && premiumExpiresOnVal !== null
        ? {
            premiumExpiresOn:
              premiumExpiresOnVal instanceof Timestamp
                ? premiumExpiresOnVal.toDate()
                : new Date(String(premiumExpiresOnVal)),
          }
        : {}),
      processedMessages: Number(data["processedMessages"] ?? 0),
      deletedMessages: Number(data["deletedMessages"] ?? 0),
      bannedSpammers: Number(data["bannedSpammers"] ?? 0),
      locale: String(data["locale"] ?? "ua"),
    } satisfies Chat;
  },
};

/**
 * Firestore converter for the User entity.
 */
const userConverter = {
  toFirestore(user: User) {
    return {
      name: user.name,
      joinedAt: user.joinedAt,
      messagesCount: user.messagesCount,
      role: user.role,
      ...(user.spamMessagesReported !== undefined
        ? { spamMessagesReported: user.spamMessagesReported }
        : {}),
    };
  },
  fromFirestore(snapshot: QueryDocumentSnapshot): User {
    const data = snapshot.data();
    const joinedAtVal = data["joinedAt"];
    const roleRaw = data["role"];
    const finalRole: UserRole =
      roleRaw === "admin" || roleRaw === "superadmin" ? roleRaw : "user";

    return {
      id: snapshot.id,
      name: String(data["name"] ?? ""),
      joinedAt:
        joinedAtVal instanceof Timestamp
          ? joinedAtVal.toDate()
          : new Date(String(joinedAtVal ?? "")),
      messagesCount: Number(data["messagesCount"] ?? 0),
      role: finalRole,
      spamMessagesReported: Number(data["spamMessagesReported"] ?? 0),
    } satisfies User;
  },
};

/**
 * Firestore converter for the Spam entity.
 */
const spamConverter = {
  toFirestore(spam: Spam) {
    return {
      text: spam.text,
      textEmbeddings: FieldValue.vector(spam.textEmbeddings),
    };
  },
  fromFirestore(snapshot: QueryDocumentSnapshot): Spam {
    const data = snapshot.data();
    const embeddingsRaw = data["textEmbeddings"];
    const textEmbeddings: number[] = Array.isArray(embeddingsRaw)
      ? embeddingsRaw.map((v: unknown) => Number(v ?? 0))
      : [];

    return {
      id: snapshot.id,
      text: String(data["text"] ?? ""),
      textEmbeddings,
    } satisfies Spam;
  },
};

/**
 * Firestore converter for the Config entity.
 */
const configConverter = {
  toFirestore(config: Config) {
    return {
      trustMessagesNumber: config.trustMessagesNumber,
      superAdmins: config.superAdmins,
      spamSimilarityThreshold: config.spamSimilarityThreshold,
      ...(config.llmSpamConfidenceThreshold !== undefined
        ? { llmSpamConfidenceThreshold: config.llmSpamConfidenceThreshold }
        : {}),
      ...(config.logLevel !== undefined ? { logLevel: config.logLevel } : {}),
    };
  },
  fromFirestore(snapshot: QueryDocumentSnapshot): Config {
    const data = snapshot.data();
    const superAdminsRaw = data["superAdmins"];
    const superAdmins: string[] = Array.isArray(superAdminsRaw)
      ? superAdminsRaw.map((v: unknown) => String(v ?? ""))
      : [];

    return {
      trustMessagesNumber: Number(data["trustMessagesNumber"] ?? 0),
      superAdmins,
      spamSimilarityThreshold: Number(data["spamSimilarityThreshold"] ?? 0.8),
      llmSpamConfidenceThreshold: Number(
        data["llmSpamConfidenceThreshold"] ?? 0.75,
      ),
      logLevel: (data["logLevel"] as Config["logLevel"]) ?? "off",
    } satisfies Config;
  },
};

/**
 * Firestore converter for the PendingReport entity.
 */
const pendingReportConverter = {
  toFirestore(report: PendingReport) {
    return {
      chatId: report.chatId,
      messageId: report.messageId,
      senderId: report.senderId,
      senderName: report.senderName,
      text: report.text,
      createdAt: report.createdAt,
      status: report.status,
      ...(report.reporterId !== undefined
        ? { reporterId: report.reporterId }
        : {}),
    };
  },
  fromFirestore(snapshot: QueryDocumentSnapshot): PendingReport {
    const data = snapshot.data();
    const createdAtVal = data["createdAt"];
    const statusRaw = data["status"];
    const finalStatus: PendingReportStatus =
      statusRaw === "punished" || statusRaw === "ignored"
        ? statusRaw
        : "pending";

    return {
      id: snapshot.id,
      chatId: String(data["chatId"] ?? ""),
      messageId: String(data["messageId"] ?? ""),
      senderId: String(data["senderId"] ?? ""),
      senderName: String(data["senderName"] ?? ""),
      text: String(data["text"] ?? ""),
      createdAt:
        createdAtVal instanceof Timestamp
          ? createdAtVal.toDate()
          : new Date(String(createdAtVal ?? "")),
      status: finalStatus,
      ...(data["reporterId"] !== undefined
        ? { reporterId: String(data["reporterId"]) }
        : {}),
    } satisfies PendingReport;
  },
};

/**
 * Gets the chats Firestore collection reference.
 */
export function getChatsCollection() {
  return db.collection("chats").withConverter(chatConverter);
}

/**
 * Gets the users subcollection reference for a specific chat.
 */
export function getUsersCollection(chatId: string) {
  return db
    .collection("chats")
    .doc(chatId)
    .collection("users")
    .withConverter(userConverter);
}

/**
 * Gets the spam Firestore collection reference.
 */
export function getSpamCollection() {
  return db.collection("spam").withConverter(spamConverter);
}

/**
 * Gets the config Firestore collection reference.
 */
export function getConfigCollection() {
  return db.collection("config").withConverter(configConverter);
}

/**
 * Gets the pendingReports Firestore collection reference.
 */
export function getPendingReportsCollection() {
  return db.collection("pendingReports").withConverter(pendingReportConverter);
}
