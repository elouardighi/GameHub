import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { db } from "@/lib/db";

// POST /api/friends/request
// Body: { identifier } — accepts an email OR a username, case-insensitive.
// Creates a Friendship row with status="pending" (requester = current user, addressee = found user)
export async function POST(req: NextRequest) {
  const me = await getAuthUser();
  if (!me) {
    return NextResponse.json(
      { error: "unauthenticated" },
      { status: 401 }
    );
  }

  const body = await req.json().catch(() => ({}));
  const identifier: string = (body.identifier ?? "").toString().trim();
  if (!identifier) {
    return NextResponse.json(
      { error: "Enter an email or username" },
      { status: 400 }
    );
  }

  // Find by email (exact, case-insensitive) or by name (exact match)
  let target = await db.user.findUnique({
    where: { email: identifier.toLowerCase() },
  });
  if (!target) {
    target = await db.user.findFirst({
      where: { name: { equals: identifier, mode: "insensitive" } },
    });
  }
  if (!target) {
    return NextResponse.json(
      { error: "User not found. Try their email like 'nova@gamehub.gg'." },
      { status: 404 }
    );
  }
  if (target.id === me.id) {
    return NextResponse.json(
      { error: "You can't befriend yourself 😅" },
      { status: 400 }
    );
  }

  // Check both directions (requester may already exist either way)
  const existingOut = await db.friendship.findUnique({
    where: {
      requesterId_addresseeId: { requesterId: me.id, addresseeId: target.id },
    },
  });
  const existingIn = await db.friendship.findUnique({
    where: {
      requesterId_addresseeId: { requesterId: target.id, addresseeId: me.id },
    },
  });

  if (existingOut && existingOut.status === "accepted") {
    return NextResponse.json(
      { error: "You're already friends!" },
      { status: 400 }
    );
  }
  if (existingOut && existingOut.status === "pending") {
    return NextResponse.json(
      { error: "Friend request already sent." },
      { status: 400 }
    );
  }
  if (existingIn && existingIn.status === "pending") {
    // They sent us a request — auto-accept it instead of duplicating
    const updated = await db.friendship.update({
      where: { id: existingIn.id },
      data: { status: "accepted" },
    });
    return NextResponse.json({
      id: updated.id,
      autoAccepted: true,
      user: {
        id: target.id,
        name: target.name,
        avatarColor: target.avatarColor,
        status: target.status,
        customStatus: target.customStatus,
        email: target.email,
        bio: target.bio,
        bannerColor: target.bannerColor,
        createdAt: target.createdAt,
      },
    });
  }
  if (existingIn && existingIn.status === "accepted") {
    return NextResponse.json(
      { error: "You're already friends!" },
      { status: 400 }
    );
  }

  const created = await db.friendship.create({
    data: {
      requesterId: me.id,
      addresseeId: target.id,
      status: "pending",
    },
  });

  return NextResponse.json({
    id: created.id,
    autoAccepted: false,
    user: {
      id: target.id,
      name: target.name,
      avatarColor: target.avatarColor,
      status: target.status,
      customStatus: target.customStatus,
      email: target.email,
      bio: target.bio,
      bannerColor: target.bannerColor,
      createdAt: target.createdAt,
    },
  });
}
