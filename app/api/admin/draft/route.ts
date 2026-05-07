import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { getCurrentUser } from "@/lib/session";
import { ConfigureDraftSchema } from "@/lib/schemas";
import { getDrafts, getUsers } from "@/lib/mongodb";
import { buildDraftState, getOrCreateDraft } from "@/lib/draft-state";

export async function PATCH(req: Request): Promise<NextResponse> {
  const me = await getCurrentUser();
  if (!me?.isAdmin) {
    return NextResponse.json({ success: false, error: "Зөвшөөрөлгүй" }, { status: 403 });
  }

  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return NextResponse.json({ success: false, error: "Алдаатай payload" }, { status: 400 });
  }

  const parsed = ConfigureDraftSchema.safeParse(json);
  if (!parsed.success) {
    const message = parsed.error.issues[0]?.message ?? "Validation алдаа";
    return NextResponse.json({ success: false, error: message }, { status: 400 });
  }

  const draft = await getOrCreateDraft();
  if (draft.status === "live") {
    return NextResponse.json(
      { success: false, error: "Draft аль хэдийн эхэлсэн байна" },
      { status: 409 },
    );
  }

  const users = await getUsers();
  const captainObjectIds = parsed.data.captainOrder.map((id) => new ObjectId(id));
  const captainDocs = await users.find({ _id: { $in: captainObjectIds } }).toArray();
  if (captainDocs.length !== captainObjectIds.length) {
    return NextResponse.json(
      { success: false, error: "Зарим ахлагч олдсонгүй" },
      { status: 400 },
    );
  }

  const captains = parsed.data.captainOrder.map((userId, index) => ({
    userId,
    order: index,
  }));

  const drafts = await getDrafts();
  await drafts.updateOne(
    { _id: draft._id },
    {
      $set: {
        status: "scheduled",
        startAt: new Date(parsed.data.startAt),
        startedAt: null,
        endsAt: null,
        completedAt: null,
        captains,
        currentTurnCaptainId: null,
        currentTurnIndex: 0,
        turnDeadline: null,
        pickWindowSeconds: parsed.data.pickWindowSeconds,
        totalCapMinutes: parsed.data.totalCapMinutes,
        teamSize: parsed.data.teamSize,
        picks: [],
        pickedPlayerIds: [],
        updatedAt: new Date(),
      },
    },
  );

  const state = await buildDraftState();
  return NextResponse.json({ success: true, data: state });
}
