# Troubleshooting

## `MONGODB_URI is required`

`.env.local` бичээгүй / restart хийгээгүй.

```bash
cp .env.example .env.local
# тэгээд утгуудыг бичээд
npm run dev   # restart
```

## `SESSION_SECRET is required`

Үүнтэй адил. `.env.local`-д `SESSION_SECRET=...` нэмнэ. **30+ тэмдэгт** санамсаргүй.

```bash
openssl rand -base64 32
# эсвэл
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

## `MongoServerSelectionError`

MongoDB сервер хүртэх боломжгүй:

1. Local үед `docker ps` эсвэл `systemctl status mongodb`-ээр шалгана
2. Atlas үед IP allowlist-д өөрийн IP-г нэмсэн эсэхийг шалга
3. URI-н `<password>` placeholder-ыг солисон уу?

## "Энэ дугаар бүртгэгдсэн байна"

`users.phone` unique index-тэй. Тус дугаараар бүртгэгдсэн хэрэглэгч устгахын тулд:

```js
// MongoDB shell
use unitel_csgo_draft;
db.users.deleteOne({ phone: "99112233" });
```

## Login хийсэн боловч `/admin` руу redirect болохгүй

`isAdmin` болоогүй. Шалгах:

```js
db.users.findOne({ phone: "99112233" }, { isAdmin: 1 });
```

`false` бол `.env.local`-ийн `ADMIN_PHONES`-д тэр дугаар орсон эсэхийг шалга. Тэгээд **logout → login** дахин хийнэ — sync хийгдэнэ.

Эсвэл шууд:

```js
db.users.updateOne({ phone: "99112233" }, { $set: { isAdmin: true } });
```

## Pick хийгээд `409 conflict`

Шалтгаан 3 байж болно:

1. **Race lost** — өөр captain тэр playerId-г таны өмнө авсан. Дахин fresh playerId сонго.
2. **Turn already advanced** — таны deadline өнгөрсөн, ээлж дамжсан. SSE state шинэчлэгдвэл UI-аас pick товч алга болно.
3. **Status changed** — admin reset хийсэн / cap-д хүрсэн.

Бүгд хэвийн. Live UI-аар зөв update хийгдэнэ.

## SSE update удаашрах / тасрах

| Шалтгаан | Шийдэл |
|---|---|
| Reverse proxy buffering | nginx-д `proxy_buffering off; proxy_cache off;` |
| HTTP/2 timeout | `keepalive_timeout 600s;` |
| Cloudflare/CDN | `Cache-Control: no-store` headers — Next.js аль хэдийн зөв тохируулсан |

EventSource нь automatically reconnect хийнэ — 1-2с-д ирэх "ping" event-ыг хүлээж байна гэж бод.

## Зураг татахад `Failed to fetch`

`html-to-image`-ийн web font хязгаарлалт. Solution:

```ts
toPng(node, { cacheBust: true, fontEmbedCSS: '' });
```

Бид аль хэдийн `cacheBust: true` тохируулсан. Хэрэв тухайн font-ыг proxy-р дамжуулж байгаа бол CORS зөв тохируулна.

## `types/validator.ts` build алдаа

Хуучин typegen-ийн үлдэгдэл. tsconfig-аас `"types"` exclude-сэн. Хэрэв алга болоогүй бол:

```bash
rm -rf types/      # эсвэл гараар устгана
npx next build
```

## Dev server аяндаа крэш

MongoDB холболтын `serverSelectionTimeoutMS = 8000`. Cluster далд бол timeout-аас өмнө идэвхтэй болсон эсэхийг шалга.

```bash
mongosh "$MONGODB_URI" --eval "db.adminCommand('ping')"
```

## Dev mode font-ууд татаж амжихгүй

Anti-virus / corporate proxy `fonts.googleapis.com`-ийг блоклож байгаа эсэх шалга. Локал font-уудаар сольж болно:

```ts
import localFont from "next/font/local";
const bebas = localFont({
  src: "./fonts/BebasNeue-Regular.ttf",
  variable: "--font-bebas",
});
```

## Тогтсон 1 цагийн cap-ийг өөрчлөх

`/admin`-д UI-гүй. Хоёр газар: `app/admin/page.tsx`-ийн `TIME_CAP` const, эсвэл `lib/schemas.ts`-ийн `ConfigureDraftSchema`-ийн `totalCapMinutes` default.

## Debugging tips

```bash
# Server-д ирж буй request-ыг харах
DEBUG=* npm run dev

# DB content-ыг тэр чигээр
mongosh "$MONGODB_URI"
> use unitel_csgo_draft
> db.drafts.find().pretty()
> db.users.find({}, { phone:1, isAdmin:1, _id:0 })
```
