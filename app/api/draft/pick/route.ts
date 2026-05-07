import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { getCurrentUser } from "@/lib/session";
import { getDrafts, getUsers } from "@/lib/mongodb";
import { PickSchema } from "@/lib/schemas";
import { buildDraftState, reconcileDraft } from "@/lib/draft-state";
import {
  currentSlotMeta,
  determineCurrentCaptain,
  isAllTeamsFull,
} from "@/lib/draft-engine";
import type { DraftDoc } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function POST(req: Request): Promise<NextResponse> {
  const me = await getCurrentUser();
  if (!me) {
    return NextResponse.json({ success: false, error: "Нэвтрээгүй байна" }, { status: 401 });
  }

  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return NextResponse.json({ success: false, error: "Алдаатай payload" }, { status: 400 });
  }

  const parsed = PickSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: parsed.error.issues[0]?.message ?? "Validation алдаа" },
      { status: 400 },
    );
  }

  const draft = await reconcileDraft();
  if (draft.status !== "live") {
    return NextResponse.json(
      { success: false, error: "Draft идэвхгүй байна" },
      { status: 409 },
    );
  }

  if (draft.currentTurnCaptainId !== me.id) {
    return NextResponse.json(
      { success: false, error: "Таны ээлж биш" },
      { status: 403 },
    );
  }

  const users = await getUsers();
  const player = await users.findOne({ _id: new ObjectId(parsed.data.playerId) });
  if (!player) {
    return NextResponse.json({ success: false, error: "Тоглогч олдсонгүй" }, { status: 404 });
  }
  if (player.isAdmin) {
    return NextResponse.json(
      { success: false, error: "Админ-ыг сонгох боломжгүй" },
      { status: 400 },
    );
  }

  const meta = currentSlotMeta(draft);
  const now = new Date();

  // Project the post-pick state to compute next captain.
  const projected: DraftDoc = {
    ...draft,
    picks: [
      ...draft.picks,
      {
        round: meta.round,
        pickIndex: draft.picks.length,
        captainId: me.id,
        playerId: parsed.data.playerId,
        pickedAt: now,
        skipped: false,
      },
    ],
  };

  const nextCaptainId = determineCurrentCaptain(projected);
  const stillRunning = nextCaptainId !== null && !isAllTeamsFull(projected);

  const drafts = await getDrafts();
  const result = await drafts.findOneAndUpdate(
    {
      _id: draft._id,
      status: "live",
      currentTurnIndex: draft.currentTurnIndex,
      currentTurnCaptainId: me.id,
      pickedPlayerIds: { $ne: parsed.data.playerId },
      "captains.userId": { $ne: parsed.data.playerId },
    },
    {
      $push: {
        picks: {
          round: meta.round,
          pickIndex: draft.picks.length,
          captainId: me.id,
          playerId: parsed.data.playerId,
          pickedAt: now,
          skipped: false,
        },
        pickedPlayerIds: parsed.data.playerId,
      },
      $set: {
        currentTurnIndex: draft.currentTurnIndex + 1,
        currentTurnCaptainId: stillRunning ? nextCaptainId : null,
        turnDeadline: stillRunning
          ? new Date(now.getTime() + draft.pickWindowSeconds * 1000)
          : null,
        status: stillRunning ? "live" : "completed",
        completedAt: stillRunning ? null : now,
        updatedAt: now,
      },
    },
    { returnDocument: "after" },
  );

  if (!result) {
    return NextResponse.json(
      {
        success: false,
        error: "Сонголт хүчингүй (тоглогчийг өөр ахлагч аваад байна эсвэл ээлж дамжсан)",
      },
      { status: 409 },
    );
  }

  const state = await buildDraftState(result);
  return NextResponse.json({ success: true, data: state });
}
