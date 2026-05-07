import { config } from "dotenv";
import { MongoClient, ObjectId, ServerApiVersion } from "mongodb";
import bcrypt from "bcryptjs";
import { resolve } from "node:path";

config({ path: resolve(process.cwd(), ".env") });
config({ path: resolve(process.cwd(), ".env.local"), override: true });

const SEED_USERS = [
  { lastName: "BATBAYAR", firstName: "ENKHTAIVAN", phone: "90000001", avatarId: 0 },
  { lastName: "DAVAA", firstName: "MUNKH-ERDENE", phone: "90000002", avatarId: 1 },
  { lastName: "GANBAATAR", firstName: "TEMUULEN", phone: "90000003", avatarId: 2 },
  { lastName: "OYUNBAT", firstName: "BILGUUN", phone: "90000004", avatarId: 3 },
  { lastName: "ENKHBAT", firstName: "TENGIS", phone: "90000005", avatarId: 4 },
  { lastName: "BOLD", firstName: "AMARSANAA", phone: "90000006", avatarId: 5 },
  { lastName: "ZORIG", firstName: "BATKHUYAG", phone: "90000007", avatarId: 6 },
  { lastName: "TUMUR", firstName: "DULGUUN", phone: "90000008", avatarId: 7 },
  { lastName: "PUREV", firstName: "ULZIIBAT", phone: "90000009", avatarId: 0 },
  { lastName: "JAVKHLAN", firstName: "MIGMARSUREN", phone: "90000010", avatarId: 3 },
];

const PASSWORD = "test1234";

async function main(): Promise<void> {
  const uri = process.env.MONGODB_URI;
  const dbName = process.env.MONGODB_DB ?? "unitel_csgo_draft";
  const adminPhones = (process.env.ADMIN_PHONES ?? "")
    .split(",")
    .map((p) => p.trim())
    .filter(Boolean);

  if (!uri) throw new Error("MONGODB_URI is required");

  const client = new MongoClient(uri, {
    serverApi: { version: ServerApiVersion.v1, strict: false, deprecationErrors: true },
    serverSelectionTimeoutMS: 8000,
  });

  await client.connect();
  const users = client.db(dbName).collection("users");

  await users.createIndex({ phone: 1 }, { unique: true }).catch(() => undefined);

  const passwordHash = await bcrypt.hash(PASSWORD, 12);
  const now = new Date();

  let created = 0;
  let updated = 0;

  for (const u of SEED_USERS) {
    const existing = await users.findOne({ phone: u.phone });
    if (existing) {
      // Backfill avatarId on previously-seeded users that didn't have one.
      if (existing.avatarId === undefined || existing.avatarId === null) {
        await users.updateOne({ _id: existing._id }, { $set: { avatarId: u.avatarId } });
        updated += 1;
      }
      continue;
    }
    await users.insertOne({
      _id: new ObjectId(),
      lastName: u.lastName,
      firstName: u.firstName,
      phone: u.phone,
      passwordHash,
      isAdmin: adminPhones.includes(u.phone),
      avatarId: u.avatarId,
      createdAt: now,
    });
    created += 1;
  }

  // Backfill any other existing users (e.g. admin) with random avatars if missing.
  const orphanCursor = users.find({ $or: [{ avatarId: { $exists: false } }, { avatarId: null }] });
  for await (const u of orphanCursor) {
    const fallbackId = Math.abs(parseInt(u._id.toHexString().slice(-2), 16)) % 8;
    await users.updateOne({ _id: u._id }, { $set: { avatarId: fallbackId } });
    updated += 1;
  }

  console.log(
    `✓ created=${created} backfilled_avatarId=${updated} total_seed=${SEED_USERS.length}`,
  );
  console.log(`  password for all seed users: "${PASSWORD}"`);
  console.log(`  phones: ${SEED_USERS.map((u) => u.phone).join(", ")}`);

  await client.close();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
