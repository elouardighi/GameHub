import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { db } from "@/lib/db";

// GET /api/servers/[id]/search?q=...
// Searches Message.content LIKE %q% on any channel in this server.
export async function GET(
  req: NextRequest,
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
  const q = (new URL(req.url).searchParams.get("q") ?? "").trim();
  if (q.length < 2) {
    return NextResponse.json({ results: [] });
  }

  const channelIds = (
    await db.channel.findMany({
      where: { serverId: id },
      select: { id: true, name: true },
    })
  ).map((c) => ({ id: c.id, name: c.name }));
  const channelMap = new Map(channelIds.map((c) => [c.id, c.name]));

  const messages = await db.message.findMany({
    where: {
      channelId: { in: channelIds.map((c) => c.id) },
      content: { contains: q },
    },
    include: { user: true, channel: true },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  const results = messages.map((m) => ({
    id: m.id,
    channelId: m.channelId,
    channelName: channelMap.get(m.channelId) ?? m.channel.name,
    userId: m.userId,
    username: m.user.name,
    avatarColor: m.user.avatarColor,
    content: m.content,
    timestamp: m.createdAt.toISOString(),
  }));

  return NextResponse.json({ results });
}
