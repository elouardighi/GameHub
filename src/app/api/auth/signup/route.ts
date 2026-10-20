import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";

// POST /api/auth/signup
// Body: { name, email, password }
// Creates a new user, auto-joins all public servers, returns the public user record.
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const name: string = (body.name ?? "").toString().trim();
  const email: string = (body.email ?? "").toString().toLowerCase().trim();
  const password: string = (body.password ?? "").toString();

  if (!name || name.length < 2) {
    return NextResponse.json(
      { error: "Name must be at least 2 characters" },
      { status: 400 }
    );
  }
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    return NextResponse.json(
      { error: "Please enter a valid email" },
      { status: 400 }
    );
  }
  if (password.length < 6) {
    return NextResponse.json(
      { error: "Password must be at least 6 characters" },
      { status: 400 }
    );
  }

  const existing = await db.user.findUnique({ where: { email } });
  if (existing) {
    return NextResponse.json(
      { error: "Email already in use" },
      { status: 409 }
    );
  }

  const passwordHash = await bcrypt.hash(password, 10);

  // Pick a deterministic avatar color from the palette
  const AVATAR_COLORS = [
    "#d4a03a",
    "#b04a4a",
    "#8bb04a",
    "#e8c159",
    "#EB459E",
    "#b04a4a",
    "#8b3a3a",
    "#6b8b3a",
    "#d4a03a",
    "#8bb04a",
  ];
  const avatarColor =
    AVATAR_COLORS[
      Math.abs(
        [...email].reduce((a, c) => a + c.charCodeAt(0), 0)
      ) % AVATAR_COLORS.length
    ];

  const user = await db.user.create({
    data: {
      name,
      email,
      passwordHash,
      avatarColor,
      status: "online",
      bio: "New to GameHub. Say hi!",
    },
  });

  // Auto-join all public servers so a brand-new user has a populated server rail
  const publicServers = await db.server.findMany({
    where: { isPublic: true },
    select: { id: true },
  });
  for (const srv of publicServers) {
    const exists = await db.member.findUnique({
      where: { serverId_userId: { serverId: srv.id, userId: user.id } },
    });
    if (!exists) {
      await db.member.create({
        data: { serverId: srv.id, userId: user.id, isOwner: false },
      });
      await db.server.update({
        where: { id: srv.id },
        data: { memberCount: { increment: 1 } },
      });
    }
  }

  return NextResponse.json({
    id: user.id,
    email: user.email,
    name: user.name,
    avatarColor: user.avatarColor,
    status: user.status,
    customStatus: user.customStatus,
    bio: user.bio,
    bannerColor: user.bannerColor,
    createdAt: user.createdAt,
  });
}
