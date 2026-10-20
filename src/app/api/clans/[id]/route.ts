import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

// GET /api/clans/[id] — clan with members + user info
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const clan = await db.clan.findUnique({ where: { id } });
  if (!clan) {
    return NextResponse.json({ error: "Clan not found" }, { status: 404 });
  }

  const members = await db.clanMember.findMany({
    where: { clanId: id },
    include: { user: true },
    orderBy: [{ role: "desc" }, { joinedAt: "asc" }],
  });

  return NextResponse.json({
    id: clan.id,
    name: clan.name,
    tag: clan.tag,
    badgeColor: clan.badgeColor,
    bannerColor: clan.bannerColor,
    bannerStyle: clan.bannerStyle,
    description: clan.description,
    ownerId: clan.ownerId,
    inviteCode: clan.inviteCode,
    games: clan.games,
    playstyle: clan.playstyle,
    minAge: clan.minAge,
    memberCount: members.length,
    applicationQuestion: clan.applicationQuestion,
    members: members.map((m) => ({
      id: m.id,
      clanId: m.clanId,
      userId: m.userId,
      role: m.role,
      joinedAt: m.joinedAt,
      user: {
        id: m.user.id,
        name: m.user.name,
        avatarColor: m.user.avatarColor,
        status: m.user.status,
        customStatus: m.user.customStatus,
        email: m.user.email,
        bannerColor: m.user.bannerColor,
        bio: m.user.bio,
        createdAt: m.user.createdAt,
      },
    })),
    createdAt: clan.createdAt,
  });
}
