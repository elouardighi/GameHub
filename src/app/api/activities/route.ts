import { NextResponse } from "next/server";
import { db } from "@/lib/db";

// GET /api/activities — all activities
export async function GET() {
  const activities = await db.activity.findMany({
    orderBy: { createdAt: "asc" },
  });

  return NextResponse.json(
    activities.map((a) => ({
      id: a.id,
      name: a.name,
      description: a.description,
      emoji: a.emoji,
      category: a.category,
      maxPlayers: a.maxPlayers,
    }))
  );
}
