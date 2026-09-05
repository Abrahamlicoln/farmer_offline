import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { NIGERIA_LGAS } from "@/data/locations-seed";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const stateId = searchParams.get("state_id") || searchParams.get("stateCode");

  try {
    if (stateId) {
      const lgas = await prisma.lga.findMany({
        where: { stateId },
        orderBy: { name: "asc" },
        select: { id: true, code: true, name: true, stateId: true },
      });

      if (lgas && lgas.length > 0) {
        return NextResponse.json({ success: true, data: lgas });
      }

      // Fallback to seed data
      const filtered = NIGERIA_LGAS.filter((l) => l.stateId === stateId);
      return NextResponse.json({ success: true, data: filtered });
    }

    const allLgas = await prisma.lga.findMany({
      orderBy: { name: "asc" },
      take: 200,
    });
    return NextResponse.json({
      success: true,
      data: allLgas.length > 0 ? allLgas : NIGERIA_LGAS,
    });
  } catch {
    const filtered = stateId
      ? NIGERIA_LGAS.filter((l) => l.stateId === stateId)
      : NIGERIA_LGAS;
    return NextResponse.json({ success: true, data: filtered });
  }
}
