import { cookies } from "next/headers";
import { createHmac, timingSafeEqual } from "node:crypto";
import { ObjectId } from "mongodb";
import { getUsers } from "./mongodb";
import type { PublicUser, UserDoc } from "./types";

const SESSION_COOKIE = "ucsgo_session";
const MAX_AGE_SECONDS = 60 * 60 * 24 * 30;

const secret = process.env.SESSION_SECRET;
if (!secret) {
  throw new Error("SESSION_SECRET is required (set it in .env.local)");
}
const SECRET = secret;

function sign(payload: string): string {
  return createHmac("sha256", SECRET).update(payload).digest("base64url");
}

function buildToken(userId: string): string {
  const payload = `${userId}.${Date.now()}`;
  const signature = sign(payload);
  return `${payload}.${signature}`;
}

function verifyToken(token: string): string | null {
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  const [userId, ts, sig] = parts;
  const expected = sign(`${userId}.${ts}`);
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return null;
  if (!timingSafeEqual(a, b)) return null;
  if (!ObjectId.isValid(userId)) return null;
  return userId;
}

export async function setSession(userId: string): Promise<void> {
  const token = buildToken(userId);
  const store = await cookies();
  store.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: MAX_AGE_SECONDS,
  });
}

export async function clearSession(): Promise<void> {
  const store = await cookies();
  store.delete(SESSION_COOKIE);
}

export async function getCurrentUser(): Promise<PublicUser | null> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (!token) return null;

  const userId = verifyToken(token);
  if (!userId) return null;

  const users = await getUsers();
  const user = await users.findOne({ _id: new ObjectId(userId) });
  if (!user) return null;

  return toPublicUser(user);
}

export function toPublicUser(user: UserDoc): PublicUser {
  return {
    id: user._id.toString(),
    lastName: user.lastName,
    firstName: user.firstName,
    phone: user.phone,
    isAdmin: user.isAdmin,
    avatarId: user.avatarId ?? 0,
  };
}

export function isAdminPhone(phone: string): boolean {
  const list = (process.env.ADMIN_PHONES ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  return list.includes(phone);
}
