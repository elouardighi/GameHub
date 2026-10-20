import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { db } from "@/lib/db";

// GET /api/servers/[id]/channels/[channelId]/threads — list threads in a forum channel
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

  const threads = await db.thread.findMany({
    where: { channelId },
    include: {
      owner: true,
      messages: { select: { id: true, content: true, createdAt: true, userId: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  const result = threads.map((t) => ({
    id: t.id,
    channelId: t.channelId,
    name: t.name,
    ownerId: t.ownerId,
    ownerName: t.owner.name,
    ownerAvatarColor: t.owner.avatarColor,
    isLocked: t.isLocked,
    isArchived: t.isArchived,
    createdAt: t.createdAt.toISOString(),
    messageCount: t.messages.length,
    preview: t.messages[0]?.content ?? "",
  }));

  return NextResponse.json(result);
}

// POST /api/servers/[id]/channels/[channelId]/threads — create a thread (forum post)
// Body: { name, firstMessage? }
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
  const channel = await db.channel.findUnique({ where: { id: channelId } });
  if (!channel) {
    return NextResponse.json({ error: "Channel not found" }, { status: 404 });
  }

  const body = await req.json().catch(() => ({}));
  const name: string = (body.name ?? "").toString().trim();
  const firstMessage: string = (body.firstMessage ?? "").toString().trim();
  if (!name) {
    return NextResponse.json({ error: "Thread name required" }, { status: 400 });
  }

  const thread = await db.thread.create({
    data: {
      channelId,
      name,
      ownerId: me.id,
    },
  });

  // Optionally create the first message in the thread
  if (firstMessage) {
    await db.message.create({
      data: {
        channelId,
        userId: me.id,
        content: firstMessage,
        threadId: thread.id,
      },
    });
  }

  return NextResponse.json({
    id: thread.id,
    channelId: thread.channelId,
    name: thread.name,
    ownerId: thread.ownerId,
    ownerName: me.name,
    ownerAvatarColor: me.avatarColor,
    isLocked: thread.isLocked,
    isArchived: thread.isArchived,
    createdAt: thread.createdAt.toISOString(),
    messageCount: firstMessage ? 1 : 0,
    preview: firstMessage ?? "",
  });
}
