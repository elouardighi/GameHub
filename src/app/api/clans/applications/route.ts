import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { db } from "@/lib/db";

// GET /api/clans/applications — list the authenticated user's clan applications
export async function GET() {
  const me = await getAuthUser();
  if (!me) {
    return NextResponse.json(
      { error: "unauthenticated" },
      { status: 401 }
    );
  }
  const apps = await db.clanApplication.findMany({
    where: { userId: me.id },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(
    apps.map((a) => ({
      id: a.id,
      clanId: a.clanId,
      userId: a.userId,
      answer: a.answer,
      status: a.status,
      createdAt: a.createdAt,
      reviewedAt: a.reviewedAt,
    }))
  );
}
