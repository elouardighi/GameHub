import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { db } from "@/lib/db";

// POST /api/clans/[id]/apply — submit an application to join a clan
// Body: { answer }
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
  const clan = await db.clan.findUnique({ where: { id } });
  if (!clan) {
    return NextResponse.json({ error: "Clan not found" }, { status: 404 });
  }

  const body = await req.json().catch(() => ({}));
  const answer: string = (body.answer ?? "").toString().trim();
  if (answer.length < 5) {
    return NextResponse.json(
      { error: "Please answer with at least a few words" },
      { status: 400 }
    );
  }

  // Check if user already has an application or is already a member
  const existingApp = await db.clanApplication.findUnique({
    where: { clanId_userId: { clanId: id, userId: me.id } },
  });
  if (existingApp) {
    if (existingApp.status === "pending") {
      return NextResponse.json(
        { error: "Application already pending", status: "pending", application: existingApp },
        { status: 400 }
      );
    }
    if (existingApp.status === "accepted") {
      return NextResponse.json(
        { error: "Already a member", status: "accepted", application: existingApp },
        { status: 400 }
      );
    }
    // previously rejected — allow resubmit by updating
    const updated = await db.clanApplication.update({
      where: { id: existingApp.id },
      data: { answer, status: "pending", reviewedAt: null },
    });
    return NextResponse.json({
      id: updated.id,
      clanId: updated.clanId,
      userId: updated.userId,
      answer: updated.answer,
      status: updated.status,
      createdAt: updated.createdAt,
    });
  }

  // Is the user already a member?
  const alreadyMember = await db.clanMember.findUnique({
    where: { clanId_userId: { clanId: id, userId: me.id } },
  });
  if (alreadyMember) {
    return NextResponse.json(
      { error: "Already a member" },
      { status: 400 }
    );
  }

  const created = await db.clanApplication.create({
    data: {
      clanId: id,
      userId: me.id,
      answer,
      status: "pending",
    },
  });
  return NextResponse.json({
    id: created.id,
    clanId: created.clanId,
    userId: created.userId,
    answer: created.answer,
    status: created.status,
    createdAt: created.createdAt,
  });
}
