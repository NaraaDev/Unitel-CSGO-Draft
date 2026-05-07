# API Reference

Бүх endpoint нь `application/json` ашиглана. Амжилттай хариу:

```json
{ "success": true, "data": <T> }
```

Алдаатай хариу:

```json
{ "success": false, "error": "Дэлгэрэнгүй мессэж" }
```

## Auth

### `POST /api/auth/register`

Шинэ хэрэглэгч бүртгэх.

**Body**

```json
{
  "lastName": "ENKHBAYAR",
  "firstName": "NARANBAT",
  "phone": "99112233",
  "password": "secret123"
}
```

**Response 200** — login session cookie тохируулна

```json
{
  "success": true,
  "data": {
    "id": "65...",
    "lastName": "ENKHBAYAR",
    "firstName": "NARANBAT",
    "phone": "99112233",
    "isAdmin": false
  }
}
```

**Алдаа**

| Code | Шалтгаан |
|---|---|
| 400 | Validation алдаа (invalid phone, password too short) |
| 409 | Дугаар бүртгэлтэй байна |

### `POST /api/auth/login`

```json
{ "phone": "99112233", "password": "secret123" }
```

Амжилттай бол cookie + хэрэглэгчийн мэдээлэл буцаана. Хэрэв тухайн дугаар `ADMIN_PHONES`-д шинээр нэмэгдсэн бол `isAdmin` синк хийгдэнэ.

**401** — дугаар/нууц үг буруу.

### `POST /api/auth/logout`

Cookie устгаж `{ success: true }` буцаана.

### `GET /api/auth/me`

Одоо нэвтэрсэн хэрэглэгчийн мэдээлэл.

```json
{ "success": true, "data": { "id": "...", "isAdmin": false, ... } }
```

Нэвтрээгүй бол `data: null`.

## Draft (нийтийн)

### `GET /api/draft`

Одоогийн draft-ийн төлөв.

**Response**

```json
{
  "success": true,
  "data": {
    "id": "...",
    "status": "live",
    "startAt": "2026-05-07T21:00:00.000Z",
    "startedAt": "2026-05-07T21:00:05.000Z",
    "endsAt": "2026-05-07T22:00:05.000Z",
    "completedAt": null,
    "pickWindowSeconds": 60,
    "totalCapMinutes": 60,
    "teamSize": 5,
    "captains": [
      { "userId": "...", "order": 0, "lastName": "...", "firstName": "..." }
    ],
    "currentTurnCaptainId": "...",
    "currentTurnIndex": 3,
    "turnDeadline": "2026-05-07T21:01:00.000Z",
    "picks": [
      { "round": 0, "pickIndex": 0, "captainId": "...", "playerId": "...", "pickedAt": "...", "skipped": false }
    ],
    "pickedPlayerIds": ["..."],
    "availablePlayers": [{ "id": "...", "lastName": "...", "firstName": "..." }],
    "teams": [
      { "captainId": "...", "captainName": "...", "members": [...] }
    ]
  }
}
```

> Энэ endpoint бүр дуудагдах үед сервер `reconcileDraft()` гүйцэтгэдэг — turn deadline өнгөрсөн бол алгасах эсвэл cap дуусагдсан бол `stopped` болгоно.

### `GET /api/draft/stream`

Server-Sent Events. 1 секунд тутамд `state` эсвэл `ping` event илгээнэ.

```
event: state
data: { ...DraftStateDto }

event: ping
data: { "t": 1730000000000 }
```

```js
const es = new EventSource('/api/draft/stream');
es.addEventListener('state', (e) => {
  const state = JSON.parse(e.data);
});
```

`abort` дохио ирвэл сервер автоматаар хаагдана.

### `POST /api/draft/pick`

**Зөвхөн** ээлжтэй ахлагч ашигла (`currentTurnCaptainId === me.id` & `status === 'live'`).

```json
{ "playerId": "65fd1234abcdef0123456789" }
```

**Амжилт** — өөрчлөгдсөн `DraftStateDto` буцаана.

**Алдааны код**

| Code | Шалтгаан |
|---|---|
| 401 | Нэвтрээгүй |
| 403 | Таны ээлж биш |
| 404 | Тоглогч олдсонгүй |
| 409 | Draft live биш / тоглогчийг өмнө нь авсан / ээлж дамжсан |

> Атомар: `findOneAndUpdate` filter дотор `currentTurnIndex`, `currentTurnCaptainId`, `pickedPlayerIds: { $ne }` шалгана. Хэрэв race condition тохиолдвол filter таарахгүй → 409.

## Admin (зөвхөн `isAdmin: true`)

### `GET /api/admin/users`

Бүх бүртгэлтэй хэрэглэгчдийн жагсаалт (passwordHash хасагдсан).

```json
{
  "success": true,
  "data": [
    { "id": "...", "lastName": "...", "firstName": "...", "phone": "99112233", "isAdmin": false }
  ]
}
```

### `PATCH /api/admin/draft`

Draft тохируулах. `status === 'live'` бол **403/409** буцаана — эхлээд `reset` хийнэ.

```json
{
  "startAt": "2026-05-07T21:00:00.000Z",
  "pickWindowSeconds": 60,
  "totalCapMinutes": 60,
  "teamSize": 5,
  "captainOrder": ["userId1", "userId2", "userId3"]
}
```

`captainOrder` массивын **эрэмбэ** нь Round 1-ийн pick дарааллыг тогтооно.

### `POST /api/admin/draft/start`

Draft-ийг live болгох. Шаардлага: `captains.length >= 2` болон `status !== 'live'`.

Сервер `startedAt = now`, `endsAt = now + cap`, эхний captain-ы `turnDeadline = now + window` гэж тогтооно.

### `POST /api/admin/draft/reset`

Бүх төлөвийг арилгаж, captains-ыг хоослоно. `users` collection нь өөрчлөгдөхгүй.

## Status enum

```ts
type DraftStatus = "idle" | "scheduled" | "live" | "completed" | "stopped";
```

| Status | Тайлбар |
|---|---|
| `idle` | Юу ч тохируулагдаагүй |
| `scheduled` | Цаг + ахлагч тохируулсан, эхлээгүй |
| `live` | Идэвхтэй draft, picks хийгдэж байна |
| `completed` | Бүх pick хийгдсэн |
| `stopped` | Time cap-д хүрсэн |

## Cookie

| Нэр | Тайлбар |
|---|---|
| `ucsgo_session` | `userId.timestamp.HMAC_signature`. httpOnly, sameSite=lax, secure prod дээр, 30 хоногийн `maxAge`. |
