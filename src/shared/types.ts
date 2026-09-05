/**
 * Represents a Telegram chat registered in the system.
 */
export interface Chat {
  /**
   * The unique Telegram chat identifier (in-app ID).
   */
  id: string;

  /**
   * The title of the Telegram chat.
   */
  title: string;

  /**
   * The timestamp when the chat was added to the system.
   */
  createdAt: Date;

  /**
   * Optional expiration date for premium features.
   */
  premiumExpiresOn?: Date;

  /**
   * Total number of processed messages in the chat.
   */
  processedMessages?: number;

  /**
   * Total number of deleted spam messages in the chat.
   */
  deletedMessages?: number;

  /**
   * Total number of banned spammers in the chat.
   */
  bannedSpammers?: number;

  /**
   * The language locale of the chat (e.g. "en" or "ua").
   */
  locale?: string;
}

/**
 * Represents the roles a user can have in a chat.
 */
export type UserRole = "user" | "admin" | "superadmin";

/**
 * Represents a Telegram user within a specific chat.
 */
export interface User {
  /**
   * The unique Telegram user identifier.
   */
  id: string;

  /**
   * The display name of the user.
   */
  name: string;

  /**
   * The timestamp when the user joined the chat.
   */
  joinedAt: Date;

  /**
   * The total number of messages sent by this user in this chat.
   */
  messagesCount: number;

  /**
   * The role of the user within this chat.
   */
  role: UserRole;

  /**
   * The total number of confirmed spam reports made by this user in this chat.
   */
  spamMessagesReported?: number;
}

/**
 * Represents a documented spam message in the system.
 */
export interface Spam {
  /**
   * The unique auto-generated identifier of the spam document.
   */
  id: string;

  /**
   * The plain text content of the spam message.
   */
  text: string;

  /**
   * The vector embedding array of the message text.
   */
  textEmbeddings: number[];
}

/**
 * Represents the system configuration settings.
 */
export interface Config {
  /**
   * The number of messages a user must send to be trusted automatically.
   */
  trustMessagesNumber: number;

  /**
   * The list of Telegram user IDs of superadmins.
   */
  superAdmins: string[];

  /**
   * The minimum similarity threshold for vector-based spam matching.
   */
  spamSimilarityThreshold: number;

  /**
   * The minimum confidence score for high-confidence LLM classification.
   */
  llmSpamConfidenceThreshold?: number;

  /**
   * The active log level for the system.
   */
  logLevel?: "off" | "standard" | "debug";
}

/**
 * Represents the status of a pending spam report.
 */
export type PendingReportStatus = "pending" | "punished" | "ignored";

/**
 * Represents a pending spam report for admin evaluation.
 */
export interface PendingReport {
  /**
   * The unique identifier of the report.
   */
  id: string;

  /**
   * The unique Telegram ID of the chat.
   */
  chatId: string;

  /**
   * The unique Telegram ID of the message.
   */
  messageId: string;

  /**
   * The Telegram user ID of the message sender.
   */
  senderId: string;

  /**
   * The display name of the message sender.
   */
  senderName: string;

  /**
   * The plain text of the message being reported.
   */
  text: string;

  /**
   * The timestamp when the report was created.
   */
  createdAt: Date;

  /**
   * The current status of the report.
   */
  status: PendingReportStatus;

  /**
   * The Telegram user ID of the user who reported this spam.
   */
  reporterId?: string;
}

/**
 * Represents the structure of an LLM analysis response.
 */
export interface LLMAnalysisResult {
  /**
   * True if the message is classified as spam, false otherwise.
   */
  isSpam: boolean;

  /**
   * The confidence score of the classification (typically between 0 and 1).
   */
  confidence: number;

  /**
   * The reasoning behind the classification.
   */
  reason: string;
}
