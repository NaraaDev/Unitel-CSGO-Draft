import { config } from "dotenv";
import { MongoClient, ServerApiVersion } from "mongodb";
import { resolve } from "node:path";

config({ path: resolve(process.cwd(), ".env") });
config({ path: resolve(process.cwd(), ".env.local"), override: true });

const SEED_PHONES = [
  "90000001",
  "90000002",
  "90000003",
  "90000004",
  "90000005",
  "90000006",
  "90000007",
  "90000008",
  "90000009",
  "90000010",
];

async function main(): Promise<void> {
  const uri = process.env.MONGODB_URI;
  const dbName = process.env.MONGODB_DB ?? "unitel_csgo_draft";
  if (!uri) throw new Error("MONGODB_URI is required");

  const client = new MongoClient(uri, {
    serverApi: { version: ServerApiVersion.v1, strict: false, deprecationErrors: true },
    serverSelectionTimeoutMS: 8000,
  });

  await client.connect();
  const db = client.db(dbName);
  const users = db.collection("users");

  const before = await users.countDocuments({ phone: { $in: SEED_PHONES } });
  const result = await users.deleteMany({ phone: { $in: SEED_PHONES } });

  console.log(`✓ matched=${before} deleted=${result.deletedCount}`);
  console.log(`  removed seed phones: ${SEED_PHONES.join(", ")}`);

  await client.close();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
