import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { db } from "@/lib/db";

// POST /api/quests/[id]/increment — increment progress by 1 (for the "I did it!" button)
// Upserts the QuestProgress row.
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

  if (existing) {
    if (existing.completed) {
      // Already claimed — don't allow further increments past the goal
      return NextResponse.json({
        id: quest.id,
        progress: existing.progress,
        completed: true,
      });
    }
    const next = Math.min(quest.progressGoal, existing.progress + 1);
    const updated = await db.questProgress.update({
      where: { id: existing.id },
      data: { progress: next },
    });
    return NextResponse.json({
      id: quest.id,
      progress: updated.progress,
      completed: updated.completed,
    });
  }

  const created = await db.questProgress.create({
    data: {
      questId: id,
      userId: me.id,
      progress: 1,
    },
  });
  return NextResponse.json({
    id: quest.id,
    progress: created.progress,
    completed: created.completed,
  });
}
