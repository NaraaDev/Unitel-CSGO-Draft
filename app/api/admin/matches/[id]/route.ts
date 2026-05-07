import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { getCurrentUser } from "@/lib/session";
import { getMatches } from "@/lib/mongodb";
import { matchToDto } from "@/lib/draft-state";
import { FinalizeMatchSchema } from "@/lib/schemas";

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(req: Request, ctx: Ctx): Promise<NextResponse> {
  const me = await getCurrentUser();
  if (!me?.isAdmin) {
    return NextResponse.json({ success: false, error: "Зөвшөөрөлгүй" }, { status: 403 });
  }

  const { id } = await ctx.params;
  if (!/^[0-9a-fA-F]{24}$/.test(id)) {
    return NextResponse.json({ success: false, error: "Алдаатай ID" }, { status: 400 });
  }

  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return NextResponse.json({ success: false, error: "Алдаатай payload" }, { status: 400 });
  }

  const parsed = FinalizeMatchSchema.safeParse(json);
  if (!parsed.success) {
    const message = parsed.error.issues[0]?.message ?? "Validation алдаа";
    return NextResponse.json({ success: false, error: message }, { status: 400 });
  }

  const matches = await getMatches();
  const matchObjectId = new ObjectId(id);
  const existing = await matches.findOne({ _id: matchObjectId });
  if (!existing) {
    return NextResponse.json({ success: false, error: "Тоглолт олдсонгүй" }, { status: 404 });
  }

  const ranks = parsed.data.ranks;
  const captainIds = new Set(existing.teams.map((t) => t.captainId));
  const ranksGiven = Object.keys(ranks);
  for (const cid of ranksGiven) {
    if (!captainIds.has(cid)) {
      return NextResponse.json(
        { success: false, error: "Тоглолтод байхгүй ахлагч" },
        { status: 400 },
      );
    }
  }
  if (ranksGiven.length !== existing.teams.length) {
    return NextResponse.json(
      { success: false, error: "Бүх багт байр өгнө үү" },
      { status: 400 },
    );
  }
  const rankValues = Object.values(ranks);
  if (new Set(rankValues).size !== rankValues.length) {
    return NextResponse.json(
      { success: false, error: "Байр давхардсан байна" },
      { status: 400 },
    );
  }
  const sorted = [...rankValues].sort((a, b) => a - b);
  for (let i = 0; i < sorted.length; i++) {
    if (sorted[i] !== i + 1) {
      return NextResponse.json(
        { success: false, error: "Байр 1-ээс N-р хүртэл дараалсан байх ёстой" },
        { status: 400 },
      );
    }
  }

  const now = new Date();
  const updatedTeams = existing.teams.map((t) => ({
    ...t,
    finalRank: ranks[t.captainId] ?? null,
  }));
  await matches.updateOne(
    { _id: matchObjectId },
    {
      $set: {
        teams: updatedTeams,
        finalized: true,
        finalizedAt: now,
        updatedAt: now,
      },
    },
  );

  const updated = await matches.findOne({ _id: matchObjectId });
  return NextResponse.json({ success: true, data: updated ? matchToDto(updated) : null });
}

export async function DELETE(_req: Request, ctx: Ctx): Promise<NextResponse> {
  const me = await getCurrentUser();
  if (!me?.isAdmin) {
    return NextResponse.json({ success: false, error: "Зөвшөөрөлгүй" }, { status: 403 });
  }

  const { id } = await ctx.params;
  if (!/^[0-9a-fA-F]{24}$/.test(id)) {
    return NextResponse.json({ success: false, error: "Алдаатай ID" }, { status: 400 });
  }

  const matches = await getMatches();
  const result = await matches.deleteOne({ _id: new ObjectId(id) });
  if (result.deletedCount === 0) {
    return NextResponse.json({ success: false, error: "Тоглолт олдсонгүй" }, { status: 404 });
  }
  return NextResponse.json({ success: true, data: { id } });
}
