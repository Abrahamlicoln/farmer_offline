"use client";

import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db, initializeOfflineLocations } from "@/lib/db";
import { syncPendingFarmers } from "@/lib/syncService";

interface NetworkContextType {
  isOnline: boolean;
  browserOnline: boolean;
  simulatedOffline: boolean;
  setSimulatedOffline: (val: boolean) => void;
  toggleSimulatedOffline: () => void;
  isSyncing: boolean;
  triggerSync: () => Promise<void>;
  pendingCount: number;
  syncedCount: number;
  lastSyncTime: string | null;
  serverReachable: boolean;
}

const NetworkContext = createContext<NetworkContextType | undefined>(undefined);

export function NetworkProvider({ children }: { children: React.ReactNode }) {
  const [browserOnline, setBrowserOnline] = useState<boolean>(true);
  const [simulatedOffline, setSimulatedOffline] = useState<boolean>(false);
  const [serverReachable, setServerReachable] = useState<boolean>(true);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [lastSyncTime, setLastSyncTime] = useState<string | null>(null);

  // Live Dexie counters
  const pendingCount = useLiveQuery(
    () => db.farmers.where("syncStatus").equals("pending").count(),
    [],
    0
  );

  const syncedCount = useLiveQuery(
    () => db.farmers.where("syncStatus").equals("synced").count(),
    [],
    0
  );

  // Effective online state: must be browser online AND not simulated offline
  const isOnline = browserOnline && !simulatedOffline && serverReachable;

  // Initialize offline locations in IndexedDB
  useEffect(() => {
    initializeOfflineLocations();
  }, []);

  // Listen to native browser online/offline events
  useEffect(() => {
    if (typeof window === "undefined") return;

    setBrowserOnline(navigator.onLine);

    const handleOnline = () => {
      console.log("[Network] Browser came online");
      setBrowserOnline(true);
    };

    const handleOffline = () => {
      console.log("[Network] Browser went offline");
      setBrowserOnline(false);
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  // Manual or programmatic sync trigger
  const triggerSync = useCallback(async () => {
    if (simulatedOffline || !browserOnline || isSyncing) return;

    setIsSyncing(true);
    try {
      const res = await syncPendingFarmers();
      if (res && res.syncedCount > 0) {
        setLastSyncTime(new Date().toLocaleTimeString());
      }
    } finally {
      setIsSyncing(false);
    }
  }, [simulatedOffline, browserOnline, isSyncing]);

  // 30-Second Heartbeat & Auto-Sync Runner
  // Compensates for navigator.onLine false-positives by actively pinging /api/health
  useEffect(() => {
    if (simulatedOffline) {
      setServerReachable(false);
      return;
    }

    const checkServerHealth = async () => {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 4000);

        const res = await fetch("/api/health", {
          signal: controller.signal,
          cache: "no-store",
        });
        clearTimeout(timeoutId);

        if (res.ok) {
          setServerReachable(true);

          // If reachable and we have pending offline records, trigger auto-sync!
          const pending = await db.farmers.where("syncStatus").equals("pending").count();
          if (pending > 0 && !isSyncing) {
            console.log(`[Heartbeat 30s] Server reachable. Auto-syncing ${pending} pending records...`);
            triggerSync();
          }
        } else {
          setServerReachable(false);
        }
      } catch {
        setServerReachable(false);
      }
    };

    // Initial check on mount
    checkServerHealth();

    // 30-Second recurring interval
    const interval = setInterval(checkServerHealth, 30000);

    return () => clearInterval(interval);
  }, [simulatedOffline, triggerSync, isSyncing]);

  // When coming back online from simulated offline, trigger sync immediately
  const toggleSimulatedOffline = () => {
    setSimulatedOffline((prev) => {
      const next = !prev;
      if (!next && browserOnline) {
        // Returned to online: test connectivity and sync
        setTimeout(() => triggerSync(), 500);
      }
      return next;
    });
  };

  return (
    <NetworkContext.Provider
      value={{
        isOnline,
        browserOnline,
        simulatedOffline,
        setSimulatedOffline,
        toggleSimulatedOffline,
        isSyncing,
        triggerSync,
        pendingCount: pendingCount ?? 0,
        syncedCount: syncedCount ?? 0,
        lastSyncTime,
        serverReachable,
      }}
    >
      {children}
    </NetworkContext.Provider>
  );
}

export function useNetwork() {
  const context = useContext(NetworkContext);
  if (!context) {
    throw new Error("useNetwork must be used within a NetworkProvider");
  }
  return context;
}
