import { NextResponse } from "next/server";
import { buildDraftState } from "@/lib/draft-state";

export const dynamic = "force-dynamic";

export async function GET(): Promise<NextResponse> {
  const state = await buildDraftState();
  return NextResponse.json({ success: true, data: state });
}
