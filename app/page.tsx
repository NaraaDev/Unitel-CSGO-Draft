import Link from "next/link";
import { SiteHeader } from "./_components/SiteHeader";

export default function Home() {
  const callouts = [
    {
      tag: "01",
      title: "БҮРТГҮҮЛ",
      body: "Овог, нэр, утас, нууц үг — 30 секунд. Бүртгэгдмэгц тоглогчийн pool-д орно, дараа нь ахлагчид чамайг сонгож болно.",
    },
    {
      tag: "02",
      title: "АХЛАГЧ ТОВЛОНО",
      body: "Админ цаг товлож, 2-8 ахлагч сонгоно. Snake / Linear / Random — гурван төрлөөс draft-ын дарааллыг шийднэ.",
    },
    {
      tag: "03",
      title: "ШУУД DRAFT",
      body: "Эхлэх цаг болохуйц автоматаар live-д орно. Ахлагч 60 сек хүрэхгүй сонголт хийнэ — алгассан, хоцорсон бүгд серверт бичигдэнэ.",
    },
    {
      tag: "04",
      title: "ОНОО ТООЦНО",
      body: "Тоглолт дуусахад админ багуудад байр өгнө. Систем оноог 1-р байр = N оноо хэлбэрээр scoreboard руу автоматаар шинэчилнэ.",
    },
  ];

  return (
    <>
      <SiteHeader />
      <main className="flex-1">
        <section className="relative overflow-hidden">
          <div className="absolute inset-0 pointer-events-none">
            <div
              className="absolute -top-40 -left-40 w-[720px] h-[720px] rounded-full opacity-40"
              style={{ background: "radial-gradient(circle, var(--accent-fire), transparent 70%)" }}
            />
            <div
              className="absolute -bottom-32 right-0 w-[560px] h-[560px] rounded-full opacity-25"
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
            <div className="ember-field" />
          </div>

          <div className="relative max-w-7xl mx-auto px-6 py-24 lg:py-32 grid lg:grid-cols-12 gap-10">
            <div className="lg:col-span-8 stagger">
              <p
                className="rise-in font-mono text-xs text-fire tracking-[0.4em] mb-4"
                style={{ ["--i" as never]: 0 }}
              >
                {"// OPERATION_BRIEF :: 2026 :: ШУУД ЭФИР"}
              </p>

              <h1
                className="rise-in font-display text-[clamp(3.5rem,9vw,9rem)] leading-[0.85] tracking-[0.02em] mb-4"
                style={{ ["--i" as never]: 1 }}
              >
                <span className="block">UNITEL MBD</span>
                <span className="block flame-text mega-glitch">CSGO DRAFT</span>
                <span className="block text-secondary text-[0.5em]">{"// LIVE.OPS.PROTOCOL"}</span>
              </h1>

              <p
                className="rise-in max-w-2xl text-secondary text-base lg:text-lg leading-relaxed mb-10"
                style={{ ["--i" as never]: 2 }}
              >
                CS:GO лигийн ахлагч нар тоглогчдыг <span className="text-fire font-semibold">шууд эфирээр</span> сонгоно.
                Snake, Linear, Random — гурван драфт төрлөөс сонгож, 60 секундийн дотор шийдвэр гаргана.
                Алгасах боломжтой ч буцаах <span className="text-danger">боломжгүй</span>.
                Бүгд серверт бичигддэг — тактик, хурд, шийдэмгий байдал.
              </p>

              <div className="rise-in flex flex-wrap gap-3" style={{ ["--i" as never]: 3 }}>
                <Link href="/register" className="btn-fire">
                  ► Бүртгүүлэх
                </Link>
                <Link href="/draft" className="btn-ghost">
                  Live Draft Үзэх
                </Link>
                <Link href="/leaderboard" className="btn-ghost">
                  ★ Scoreboard
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
                    <dt className="font-mono text-[11px] text-muted">DRAFT ТӨРЛҮҮД</dt>
                    <dd className="font-display text-lg text-fire">SNAKE / LINEAR / RAND</dd>
                  </div>
                  <div className="flex items-baseline justify-between border-b border-subtle pb-2">
                    <dt className="font-mono text-[11px] text-muted">PICK ХУГАЦАА</dt>
                    <dd className="font-display text-lg">60s</dd>
                  </div>
                  <div className="flex items-baseline justify-between border-b border-subtle pb-2">
                    <dt className="font-mono text-[11px] text-muted">НИЙТ TIME-CAP</dt>
                    <dd className="font-display text-lg">60 МИН</dd>
                  </div>
                  <div className="flex items-baseline justify-between border-b border-subtle pb-2">
                    <dt className="font-mono text-[11px] text-muted">БАГИЙН ХЭМЖЭЭ</dt>
                    <dd className="font-display text-lg">5 ОПЕРАТОР</dd>
                  </div>
                  <div className="flex items-baseline justify-between">
                    <dt className="font-mono text-[11px] text-muted">ҮЗЭГЧИД</dt>
                    <dd className="font-display text-lg text-cyber">НЭЭЛТТЭЙ</dd>
                  </div>
                </dl>

                <div className="mt-6 flex items-center gap-2 font-mono text-[11px] text-fire">
                  <span className="w-2 h-2 bg-current blink" />
                  <span className="tracking-[0.3em]">СИСТЕМ БЭЛЭН — DRAFT ХҮЛЭЭГДЭЖ БАЙНА</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="relative max-w-7xl mx-auto px-6 py-20">
          <div className="flex items-end justify-between mb-12 flex-wrap gap-4">
            <div>
              <p className="font-mono text-xs text-fire tracking-[0.4em] mb-2">{"// АЖИЛЛАГАА"}</p>
              <h2 className="font-display text-5xl lg:text-7xl tracking-tight">
                4 ҮЕ <span className="text-fire">/</span> ШУУД ШИЙДВЭР
              </h2>
            </div>
            <p className="text-secondary max-w-md">
              Бүх алхам серверт бичигдэнэ. Хийсэн сонголтоо буцаах боломжгүй —
              бүх юм бодит цаг хугацаанд явагдана.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-5 stagger">
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

        <section className="relative border-y border-subtle bg-raised overflow-hidden">
          <div className="ember-field opacity-60" />
          <div className="relative max-w-7xl mx-auto px-6 py-14 flex flex-col md:flex-row items-center justify-between gap-6">
            <div>
              <p className="font-mono text-xs text-fire tracking-[0.4em] mb-1">{"// БЭЛЭН ҮҮ?"}</p>
              <p className="font-display text-3xl md:text-5xl">
                АДМИН ЭХЛҮҮЛЭХЭД <span className="flame-text">DRAFT АСНА.</span>
              </p>
              <p className="text-secondary text-sm font-mono mt-2">
                Бүртгэлгүй бол доороос орж тоглогчийн pool-д нэгдээрэй.
              </p>
            </div>
            <Link href="/register" className="btn-fire whitespace-nowrap fire-pulse">
              ► ХҮРЭЭНД ОРОХ
            </Link>
          </div>
        </section>

        <footer className="max-w-7xl mx-auto px-6 py-10 font-mono text-xs text-muted flex justify-between flex-wrap gap-4">
          <span>UNITEL MBD // CSGO_DRAFT // © 2026</span>
          <span>BUILD: TACTICAL.HUD.v1</span>
        </footer>
      </main>
    </>
  );
}
