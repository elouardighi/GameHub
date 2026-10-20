import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

// GET /api/servers/[id] — server with all channels + member count
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const server = await db.server.findUnique({ where: { id } });
  if (!server) {
    return NextResponse.json({ error: "Server not found" }, { status: 404 });
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
