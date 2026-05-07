import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";
import { getUsers } from "@/lib/mongodb";
import { RegisterSchema } from "@/lib/schemas";
import { isAdminPhone, setSession, toPublicUser } from "@/lib/session";
import type { UserDoc } from "@/lib/types";
import { ObjectId } from "mongodb";

export async function POST(req: Request): Promise<NextResponse> {
  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return NextResponse.json({ success: false, error: "Алдаатай payload" }, { status: 400 });
  }

  const parsed = RegisterSchema.safeParse(json);
  if (!parsed.success) {
    const message = parsed.error.issues[0]?.message ?? "Validation алдаа";
    return NextResponse.json({ success: false, error: message }, { status: 400 });
  }

  const users = await getUsers();
  const existing = await users.findOne({ phone: parsed.data.phone });
  if (existing) {
    return NextResponse.json(
      { success: false, error: "Энэ дугаар бүртгэгдсэн байна" },
      { status: 409 },
    );
  }

  const passwordHash = await bcrypt.hash(parsed.data.password, 12);
  const now = new Date();

  const doc: UserDoc = {
    _id: new ObjectId(),
    lastName: parsed.data.lastName,
    firstName: parsed.data.firstName,
    phone: parsed.data.phone,
    passwordHash,
    isAdmin: isAdminPhone(parsed.data.phone),
    createdAt: now,
  };

  await users.insertOne(doc);
  await setSession(doc._id.toString());

  return NextResponse.json({ success: true, data: toPublicUser(doc) });
}
