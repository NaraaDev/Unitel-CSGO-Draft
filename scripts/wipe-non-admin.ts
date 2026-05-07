import { config } from "dotenv";
import { MongoClient, ServerApiVersion } from "mongodb";
import { resolve } from "node:path";

config({ path: resolve(process.cwd(), ".env") });
config({ path: resolve(process.cwd(), ".env.local"), override: true });

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
  const db = client.db(dbName);
  const users = db.collection("users");
  const drafts = db.collection("drafts");
  const matches = db.collection("matches");

  // Delete all matches (history + scoreboard source)
  const matchResult = await matches.deleteMany({});

  // Reset the draft singleton to idle (preserves _id/kind, wipes participants/picks)
  const now = new Date();
  const draftResult = await drafts.updateMany(
    { kind: "singleton" },
    {
      $set: {
        status: "idle",
        startAt: null,
        startedAt: null,
        endsAt: null,
        completedAt: null,
        captains: [],
        currentTurnCaptainId: null,
        currentTurnIndex: 0,
        turnDeadline: null,
        pickSequence: [],
        picks: [],
        pickedPlayerIds: [],
        updatedAt: now,
      },
    },
  );

  // Delete all users except admins (by isAdmin flag OR phone in ADMIN_PHONES)
  const userFilter = {
    $and: [
      { isAdmin: { $ne: true } },
      ...(adminPhones.length > 0 ? [{ phone: { $nin: adminPhones } }] : []),
    ],
  } as const;
  const userResult = await users.deleteMany(userFilter);

  console.log(`✓ matches deleted: ${matchResult.deletedCount}`);
  console.log(`✓ drafts reset: ${draftResult.modifiedCount}`);
  console.log(`✓ non-admin users deleted: ${userResult.deletedCount}`);
  console.log(`  preserved admin phones: ${adminPhones.join(", ") || "(by isAdmin flag only)"}`);

  const remainingUsers = await users.find({}, { projection: { phone: 1, isAdmin: 1, lastName: 1, firstName: 1 } }).toArray();
  console.log(`  ${remainingUsers.length} user(s) remaining:`);
  for (const u of remainingUsers) {
    console.log(
      `    - ${u.phone} ${u.isAdmin ? "[ADMIN]" : ""} ${u.lastName ?? ""} ${u.firstName ?? ""}`,
    );
  }

  await client.close();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
