import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({
    status: "ok",
    message: "One Acre Fund Central Server is reachable",
    timestamp: new Date().toISOString(),
  });
}
