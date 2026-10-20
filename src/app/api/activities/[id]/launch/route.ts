import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { db } from "@/lib/db";

// POST /api/activities/[id]/launch — records an ActivityParticipant row (best-effort)
export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const me = await getAuthUser();
  if (!me) {
    return NextResponse.json(
      { error: "unauthenticated" },
      { status: 401 }
    );
  }
  const { id } = await params;
  const activity = await db.activity.findUnique({ where: { id } });
  if (!activity) {
    return NextResponse.json({ error: "Activity not found" }, { status: 404 });
  }

  // upsert participation
  const existing = await db.activityParticipant.findUnique({
    where: { activityId_userId: { activityId: id, userId: me.id } },
  });
  if (!existing) {
    await db.activityParticipant.create({
      data: { activityId: id, userId: me.id },
    });
  }

  return NextResponse.json({
    ok: true,
    activity: {
      id: activity.id,
      name: activity.name,
      emoji: activity.emoji,
      category: activity.category,
      maxPlayers: activity.maxPlayers,
    },
  });
}
