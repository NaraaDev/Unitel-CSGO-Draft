import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/session";
import { getDrafts } from "@/lib/mongodb";
import { buildDraftState, getOrCreateDraft } from "@/lib/draft-state";

export async function POST(): Promise<NextResponse> {
  const me = await getCurrentUser();
  if (!me?.isAdmin) {
    return NextResponse.json({ success: false, error: "Зөвшөөрөлгүй" }, { status: 403 });
  }

  const draft = await getOrCreateDraft();
  const drafts = await getDrafts();
  const now = new Date();

  await drafts.updateOne(
    { _id: draft._id },
    {
      $set: {
        status: "idle",
        startAt: null,
        startedAt: null,
        endsAt: null,
        completedAt: null,
        captains: [],
        currentTurnCaptainId: null,
        currentTurnIndex: 0,
        turnDeadline: null,
        picks: [],
        pickedPlayerIds: [],
        updatedAt: now,
      },
    },
  );

  const state = await buildDraftState();
  return NextResponse.json({ success: true, data: state });
}
