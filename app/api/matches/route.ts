import { NextResponse } from "next/server";
import { listMatches } from "@/lib/draft-state";

export async function GET(): Promise<NextResponse> {
  const data = await listMatches({ finalizedOnly: true });
  return NextResponse.json({ success: true, data });
}
