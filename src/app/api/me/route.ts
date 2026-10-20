import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { db } from "@/lib/db";

// GET /api/me — return the authenticated user (replaces the old hardcoded NovaStrike demo user)
export async function GET() {
  const me = await getAuthUser();
  if (!me) {
    return NextResponse.json(
      { error: "unauthenticated" },
      { status: 401 }
    );
  }
  return NextResponse.json({
    id: me.id,
    email: me.email,
    name: me.name,
    avatarColor: me.avatarColor,
    status: me.status,
    customStatus: me.customStatus,
    bio: me.bio,
    bannerColor: me.bannerColor,
    settings: me.settings,
    createdAt: me.createdAt,
  });
}

// PATCH /api/me — update profile fields (name, bio, avatarColor, bannerColor, customStatus, status)
export async function PATCH(req: NextRequest) {
  const me = await getAuthUser();
  if (!me) {
    return NextResponse.json(
      { error: "unauthenticated" },
      { status: 401 }
    );
  }
  const body = await req.json().catch(() => ({}));

  const data: Record<string, unknown> = {};
  if (typeof body.name === "string" && body.name.trim().length >= 2) {
    data.name = body.name.trim();
  }
  if (typeof body.bio === "string" && body.bio.length <= 500) {
    data.bio = body.bio;
  }
  if (typeof body.avatarColor === "string") {
    data.avatarColor = body.avatarColor;
  }
  if (typeof body.bannerColor === "string") {
    data.bannerColor = body.bannerColor;
  }
  if (typeof body.customStatus === "string" && body.customStatus.length <= 200) {
    data.customStatus = body.customStatus || null;
  }
  if (
    typeof body.status === "string" &&
    ["online", "idle", "dnd", "offline"].includes(body.status)
  ) {
    data.status = body.status;
  }

  if (Object.keys(data).length === 0) {
    return NextResponse.json(
      { error: "No valid fields to update" },
      { status: 400 }
    );
  }

  const updated = await db.user.update({
    where: { id: me.id },
    data,
  });

  return NextResponse.json({
    id: updated.id,
    email: updated.email,
    name: updated.name,
    avatarColor: updated.avatarColor,
    status: updated.status,
    customStatus: updated.customStatus,
    bio: updated.bio,
    bannerColor: updated.bannerColor,
    settings: updated.settings,
    createdAt: updated.createdAt,
  });
}
