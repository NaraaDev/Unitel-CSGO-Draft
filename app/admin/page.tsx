"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { SiteHeader } from "../_components/SiteHeader";
import { StatusChip } from "../_components/StatusChip";
import { Avatar } from "../_components/Avatar";
import type { BestOf, DraftStateDto, PublicUser } from "@/lib/types";

interface AdminUser {
  id: string;
  lastName: string;
  firstName: string;
  phone: string;
  isAdmin: boolean;
  avatarId: number;
}

const PICK_WINDOW = 60;
const TIME_CAP = 60;
const TEAM_SIZE = 5;
const BO_OPTIONS: BestOf[] = [1, 3, 5, 7];

function defaultStartAtLocal(): string {
  const d = new Date(Date.now() + 5 * 60 * 1000);
  d.setSeconds(0, 0);
  const pad = (n: number) => n.toString().padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default function AdminPage() {
  const router = useRouter();
  const [me, setMe] = useState<PublicUser | null>(null);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [draft, setDraft] = useState<DraftStateDto | null>(null);

  const [captainOrder, setCaptainOrder] = useState<string[]>([]);
  const [teamNames, setTeamNames] = useState<Record<string, string>>({});
  const [bestOf, setBestOf] = useState<BestOf>(1);
  const [startAt, setStartAt] = useState<string>(defaultStartAtLocal);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      const [meRes, usersRes, draftRes] = await Promise.all([
        fetch("/api/auth/me").then((r) => r.json()),
        fetch("/api/admin/users").then((r) => r.json()),
        fetch("/api/draft").then((r) => r.json()),
      ]);
      if (!alive) return;
      if (!meRes.data || !meRes.data.isAdmin) {
        router.replace("/login");
        return;
      }
      setMe(meRes.data);
      setUsers(usersRes.data ?? []);
      setDraft(draftRes.data ?? null);
      if (draftRes.data?.captains?.length) {
        const captains = draftRes.data.captains as DraftStateDto["captains"];
        setCaptainOrder(captains.map((c) => c.userId));
        setTeamNames(
          Object.fromEntries(
            captains.map((c) => [c.userId, c.teamName ?? ""]),
          ),
        );
      }
      if (draftRes.data?.bestOf) {
        setBestOf(draftRes.data.bestOf as BestOf);
      }
      if (draftRes.data?.startAt) {
        const d = new Date(draftRes.data.startAt);
        if (!Number.isNaN(d.getTime())) {
          const pad = (n: number) => n.toString().padStart(2, "0");
          setStartAt(
            `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`,
          );
        }
      }
    })();
    return () => {
      alive = false;
    };
  }, [router]);

  const eligibleCaptains = useMemo(
    () => users.filter((u) => !u.isAdmin),
    [users],
  );

  function toggleCaptain(id: string) {
    setCaptainOrder((prev) =>
      prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id],
    );
  }

  function moveCaptain(id: string, dir: -1 | 1) {
    setCaptainOrder((prev) => {
      const idx = prev.indexOf(id);
      if (idx < 0) return prev;
      const next = [...prev];
      const target = idx + dir;
      if (target < 0 || target >= next.length) return prev;
      [next[idx], next[target]] = [next[target], next[idx]];
      return next;
    });
  }

  async function persistConfig(): Promise<DraftStateDto> {
    const startAtIso = new Date(startAt).toISOString();
    const trimmedNames: Record<string, string> = {};
    for (const id of captainOrder) {
      const v = (teamNames[id] ?? "").trim();
      if (v) trimmedNames[id] = v;
    }
    const res = await fetch("/api/admin/draft", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        startAt: startAtIso,
        pickWindowSeconds: PICK_WINDOW,
        totalCapMinutes: TIME_CAP,
        teamSize: TEAM_SIZE,
        bestOf,
        captainOrder,
        teamNames: trimmedNames,
      }),
    });
    const json = await res.json();
    if (!json.success) throw new Error(json.error);
    return json.data as DraftStateDto;
  }

  async function saveConfig() {
    setBusy("config");
    setError(null);
    setInfo(null);
    try {
      const next = await persistConfig();
      setDraft(next);
      setInfo("Тохиргоо хадгалагдлаа");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(null);
    }
  }

  async function startDraft() {
    setBusy("start");
    setError(null);
    setInfo(null);
    try {
      // Auto-save config first so the user doesn't have to remember a separate "save" step.
      await persistConfig();

      const res = await fetch("/api/admin/draft/start", { method: "POST" });
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      setDraft(json.data);
      setInfo("Draft эхэллээ");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(null);
    }
  }

  async function resetDraft() {
    if (!confirm("Бүх draft-ыг устгаад дахин эхэлүүлэх үү?")) return;
    setBusy("reset");
    try {
      const res = await fetch("/api/admin/draft/reset", { method: "POST" });
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      setDraft(json.data);
      setCaptainOrder([]);
      setTeamNames({});
      setBestOf(1);
      setInfo("Draft reset");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(null);
    }
  }

  if (!me) {
    return (
      <>
        <SiteHeader />
        <main className="flex-1 flex items-center justify-center font-mono text-muted">
          BOOTING ADMIN CONSOLE...
        </main>
      </>
    );
  }

  const captainCount = captainOrder.length;

  return (
    <>
      <SiteHeader />
      <main className="flex-1 max-w-7xl mx-auto px-6 py-10 w-full">
        <div className="flex items-center justify-between flex-wrap gap-3 mb-2">
          <p className="font-mono text-xs text-fire tracking-[0.4em] rise-in">{"// COMMAND.CONSOLE"}</p>
          {draft && <StatusChip status={draft.status} />}
        </div>
        <h1 className="font-display text-5xl lg:text-7xl rise-in mb-6" style={{ ["--i" as never]: 1 }}>
          АДМИН <span className="text-fire">КОНСОЛ</span>
        </h1>

        {error && (
          <div className="border border-danger/50 bg-danger/10 px-4 py-3 font-mono text-sm text-danger mb-4">
            ERR // {error}
          </div>
        )}
        {info && (
          <div className="border border-success/50 bg-success/10 px-4 py-3 font-mono text-sm text-success mb-4">
            OK // {info}
          </div>
        )}

        <div className="grid lg:grid-cols-12 gap-6">
          <section
            className="lg:col-span-7 tactical-card bevel-strong corners p-6 relative rise-in"
            style={{ ["--i" as never]: 2 }}
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-display text-2xl tracking-wide">АХЛАГЧ СОНГОХ</h2>
              <span className="font-mono text-xs text-muted">
                {captainCount} / {eligibleCaptains.length} CAPTAINS
              </span>
            </div>
            <p className="text-secondary text-xs font-mono mb-4">
              Бүртгэлтэй тоглогчдоос ахлагчдыг сонгож, ↑ ↓ товчоор pick дарааллыг тохируулна.
            </p>

            <div className="border border-subtle">
              <div className="grid grid-cols-12 px-3 py-2 font-mono text-[10px] tracking-widest text-muted border-b border-subtle">
                <span className="col-span-1">#</span>
                <span className="col-span-7">OPERATOR</span>
                <span className="col-span-2">PHONE</span>
                <span className="col-span-2 text-right">ACTIONS</span>
              </div>
              <div className="max-h-[420px] overflow-auto">
                {eligibleCaptains.length === 0 && (
                  <div className="px-3 py-12 font-mono text-muted text-sm text-center">
                    Бүртгэлтэй тоглогч алга
                  </div>
                )}
                {eligibleCaptains.map((u) => {
                  const idx = captainOrder.indexOf(u.id);
                  const selected = idx >= 0;
                  return (
                    <div
                      key={u.id}
                      onClick={() => toggleCaptain(u.id)}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          toggleCaptain(u.id);
                        }
                      }}
                      aria-pressed={selected}
                      aria-label={selected ? "Хасах" : "Нэмэх"}
                      className={`grid grid-cols-12 items-center px-3 py-2 border-b border-subtle/60 transition-colors cursor-pointer select-none ${
                        selected ? "bg-fire/[0.06]" : "hover:bg-fire/[0.03]"
                      }`}
                    >
                      <span
                        className={`col-span-1 font-display text-lg ${selected ? "text-fire" : "text-muted"}`}
                      >
                        {selected ? `#${idx + 1}` : "+"}
                      </span>
                      <span className="col-span-7 flex items-center gap-2">
                        <Avatar id={u.avatarId} size={28} active={selected} />
                        <span>
                          <span className="font-display tracking-wide">
                            {u.lastName.toUpperCase()}
                          </span>{" "}
                          <span className="text-secondary">{u.firstName}</span>
                        </span>
                      </span>
                      <span className="col-span-2 font-mono text-xs text-muted">{u.phone}</span>
                      <span className="col-span-2 flex justify-end gap-1">
                        {selected && (
                          <>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                moveCaptain(u.id, -1);
                              }}
                              disabled={idx === 0}
                              className="font-mono text-xs px-2 py-1 border border-subtle hover:border-fire hover:text-fire disabled:opacity-30"
                            >
                              ↑
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                moveCaptain(u.id, 1);
                              }}
                              disabled={idx === captainCount - 1}
                              className="font-mono text-xs px-2 py-1 border border-subtle hover:border-fire hover:text-fire disabled:opacity-30"
                            >
                              ↓
                            </button>
                          </>
                        )}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {captainCount > 0 && (
              <div className="mt-5 border border-subtle bevel">
                <div className="px-3 py-2 font-mono text-[10px] tracking-widest text-muted border-b border-subtle">
                  БАГИЙН НЭР
                </div>
                <div className="divide-y divide-subtle/60">
                  {captainOrder.map((id, idx) => {
                    const u = users.find((x) => x.id === id);
                    if (!u) return null;
                    return (
                      <div key={id} className="flex items-center gap-3 px-3 py-2">
                        <span className="text-fire font-display text-base w-6 shrink-0">
                          #{idx + 1}
                        </span>
                        <Avatar id={u.avatarId} size={26} />
                        <span className="font-mono text-xs text-muted w-32 shrink-0 truncate">
                          {u.lastName} {u.firstName}
                        </span>
                        <input
                          className="input-tac !py-1.5 !px-2 !text-sm"
                          maxLength={40}
                          placeholder={`TEAM #${idx + 1}`}
                          value={teamNames[id] ?? ""}
                          onChange={(e) =>
                            setTeamNames((prev) => ({ ...prev, [id]: e.target.value }))
                          }
                        />
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </section>

          <section
            className="lg:col-span-5 space-y-6 rise-in"
            style={{ ["--i" as never]: 3 }}
          >
            <div className="tactical-card bevel-strong corners p-6 relative">
              <h2 className="font-display text-2xl mb-4 tracking-wide">DRAFT ТОХИРГОО</h2>
              <div className="space-y-4">
                <div>
                  <label className="label-tac">Эхлэх цаг (local)</label>
                  <input
                    type="datetime-local"
                    value={startAt}
                    onChange={(e) => setStartAt(e.target.value)}
                    className="input-tac"
                  />
                </div>
                <div className="grid grid-cols-3 gap-2 font-mono text-xs">
                  <div className="border border-subtle px-3 py-2">
                    <div className="text-muted text-[10px]">PICK</div>
                    <div className="font-display text-lg">{PICK_WINDOW}s</div>
                  </div>
                  <div className="border border-subtle px-3 py-2">
                    <div className="text-muted text-[10px]">CAP</div>
                    <div className="font-display text-lg">{TIME_CAP}m</div>
                  </div>
                  <div className="border border-subtle px-3 py-2">
                    <div className="text-muted text-[10px]">TEAM</div>
                    <div className="font-display text-lg">{TEAM_SIZE}</div>
                  </div>
                </div>

                <div>
                  <label className="label-tac">МАТЧИЙН ФОРМАТ</label>
                  <div className="grid grid-cols-4 gap-2">
                    {BO_OPTIONS.map((n) => {
                      const active = bestOf === n;
                      return (
                        <button
                          key={n}
                          type="button"
                          onClick={() => setBestOf(n)}
                          className={`bevel border px-2 py-2 font-display tracking-wider text-base transition-colors ${
                            active
                              ? "border-fire text-fire bg-fire/[0.08]"
                              : "border-subtle text-secondary hover:border-fire hover:text-fire"
                          }`}
                        >
                          BO{n}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
              <button
                onClick={saveConfig}
                disabled={busy !== null || captainCount < 2}
                className="btn-ghost w-full mt-5"
              >
                {busy === "config" ? "SAVING..." : "ТОХИРГОО ХАДГАЛАХ"}
              </button>
            </div>

            <div className="tactical-card bevel-strong corners p-6 relative">
              <div className="absolute inset-0 marching-border opacity-30 pointer-events-none" />
              <h2 className="font-display text-2xl mb-4 tracking-wide relative">DEPLOY</h2>
              <p className="text-secondary text-xs font-mono mb-4 relative">
                Эхлүүлсэн draft-ыг буцаах боломжгүй.
              </p>
              <button
                onClick={startDraft}
                disabled={busy !== null || draft?.status === "live" || captainCount < 2}
                className="btn-fire w-full relative"
              >
                {busy === "start" ? "DEPLOYING..." : "► DRAFT START"}
              </button>
              <button
                onClick={resetDraft}
                disabled={busy !== null}
                className="btn-danger w-full mt-3 relative"
              >
                ⟲ RESET ALL
              </button>
            </div>

            {draft && draft.captains.length > 0 && (
              <div className="tactical-card bevel-strong corners p-6 relative">
                <h2 className="font-display text-xl mb-3 tracking-wide">ТӨЛӨВ</h2>
                <p className="font-mono text-[11px] text-muted mb-2">
                  BO{draft.bestOf ?? 1} · {draft.captains.length} TEAMS · {draft.teamSize} OPS
                </p>
                <ol className="space-y-2 font-mono text-sm">
                  {draft.captains.map((c, i) => (
                    <li key={c.userId} className="flex items-center gap-3">
                      <span className="text-fire font-display text-lg w-6">#{i + 1}</span>
                      <Avatar id={c.avatarId} size={28} />
                      <span className="font-display tracking-wide">
                        {c.teamName ?? `TEAM #${i + 1}`}
                      </span>
                      <span className="text-secondary text-xs ml-auto">
                        {c.lastName} {c.firstName}
                      </span>
                    </li>
                  ))}
                </ol>
              </div>
            )}
          </section>
        </div>
      </main>
    </>
  );
}
