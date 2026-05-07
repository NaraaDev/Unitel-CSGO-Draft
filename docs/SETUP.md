# Setup гарын авлага

## Шаардлагатай зүйлс

| Хэрэгсэл | Хувилбар |
|---|---|
| Node.js | 20+ (Next.js 16 LTS) |
| npm | 10+ |
| MongoDB | 6+ (local Docker эсвэл Atlas) |

## 1. Repo татах ба deps суулгах

```bash
git clone <repo>
cd Unitel-CSGO-Draft
npm install
```

## 2. MongoDB бэлдэх

### Сонголт А — Локал Docker (хамгийн хурдан)

```bash
docker run -d --name mongo -p 27017:27017 mongo:7
```

Холболт URI: `mongodb://localhost:27017`

### Сонголт Б — MongoDB Atlas

1. <https://cloud.mongodb.com> → Free cluster
2. Database Access-д хэрэглэгч нэмэх
3. Network Access → IP allowlist
4. Connection String хуулна:
   `mongodb+srv://<user>:<pass>@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority`

## 3. `.env.local` тохируулах

`.env.example`-г хуулж нөхнө:

```bash
cp .env.example .env.local
```

```env
# .env.local
MONGODB_URI=mongodb://localhost:27017
MONGODB_DB=unitel_csgo_draft
SESSION_SECRET=сондгой_санамсаргүй_32_багц_тэмдэгт_xxxxxxxxxxxxxxxx
ADMIN_PHONES=99112233,88112233
```

| Хувьсагч | Тайлбар |
|---|---|
| `MONGODB_URI` | MongoDB холболтын URI |
| `MONGODB_DB` | Өгөгдлийн сан нэр (default: `unitel_csgo_draft`) |
| `SESSION_SECRET` | Cookie-г HMAC-аар гарын үсэг зурах түлхүүр. Server дээр л хадгална, **30+ тэмдэгт** санамсаргүй текст. |
| `ADMIN_PHONES` | Админ эрхтэй болох утасны дугаарууд, таслалаар. Эдгээр дугаараар бүртгүүлэх / нэвтрэх үед `isAdmin: true` тогтооно. |

> ⚠️ `.env.local` нь `.gitignore`-т багтсан тул git-д орохгүй.
> Production-д `SESSION_SECRET`-г **БҮҮ** жижиг тэмдэгтээр бичээрэй — өөрчилбөл бүх session шууд хүчингүй болно.

## 4. Ажиллуулах

```bash
# Dev (Turbopack)
npm run dev

# Production build
npm run build && npm start
```

Анхдагч порт: `3000`. Өөр порт хэрэг бол:

```bash
PORT=4000 npm run dev
# эсвэл
npx next dev -p 4000
```

## 5. Эхний админ үүсгэх

1. `ADMIN_PHONES`-д өөрийн дугаараа нэмнэ (жишээ: `99112233`)
2. Сервер restart
3. <http://localhost:3000/register> → тэр дугаараар бүртгүүлнэ
4. Бүртгэгдмэгц `/admin` руу шилжих эрхтэй болно

> Хэрэв дугаар нь `ADMIN_PHONES`-д байхгүй байгаад нэмсэн бол: тухайн хэрэглэгч **дахин нэвтрэхэд** админ эрх синк хийгдэнэ.

## 6. Database collections

App анх ажиллахдаа дараах collections-ыг үүсгэж, шаардлагатай index-уудыг зөв нэмнэ:

- `users` — `{ phone: 1 }` unique
- `drafts` — singleton документ (нэг л идэвхтэй draft)

Нэмэлт setup script хэрэггүй.

## 7. Production checklist

- [ ] HTTPS дор (cookie `secure` зөвхөн `NODE_ENV=production` дээр true болно)
- [ ] `SESSION_SECRET` 32+ тэмдэгт санамсаргүй
- [ ] MongoDB user least-privilege (хэрэгтэй DB-д л `readWrite`)
- [ ] `ADMIN_PHONES` зөв тохируулсан
- [ ] Process manager (PM2 / systemd / Docker)
- [ ] Reverse proxy (nginx/Caddy) `/api/draft/stream`-ийг **buffer хийхгүй** (SSE)
  ```nginx
  location /api/draft/stream {
    proxy_buffering off;
    proxy_cache off;
    proxy_set_header Connection '';
    proxy_http_version 1.1;
    chunked_transfer_encoding off;
  }
  ```
