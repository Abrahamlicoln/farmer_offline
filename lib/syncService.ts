import { db } from "@/lib/db";
import { FarmerRecord, SyncPayload, SyncResult } from "@/types";
import { syncEventBus } from "@/lib/firebase";

export async function syncPendingFarmers(): Promise<SyncResult | null> {
  // 1. Fetch pending & failed records from IndexedDB
  const pendingRecords = await db.farmers
    .filter((f) => f.syncStatus === "pending" || f.syncStatus === "failed")
    .toArray();

  if (pendingRecords.length === 0) {
    return null;
  }

  const batchId = `BATCH-${Date.now()}-${Math.random().toString(36).slice(2, 7).toUpperCase()}`;

  // Notify UI that sync is starting
  syncEventBus.emit({
    status: "syncing",
    message: `Starting sync for ${pendingRecords.length} offline records...`,
    total: pendingRecords.length,
    current: 0,
  });

  const payload: SyncPayload = {
    batchId,
    clientDeviceId: typeof window !== "undefined" ? window.navigator.userAgent : "field-agent-device",
    records: pendingRecords,
  };

  try {
    const response = await fetch("/api/sync", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw new Error(`Server returned status ${response.status}: ${response.statusText}`);
    }

    const result: SyncResult = await response.json();

    // 2. Update Dexie records based on server response
    const now = new Date().toISOString();

    await db.transaction("rw", db.farmers, async () => {
      // Mark successful & duplicate records as synced
      for (const id of result.syncedIds) {
        await db.farmers.update(id, {
          syncStatus: "synced",
          syncedAt: now,
          syncError: null,
          updatedAt: now,
        });
      }

      // Mark any failed records
      for (const failed of result.failedIds) {
        await db.farmers.update(failed.id, {
          syncStatus: "failed",
          syncError: failed.reason,
          updatedAt: now,
        });
      }
    });

    // Notify UI of completion
    syncEventBus.emit({
      status: result.failedCount > 0 ? "error" : "success",
      message: `Sync finished: ${result.syncedCount} synced, ${result.duplicateCount} duplicates safely handled${result.failedCount > 0 ? `, ${result.failedCount} failed` : ""}`,
      total: pendingRecords.length,
      current: result.syncedCount + result.duplicateCount,
      syncedCount: result.syncedCount,
      duplicateCount: result.duplicateCount,
      failedCount: result.failedCount,
      timestamp: now,
    });

    return result;
  } catch (error: any) {
    console.error("[syncPendingFarmers] Network error during sync:", error);

    // Keep records pending or mark failed
    const errorMsg = error?.message || "Failed to reach central server";

    syncEventBus.emit({
      status: "error",
      message: `Sync failed: ${errorMsg}. Records remain safely saved offline.`,
      total: pendingRecords.length,
      current: 0,
      failedCount: pendingRecords.length,
      syncedCount: 0,
      duplicateCount: 0,
    });

    return null;
  }
}

/**
 * Pushes all local IndexedDB farmers to the central Neon database.
 * Completely idempotent: existing records on the server are preserved,
 * while any missing records are committed.
 */
export async function syncAllLocalFarmers(): Promise<SyncResult | null> {
  if (typeof window === "undefined") return null;

  try {
    const allRecords = await db.farmers.toArray();
    if (allRecords.length === 0) return null;

    const batchId = `BATCH-ALL-${Date.now()}-${Math.random().toString(36).slice(2, 7).toUpperCase()}`;

    const payload: SyncPayload = {
      batchId,
      clientDeviceId: window.navigator?.userAgent || "browser-client",
      records: allRecords,
    };

    const response = await fetch("/api/sync", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!response.ok) return null;

    const result: SyncResult = await response.json();
    const now = new Date().toISOString();

    await db.transaction("rw", db.farmers, async () => {
      for (const id of result.syncedIds) {
        await db.farmers.update(id, {
          syncStatus: "synced",
          syncedAt: now,
          syncError: null,
          updatedAt: now,
        });
      }
    });

    return result;
  } catch (err) {
    console.error("[syncAllLocalFarmers] Sync error:", err);
    return null;
  }
}
