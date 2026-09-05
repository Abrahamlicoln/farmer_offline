import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const logs = await prisma.syncAuditLog.findMany({
      orderBy: { timestamp: "desc" },
      take: 50,
    });
    return NextResponse.json({ success: true, logs });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error?.message || "Failed to fetch logs" },
      { status: 500 }
    );
  }
}
