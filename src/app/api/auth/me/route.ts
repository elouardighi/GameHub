import { NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";

// GET /api/auth/me — returns the authenticated user (or 401)
export async function GET() {
  const user = await getAuthUser();
  if (!user) {
    return NextResponse.json(
      { error: "unauthenticated" },
      { status: 401 }
    );
  }
  return NextResponse.json({
    id: user.id,
    email: user.email,
    name: user.name,
    avatarColor: user.avatarColor,
    status: user.status,
    customStatus: user.customStatus,
    bio: user.bio,
    bannerColor: user.bannerColor,
    settings: user.settings,
    createdAt: user.createdAt,
  });
}
