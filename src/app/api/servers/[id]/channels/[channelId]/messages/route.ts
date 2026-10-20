import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { db } from "@/lib/db";

// Group reactions by emoji with count + did the current user react
function groupReactions(
  reactions: { emoji: string; userId: string }[],
  currentUserId: string
) {
  const map = new Map<string, { count: number; reactedByMe: boolean }>();
  for (const r of reactions) {
    const cur = map.get(r.emoji) ?? { count: 0, reactedByMe: false };
    cur.count += 1;
    if (r.userId === currentUserId) cur.reactedByMe = true;
    map.set(r.emoji, cur);
  }
  return Array.from(map.entries()).map(([emoji, v]) => ({
    emoji,
    count: v.count,
    reactedByMe: v.reactedByMe,
  }));
}

// GET /api/servers/[id]/channels/[channelId]/messages
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; channelId: string }> }
) {
  const me = await getAuthUser();
  if (!me) {
    return NextResponse.json(
      { error: "unauthenticated" },
      { status: 401 }
    );
  }

  const { channelId } = await params;
  const channel = await db.channel.findUnique({ where: { id: channelId } });
  if (!channel) {
    return NextResponse.json({ error: "Channel not found" }, { status: 404 });
  }

  const messages = await db.message.findMany({
    where: { channelId, threadId: null },
    include: {
      user: true,
      reactions: true,
    },
    orderBy: { createdAt: "asc" },
    take: 200,
  });

  // Index for reply resolution
  const byId = new Map(messages.map((m) => [m.id, m]));

  const result = messages.map((m) => {
    const reply = m.replyToId ? byId.get(m.replyToId) : null;
    return {
      id: m.id,
      channelId: m.channelId,
      userId: m.userId,
      username: m.user.name,
      avatarColor: m.user.avatarColor,
      content: m.content,
      timestamp: m.createdAt.toISOString(),
      isPinned: m.isPinned,
      isEdited: m.isEdited,
      replyToId: m.replyToId,
      replyTo: reply
        ? {
            id: reply.id,
            userId: reply.userId,
            username: reply.user.name,
            content: reply.content,
          }
        : null,
      reactions: groupReactions(
        m.reactions.map((r) => ({ emoji: r.emoji, userId: r.userId })),
        me.id
      ),
    };
  });

  return NextResponse.json(result);
}

// POST — persist a message then return it (so chat history is durable across reloads)
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; channelId: string }> }
) {
  const me = await getAuthUser();
  if (!me) {
    return NextResponse.json(
      { error: "unauthenticated" },
      { status: 401 }
    );
  }

  const { channelId } = await params;
  const body = await req.json().catch(() => ({}));
  const content: string = (body.content ?? "").toString();
  const replyToId: string | null = body.replyToId ?? null;

  if (!content.trim()) {
    return NextResponse.json(
      { error: "content required" },
      { status: 400 }
    );
  }

  const created = await db.message.create({
    data: {
      channelId,
      userId: me.id,
      content,
      replyToId: replyToId ?? null,
    },
    include: { user: true },
  });

  return NextResponse.json({
    id: created.id,
    channelId: created.channelId,
    userId: created.userId,
    username: created.user.name,
    avatarColor: created.user.avatarColor,
    content: created.content,
    timestamp: created.createdAt.toISOString(),
    isPinned: created.isPinned,
    isEdited: created.isEdited,
    replyToId: created.replyToId,
    reactions: [],
  });
}
