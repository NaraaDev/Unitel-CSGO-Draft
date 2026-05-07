# Архитектур

## Бүтэц

```
unitel-csgo-draft/
├─ app/                          # Next.js App Router
│  ├─ layout.tsx                 # Fonts + html shell
│  ├─ globals.css                # Tactical HUD design system
│  ├─ page.tsx                   # Landing
│  ├─ login/page.tsx
│  ├─ register/page.tsx
│  ├─ admin/page.tsx             # Client component (admin console)
│  ├─ draft/page.tsx             # Client component (live SSE feed)
│  ├─ _components/
│  │  ├─ SiteHeader.tsx
│  │  └─ StatusChip.tsx
│  └─ api/
│     ├─ auth/{register,login,logout,me}/route.ts
│     ├─ admin/{users,draft,draft/start,draft/reset}/route.ts
│     └─ draft/{.,pick,stream}/route.ts
├─ lib/
│  ├─ mongodb.ts                 # Cached MongoClient + auto-indexes
│  ├─ session.ts                 # HMAC cookie session
│  ├─ schemas.ts                 # Zod input validation
│  ├─ draft-engine.ts            # Pure snake-order calculation
│  ├─ draft-state.ts             # Server-side reconciliation + DTO builder
│  └─ types.ts                   # Shared types
├─ public/
├─ docs/                         # Энэ folder
└─ .env.local                    # Secrets (gitignored)
```

## Component тус бүр

### `lib/mongodb.ts`

`MongoClient` нэг л хувилбараар Next.js dev hot-reload орчинд хадгалагдана:

```ts
if (process.env.NODE_ENV !== "production") {
  if (!global._mongoClientPromise) {
    global._mongoClientPromise = new MongoClient(uri, options).connect();
  }
  clientPromise = global._mongoClientPromise;
}
```

`getDb()` дуудагдсаны дараа нэг удаа `ensureIndexes` гүйнэ:

- `users.phone` — unique
- `users.createdAt` — DESC

`getUsers()`, `getDrafts()` нь helper-уудыг буцаана.

### `lib/session.ts`

Cookie-based session. JWT хэрэглээгүй — гэрэн HMAC-SHA256:

```
token = userId + "." + timestamp + "." + base64url(HMAC(SECRET, userId + "." + timestamp))
```

`timingSafeEqual`-аар verify хийдэг. `cookies()` нь Next.js 16-д **async**:

```ts
const store = await cookies();
store.set(SESSION_COOKIE, token, { ... });
```

`getCurrentUser()` нь cookie + DB lookup-ыг хослуулсан. Хэрэв userId DB-д байхгүй болсон бол `null` буцаана.

### `lib/draft-engine.ts`

Цэвэр функциуд (DB-гүй):

```ts
captainAtPickIndex(captains, pickIndex) // → { captainId, round, positionInRound }
totalPickCount(draft)                    // = N * (teamSize - 1)
isDraftDone(draft)                       // → boolean
shouldStopByCap(draft, now)              // → boolean
```

Snake formula:

```ts
const round = Math.floor(pickIndex / N);
const pos = pickIndex % N;
const forward = round % 2 === 0;
const slot = forward ? pos : N - 1 - pos;
return sorted[slot].userId;
```

### `lib/draft-state.ts`

Серверийн "single source of truth":

- **`reconcileDraft()`** — DB-гээс draft-ыг авч, дараахийг шалгана:
  - Cap хэтрэвэл → `stopped`
  - Бүх pick хийгдсэн → `completed`
  - Turn deadline өнгөрсөн → `skipCurrentTurn`
- **`skipCurrentTurn(draft, now)`** — current turn-ийг алгасах атомар write
- **`buildDraftState(draft?)`** — full DTO build (teams + availablePlayers + names тэр чигээр)

`reconcileDraft` нь идэмхий — нэг хүсэлт өөрөө deadline өнгөрсөн бол сервер автоматаар алгасна. Cron хэрэггүй.

### `app/api/draft/pick/route.ts`

Гол атомар үйлдэл:

