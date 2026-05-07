import { Avatar } from "./Avatar";
import { getLeaderboard } from "@/lib/draft-state";

export async function Leaderboard({ limit = 10 }: { limit?: number }) {
  let entries = [] as Awaited<ReturnType<typeof getLeaderboard>>;
  try {
    entries = await getLeaderboard();
  } catch {
    return null;
  }

  if (entries.length === 0) {
    return (
      <section className="relative max-w-7xl mx-auto px-6 py-16">
        <p className="font-mono text-xs text-fire tracking-[0.4em] mb-3">{"// LEADERBOARD"}</p>
        <h2 className="font-display text-4xl lg:text-6xl tracking-tight mb-6">
          ТОГЛОГЧДЫН <span className="text-fire">SCOREBOARD</span>
        </h2>
        <p className="text-secondary font-mono text-sm">
          Хараахан баталгаажсан тоглолт байхгүй байна. Эхний тоглолтоор leaderboard эхэлнэ.
        </p>
      </section>
    );
  }

  const top = entries.slice(0, limit);

  return (
    <section className="relative max-w-7xl mx-auto px-6 py-16">
      <div className="flex items-end justify-between mb-8 flex-wrap gap-4">
        <div>
          <p className="font-mono text-xs text-fire tracking-[0.4em] mb-2">
            {"// LEADERBOARD"}
          </p>
          <h2 className="font-display text-4xl lg:text-6xl tracking-tight">
            ТОГЛОГЧДЫН <span className="text-fire">SCOREBOARD</span>
          </h2>
        </div>
        <p className="text-secondary max-w-md text-sm">
          Бүх тоглолтын байраар оноо хуримтлуулна. 1-р байр = N оноо, эцсийн байр = 1 оноо.
        </p>
      </div>

      <div className="border border-subtle bevel">
        <div className="grid grid-cols-12 px-3 py-2 font-mono text-[10px] tracking-widest text-muted border-b border-subtle">
          <span className="col-span-1">#</span>
          <span className="col-span-5">OPERATOR</span>
          <span className="col-span-2 text-right">MATCHES</span>
          <span className="col-span-2 text-right">WINS</span>
          <span className="col-span-2 text-right">POINTS</span>
        </div>
        {top.map((e, idx) => {
          const rankColor =
            idx === 0
              ? "text-fire"
              : idx < 3
              ? "text-cyber"
              : "text-muted";
          return (
            <div
              key={e.userId}
              className="grid grid-cols-12 items-center px-3 py-2 border-b border-subtle/60"
            >
              <span className={`col-span-1 font-display text-lg ${rankColor}`}>
                #{idx + 1}
              </span>
              <span className="col-span-5 flex items-center gap-2">
                <Avatar id={e.avatarId} size={28} />
                <span>
                  <span className="font-display tracking-wide">
                    {e.lastName.toUpperCase()}
                  </span>{" "}
                  <span className="text-secondary">{e.firstName}</span>
                </span>
              </span>
              <span className="col-span-2 text-right font-mono text-sm tabular-nums">
                {e.matches}
              </span>
              <span className="col-span-2 text-right font-mono text-sm tabular-nums text-cyber">
                {e.wins}
              </span>
              <span className="col-span-2 text-right font-display text-xl tabular-nums text-fire">
                {e.points}
              </span>
            </div>
          );
        })}
      </div>
    </section>
  );
}
