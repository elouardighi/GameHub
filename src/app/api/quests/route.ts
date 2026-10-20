import { NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { db } from "@/lib/db";

// GET /api/quests — all quests with the authenticated user's progress
export async function GET() {
  const me = await getAuthUser();
  if (!me) {
    return NextResponse.json(
      { error: "unauthenticated" },
      { status: 401 }
    );
  }

  const quests = await db.quest.findMany({
    orderBy: { createdAt: "asc" },
  });

  const progress = await db.questProgress.findMany({
    where: { userId: me.id },
  });
  const progressByQuest = new Map(progress.map((p) => [p.questId, p]));

  const result = quests.map((q) => {
    const p = progressByQuest.get(q.id);
    return {
      id: q.id,
      title: q.title,
      description: q.description,
      game: q.game,
      reward: q.reward,
      pointsReward: q.pointsReward,
      progressGoal: q.progressGoal,
      progress: p?.progress ?? 0,
      completed: p?.completed ?? false,
    };
  });

  return NextResponse.json(result);
}
