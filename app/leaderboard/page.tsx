import Link from "next/link";
import { SiteHeader } from "../_components/SiteHeader";
import { Avatar } from "../_components/Avatar";
import { getLeaderboard } from "@/lib/draft-state";

export const dynamic = "force-dynamic";

export default async function LeaderboardPage() {
  let entries: Awaited<ReturnType<typeof getLeaderboard>> = [];
  try {
    entries = await getLeaderboard();
  } catch {
    entries = [];
  }

  const podium = entries.slice(0, 3);
  const rest = entries.slice(3);

  return (
    <>
      <SiteHeader />
      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 py-10 w-full">
        <div className="flex items-center justify-between flex-wrap gap-3 mb-2">
          <p className="font-mono text-xs text-fire tracking-[0.4em] rise-in">
            {"// SCOREBOARD"}
          </p>
          <Link href="/" className="btn-ghost !py-1 !px-3 !text-xs">
            ← НҮҮР ХУУДАС
          </Link>
        </div>
        <h1
          className="font-display text-5xl lg:text-7xl rise-in mb-2"
          style={{ ["--i" as never]: 1 }}
        >
          ТОГЛОГЧДЫН <span className="text-fire">SCOREBOARD</span>
        </h1>
        <p className="text-secondary font-mono text-sm mb-10">
          Бүх тоглолтын байраар оноо хуримтлуулна. 1-р байр = N оноо, эцсийн байр = 1 оноо.
        </p>

        {entries.length === 0 ? (
          <div className="tactical-card bevel-strong corners p-10 text-center">
            <p className="font-display text-3xl text-muted mb-2">NO STATS YET</p>
            <p className="font-mono text-sm text-secondary">
              Хараахан баталгаажсан тоглолт байхгүй байна.
            </p>
          </div>
        ) : (
          <>
            <Podium podium={podium} />
            {rest.length > 0 && (
              <div className="mt-12">
                <p className="font-mono text-xs text-fire tracking-[0.4em] mb-3">
                  {"// REMAINING OPS"}
                </p>
                <div className="border border-subtle bevel">
                  <div className="grid grid-cols-12 px-4 py-2 font-mono text-[10px] tracking-widest text-muted border-b border-subtle">
                    <span className="col-span-1">#</span>
                    <span className="col-span-5">OPERATOR</span>
                    <span className="col-span-2 text-right">MATCHES</span>
                    <span className="col-span-2 text-right">WINS</span>
                    <span className="col-span-2 text-right">POINTS</span>
                  </div>
                  {rest.map((e, i) => (
                    <div
                      key={e.userId}
                      className="grid grid-cols-12 items-center px-4 py-2.5 border-b border-subtle/60"
                    >
                      <span className="col-span-1 font-display text-lg text-muted">
                        #{i + 4}
                      </span>
                      <span className="col-span-5 flex items-center gap-3">
                        <Avatar id={e.avatarId} size={32} />
                        <span className="min-w-0">
                          <span className="font-display tracking-wide truncate block">
                            {e.lastName.toUpperCase()}
                          </span>
                          <span className="text-secondary text-sm truncate block leading-tight">
                            {e.firstName}
                          </span>
                        </span>
                      </span>
                      <span className="col-span-2 text-right font-mono text-sm tabular-nums">
                        {e.matches}
                      </span>
                      <span className="col-span-2 text-right font-mono text-sm tabular-nums text-cyber">
                        {e.wins}
                      </span>
                      <span className="col-span-2 text-right font-display text-2xl tabular-nums text-fire">
                        {e.points}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </main>
    </>
  );
}

function Podium({
  podium,
}: {
  podium: Awaited<ReturnType<typeof getLeaderboard>>;
}) {
  // Visual order: 2nd left, 1st middle, 3rd right
  const [first, second, third] = [podium[0], podium[1], podium[2]];
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
      <PodiumCard entry={second} rank={2} />
      <PodiumCard entry={first} rank={1} />
      <PodiumCard entry={third} rank={3} />
    </div>
  );
}

function PodiumCard({
  entry,
  rank,
}: {
  entry: Awaited<ReturnType<typeof getLeaderboard>>[number] | undefined;
  rank: 1 | 2 | 3;
}) {
  if (!entry) {
    return (
      <div
        className={`tactical-card bevel-strong corners p-6 text-center border-dashed border-subtle/40 ${
          rank === 1 ? "min-h-[24rem]" : "min-h-[20rem]"
        } flex flex-col items-center justify-center`}
      >
        <p className="font-display text-7xl text-muted/40">#{rank}</p>
        <p className="font-mono text-xs text-muted/60 mt-2">SLOT OPEN</p>
      </div>
    );
  }

  const palette = {
    1: {
      border: "border-fire",
      ring: "ring-fire/40",
      text: "text-fire",
      glow: "shadow-[0_0_60px_rgba(255,90,30,0.25)]",
      label: "CHAMPION",
      avatar: 144,
      minH: "min-h-[26rem]",
      heading: "text-7xl md:text-8xl",
    },
    2: {
      border: "border-cyber",
      ring: "ring-cyber/30",
      text: "text-cyber",
      glow: "shadow-[0_0_30px_rgba(60,200,255,0.15)]",
      label: "RUNNER-UP",
      avatar: 112,
      minH: "min-h-[22rem]",
      heading: "text-5xl md:text-6xl",
    },
    3: {
      border: "border-secondary/60",
      ring: "ring-secondary/20",
      text: "text-secondary",
      glow: "",
      label: "BRONZE",
      avatar: 96,
      minH: "min-h-[20rem]",
      heading: "text-4xl md:text-5xl",
    },
  } as const;

  const p = palette[rank];

  return (
    <div
      className={`tactical-card bevel-strong corners p-6 relative overflow-hidden border-2 ${p.border} ${p.glow} ${p.minH} flex flex-col`}
    >
      <div className="absolute top-0 right-0 font-display text-[14rem] leading-none opacity-[0.05] pr-2 select-none">
        #{rank}
      </div>
      <div className="flex items-baseline justify-between mb-4 relative">
        <p className={`font-mono text-[11px] tracking-[0.3em] ${p.text}`}>
          {"// "}{p.label}
        </p>
        <p className={`font-display text-3xl ${p.text}`}>#{rank}</p>
      </div>

      <div className="flex flex-col items-center text-center grow justify-center relative">
        <div className={`p-1 rounded-full ring-4 ${p.ring} mb-4`}>
          <Avatar id={entry.avatarId} size={p.avatar} active={rank === 1} />
        </div>
        <p
          className={`font-display tracking-wide leading-none truncate w-full ${p.heading}`}
        >
          {entry.lastName.toUpperCase()}
        </p>
        <p className="text-secondary text-base mt-2 truncate w-full">
          {entry.firstName}
        </p>
      </div>

      <div className="grid grid-cols-3 gap-2 mt-6 relative">
        <div className="border border-subtle px-2 py-2 text-center">
          <p className="font-mono text-[10px] text-muted">MATCHES</p>
          <p className="font-display text-xl tabular-nums">{entry.matches}</p>
        </div>
        <div className="border border-subtle px-2 py-2 text-center">
          <p className="font-mono text-[10px] text-muted">WINS</p>
          <p className="font-display text-xl tabular-nums text-cyber">
            {entry.wins}
          </p>
        </div>
        <div className={`border ${p.border} px-2 py-2 text-center`}>
          <p className="font-mono text-[10px] text-muted">POINTS</p>
          <p className={`font-display text-xl tabular-nums ${p.text}`}>
            {entry.points}
          </p>
        </div>
      </div>
    </div>
  );
}
