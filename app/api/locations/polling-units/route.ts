import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { NIGERIA_POLLING_UNITS } from "@/data/locations-seed";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const lgaId = searchParams.get("lga_id");
  const stateId = searchParams.get("state_id");

  try {
    const where: any = {};
    if (lgaId) where.lgaId = lgaId;
    if (stateId) where.stateId = stateId;

    const units = await prisma.pollingUnit.findMany({
      where,
      orderBy: { name: "asc" },
      take: 100,
    });

    if (units && units.length > 0) {
      return NextResponse.json({ success: true, data: units });
    }

    // Fallback to static seed
    let filtered = NIGERIA_POLLING_UNITS;
    if (lgaId) filtered = filtered.filter((u) => u.lgaId === lgaId);
    if (stateId) filtered = filtered.filter((u) => u.stateId === stateId);

    return NextResponse.json({ success: true, data: filtered });
  } catch {
    let filtered = NIGERIA_POLLING_UNITS;
    if (lgaId) filtered = filtered.filter((u) => u.lgaId === lgaId);
    if (stateId) filtered = filtered.filter((u) => u.stateId === stateId);
    return NextResponse.json({ success: true, data: filtered });
  }
}
