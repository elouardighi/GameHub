import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { db } from "@/lib/db";

// POST /api/quests/[id]/claim — claims the reward for a completed quest
// Only allowed when progress >= progressGoal.
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
  const quest = await db.quest.findUnique({ where: { id } });
  if (!quest) {
    return NextResponse.json({ error: "Quest not found" }, { status: 404 });
  }

  const existing = await db.questProgress.findUnique({
    where: { questId_userId: { questId: id, userId: me.id } },
  });
  if (!existing) {
    return NextResponse.json(
      { error: "Quest not started yet" },
      { status: 400 }
    );
  }
  if (existing.completed) {
    return NextResponse.json(
      { error: "Reward already claimed" },
      { status: 400 }
    );
  }
  if (existing.progress < quest.progressGoal) {
    return NextResponse.json(
      { error: "Goal not reached yet" },
      { status: 400 }
    );
  }

  const updated = await db.questProgress.update({
    where: { id: existing.id },
    data: { completed: true, completedAt: new Date() },
  });

  return NextResponse.json({
    id: quest.id,
    progress: updated.progress,
    completed: updated.completed,
    points: quest.pointsReward,
    reward: quest.reward,
  });
}
