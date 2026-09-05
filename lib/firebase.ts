import { initializeApp, getApps, type FirebaseApp } from "firebase/app";

export const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "AIzaSyA60Vbha1FN-YPmx1dShqS_4fyCQ_0yg5Y",
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "oneacrefund-1b82c.firebaseapp.com",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "oneacrefund-1b82c",
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "oneacrefund-1b82c.firebasestorage.app",
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "278157702631",
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "1:278157702631:web:2c873b8016899a1a933942",
};

export const FIREBASE_VAPID_KEY =
  process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY ||
  "BO-j6HRHkuDHJthgStzR5GxOq1RPxM_e6y_u9a4oAq7Ehh2SJDlh6qa6ndaXyvaWpRsMOknZgE2_pUK6pIY4yvY";

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
