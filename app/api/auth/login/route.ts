import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json();

    if (!email || !password) {
      return NextResponse.json(
        { success: false, message: "Email and password are required." },
        { status: 400 }
      );
    }

    const cleanEmail = String(email).trim().toLowerCase();
    const cleanPassword = String(password).trim();

    // Query Neon PostgreSQL
    const user = await prisma.user.findUnique({
      where: { email: cleanEmail },
    });

    if (!user || user.password !== cleanPassword) {
      return NextResponse.json(
        { success: false, message: "Invalid email or password." },
        { status: 401 }
      );
    }

    // Generate JSON Web Token / Bearer Token
    const payload = {
      userId: user.id,
      email: user.email,
      fullName: user.fullName,
      role: user.role,
      issuedAt: Date.now(),
    };

    const token = `oaf_jwt_${Buffer.from(JSON.stringify(payload)).toString("base64")}`;

    return NextResponse.json({
      success: true,
      token,
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        role: user.role,
      },
    });
  } catch (error: any) {
    console.error("[Auth API] Login error:", error);
    return NextResponse.json(
      { success: false, message: "Server authentication error." },
      { status: 500 }
    );
  }
}
