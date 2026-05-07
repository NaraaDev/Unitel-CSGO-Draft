---
name: mongodb-patterns
description: MongoDB patterns for Next.js applications — connection pooling, schema design with Mongoose, indexing, aggregation pipelines, transactions, and security best practices. Use when working with MongoDB in Node.js/Next.js projects.
---

# MongoDB Patterns for Next.js

## When to Use

Use this skill when:
- Designing MongoDB schemas (with or without Mongoose)
- Writing Next.js API routes (Route Handlers) that read/write MongoDB
- Optimizing queries, indexes, or aggregation pipelines
- Setting up MongoDB connection in Next.js (App Router or Pages Router)
- Implementing authentication, sessions, or rate-limiting backed by MongoDB
- Handling transactions across multiple collections

## Core Principles

1. **One connection per process** — Next.js dev mode hot-reloads modules; cache the client on `globalThis` to avoid connection storms.
2. **Explicit schemas at the boundary** — Validate every payload entering the API (zod/valibot). MongoDB is schemaless; your application is not.
3. **Index for queries you actually run** — Profile with `explain('executionStats')` before adding indexes. Compound indexes follow the ESR rule: Equality, Sort, Range.
4. **Project only what you need** — `.find({}, { projection: { field: 1 } })` reduces bandwidth and memory.
5. **Never trust `_id` from clients** — Validate it as a 24-hex string before passing to `new ObjectId()`.

## Connection Setup (Next.js App Router)

`lib/mongodb.ts`:

```ts
import { MongoClient } from 'mongodb'

const uri = process.env.MONGODB_URI
if (!uri) throw new Error('MONGODB_URI is required')

const options = { maxPoolSize: 10, serverSelectionTimeoutMS: 5000 }

let client: MongoClient
let clientPromise: Promise<MongoClient>

declare global {
  var _mongoClientPromise: Promise<MongoClient> | undefined
}

if (process.env.NODE_ENV === 'development') {
  if (!global._mongoClientPromise) {
    client = new MongoClient(uri, options)
    global._mongoClientPromise = client.connect()
  }
  clientPromise = global._mongoClientPromise
} else {
  client = new MongoClient(uri, options)
  clientPromise = client.connect()
}

export default clientPromise
```

Usage in a Route Handler (`app/api/users/route.ts`):

```ts
import clientPromise from '@/lib/mongodb'
import { NextResponse } from 'next/server'

export async function GET() {
  const client = await clientPromise
  const db = client.db('app')
  const users = await db.collection('users')
    .find({}, { projection: { passwordHash: 0 } })
    .limit(50)
    .toArray()
  return NextResponse.json({ data: users })
}
```

## Mongoose Alternative

Prefer the native driver for new projects (smaller bundle, simpler types). Use Mongoose only when you need:
- Lifecycle hooks (`pre('save')`)
- Schema-level virtuals/methods
- Auto-population across refs

Mongoose connection cache pattern is identical — store the connection promise on `globalThis`.

## Schema Design Rules

1. **Embed when read together** — User profile fields embedded in `users` doc, not split across collections.
2. **Reference when independent lifecycles** — Orders reference users; do not duplicate the user doc inside every order.
3. **Bounded arrays only** — If an array can grow unbounded (>1000 items), make it a separate collection. MongoDB document limit is 16MB.
4. **Pre-compute counters** — `commentCount` field updated via `$inc` is faster than `countDocuments` on every read.
5. **Schema versioning** — Add a `_v` field; migrate lazily on read or via a background job.

## Indexing

```js
// Compound index — ESR rule
db.orders.createIndex({ userId: 1, status: 1, createdAt: -1 })

// Unique constraint
db.users.createIndex({ email: 1 }, { unique: true })

// Partial index (smaller, faster)
db.sessions.createIndex(
  { token: 1 },
  { partialFilterExpression: { revoked: false } }
)

// TTL — auto-delete sessions after 30 days
db.sessions.createIndex({ createdAt: 1 }, { expireAfterSeconds: 2592000 })
```

Always check with `.explain('executionStats')` — look for `IXSCAN` (good) vs `COLLSCAN` (bad).

## Aggregation Pipeline Order

For performance, order stages: `$match` → `$project` → `$lookup` → `$group` → `$sort` → `$limit`.

Filter early (`$match` first uses indexes), reduce fields (`$project`), join only when narrowed (`$lookup`).

```js
db.orders.aggregate([
  { $match: { status: 'paid', createdAt: { $gte: lastMonth } } },
  { $group: { _id: '$userId', total: { $sum: '$amount' } } },
  { $sort: { total: -1 } },
  { $limit: 10 }
])
```

## Transactions

Use only when crossing collections; single-document writes are atomic by default.

```ts
const session = client.startSession()
try {
  await session.withTransaction(async () => {
    await db.collection('accounts').updateOne(
      { _id: from }, { $inc: { balance: -amount } }, { session }
    )
    await db.collection('accounts').updateOne(
      { _id: to }, { $inc: { balance: amount } }, { session }
    )
  })
} finally {
  await session.endSession()
}
```

Requires a replica set (Atlas provides this; standalone local Mongo does not).

## Security Checklist

- [ ] `MONGODB_URI` lives in `.env.local`, never committed
- [ ] User passwords hashed with `argon2` or `bcrypt` (never plain, never MD5/SHA-1)
- [ ] All `_id` inputs validated as 24-hex before `new ObjectId()`
- [ ] No `$where` or `$function` operators with user input (server-side JS execution)
- [ ] Query operators stripped from user input (`{ email: { $ne: null } }` injection)
- [ ] Connection uses TLS in production (`?tls=true`)
- [ ] Database user has least-privilege role (no `dbAdmin` in production)

## Validating Input Against Operator Injection

```ts
import { z } from 'zod'

const FindUserSchema = z.object({
  email: z.string().email(),  // string, not object — blocks { $ne: null }
})

const parsed = FindUserSchema.safeParse(await req.json())
if (!parsed.success) return NextResponse.json({ error: 'invalid' }, { status: 400 })
```

## Common Pitfalls

- **Forgetting `await` on async cursor methods** — `.find()` returns a cursor; you must `.toArray()` or iterate.
- **Using `find` when you need `findOne`** — returns a cursor not a document.
- **Calling `client.close()` in a route** — kills the pool for every other request.
- **Returning `_id` ObjectId to client** — serialize with `.toString()` or use `{ projection: { _id: 0, id: '$_id' } }`.
- **Storing dates as strings** — use real `Date` objects so range queries and TTL indexes work.

## Testing

- Unit tests: mock the collection with `jest.mock` or use `mongodb-memory-server`.
- Integration tests: spin up a real MongoDB via `mongodb-memory-server` or Testcontainers.
- E2E: seed data through the same connection module the app uses.
