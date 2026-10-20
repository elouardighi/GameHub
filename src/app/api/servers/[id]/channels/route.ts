import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { db } from "@/lib/db";

// POST /api/servers/[id]/channels — create a new channel in the server
// Body: { name, type?, topic? }
export async function POST(
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
  const server = await db.server.findUnique({ where: { id } });
  if (!server) {
    return NextResponse.json({ error: "Server not found" }, { status: 404 });
  }

  const body = await req.json().catch(() => ({}));
  let name: string = (body.name ?? "").toString().trim().toLowerCase();
  // Discord-style: replace spaces with dashes
  name = name.replace(/\s+/g, "-");
  if (!name) {
    return NextResponse.json({ error: "Channel name required" }, { status: 400 });
  }

  const type: string = (body.type ?? "text").toString();
  const allowedTypes = ["text", "voice", "stage", "forum", "announcement", "rules"];
  if (!allowedTypes.includes(type)) {
    return NextResponse.json({ error: "Invalid channel type" }, { status: 400 });
  }
  const topic: string | null = typeof body.topic === "string" ? body.topic : null;

  // position = next available
  const lastChannel = await db.channel.findFirst({
    where: { serverId: id },
    orderBy: { position: "desc" },
  });
  const position = (lastChannel?.position ?? -1) + 1;

  const channel = await db.channel.create({
    data: {
      serverId: id,
      name,
      type,
      topic: topic ?? undefined,
      position,
      userLimit: type === "voice" || type === "stage" ? 10 : null,
    },
  });

  return NextResponse.json({
    id: channel.id,
    serverId: channel.serverId,
    name: channel.name,
    type: channel.type,
    topic: channel.topic,
    categoryId: channel.categoryId,
    position: channel.position,
    isPrivate: channel.isPrivate,
    userLimit: channel.userLimit,
    bitrate: channel.bitrate,
    createdAt: channel.createdAt,
  });
}
