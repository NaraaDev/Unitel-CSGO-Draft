"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Avatar } from "../../_components/Avatar";
import type { MatchDto } from "@/lib/types";

export function MatchesArchive({ refreshKey = 0 }: { refreshKey?: number }) {
  const [matches, setMatches] = useState<MatchDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/matches", { cache: "no-store" });
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      setMatches(json.data ?? []);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh, refreshKey]);

  const pending = useMemo(() => matches.filter((m) => !m.finalized), [matches]);
  const finalized = useMemo(() => matches.filter((m) => m.finalized), [matches]);

  return (
    <section className="tactical-card bevel-strong corners p-6 mt-8 relative">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-display text-2xl tracking-wide">
          ТОГЛОЛТЫН <span className="text-fire">АРХИВ</span>
        </h2>
        <span className="font-mono text-xs text-muted">
          {pending.length} PENDING · {finalized.length} FINALIZED
        </span>
      </div>

      {error && (
        <div className="border border-danger/50 bg-danger/10 px-3 py-2 font-mono text-xs text-danger mb-3">
          ERR // {error}
        </div>
      )}

      {loading ? (
        <p className="font-mono text-sm text-muted">LOADING...</p>
      ) : matches.length === 0 ? (
        <p className="font-mono text-sm text-muted">Архивлагдсан тоглолт алга.</p>
      ) : (
        <div className="space-y-4">
          {pending.length > 0 && (
            <div>
              <p className="font-mono text-[10px] text-fire tracking-[0.4em] mb-2">
                {"// PENDING — БАЙР ОРУУЛНА УУ"}
              </p>
              <div className="space-y-3">
                {pending.map((m) =>
                  editing === m.id ? (
                    <RankEditor
                      key={m.id}
                      match={m}
                      busy={busy}
                      onCancel={() => setEditing(null)}
                      onSubmit={async (ranks) => {
                        setBusy(m.id);
                        setError(null);
                        try {
                          const res = await fetch(`/api/admin/matches/${m.id}`, {
                            method: "PATCH",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ ranks }),
                          });
                          const json = await res.json();
                          if (!json.success) throw new Error(json.error);
                          setEditing(null);
                          await refresh();
                        } catch (e) {
                          setError((e as Error).message);
                        } finally {
                          setBusy(null);
                        }
                      }}
                      onDelete={async () => {
                        if (!confirm("Энэ тоглолтыг устгах уу?")) return;
                        setBusy(m.id);
                        setError(null);
                        try {
                          const res = await fetch(`/api/admin/matches/${m.id}`, {
                            method: "DELETE",
                          });
                          const json = await res.json();
                          if (!json.success) throw new Error(json.error);
                          setEditing(null);
                          await refresh();
                        } catch (e) {
                          setError((e as Error).message);
                        } finally {
                          setBusy(null);
                        }
                      }}
                    />
                  ) : (
                    <MatchRow
                      key={m.id}
                      match={m}
                      onEdit={() => setEditing(m.id)}
                    />
                  ),
                )}
              </div>
            </div>
          )}

          {finalized.length > 0 && (
            <div>
              <p className="font-mono text-[10px] text-muted tracking-[0.4em] mb-2 mt-4">
                {"// FINALIZED"}
              </p>
              <div className="space-y-3">
                {finalized.map((m) => (
                  <MatchRow
                    key={m.id}
                    match={m}
                    onEdit={() => setEditing(m.id)}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </section>
  );
}

function MatchRow({ match, onEdit }: { match: MatchDto; onEdit: () => void }) {
  const sorted = match.finalized
    ? [...match.teams].sort((a, b) => (a.finalRank ?? 99) - (b.finalRank ?? 99))
    : match.teams;
  return (
    <div className="border border-subtle bevel p-3">
      <div className="flex items-center justify-between gap-3 mb-2">
        <div>
          <p className="font-mono text-[10px] text-muted">
            {new Date(match.completedAt).toLocaleString()} · BO{match.bestOf} ·{" "}
            {match.teams.length} TEAMS
          </p>
          <p className="font-mono text-[10px] text-muted">
            {match.finalized ? "FINALIZED" : "PENDING"}
          </p>
        </div>
        <button onClick={onEdit} className="btn-ghost !py-1 !px-3 !text-xs">
          {match.finalized ? "ЗАСАХ" : "БАЙР ОРУУЛАХ"}
        </button>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {sorted.map((t) => (
          <div
            key={t.captainId}
            className={`border border-subtle/60 px-2 py-1.5 ${
              t.finalRank === 1 ? "border-fire" : ""
            }`}
          >
            <div className="flex items-center gap-2">
              {t.finalRank != null && (
                <span
                  className={`font-display text-base w-6 ${
                    t.finalRank === 1 ? "text-fire" : "text-cyber"
                  }`}
                >
                  #{t.finalRank}
                </span>
              )}
              <Avatar id={t.captainAvatarId} size={22} />
              <span className="font-display text-sm tracking-wide">
                {t.teamName ?? `TEAM ${t.captainLastName.toUpperCase()}`}
              </span>
            </div>
            <p className="font-mono text-[10px] text-muted mt-1">
              {t.captainLastName} {t.captainFirstName}
              {t.members.length > 0 && (
                <>
                  <br />
                  {t.members.map((mb) => `${mb.lastName} ${mb.firstName}`).join(" · ")}
                </>
              )}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

function RankEditor({
  match,
  busy,
  onCancel,
  onSubmit,
  onDelete,
}: {
  match: MatchDto;
  busy: string | null;
  onCancel: () => void;
  onSubmit: (ranks: Record<string, number>) => void | Promise<void>;
  onDelete: () => void | Promise<void>;
}) {
  const [ranks, setRanks] = useState<Record<string, number>>(() => {
    const init: Record<string, number> = {};
    for (const t of match.teams) {
      if (t.finalRank != null) init[t.captainId] = t.finalRank;
    }
    return init;
  });

  const totalTeams = match.teams.length;
  const isBusy = busy === match.id;

  return (
    <div className="border border-fire bevel p-3 bg-fire/[0.04]">
      <p className="font-mono text-[10px] text-fire mb-2">
        {"// БАГ БҮРД БАЙР (1-"}
        {totalTeams}
        {") ӨГНӨ"}
      </p>
      <div className="space-y-2">
        {match.teams.map((t) => (
          <div key={t.captainId} className="flex items-center gap-2">
            <Avatar id={t.captainAvatarId} size={22} />
            <span className="font-display text-sm flex-1 truncate">
              {t.teamName ?? `TEAM ${t.captainLastName.toUpperCase()}`}
            </span>
            <select
              value={ranks[t.captainId] ?? ""}
              onChange={(e) => {
                const v = e.target.value;
                setRanks((prev) => {
                  const next = { ...prev };
                  if (v === "") delete next[t.captainId];
                  else next[t.captainId] = Number(v);
                  return next;
                });
              }}
              className="input-tac !py-1 !px-2 !text-sm w-20"
            >
              <option value="">—</option>
              {Array.from({ length: totalTeams }, (_, i) => i + 1).map((n) => (
                <option key={n} value={n}>
                  #{n}
                </option>
              ))}
            </select>
          </div>
        ))}
      </div>
      <div className="flex gap-2 mt-3">
        <button
          onClick={() => onSubmit(ranks)}
          disabled={isBusy || Object.keys(ranks).length !== totalTeams}
          className="btn-fire !py-1.5 !px-3 !text-xs"
        >
          {isBusy ? "..." : "ХАДГАЛАХ"}
        </button>
        <button
          onClick={onCancel}
          disabled={isBusy}
          className="btn-ghost !py-1.5 !px-3 !text-xs"
        >
          БОЛИХ
        </button>
        <button
          onClick={onDelete}
          disabled={isBusy}
          className="btn-danger !py-1.5 !px-3 !text-xs ml-auto"
        >
          УСТГАХ
        </button>
      </div>
    </div>
  );
}