```ts
db.drafts.findOneAndUpdate(
  {
    _id: draft._id,
    status: "live",
    currentTurnIndex: draft.currentTurnIndex,         // race-guard
    currentTurnCaptainId: me.id,                       // ownership
    pickedPlayerIds: { $ne: parsed.data.playerId },   // dedupe
    "captains.userId": { $ne: parsed.data.playerId }, // captain ≠ pick
  },
  {
    $push: { picks: { ... }, pickedPlayerIds: parsed.data.playerId },
    $set: { currentTurnIndex: nextIndex, ... },
  },
);
```

Filter таарвал л write болно. Хоёр captain зэрэг ижил player сонгох гэвэл нэг нь л 200 авна, нөгөө нь 409.

### `app/api/draft/stream/route.ts`

SSE-ийг Web `ReadableStream` дээр бичсэн:

```ts
const stream = new ReadableStream({
  async start(controller) {
    const send = (event, data) => controller.enqueue(...);

    send("state", await buildDraftState());

    const interval = setInterval(async () => {
      const next = JSON.stringify(await buildDraftState());
      if (next !== prev) send("state", next);
      else send("ping", { t: Date.now() });
    }, 1000);

    req.signal.addEventListener("abort", () => {
      clearInterval(interval);
      controller.close();
    });
  },
});
```

Polling-based — REDIS pub/sub шиг байх шаардлага бага. Нэг draft, олонгүй subscriber-той тул scale хүндрэлгүй.

> **Production Tip:** reverse proxy (nginx, Cloudflare) дээр `proxy_buffering off` болгоно. Тэгэхгүй бол event delay-тэй ирнэ.

### Client-side state (draft page)

```
EventSource('/api/draft/stream') → state → setState
                                        ↓
                            React rerender → UI
```

`setInterval(250ms)` нь зөвхөн **timer countdown** UI-г refresh хийдэг. State өөрөө сервэрээс ирнэ.

## Concurrency / Race conditions

| Тохиолдол | Хэрхэн шийдэв |
|---|---|
| 2 captain ижил player сонгох | `findOneAndUpdate` filter дотор `pickedPlayerIds: { $ne }` |
| Captain өөрийн ээлж бус үед дарах | `currentTurnCaptainId` filter |
| Pick + skip зэрэг ажиллах | `currentTurnIndex` filter (атомар хүлээн зөвшөөрнө) |
| Stale state UI-гаас | `currentTurnIndex` mismatch → 409 → клиент SSE-ээр fresh state хүлээж авна |
| Cap reached, гэвч pick request | `reconcileDraft` эхлээд `stopped` болгоно → `status !== "live"` → 409 |

## Аюулгүй байдал

- ✅ Нууц үг bcrypt-ээр (cost 12) hash-лагдсан
- ✅ Cookie httpOnly, sameSite=lax, prod дээр secure
- ✅ Бүх `_id` ObjectId regex (`/^[0-9a-f]{24}$/`)-ээр валидлагдана `→ NoSQL injection`-аас хамгаалагдсан
- ✅ Zod-аар бүх input валидлагдана
- ✅ Admin endpoints `getCurrentUser().isAdmin` шалгалттай
- ✅ Hash хэзээ ч response-д буцдаггүй (`.find({}, { projection: { passwordHash: 0 } })`)

## Sustained scale

Энэ системийг **бяцхан-дунд** хэмжээний tournament (10–50 хэрэглэгч)-д зориулсан:

- SSE polling — 1с тутам query, нэг draft нэг доктор. 100+ subscriber-тэй болгох бол change-stream / pub-sub руу шилжээрэй.
- Bcrypt cost 12 — register/login per ~150ms. Илүү хурдан хэрэгтэй бол cost-ыг 10 болгож болно.
- MongoDB connection pool 10. Concurrent traffic ихсэх бол `maxPoolSize`-г өсгөнө.

## Дараах өргөтгөл (хийгдээгүй)

- [ ] Player profile зураг
- [ ] Multi-draft (одоо singleton)
- [ ] Captain dashboard (хувийн pick history)
- [ ] Slack/Discord webhook (live updates)
- [ ] OBS overlay endpoint (`/draft/overlay` транс-параент CSS-тэй)
