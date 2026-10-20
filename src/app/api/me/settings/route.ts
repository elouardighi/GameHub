import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { db } from "@/lib/db";

// PATCH /api/me/settings — update voice/video settings (stored as JSON on user.settings)
export async function PATCH(req: NextRequest) {
  const me = await getAuthUser();
  if (!me) {
    return NextResponse.json(
      { error: "unauthenticated" },
      { status: 401 }
    );
  }

  const body = await req.json().catch(() => ({}));

  // Merge with any existing settings JSON
  let existing: Record<string, unknown> = {};
  try {
    existing = me.settings ? JSON.parse(me.settings) : {};
  } catch {
    existing = {};
  }

  const merged = { ...existing, ...body };

  const updated = await db.user.update({
    where: { id: me.id },
    data: { settings: JSON.stringify(merged) },
  });

  return NextResponse.json({
    ok: true,
    settings: JSON.parse(updated.settings ?? "{}"),
  });
}
