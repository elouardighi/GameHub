import { NextResponse } from "next/server";
import { db } from "@/lib/db";

// GET /api/clans — list all clans with member count
export async function GET() {
  const clans = await db.clan.findMany({
    orderBy: { createdAt: "asc" },
  });

  const enriched = await Promise.all(
    clans.map(async (c) => {
      const memberCount = await db.clanMember.count({
        where: { clanId: c.id },
      });
      return {
        id: c.id,
        name: c.name,
        tag: c.tag,
        badgeColor: c.badgeColor,
        bannerColor: c.bannerColor,
        bannerStyle: c.bannerStyle,
        description: c.description,
        ownerId: c.ownerId,
        inviteCode: c.inviteCode,
        games: c.games,
        playstyle: c.playstyle,
        minAge: c.minAge,
        memberCount,
        applicationQuestion: c.applicationQuestion,
        createdAt: c.createdAt,
      };
    })
  );

  return NextResponse.json(enriched);
}
