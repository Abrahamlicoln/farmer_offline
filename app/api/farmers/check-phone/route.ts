import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const phone = searchParams.get("phone");

    if (!phone || phone.trim().length < 8) {
      return NextResponse.json({ exists: false });
    }

    const cleanPhone = phone.trim();

    const existing = await prisma.farmer.findFirst({
      where: {
        phoneNumber: cleanPhone,
      },
      select: {
        id: true,
        fullName: true,
        stateName: true,
        village: true,
        createdAt: true,
      },
    });

    if (existing) {
      return NextResponse.json({
        exists: true,
        farmer: existing,
      });
    }

    return NextResponse.json({ exists: false });
  } catch (error: any) {
    // Fail safely without blocking offline operations
    return NextResponse.json({ exists: false, error: error?.message });
  }
}
