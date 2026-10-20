import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { db } from "@/lib/db";

// POST /api/friends/[friendshipId]/accept — mark a pending request as accepted
export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ friendshipId: string }> }
) {
  const me = await getAuthUser();
  if (!me) {
    return NextResponse.json(
      { error: "unauthenticated" },
      { status: 401 }
    );
  }
  const { friendshipId } = await params;
  const fr = await db.friendship.findUnique({ where: { id: friendshipId } });
  if (!fr) {
    return NextResponse.json({ error: "Request not found" }, { status: 404 });
  }
  if (fr.addresseeId !== me.id) {
    return NextResponse.json(
      { error: "Not yours to accept" },
      { status: 403 }
    );
  }
  if (fr.status !== "pending") {
    return NextResponse.json(
      { error: "Already handled" },
      { status: 400 }
    );
  }

  const updated = await db.friendship.update({
    where: { id: friendshipId },
    data: { status: "accepted" },
  });

  const other = await db.user.findUnique({ where: { id: updated.requesterId } });
  return NextResponse.json({
    id: updated.id,
    user: other
      ? {
          id: other.id,
          name: other.name,
          avatarColor: other.avatarColor,
          status: other.status,
          customStatus: other.customStatus,
          email: other.email,
          bio: other.bio,
          bannerColor: other.bannerColor,
          createdAt: other.createdAt,
        }
      : null,
  });
}
