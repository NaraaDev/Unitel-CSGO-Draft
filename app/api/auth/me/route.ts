import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/session";

export async function GET(): Promise<NextResponse> {
  const user = await getCurrentUser();
  return NextResponse.json({ success: true, data: user });
}
