import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const [users, farmers] = await Promise.all([
      prisma.user.findMany({
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          fullName: true,
          email: true,
          role: true,
          createdAt: true,
          updatedAt: true,
        },
      }),
      prisma.farmer.findMany({
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          fullName: true,
          phoneNumber: true,
          stateCode: true,
          stateName: true,
          lgaName: true,
          village: true,
          programme: true,
          registeredBy: true,
          syncStatus: true,
          createdAt: true,
        },
      }),
    ]);

    const officersWithFarmers = users.map((user: { id: string; fullName: string; email: string; role: string; createdAt: Date; updatedAt: Date }) => {
      const userFullLower = user.fullName.toLowerCase();
      const userBaseLower = user.fullName.replace(/\s*\([^)]*\)/g, "").trim().toLowerCase();
      const userEmailLower = user.email.toLowerCase();

      const userFarmers = farmers.filter((f: { registeredBy: string | null; [key: string]: any }) => {
        const reg = (f.registeredBy || "").toLowerCase().trim();
        if (!reg) return false;
        return (
          reg === userFullLower ||
          reg === userBaseLower ||
          reg.includes(userBaseLower) ||
          userFullLower.includes(reg) ||
          (user.email && reg.includes(userEmailLower))
        );
      });

      return {
        ...user,
        farmerCount: userFarmers.length,
        farmers: userFarmers,
      };
    });

    return NextResponse.json({
      success: true,
      officers: officersWithFarmers,
      total: officersWithFarmers.length,
      totalFarmersRegistered: farmers.length,
      farmers,
    });
  } catch (error: any) {
    console.error("[GET /api/admin/officers] Error fetching officers:", error);
    return NextResponse.json(
      { success: false, message: error?.message || "Failed to fetch officers." },
      { status: 500 }
    );
  }
}


export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { fullName, email, password, role } = body;

    if (!fullName || !email || !password) {
      return NextResponse.json(
        { success: false, message: "Full name, email address, and password are required." },
        { status: 400 }
      );
    }

    const cleanEmail = String(email).trim().toLowerCase();
    const cleanName = String(fullName).trim();
    const cleanPassword = String(password).trim();
    const cleanRole = role === "admin" ? "admin" : "officer";

    // Validate email format
    if (!cleanEmail.includes("@") || !cleanEmail.includes(".")) {
      return NextResponse.json(
        { success: false, message: "Please provide a valid email address." },
        { status: 400 }
      );
    }

    if (cleanPassword.length < 6) {
      return NextResponse.json(
        { success: false, message: "Password must be at least 6 characters long." },
        { status: 400 }
      );
    }

    // Check for existing user
    const existing = await prisma.user.findUnique({
      where: { email: cleanEmail },
    });

    if (existing) {
      return NextResponse.json(
        { success: false, message: `An account with email "${cleanEmail}" already exists.` },
        { status: 409 }
      );
    }

    // Create user in Neon PostgreSQL
    const newUser = await prisma.user.create({
      data: {
        fullName: cleanName,
        email: cleanEmail,
        password: cleanPassword,
        role: cleanRole,
      },
      select: {
        id: true,
        fullName: true,
        email: true,
        role: true,
        createdAt: true,
      },
    });

    return NextResponse.json(
      {
        success: true,
        message: `${cleanRole === "admin" ? "Administrator" : "Field Officer"} account registered successfully.`,
        officer: newUser,
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error("[POST /api/admin/officers] Error creating officer:", error);
    return NextResponse.json(
      { success: false, message: error?.message || "Failed to create officer account." },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { success: false, message: "User ID is required." },
        { status: 400 }
      );
    }

    await prisma.user.delete({
      where: { id },
    });

    return NextResponse.json({
      success: true,
      message: "Officer account deleted successfully.",
    });
  } catch (error: any) {
    console.error("[DELETE /api/admin/officers] Error deleting officer:", error);
    return NextResponse.json(
      { success: false, message: error?.message || "Failed to delete officer account." },
      { status: 500 }
    );
  }
}
