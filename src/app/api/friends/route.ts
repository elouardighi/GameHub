import { NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { db } from "@/lib/db";

// GET /api/friends — friendships for the authenticated user, split into three buckets
export async function GET() {
  const me = await getAuthUser();
  if (!me) {
    return NextResponse.json(
      { error: "unauthenticated" },
      { status: 401 }
    );
  }

  const [outgoing, incoming] = await Promise.all([
    db.friendship.findMany({
      where: { requesterId: me.id, status: "accepted" },
      include: { addressee: true },
    }),
    db.friendship.findMany({
      where: { addresseeId: me.id, status: "accepted" },
      include: { requester: true },
    }),
  ]);

  const friends = [
    ...outgoing.map((f) => f.addressee),
    ...incoming.map((f) => f.requester),
  ].map((u) => ({
    id: u.id,
    email: u.email,
    name: u.name,
    avatarColor: u.avatarColor,
    status: u.status,
    customStatus: u.customStatus,
    bio: u.bio,
    bannerColor: u.bannerColor,
    createdAt: u.createdAt,
  }));

  const pendingOutgoing = (
    await db.friendship.findMany({
      where: { requesterId: me.id, status: "pending" },
      include: { addressee: true },
    })
  ).map((f) => ({
    id: f.id,
    user: {
      id: f.addressee.id,
      email: f.addressee.email,
      name: f.addressee.name,
      avatarColor: f.addressee.avatarColor,
      status: f.addressee.status,
      customStatus: f.addressee.customStatus,
      bio: f.addressee.bio,
      bannerColor: f.addressee.bannerColor,
      createdAt: f.addressee.createdAt,
    },
  }));

  const pendingIncoming = (
    await db.friendship.findMany({
      where: { addresseeId: me.id, status: "pending" },
      include: { requester: true },
    })
  ).map((f) => ({
    id: f.id,
    user: {
      id: f.requester.id,
      email: f.requester.email,
      name: f.requester.name,
      avatarColor: f.requester.avatarColor,
      status: f.requester.status,
      customStatus: f.requester.customStatus,
      bio: f.requester.bio,
      bannerColor: f.requester.bannerColor,
      createdAt: f.requester.createdAt,
    },
  }));

  return NextResponse.json({
    friends,
    pendingIncoming,
    pendingOutgoing,
  });
}
