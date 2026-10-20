import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { db } from "@/lib/db";

// POST /api/servers/[id]/join — add the authenticated user as a member if they aren't already.
// Returns the server with channels so the client can switch to it.
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
  const server = await db.server.findUnique({ where: { id } });
  if (!server) {
    return NextResponse.json({ error: "Server not found" }, { status: 404 });
  }

  const existing = await db.member.findUnique({
    where: { serverId_userId: { serverId: id, userId: me.id } },
  });
  if (!existing) {
    await db.member.create({
      data: { serverId: id, userId: me.id, isOwner: false },
    });
    await db.server.update({
      where: { id },
      data: { memberCount: { increment: 1 } },
    });
  }

  const channels = await db.channel.findMany({
    where: { serverId: id },
    orderBy: { position: "asc" },
  });
  const memberCount = await db.member.count({ where: { serverId: id } });

  return NextResponse.json({
    id: server.id,
    name: server.name,
    iconColor: server.iconColor,
    bannerColor: server.bannerColor,
    description: server.description,
    ownerId: server.ownerId,
    inviteCode: server.inviteCode,
    isPublic: server.isPublic,
    verified: server.verified,
    partnered: server.partnered,
    memberCount,
    channels: channels.map((c) => ({
      id: c.id,
      serverId: c.serverId,
      name: c.name,
      type: c.type,
      topic: c.topic,
      categoryId: c.categoryId,
      position: c.position,
      isPrivate: c.isPrivate,
      userLimit: c.userLimit,
      bitrate: c.bitrate,
      createdAt: c.createdAt,
    })),
    createdAt: server.createdAt,
  });
}
