"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { toPng } from "html-to-image";
import { SiteHeader } from "../_components/SiteHeader";
import { StatusChip } from "../_components/StatusChip";
import { Avatar } from "../_components/Avatar";
import type { DraftStateDto, PublicUser } from "@/lib/types";

function fmt(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m.toString().padStart(2, "0")}:${r.toString().padStart(2, "0")}`;
}

function fmtRemaining(targetIso: string | null): { display: string; seconds: number } {
  if (!targetIso) return { display: "--:--", seconds: 0 };
  const diff = (new Date(targetIso).getTime() - Date.now()) / 1000;
  return { display: fmt(diff), seconds: diff };
}

export default function DraftPage() {
  const [me, setMe] = useState<PublicUser | null | undefined>(undefined);
  const [state, setState] = useState<DraftStateDto | null>(null);
  const [filter, setFilter] = useState("");
  const [picking, setPicking] = useState<string | null>(null);
  const [pickError, setPickError] = useState<string | null>(null);
  const [_, setTick] = useState(0);
  const [exporting, setExporting] = useState(false);
  const boardRef = useRef<HTMLDivElement | null>(null);
  const lastPickRef = useRef<number>(0);
  const [flashCaptainId, setFlashCaptainId] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((j) => alive && setMe(j.data ?? null))
      .catch(() => alive && setMe(null));
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    const es = new EventSource("/api/draft/stream");
    es.addEventListener("state", (e) => {
      const data = JSON.parse((e as MessageEvent).data) as DraftStateDto;
      setState((prev) => {
        if (prev && data.picks.length > prev.picks.length) {
          const last = data.picks[data.picks.length - 1];
          lastPickRef.current = Date.now();
          if (last && !last.skipped) {
            setFlashCaptainId(last.captainId);
            setTimeout(() => setFlashCaptainId(null), 700);
          }
        }
        return data;
      });
    });
    es.addEventListener("error", () => {
      // EventSource auto-reconnects
    });
    return () => es.close();
  }, []);

  useEffect(() => {
    const t = setInterval(() => setTick((n) => n + 1), 250);
    return () => clearInterval(t);
  }, []);

  const isMyTurn = useMemo(
    () => !!state && !!me && state.currentTurnCaptainId === me.id && state.status === "live",
    [state, me],
  );

  const remaining = useMemo(
    () => fmtRemaining(state?.turnDeadline ?? null),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [state?.turnDeadline, _],
  );

  const totalRemaining = useMemo(
    () => fmtRemaining(state?.endsAt ?? null),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [state?.endsAt, _],
  );

  const filtered = useMemo(() => {
    if (!state) return [];
    const q = filter.trim().toLowerCase();
    if (!q) return state.availablePlayers;
    return state.availablePlayers.filter((p) =>
      `${p.lastName} ${p.firstName}`.toLowerCase().includes(q),
    );
  }, [state, filter]);

  async function pickPlayer(playerId: string) {
    setPicking(playerId);
    setPickError(null);
    try {
      const res = await fetch("/api/draft/pick", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ playerId }),
      });
      const json = await res.json();
      if (!json.success) {
        setPickError(json.error ?? "Сонголт амжилтгүй");
      } else if (json.data) {
        setState(json.data);
      }
    } catch {
      setPickError("Сүлжээний алдаа");
    } finally {
      setPicking(null);
    }
  }

  async function exportImage() {
    if (!boardRef.current) return;
    setExporting(true);
    try {
      const dataUrl = await toPng(boardRef.current, {
        cacheBust: true,
        backgroundColor: "#08080a",
        pixelRatio: 2,
      });
      const a = document.createElement("a");
      a.href = dataUrl;
      a.download = `csgo-draft-${new Date().toISOString().slice(0, 16).replace(/[:T]/g, "-")}.png`;
      a.click();
    } catch (err) {
      setPickError("Зураг үүсгэж чадсангүй: " + (err as Error).message);
    } finally {
      setExporting(false);
    }
  }

  if (state === null) {
    return (
      <>
        <SiteHeader />
        <main className="flex-1 flex items-center justify-center font-mono text-muted">
          ESTABLISHING TACTICAL FEED...
        </main>
      </>
    );
  }

  const turnPct =
    state.pickWindowSeconds > 0
      ? Math.max(0, Math.min(1, remaining.seconds / state.pickWindowSeconds))
      : 0;

  const currentCaptain = state.captains.find((c) => c.userId === state.currentTurnCaptainId);
  const totalPicks = state.captains.length * Math.max(0, state.teamSize - 1);

  return (
    <>
      <SiteHeader />
      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 py-6 w-full">
        {/* TOP BAR — clock + status */}
        <div className="grid grid-cols-12 gap-4 mb-6">
          <div className="col-span-12 lg:col-span-7 tactical-card bevel-strong corners p-5 relative overflow-hidden">
            <div className="scanline opacity-50" />
            <div className="flex items-center justify-between mb-2">
              <p className="font-mono text-xs tracking-[0.4em] text-fire">{"// LIVE.OPS"}</p>
              <StatusChip status={state.status} />
            </div>
            {state.status === "live" && currentCaptain ? (
              <>
                <div className="flex items-center gap-3 flex-wrap">
                  <Avatar id={currentCaptain.avatarId} size={48} active />
                  <div>
                    <div className="font-mono text-xs text-muted">ON CLOCK</div>
                    <div className="font-display text-3xl md:text-5xl tracking-wide leading-none">
                      {currentCaptain.lastName.toUpperCase()}{" "}
                      <span className="text-fire">{currentCaptain.firstName}</span>
                    </div>
                  </div>
                </div>
                <div className="mt-3 flex items-baseline justify-between gap-4">
                  <div
                    className={`font-display text-6xl md:text-8xl leading-none tabular-nums ${
                      remaining.seconds <= 5 ? "text-danger shake" : "text-fire"
                    }`}
                  >
                    {remaining.display}
                  </div>
                  <div className="font-mono text-xs text-muted text-right">
                    PICK {state.currentTurnIndex + 1} / {totalPicks}
                    <br />
                    ROUND {Math.floor(state.currentTurnIndex / Math.max(1, state.captains.length)) + 1} /{" "}
                    {state.teamSize - 1}
                  </div>
                </div>
                <div className="mt-3 h-2 bg-elevated relative overflow-hidden">
                  <div
                    className="absolute inset-y-0 left-0 bg-fire transition-[width] duration-200"
                    style={{ width: `${turnPct * 100}%` }}
                  />
                </div>
              </>
            ) : state.status === "scheduled" ? (
              <ScheduledHero state={state} />
            ) : state.status === "completed" || state.status === "stopped" ? (
              <div>
                <p className="font-display text-4xl md:text-6xl">
                  {state.status === "completed" ? "DRAFT FINALIZED" : "TIME CAP REACHED"}
                </p>
                <p className="text-secondary text-sm mt-2 font-mono">
                  {state.completedAt ? new Date(state.completedAt).toLocaleString() : ""}
                </p>
                <button onClick={exportImage} disabled={exporting} className="btn-fire mt-5">
                  {exporting ? "GENERATING..." : "► ЗУРГААР ТАТАХ"}
                </button>
              </div>
            ) : (
              <div>
                <p className="font-display text-4xl md:text-6xl text-muted">STANDBY</p>
                <p className="text-secondary text-sm mt-2 font-mono">
                  Админ ахлагч сонгож, цаг товлоогүй байна.
                </p>
              </div>
            )}
          </div>

          <div className="col-span-12 lg:col-span-5 tactical-card bevel-strong corners p-5">
            <div className="flex items-center justify-between mb-3">
              <p className="font-mono text-xs tracking-[0.4em] text-fire">{"// TIMECAP"}</p>
              <span className="chip text-fire">
                <span className="chip-dot" />
                BO{state.bestOf ?? 1}
              </span>
            </div>
            <div className="flex items-baseline justify-between gap-3">
              <div>
                <div className="font-display text-5xl tabular-nums">{totalRemaining.display}</div>
                <p className="font-mono text-xs text-muted mt-1">CAP REMAINING</p>
              </div>
              <div className="text-right">
                <div className="font-display text-2xl text-cyber tabular-nums">
                  {state.captains.length}
                </div>
                <p className="font-mono text-xs text-muted">CAPTAINS</p>
              </div>
              <div className="text-right">
                <div className="font-display text-2xl text-cyber tabular-nums">
                  {state.picks.filter((p) => !p.skipped).length}
                </div>
                <p className="font-mono text-xs text-muted">PICKS</p>
              </div>
            </div>
            {state.status === "completed" || state.status === "stopped" ? (
              <button onClick={exportImage} disabled={exporting} className="btn-ghost w-full mt-5">
                {exporting ? "GENERATING..." : "ЗУРАГ ТАТАХ"}
              </button>
            ) : null}
          </div>
        </div>

        {/* CAPTAIN PICK PANEL */}
        {isMyTurn && (
          <div className="tactical-card border-2 border-fire bevel-strong corners p-5 mb-6 relative overflow-hidden">
            <div className="absolute inset-0 marching-border opacity-30 pointer-events-none" />
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="font-mono text-xs text-fire tracking-[0.4em] mb-1">
                  {"// YOU ARE ON CLOCK"}
                </p>
                <p className="font-display text-3xl">PICK YOUR OPERATOR</p>
              </div>
              <div className="font-display text-5xl text-fire tabular-nums">{remaining.display}</div>
            </div>
            <input
              type="text"
              placeholder="OPERATOR ХАЙЛТ..."
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="input-tac mb-3"
            />
            {pickError && (
              <div className="border border-danger/50 bg-danger/10 px-3 py-2 font-mono text-xs text-danger mb-3">
                ERR // {pickError}
              </div>
            )}
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2 max-h-[40vh] overflow-auto">
              {filtered.map((p) => {
                const isPicking = picking === p.id;
                return (
                  <button
                    key={p.id}
                    onClick={() => pickPlayer(p.id)}
                    disabled={picking !== null}
                    className="text-left tactical-card bevel border border-subtle hover:border-fire hover:bg-fire/[0.06] transition-colors p-3 group flex items-center gap-3"
                  >
                    <Avatar id={p.avatarId} size={40} />
                    <div className="min-w-0">
                      <p className="font-display text-lg tracking-wide group-hover:text-fire truncate">
                        {p.lastName.toUpperCase()}
                      </p>
                      <p className="text-secondary text-sm truncate">{p.firstName}</p>
                      {isPicking && (
                        <p className="font-mono text-[10px] text-fire blink">SUBMITTING...</p>
                      )}
                    </div>
                  </button>
                );
              })}
              {filtered.length === 0 && (
                <p className="col-span-full text-center text-muted font-mono py-8">
                  Тоглогч олдсонгүй
                </p>
              )}
            </div>
          </div>
        )}

        {/* TEAMS BOARD */}
        <div ref={boardRef} className="bg-base">
          <div className="flex items-end justify-between mb-4 flex-wrap gap-2">
            <div>
              <p className="font-mono text-xs text-fire tracking-[0.4em]">{"// TEAMS"}</p>
              <h2 className="font-display text-4xl tracking-wide">ROSTERS</h2>
            </div>
            <p className="font-mono text-xs text-muted">
              SNAKE / BO{state.bestOf ?? 1} / TEAM_SIZE {state.teamSize} / WINDOW {state.pickWindowSeconds}s
            </p>
          </div>

          <div
            className="grid gap-4"
            style={{
              gridTemplateColumns: `repeat(${Math.max(1, Math.min(state.captains.length, 4))}, minmax(0, 1fr))`,
            }}
          >
            {state.teams.map((team, idx) => {
              const isCurrent = state.currentTurnCaptainId === team.captainId;
              const isFlash = flashCaptainId === team.captainId;
              return (
                <div
                  key={team.captainId}
                  className={`tactical-card bevel corners p-4 relative transition-all ${
                    isCurrent && state.status === "live" ? "border-fire glow-fire" : ""
                  } ${isFlash ? "lock-in" : ""}`}
                >
                  {isCurrent && state.status === "live" && (
                    <div className="absolute -top-3 left-3 font-display tracking-widest text-xs text-fire bg-base px-2 py-0.5 border border-fire">
                      ON CLOCK
                    </div>
                  )}
                  <div className="flex items-baseline justify-between mb-1">
                    <p className="font-mono text-xs text-muted">TEAM #{idx + 1}</p>
                    <p className="font-mono text-xs text-fire">
                      {team.members.length}/{state.teamSize}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 mb-1">
                    <Avatar
                      id={team.captainAvatarId}
                      size={32}
                      active={isCurrent && state.status === "live"}
                    />
                    <h3 className="font-display text-2xl tracking-wide truncate">
                      {team.teamName ?? `TEAM #${idx + 1}`}
                    </h3>
                  </div>
                  <p className="font-mono text-[11px] text-muted mb-3 truncate">
                    CPT · {team.captainName}
                  </p>
                  <ol className="space-y-1.5">
                    {Array.from({ length: state.teamSize }).map((_, slot) => {
                      const member = team.members[slot];
                      const isCaptainSlot = slot === 0;
                      return (
                        <li
                          key={slot}
                          className={`flex items-center gap-2 px-2 py-1.5 border ${
                            member ? "border-subtle bg-elevated" : "border-subtle/40"
                          }`}
                        >
                          <span
                            className={`font-mono text-[10px] w-5 ${
                              isCaptainSlot ? "text-fire" : "text-muted"
                            }`}
                          >
                            {isCaptainSlot ? "CPT" : `#${slot + 1}`}
                          </span>
                          {member ? (
                            <span
                              className={`flex items-center gap-2 ${
                                isFlash && member === team.members[team.members.length - 1]
                                  ? "slot-in"
                                  : ""
                              }`}
                            >
                              <Avatar id={member.avatarId} size={22} />
                              <span className="font-display tracking-wide truncate">
                                {member.lastName.toUpperCase()}
                              </span>
                              <span className="text-secondary text-sm truncate">
                                {member.firstName}
                              </span>
                            </span>
                          ) : (
                            <span className="font-mono text-xs text-muted/50 tracking-widest">
                              ── EMPTY ──
                            </span>
                          )}
                        </li>
                      );
                    })}
                  </ol>
                </div>
              );
            })}
          </div>

          {state.captains.length === 0 && (
            <div className="tactical-card bevel corners p-12 text-center">
              <p className="font-display text-3xl text-muted mb-2">NO ROSTERS</p>
              <p className="font-mono text-sm text-secondary">
                Админ ахлагч сонгож draft-ыг тохируулна.
              </p>
            </div>
          )}
        </div>

        {/* PICK LOG */}
        {state.picks.length > 0 && (
          <section className="mt-10">
            <p className="font-mono text-xs text-fire tracking-[0.4em] mb-2">{"// PICK_LOG"}</p>
            <h3 className="font-display text-3xl mb-4">ТҮҮХ</h3>
            <div className="tactical-card bevel max-h-[260px] overflow-auto">
              {[...state.picks].reverse().map((p) => {
                const captain = state.captains.find((c) => c.userId === p.captainId);
                return (
                  <div
                    key={`${p.pickIndex}`}
                    className={`row-tac font-mono text-sm flex-wrap ${p.skipped ? "locked-hatch text-danger" : ""}`}
                  >
                    <span className="text-muted">#{(p.pickIndex + 1).toString().padStart(2, "0")}</span>
                    <span className="text-fire font-display tracking-wide w-32 shrink-0">
                      R{p.round + 1}
                    </span>
                    <span className="grow">
                      {captain && (
                        <span className="text-secondary">
                          {captain.lastName} {captain.firstName}
                        </span>
                      )}
                      {" "}→{" "}
                      {p.skipped ? (
                        <span className="text-danger font-display tracking-widest">SKIPPED</span>
                      ) : (
                        <span>
                          {(() => {
                            const m = state.teams
                              .find((t) => t.captainId === p.captainId)
                              ?.members.find((mm) => mm.id === p.playerId);
                            return m ? (
                              <span className="font-display tracking-wide">
                                {m.lastName.toUpperCase()} <span className="text-secondary">{m.firstName}</span>
                              </span>
                            ) : (
                              <span className="text-muted">—</span>
                            );
                          })()}
                        </span>
                      )}
                    </span>
                    <span className="text-muted text-[11px]">
                      {new Date(p.pickedAt).toLocaleTimeString()}
                    </span>
                  </div>
                );
              })}
            </div>
          </section>
        )}
      </main>
    </>
  );
}

function ScheduledHero({ state }: { state: DraftStateDto }) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  if (!state.startAt) return null;
  const diff = Math.max(0, (new Date(state.startAt).getTime() - now) / 1000);
  return (
    <div>
      <p className="font-mono text-xs text-muted">DEPLOYMENT IN</p>
      <p className="font-display text-5xl md:text-7xl tabular-nums text-cyber">
        T-{fmt(diff)}
      </p>
      <p className="font-mono text-xs text-secondary mt-2">
        SCHEDULED // {new Date(state.startAt).toLocaleString()}
      </p>
    </div>
  );
}
