import { NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { db } from "@/lib/db";

// GET /api/seed-data — single-call initial page load payload, scoped to the authenticated user.
// Returns 401 if not authenticated.
export async function GET() {
  const me = await getAuthUser();
  if (!me) {
    return NextResponse.json(
      { error: "unauthenticated" },
      { status: 401 }
    );
  }

  // Servers: all public servers + any private server the user owns
  // (so new users still see the 5 public servers even though they were just created)
  const servers = await db.server.findMany({
    where: {
      OR: [{ isPublic: true }, { ownerId: me.id }],
    },
    orderBy: { createdAt: "asc" },
  });
  const allServers = await Promise.all(
    servers.map(async (s) => {
      const [channels, memberCount] = await Promise.all([
        db.channel.findMany({
          where: { serverId: s.id },
          orderBy: { position: "asc" },
        }),
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
        channelCount: channels.length,
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
        createdAt: s.createdAt,
      };
    })
  );

  const clans = await db.clan.findMany({ orderBy: { createdAt: "asc" } });
  const allClans = await Promise.all(
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

  // Friends buckets (scoped to authenticated user)
  const [friendsOut, friendsIn] = await Promise.all([
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
    ...friendsOut.map((f) => f.addressee),
    ...friendsIn.map((f) => f.requester),
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

  const pendingIncoming = (
    await db.friendship.findMany({
      where: { addresseeId: me.id, status: "pending" },
      include: { requester: true },
    })
  ).map((f) => ({
    id: f.id,
    user: {
      id: f.requester.id,
      name: f.requester.name,
      avatarColor: f.requester.avatarColor,
      status: f.requester.status,
      customStatus: f.requester.customStatus,
      email: f.requester.email,
      bio: f.requester.bio,
      bannerColor: f.requester.bannerColor,
      createdAt: f.requester.createdAt,
    },
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
      name: f.addressee.name,
      avatarColor: f.addressee.avatarColor,
      status: f.addressee.status,
      customStatus: f.addressee.customStatus,
      email: f.addressee.email,
      bio: f.addressee.bio,
      bannerColor: f.addressee.bannerColor,
      createdAt: f.addressee.createdAt,
    },
  }));

  // Quests with progress (scoped; defaults to 0 if no progress record)
  const quests = await db.quest.findMany({ orderBy: { createdAt: "asc" } });
  const progress = await db.questProgress.findMany({
    where: { userId: me.id },
  });
  const progressByQuest = new Map(progress.map((p) => [p.questId, p]));
  const allQuests = quests.map((q) => {
    const p = progressByQuest.get(q.id);
    return {
      id: q.id,
      title: q.title,
      description: q.description,
      game: q.game,
      reward: q.reward,
      pointsReward: q.pointsReward,
      progressGoal: q.progressGoal,
      progress: p?.progress ?? 0,
      completed: p?.completed ?? false,
    };
  });

  // Activities
  const activities = await db.activity.findMany({
    orderBy: { createdAt: "asc" },
  });
  const allActivities = activities.map((a) => ({
    id: a.id,
    name: a.name,
    description: a.description,
    emoji: a.emoji,
    category: a.category,
    maxPlayers: a.maxPlayers,
  }));

  return NextResponse.json({
    currentUser: {
      id: me.id,
      email: me.email,
      name: me.name,
      avatarColor: me.avatarColor,
      status: me.status,
      customStatus: me.customStatus,
      bio: me.bio,
      bannerColor: me.bannerColor,
      settings: me.settings,
      createdAt: me.createdAt,
    },
    allServers,
    allClans,
    friends,
    pendingIncoming,
    pendingOutgoing,
    quests: allQuests,
    activities: allActivities,
  });
}
