import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { db } from "@/lib/db";

// GET /api/servers — list all servers with their channel + member counts
export async function GET() {
  const servers = await db.server.findMany({
    orderBy: { createdAt: "asc" },
  });

  const enriched = await Promise.all(
    servers.map(async (s) => {
      const [channelCount, memberCount] = await Promise.all([
        db.channel.count({ where: { serverId: s.id } }),
        db.member.count({ where: { serverId: s.id } }),
      ]);
      return {
        id: s.id,
        name: s.name,
        iconColor: s.iconColor,
        bannerColor: s.bannerColor,
        description: s.description,
        ownerId: s.ownerId,
        inviteCode: s.inviteCode,
        isPublic: s.isPublic,
        verified: s.verified,
        partnered: s.partnered,
        memberCount,
        channelCount,
        createdAt: s.createdAt,
      };
    })
  );

  return NextResponse.json(enriched);
}

// POST /api/servers — create a new server. The authenticated user becomes the owner.
export async function POST(req: NextRequest) {
  const me = await getAuthUser();
  if (!me) {
    return NextResponse.json(
      { error: "unauthenticated" },
      { status: 401 }
    );
  }
  const body = await req.json().catch(() => ({}));
  const name: string = (body.name ?? "New Server").toString();
  const iconColor: string = (body.iconColor ?? "#d4a03a").toString();
  const bannerColor: string | null = body.bannerColor ?? null;
  const description: string | null = body.description ?? null;

  const server = await db.server.create({
    data: {
      name,
      iconColor,
      bannerColor: bannerColor ?? undefined,
      description: description ?? undefined,
      ownerId: me.id,
      isPublic: true,
      memberCount: 1,
    },
  });

  // Owner membership
  await db.member.create({
    data: { serverId: server.id, userId: me.id, isOwner: true },
  });

  // Default roles
  await db.role.createMany({
    data: [
      { serverId: server.id, name: "@everyone", color: "#99AAB5", position: 0, isDefault: true, mentionable: true },
      { serverId: server.id, name: "Members", color: "#6b8b3a", position: 1, mentionable: true },
      { serverId: server.id, name: "Pro", color: "#c44a8b", position: 2, mentionable: true },
      { serverId: server.id, name: "Moderators", color: "#8bb04a", position: 3, mentionable: true },
      { serverId: server.id, name: "Admins", color: "#d4a03a", position: 4, mentionable: true },
      { serverId: server.id, name: "Owner", color: "#b04a4a", position: 5, mentionable: true },
    ],
  });

  // Default channels (Discord-like minimal set)
  const channels = [
    { name: "welcome", type: "rules", topic: "Welcome! Read the rules first." },
    { name: "announcements", type: "announcement", topic: "Official announcements." },
    { name: "general", type: "text", topic: "General chat." },
    { name: "general-voice", type: "voice", topic: "Hang out voice channel" },
  ];
  for (let i = 0; i < channels.length; i++) {
    const c = channels[i];
    await db.channel.create({
      data: {
        serverId: server.id,
        name: c.name,
        type: c.type,
        topic: c.topic,
        position: i,
        userLimit: c.type === "voice" ? 10 : null,
      },
    });
  }

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
    memberCount: 1,
    channelCount: channels.length,
    createdAt: server.createdAt,
  });
}
