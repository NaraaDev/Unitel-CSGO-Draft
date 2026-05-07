import { NextResponse } from "next/server";
import { getLeaderboard } from "@/lib/draft-state";

export async function GET(): Promise<NextResponse> {
  const data = await getLeaderboard();
  return NextResponse.json({ success: true, data });
}
