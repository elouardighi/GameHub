import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

// GET /api/servers/[id]/members — members with user info + synthesized roles
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const server = await db.server.findUnique({ where: { id } });
  if (!server) {
    return NextResponse.json({ error: "Server not found" }, { status: 404 });
  }

  const members = await db.member.findMany({
    where: { serverId: id },
    include: { user: true },
    orderBy: [{ isOwner: "desc" }, { joinedAt: "asc" }],
  });

  // Synthesize roles based on owner flag + user index (Discord-like).
  // Just keep it simple: owners get "Owner", first 3 members get "Pro", etc.
  const result = members.map((m, idx) => {
    let role: { name: string; color: string } = {
      name: "MEMBERS",
      color: "#99AAB5",
    };
    if (m.isOwner) {
      role = { name: "OWNER", color: "#b04a4a" };
    } else if (idx <= 2) {
      role = { name: "PRO", color: "#c44a8b" };
    } else if (idx <= 4) {
      role = { name: "MODERATORS", color: "#8bb04a" };
    }

    return {
      id: m.id,
      serverId: m.serverId,
      userId: m.userId,
      nickname: m.nickname,
      joinedAt: m.joinedAt,
      isOwner: m.isOwner,
      role: role.name,
      roleColor: role.color,
      user: {
        id: m.user.id,
        email: m.user.email,
        name: m.user.name,
        avatarColor: m.user.avatarColor,
        status: m.user.status,
        customStatus: m.user.customStatus,
        bio: m.user.bio,
        bannerColor: m.user.bannerColor,
        createdAt: m.user.createdAt,
      },
    };
  });

  return NextResponse.json(result);
}
