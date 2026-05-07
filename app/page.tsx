import Link from "next/link";
import { SiteHeader } from "./_components/SiteHeader";
import { Leaderboard } from "./_components/Leaderboard";

export const dynamic = "force-dynamic";

export default function Home() {
  const callouts = [
    { tag: "01", title: "БҮРТГҮҮЛ", body: "Овог, нэр, утас, нууц үгээ оруулаад тоглогчийн пүүлд нэгдээрэй." },
    { tag: "02", title: "АХЛАГЧ ШАЛГАРНА", body: "Админ цаг товлож, ахлагчдаа сонгож, дараалалыг snake форматаар шийднэ." },
    { tag: "03", title: "DRAFT GO", body: "Цаг болоход ахлагч нар ээлжээр сонголт хийнэ. Хугацаа хэтэрвэл ээлж урагшилна." },
  ];

  return (
    <>
      <SiteHeader />
      <main className="flex-1">
        <section className="relative overflow-hidden">
          <div className="absolute inset-0 pointer-events-none">
            <div
              className="absolute -top-40 -left-40 w-[640px] h-[640px] rounded-full opacity-30"
              style={{ background: "radial-gradient(circle, var(--accent-fire), transparent 70%)" }}
            />
            <div
              className="absolute -bottom-32 right-0 w-[520px] h-[520px] rounded-full opacity-20"
              style={{ background: "radial-gradient(circle, var(--accent-cyber), transparent 70%)" }}
            />
            <svg className="absolute inset-0 w-full h-full opacity-[0.06]" xmlns="http://www.w3.org/2000/svg">
              <defs>
                <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                  <path d="M 40 0 L 0 0 0 40" fill="none" stroke="white" strokeWidth="0.5" />
                </pattern>
              </defs>
              <rect width="100%" height="100%" fill="url(#grid)" />
            </svg>
          </div>

          <div className="relative max-w-7xl mx-auto px-6 py-24 lg:py-32 grid lg:grid-cols-12 gap-10">
            <div className="lg:col-span-8 stagger">
              <p
                className="rise-in font-mono text-xs text-fire tracking-[0.4em] mb-4"
                style={{ ["--i" as never]: 0 }}
              >
                {"// OPERATION_BRIEF :: 2026"}
              </p>

              <h1
                className="rise-in font-display text-[clamp(3.5rem,9vw,9rem)] leading-[0.85] tracking-[0.02em] mb-4"
                style={{ ["--i" as never]: 1 }}
              >
                <span className="block">UNITEL</span>
                <span className="block text-fire glitch">CSGO DRAFT</span>
                <span className="block text-secondary text-[0.5em]">{"// LIVE.OPS.PROTOCOL"}</span>
              </h1>

              <p
                className="rise-in max-w-2xl text-secondary text-base lg:text-lg leading-relaxed mb-10"
                style={{ ["--i" as never]: 2 }}
              >
                CS:GO лигийн ахлагч нар тоглогчдыг шууд эфирээр, snake-дараалалаар сонгоно.
                Бүх ээлж серверээс баталгаажиж бичигдэнэ. Алгасах боломжтой ч буцаах эрхгүй —
                тактик, хурд, шийдэмгий байдал.
              </p>

              <div className="rise-in flex flex-wrap gap-3" style={{ ["--i" as never]: 3 }}>
                <Link href="/register" className="btn-fire">
                  ► Бүртгүүлэх
                </Link>
                <Link href="/draft" className="btn-ghost">
                  Live Draft Үзэх
                </Link>
                <Link href="/login" className="btn-ghost">
                  Нэвтрэх
                </Link>
              </div>
            </div>

            <div className="lg:col-span-4 relative">
              <div
                className="tactical-card bevel-strong corners p-6 relative overflow-hidden rise-in"
                style={{ ["--i" as never]: 2 }}
              >
                <div className="scanline" />
                <p className="font-mono text-xs text-muted mb-3">{"// SYSTEM.READOUT"}</p>

                <dl className="space-y-3">
                  <div className="flex items-baseline justify-between border-b border-subtle pb-2">
                    <dt className="font-mono text-[11px] text-muted">PROTOCOL</dt>
                    <dd className="font-display text-lg text-fire">SNAKE / 4 ROUND</dd>
                  </div>
                  <div className="flex items-baseline justify-between border-b border-subtle pb-2">
                    <dt className="font-mono text-[11px] text-muted">PICK_WINDOW</dt>
                    <dd className="font-display text-lg">60.00s</dd>
                  </div>
                  <div className="flex items-baseline justify-between border-b border-subtle pb-2">
                    <dt className="font-mono text-[11px] text-muted">TIME_CAP</dt>
                    <dd className="font-display text-lg">60:00 MIN</dd>
                  </div>
                  <div className="flex items-baseline justify-between border-b border-subtle pb-2">
                    <dt className="font-mono text-[11px] text-muted">TEAM_SIZE</dt>
                    <dd className="font-display text-lg">5 OPS</dd>
                  </div>
                  <div className="flex items-baseline justify-between">
                    <dt className="font-mono text-[11px] text-muted">SPECTATOR</dt>
                    <dd className="font-display text-lg text-cyber">OPEN</dd>
                  </div>
                </dl>

                <div className="mt-6 flex items-center gap-2 font-mono text-[11px] text-fire">
                  <span className="w-2 h-2 bg-current blink" />
                  <span className="tracking-[0.3em]">SYSTEM IDLE — AWAITING DRAFT</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="relative max-w-7xl mx-auto px-6 py-20">
          <div className="flex items-end justify-between mb-12 flex-wrap gap-4">
            <div>
              <p className="font-mono text-xs text-fire tracking-[0.4em] mb-2">{"// PROCEDURE"}</p>
              <h2 className="font-display text-5xl lg:text-7xl tracking-tight">
                3 ҮЕ <span className="text-fire">/</span> 1 ЭЦСИЙН ШИЙДВЭР
              </h2>
            </div>
            <p className="text-secondary max-w-md">
              Бүгд серверийн дагалдан, бодит цаг хугацаанд. Сонголт хийгдвэл буцаах боломжгүй.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-5 stagger">
            {callouts.map((c, idx) => (
              <article
                key={c.tag}
                className="tactical-card bevel corners p-7 rise-in relative overflow-hidden"
                style={{ ["--i" as never]: idx }}
              >
                <div className="absolute top-0 right-0 font-display text-[8rem] text-fire/[0.06] leading-none pr-2 pt-1 select-none">
                  {c.tag}
                </div>
                <p className="font-mono text-xs text-muted mb-3">STEP_{c.tag}</p>
                <h3 className="font-display text-3xl tracking-wide mb-3">{c.title}</h3>
                <p className="text-secondary leading-relaxed text-sm">{c.body}</p>
                <div className="mt-6 h-px ticker-bg" />
              </article>
            ))}
          </div>
        </section>

        <Leaderboard />

        <section className="relative border-y border-subtle bg-raised">
          <div className="max-w-7xl mx-auto px-6 py-12 flex flex-col md:flex-row items-center justify-between gap-6">
            <div>
              <p className="font-mono text-xs text-fire tracking-[0.4em] mb-1">{"// READY?"}</p>
              <p className="font-display text-3xl md:text-5xl">DRAFT BEGINS WHEN ADMIN PUSHES START.</p>
            </div>
            <Link href="/register" className="btn-fire whitespace-nowrap">
              ► Хүрээнд орох
            </Link>
          </div>
        </section>

        <footer className="max-w-7xl mx-auto px-6 py-10 font-mono text-xs text-muted flex justify-between flex-wrap gap-4">
          <span>UNITEL // CSGO_DRAFT // © 2026</span>
          <span>BUILD: TACTICAL.HUD.v1</span>
        </footer>
      </main>
    </>
  );
}
