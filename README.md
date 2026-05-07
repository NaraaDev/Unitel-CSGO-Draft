# UNITEL CS:GO Draft

CS:GO лигийн live snake-draft систем. Тоглогчид бүртгүүлж, админ ахлагч + цагийг товлож, ахлагч нар ээлжээр сонголт хийнэ.

**Stack:** Next.js 16.2.5 (App Router) · React 19 · TypeScript · Tailwind v4 · MongoDB · SSE · `bcryptjs` · `zod` · `html-to-image`

📚 Дэлгэрэнгүй нь [`docs/`](./docs) дотор:

- [Setup болон ажиллуулах](./docs/SETUP.md)
- [Хэрэглэгчийн зааварчилгаа](./docs/USER_GUIDE.md)
- [Админ зааварчилгаа](./docs/ADMIN_GUIDE.md)
- [API reference](./docs/API.md)
- [Архитектур, дотоод бүтэц](./docs/ARCHITECTURE.md)
- [Ажиллахгүй болсон үед](./docs/TROUBLESHOOTING.md)

## Хурдан эхлэл

```bash
cp .env.example .env.local       # дотор нь утга бичих
# MONGODB_URI, SESSION_SECRET, ADMIN_PHONES
npm install
npm run dev
```

`http://localhost:3000` дээр нээгдэнэ.
