import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { db } from "@/lib/db";

// POST /api/friends/[friendshipId]/reject — deletes the pending request (ignore)
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
  // Either side can reject their pending request
  if (fr.addresseeId !== me.id && fr.requesterId !== me.id) {
    return NextResponse.json(
      { error: "Not yours to reject" },
      { status: 403 }
    );
  }
  await db.friendship.delete({ where: { id: friendshipId } });
  return NextResponse.json({ ok: true });
}
