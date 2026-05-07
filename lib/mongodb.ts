import { MongoClient, ServerApiVersion, type Db, type Collection } from "mongodb";
import type { UserDoc, DraftDoc, MatchDoc } from "./types";

const uri = process.env.MONGODB_URI;
if (!uri) {
  throw new Error("MONGODB_URI is required (set it in .env.local)");
}

const dbName = process.env.MONGODB_DB ?? "unitel_csgo_draft";

const options = {
  serverApi: { version: ServerApiVersion.v1, strict: false, deprecationErrors: true },
  maxPoolSize: 10,
  serverSelectionTimeoutMS: 8000,
};

let clientPromise: Promise<MongoClient>;

declare global {
  var _mongoClientPromise: Promise<MongoClient> | undefined;
}

if (process.env.NODE_ENV !== "production") {
  if (!global._mongoClientPromise) {
    global._mongoClientPromise = new MongoClient(uri, options).connect();
  }
  clientPromise = global._mongoClientPromise;
} else {
  clientPromise = new MongoClient(uri, options).connect();
}

let indexesEnsured = false;

export async function getDb(): Promise<Db> {
  const client = await clientPromise;
  const db = client.db(dbName);
  if (!indexesEnsured) {
    indexesEnsured = true;
    await ensureIndexes(db);
  }
  return db;
}

async function ensureIndexes(db: Db): Promise<void> {
  await Promise.all([
    db.collection<UserDoc>("users").createIndex({ phone: 1 }, { unique: true }),
    db.collection<UserDoc>("users").createIndex({ createdAt: -1 }),
    db.collection<MatchDoc>("matches").createIndex({ archivedAt: -1 }),
    db.collection<MatchDoc>("matches").createIndex({ finalized: 1, archivedAt: -1 }),
  ]);
}

export async function getUsers(): Promise<Collection<UserDoc>> {
  const db = await getDb();
  return db.collection<UserDoc>("users");
}

export async function getDrafts(): Promise<Collection<DraftDoc>> {
  const db = await getDb();
  return db.collection<DraftDoc>("drafts");
}

export async function getMatches(): Promise<Collection<MatchDoc>> {
  const db = await getDb();
  return db.collection<MatchDoc>("matches");
}
