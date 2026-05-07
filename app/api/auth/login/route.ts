import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";
import { getUsers } from "@/lib/mongodb";
import { LoginSchema } from "@/lib/schemas";
import { isAdminPhone, setSession, toPublicUser } from "@/lib/session";

export async function POST(req: Request): Promise<NextResponse> {
  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return NextResponse.json({ success: false, error: "Алдаатай payload" }, { status: 400 });
  }

  const parsed = LoginSchema.safeParse(json);
  if (!parsed.success) {
    const message = parsed.error.issues[0]?.message ?? "Validation алдаа";
    return NextResponse.json({ success: false, error: message }, { status: 400 });
  }

  const users = await getUsers();
  const user = await users.findOne({ phone: parsed.data.phone });
  if (!user) {
    return NextResponse.json(
      { success: false, error: "Дугаар эсвэл нууц үг буруу" },
      { status: 401 },
    );
  }

  const ok = await bcrypt.compare(parsed.data.password, user.passwordHash);
  if (!ok) {
    return NextResponse.json(
      { success: false, error: "Дугаар эсвэл нууц үг буруу" },
      { status: 401 },
    );
  }

  // Sync admin flag if env config changed since registration
  const shouldBeAdmin = isAdminPhone(user.phone);
  if (shouldBeAdmin !== user.isAdmin) {
    await users.updateOne({ _id: user._id }, { $set: { isAdmin: shouldBeAdmin } });
    user.isAdmin = shouldBeAdmin;
  }

  await setSession(user._id.toString());
  return NextResponse.json({ success: true, data: toPublicUser(user) });
}
