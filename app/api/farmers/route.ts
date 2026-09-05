import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search") || "";
    const state = searchParams.get("state") || "";
    const programme = searchParams.get("programme") || "";
    const lga = searchParams.get("lga") || "";
    const officer = searchParams.get("officer") || "";

    // Build filter where clause
    const where: any = {};

    if (officer) {
      where.registeredBy = { contains: officer, mode: "insensitive" };
    }

    if (state) {
      where.stateName = { equals: state, mode: "insensitive" };
    }

    if (programme) {
      where.programme = { equals: programme, mode: "insensitive" };
    }

    if (lga) {
      where.lgaName = { equals: lga, mode: "insensitive" };
    }

    if (search) {
      where.OR = [
        { fullName: { contains: search, mode: "insensitive" } },
        { phoneNumber: { contains: search, mode: "insensitive" } },
        { id: { contains: search, mode: "insensitive" } },
        { village: { contains: search, mode: "insensitive" } },
      ];
    }

    // Fetch farmers
    const farmers = await prisma.farmer.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: 100,
    });

    const totalCount = await prisma.farmer.count();

    // Aggregations for dashboard analytics
    const stateGroups = await prisma.farmer.groupBy({
      by: ["stateName"],
      _count: { id: true },
      orderBy: { _count: { id: "desc" } },
    });

    const programmeGroups = await prisma.farmer.groupBy({
      by: ["programme"],
      _count: { id: true },
      orderBy: { _count: { id: "desc" } },
    });

    const lgaGroups = await prisma.farmer.groupBy({
      by: ["lgaName", "stateName"],
      _count: { id: true },
      orderBy: { _count: { id: "desc" } },
      take: 10,
    });

    return NextResponse.json({
      success: true,
      total: totalCount,
      farmers,
      analytics: {
        stateDistribution: stateGroups.map((g: any) => ({
          stateName: g.stateName,
          count: g._count.id,
        })),
        programmeDistribution: programmeGroups.map((g: any) => ({
          programme: g.programme,
          count: g._count.id,
        })),
        lgaDistribution: lgaGroups.map((g: any) => ({
          lgaName: g.lgaName,
          stateName: g.stateName,
          count: g._count.id,
        })),
      },
    });
  } catch (error: any) {
    console.error("[GET /api/farmers] Error fetching farmers:", error);
    return NextResponse.json(
      { success: false, message: error?.message || "Failed to fetch farmers" },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const farmerId = searchParams.get("id");

    if (farmerId) {
      await prisma.farmer.delete({
        where: { id: farmerId },
      });
      return NextResponse.json({
        success: true,
        message: `Farmer ${farmerId} deleted successfully.`,
      });
    }

    // Clear all farmer records and sync logs
    const result = await prisma.farmer.deleteMany();
    await prisma.syncAuditLog.deleteMany();

    return NextResponse.json({
      success: true,
      message: `Successfully cleared ${result.count} farmer records.`,
      deletedCount: result.count,
    });
  } catch (error: any) {
    console.error("[DELETE /api/farmers] Error deleting records:", error);
    return NextResponse.json(
      { success: false, message: error?.message || "Failed to delete records" },
      { status: 500 }
    );
  }
}
