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

  type FlyingPick = {
    key: string;
    playerId: string;
    avatarId: number;
    lastName: string;
    firstName: string;
    source: { x: number; y: number; w: number; h: number };
    dest: { x: number; y: number; w: number; h: number } | null;
  };
  const [flying, setFlying] = useState<FlyingPick[]>([]);

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

  async function pickPlayer(playerId: string, sourceEl?: HTMLElement | null) {
    setPicking(playerId);
    setPickError(null);
    if (sourceEl) {
      const player = state?.availablePlayers.find((p) => p.id === playerId);
      if (player) {
        const r = sourceEl.getBoundingClientRect();
        setFlying((prev) => [
          ...prev,
          {
            key: `${playerId}-${Date.now()}`,
            playerId,
            avatarId: player.avatarId,
            lastName: player.lastName,
            firstName: player.firstName,
            source: { x: r.left, y: r.top, w: r.width, h: r.height },
            dest: null,
          },
        ]);
      }
    }
    try {
      const res = await fetch("/api/draft/pick", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ playerId }),
      });
      const json = await res.json();
      if (!json.success) {
        setPickError(json.error ?? "Сонголт амжилтгүй");
        setFlying((prev) => prev.filter((f) => f.playerId !== playerId));
      } else if (json.data) {
        setState(json.data);
      }
    } catch {
      setPickError("Сүлжээний алдаа");
      setFlying((prev) => prev.filter((f) => f.playerId !== playerId));
    } finally {
      setPicking(null);
    }
  }

  useEffect(() => {
    const pending = flying.filter((f) => f.dest === null);
    if (pending.length === 0) return;
    const raf = requestAnimationFrame(() => {
      setFlying((prev) =>
        prev.map((f) => {
          if (f.dest) return f;
          const el = document.querySelector<HTMLElement>(
            `[data-member-id="${f.playerId}"]`,
          );
          if (!el) return f;
          const r = el.getBoundingClientRect();
          return {
            ...f,
            dest: { x: r.left, y: r.top, w: r.width, h: r.height },
          };
        }),
      );
    });
    return () => cancelAnimationFrame(raf);
  }, [state, flying]);

  useEffect(() => {
    if (flying.length === 0) return;
    const timers = flying
      .filter((f) => f.dest)
      .map((f) =>
        window.setTimeout(() => {
          setFlying((prev) => prev.filter((p) => p.key !== f.key));
        }, 750),
      );
    return () => timers.forEach((t) => window.clearTimeout(t));
  }, [flying]);

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
      {flying.map((f) => {
        const baseStyle: React.CSSProperties = {
          position: "fixed",
          top: 0,
          left: 0,
          width: f.source.w,
          height: f.source.h,
          transformOrigin: "top left",
          willChange: "transform, opacity",
          transition:
            "transform 0.7s cubic-bezier(0.2, 0.7, 0.2, 1), opacity 0.65s ease-out",
          zIndex: 60,
          pointerEvents: "none",
        };
        let style: React.CSSProperties;
        if (!f.dest) {
          style = {
            ...baseStyle,
            transform: `translate(${f.source.x}px, ${f.source.y}px) scale(1)`,
            opacity: 1,
          };
        } else {
          const scale = Math.max(
            0.18,
            Math.min((f.dest.w * 1.15) / f.source.w, (f.dest.h * 2.4) / f.source.h),
          );
          const cx = f.dest.x + f.dest.w / 2 - (f.source.w * scale) / 2;
          const cy = f.dest.y + f.dest.h / 2 - (f.source.h * scale) / 2;
          style = {
            ...baseStyle,
            transform: `translate(${cx}px, ${cy}px) scale(${scale})`,
            opacity: 0,
          };
        }
        return (
          <div
            key={f.key}
            style={style}
            className="tactical-card bevel-strong border border-fire bg-fire/[0.18] flex items-center gap-4 p-4 shadow-[0_0_40px_var(--accent-fire)]"
          >
            <Avatar id={f.avatarId} size={72} active />
            <div className="min-w-0">
              <p className="font-display text-2xl tracking-wide text-fire truncate">
                {f.lastName.toUpperCase()}
              </p>
              <p className="text-secondary text-base truncate">{f.firstName}</p>
            </div>
          </div>
        );
      })}
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
                <p className="font-display text-4xl md:text-6xl text-muted">
                  LIVE БАЙХГҮЙ БАЙНА
                </p>
                <p className="text-secondary text-sm mt-2 font-mono">
                  Одоогоор товлогдсон draft алга. Админ цаг товлох хүртэл хүлээнэ үү.
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
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3 max-h-[60vh] overflow-auto pr-1">
              {filtered.map((p) => {
                const isPicking = picking === p.id;
                const isFlying = flying.some((f) => f.playerId === p.id);
                return (
                  <button
                    key={p.id}
                    onClick={(e) => pickPlayer(p.id, e.currentTarget)}
                    disabled={picking !== null}
                    className={`text-left tactical-card bevel-strong border border-subtle hover:border-fire hover:bg-fire/[0.08] transition-all p-4 group flex items-center gap-4 relative overflow-hidden ${
                      isFlying ? "opacity-0 scale-90 pointer-events-none" : ""
                    }`}
                  >
                    <div className="absolute top-0 right-0 font-display text-[5rem] text-fire/[0.04] leading-none pr-2 select-none">
                      {p.lastName.charAt(0).toUpperCase()}
                    </div>
                    <Avatar id={p.avatarId} size={72} />
                    <div className="min-w-0 relative">
                      <p className="font-display text-2xl tracking-wide group-hover:text-fire truncate">
                        {p.lastName.toUpperCase()}
                      </p>
                      <p className="text-secondary text-base truncate">{p.firstName}</p>
                      {isPicking && (
                        <p className="font-mono text-[10px] text-fire blink mt-1">SUBMITTING...</p>
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

          <div className="grid gap-5 grid-cols-1 md:grid-cols-2">
            {state.teams.map((team, idx) => {
              const isCurrent = state.currentTurnCaptainId === team.captainId;
              const isFlash = flashCaptainId === team.captainId;
              return (
                <div
                  key={team.captainId}
                  className={`tactical-card bevel-strong corners p-6 relative transition-all overflow-hidden ${
                    isCurrent && state.status === "live" ? "border-fire glow-fire" : ""
                  } ${isFlash ? "lock-in" : ""}`}
                >
                  {isCurrent && state.status === "live" && (
                    <div className="absolute -top-3 left-4 font-display tracking-widest text-xs text-fire bg-base px-2 py-0.5 border border-fire">
                      ON CLOCK
                    </div>
                  )}
                  <div className="absolute top-0 right-0 font-display text-[8rem] text-fire/[0.05] leading-none pr-3 pt-1 select-none">
                    {idx + 1}
                  </div>

                  {/* CAPTAIN HEADER BLOCK */}
                  <div className="relative pb-5 mb-5 border-b border-fire/30">
                    <div className="flex items-baseline justify-between mb-2">
                      <p className="font-mono text-[11px] text-muted tracking-[0.3em]">
                        TEAM #{idx + 1}
                      </p>
                      <p className="font-mono text-xs text-fire tabular-nums">
                        {team.members.length}/{state.teamSize}
                      </p>
                    </div>
                    <div className="flex items-center gap-4">
                      <Avatar
                        id={team.captainAvatarId}
                        size={64}
                        active={isCurrent && state.status === "live"}
                      />
                      <div className="min-w-0">
                        <h3 className="font-display text-3xl md:text-4xl tracking-wide truncate leading-none">
                          {team.teamName ?? `TEAM #${idx + 1}`}
                        </h3>
                        <p className="font-mono text-xs text-muted mt-1 truncate">
                          CPT · {team.captainName}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* ROSTER BLOCK */}
                  <p className="font-mono text-[10px] text-fire tracking-[0.3em] mb-3">
                    {"// ROSTER"}
                  </p>
                  <ol className="space-y-2">
                    {Array.from({ length: state.teamSize }).map((_, slot) => {
                      const member = team.members[slot];
                      const isCaptainSlot = slot === 0;
                      return (
                        <li
                          key={slot}
                          className={`flex items-center gap-3 px-3 py-3 border bevel ${
                            member
                              ? "border-subtle bg-elevated"
                              : "border-subtle/40 border-dashed"
                          }`}
                        >
                          <span
                            className={`font-mono text-[11px] tracking-widest w-8 text-center ${
                              isCaptainSlot ? "text-fire" : "text-muted"
                            }`}
                          >
                            {isCaptainSlot ? "CPT" : `#${slot + 1}`}
                          </span>
                          {member ? (
                            <span
                              data-member-id={member.id}
                              className={`flex items-center gap-3 min-w-0 ${
                                isFlash && member === team.members[team.members.length - 1]
                                  ? "slot-in"
                                  : ""
                              }`}
                            >
                              <Avatar id={member.avatarId} size={36} />
                              <span className="min-w-0">
                                <span className="font-display text-lg tracking-wide truncate block">
                                  {member.lastName.toUpperCase()}
                                </span>
                                <span className="text-secondary text-sm truncate block leading-tight">
                                  {member.firstName}
                                </span>
                              </span>
                            </span>
                          ) : (
                            <span className="font-mono text-xs text-muted/50 tracking-[0.3em]">
                              ── EMPTY SLOT ──
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
