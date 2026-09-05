import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { FarmerRecord, SyncPayload, SyncResult } from "@/types";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const payload: SyncPayload = await req.json();
    const { batchId, clientDeviceId, records } = payload;

    if (!records || !Array.isArray(records) || records.length === 0) {
      return NextResponse.json(
        { success: false, message: "No records provided in sync batch" },
        { status: 400 }
      );
    }

    const syncedIds: string[] = [];
    const failedIds: { id: string; reason: string }[] = [];
    let duplicateCount = 0;
    let syncedCount = 0;

    for (const record of records) {
      try {
        // 1. Idempotency Check: Check if record with this ID already exists
        const existingFarmer = await prisma.farmer.findUnique({
          where: { id: record.id },
        });

        if (existingFarmer) {
          // Record already present on server - idempotent pass without creating duplicates
          duplicateCount++;
          syncedIds.push(record.id);

          await prisma.syncAuditLog.create({
            data: {
              batchId,
              farmerId: record.id,
              status: "DUPLICATE_IGNORED",
              message: "Record already synced previously; re-submission ignored to prevent duplication",
              clientDeviceId: clientDeviceId || "unknown",
            },
          });
          continue;
        }

        // 2. Insert new farmer into Neon PostgreSQL
        await prisma.farmer.create({
          data: {
            id: record.id,
            fullName: record.fullName,
            phoneNumber: record.phoneNumber,
            stateCode: record.stateCode,
            stateName: record.stateName,
            lgaId: record.lgaId || null,
            lgaName: record.lgaName,
            village: record.village,
            pollingUnitCode: record.pollingUnitCode || null,
            programme: record.programme,
            registeredBy: record.registeredBy || "Field Officer",
            syncStatus: "synced",
            syncedAt: new Date(),
            createdAt: record.createdAt ? new Date(record.createdAt) : new Date(),
          },
        });

        syncedCount++;
        syncedIds.push(record.id);

        // 3. Log audit trail
        await prisma.syncAuditLog.create({
          data: {
            batchId,
            farmerId: record.id,
            status: "SUCCESS",
            message: "Successfully synchronized from offline device",
            clientDeviceId: clientDeviceId || "unknown",
          },
        });
      } catch (err: any) {
        console.error(`[Sync] Error processing record ${record.id}:`, err);
        failedIds.push({
          id: record.id,
          reason: err?.message || "Failed to commit record to server database",
        });

        await prisma.syncAuditLog.create({
          data: {
            batchId,
            farmerId: record.id,
            status: "FAILED",
            message: err?.message || "Internal database commit error",
            clientDeviceId: clientDeviceId || "unknown",
          },
        });
      }
    }

    const response: SyncResult = {
      success: failedIds.length === 0,
      batchId,
      totalReceived: records.length,
      syncedCount,
      duplicateCount,
      failedCount: failedIds.length,
      syncedIds,
      failedIds,
      timestamp: new Date().toISOString(),
    };

    return NextResponse.json(response);
  } catch (error: any) {
    console.error("[/api/sync] Batch processing failure:", error);
    return NextResponse.json(
      { success: false, message: error?.message || "Internal server error" },
      { status: 500 }
    );
  }
}
