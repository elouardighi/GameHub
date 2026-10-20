import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { db } from "@/lib/db";

// DELETE /api/friends/[friendshipId]
// Handles two cases:
// 1. The param is a Friendship id → delete that row directly.
// 2. The param is a User id (the "other" user) → look up the friendship row by
//    (current user ↔ other user) and delete it.
// This makes the unfriend flow easier from the client side.
export async function DELETE(
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

  // 1. Try as friendship id
  let fr = await db.friendship.findUnique({ where: { id: friendshipId } });
  if (fr) {
    if (fr.addresseeId !== me.id && fr.requesterId !== me.id) {
      return NextResponse.json(
        { error: "Not yours to remove" },
        { status: 403 }
      );
    }
    await db.friendship.delete({ where: { id: friendshipId } });
    return NextResponse.json({ ok: true });
  }

  // 2. Treat as userId (the other side) and find any friendship between them
  fr = await db.friendship.findUnique({
    where: {
      requesterId_addresseeId: { requesterId: me.id, addresseeId: friendshipId },
    },
  });
  if (!fr) {
    fr = await db.friendship.findUnique({
      where: {
        requesterId_addresseeId: { requesterId: friendshipId, addresseeId: me.id },
      },
    });
  }
  if (!fr) {
    return NextResponse.json({ error: "Friendship not found" }, { status: 404 });
  }
  await db.friendship.delete({ where: { id: fr.id } });
  return NextResponse.json({ ok: true });
}
