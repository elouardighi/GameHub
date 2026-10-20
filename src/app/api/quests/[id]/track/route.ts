import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { db } from "@/lib/db";

// POST /api/quests/[id]/track — toggles "tracking" (just returns success for the demo)
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
  return NextResponse.json({ ok: true, questId: id, tracked: true });
}
