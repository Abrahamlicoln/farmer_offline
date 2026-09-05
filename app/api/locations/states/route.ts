import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { NIGERIA_STATES } from "@/data/locations-seed";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const states = await prisma.state.findMany({
      orderBy: { name: "asc" },
      select: { code: true, name: true },
    });

    if (states && states.length > 0) {
      return NextResponse.json({ success: true, data: states });
    }

    // Fallback to static seed if database not yet migrated
    return NextResponse.json({ success: true, data: NIGERIA_STATES });
  } catch {
    return NextResponse.json({ success: true, data: NIGERIA_STATES });
  }
}
