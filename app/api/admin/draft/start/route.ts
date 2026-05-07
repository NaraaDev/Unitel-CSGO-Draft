import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/session";
import { getDrafts } from "@/lib/mongodb";
import { buildDraftState, getOrCreateDraft } from "@/lib/draft-state";
import { captainAtPickIndex } from "@/lib/draft-engine";

export async function POST(): Promise<NextResponse> {
  const me = await getCurrentUser();
  if (!me?.isAdmin) {
    return NextResponse.json({ success: false, error: "Зөвшөөрөлгүй" }, { status: 403 });
  }

  const draft = await getOrCreateDraft();
  if (draft.captains.length < 2) {
    return NextResponse.json(
      { success: false, error: "Хамгийн багадаа 2 ахлагч сонгоно уу" },
      { status: 400 },
    );
  }
  if (draft.status === "live") {
    return NextResponse.json(
      { success: false, error: "Аль хэдийн эхэлсэн" },
      { status: 409 },
    );
  }

  const now = new Date();
  const firstSlot = captainAtPickIndex(draft.captains, 0);
  if (!firstSlot) {
    return NextResponse.json({ success: false, error: "Ахлагч байхгүй" }, { status: 400 });
  }

  const drafts = await getDrafts();
  await drafts.updateOne(
    { _id: draft._id },
    {
      $set: {
        status: "live",
        startedAt: now,
        endsAt: new Date(now.getTime() + draft.totalCapMinutes * 60 * 1000),
        currentTurnCaptainId: firstSlot.captainId,
        currentTurnIndex: 0,
        turnDeadline: new Date(now.getTime() + draft.pickWindowSeconds * 1000),
        completedAt: null,
        updatedAt: now,
      },
    },
  );

  const state = await buildDraftState();
  return NextResponse.json({ success: true, data: state });
}
