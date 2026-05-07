import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/session";
import { listMatches } from "@/lib/draft-state";

export async function GET(): Promise<NextResponse> {
  const me = await getCurrentUser();
  if (!me?.isAdmin) {
    return NextResponse.json({ success: false, error: "Зөвшөөрөлгүй" }, { status: 403 });
  }
  const data = await listMatches();
  return NextResponse.json({ success: true, data });
}
