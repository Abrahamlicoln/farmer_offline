import { initializeApp, getApps, type FirebaseApp } from "firebase/app";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "mock-api-key",
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "one-acre-fund.firebaseapp.com",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "one-acre-fund-offline",
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "one-acre-fund.appspot.com",
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "1234567890",
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "1:1234567890:web:abcdef",
};

let app: FirebaseApp | null = null;

export function getFirebaseApp(): FirebaseApp | null {
  if (typeof window === "undefined") return null;
  if (!app && getApps().length === 0) {
    try {
      app = initializeApp(firebaseConfig);
    } catch (e) {
      console.warn("[Firebase] Initialized in fallback mode:", e);
    }
  }
  return app || (getApps()[0] ?? null);
}

// Real-time sync events for UI notifications
export type SyncEventPayload = {
  status: "idle" | "syncing" | "progress" | "success" | "error";
  message?: string;
  total?: number;
  current?: number;
  syncedCount?: number;
  duplicateCount?: number;
  failedCount?: number;
  timestamp?: string;
};

type SyncEventListener = (payload: SyncEventPayload) => void;
const listeners = new Set<SyncEventListener>();

export const syncEventBus = {
  emit(payload: SyncEventPayload) {
    listeners.forEach((listener) => {
      try {
        listener(payload);
      } catch (err) {
        console.error("[syncEventBus] listener error:", err);
      }
    });
  },
  subscribe(listener: SyncEventListener) {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },
};
