import { initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

/**
 * Global Firebase Admin initialization.
 * Must be executed before any Firebase services (Firestore, etc.) are accessed.
 */
initializeApp();

getFirestore().settings({ ignoreUndefinedProperties: true });
