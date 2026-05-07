import type { DraftCaptain, DraftDoc, DraftPick } from "./types";

const sortByOrder = (captains: DraftCaptain[]): DraftCaptain[] =>
  [...captains].sort((a, b) => a.order - b.order);

/**
 * Snake order: forward → reverse → forward → ...
 * Slot index runs 0..(snakeSlots-1) where snakeSlots = N * (teamSize - 1).
 * Captain auto-fills slot 1 of their own team, so they pick `teamSize - 1` more times.
 */
export function captainAtSnakeIndex(
  captains: DraftCaptain[],
  snakeIndex: number,
): { captainId: string; round: number; positionInRound: number } | null {
  const n = captains.length;
  if (n === 0) return null;
  const sorted = sortByOrder(captains);
  const round = Math.floor(snakeIndex / n);
  const positionInRound = snakeIndex % n;
  const forward = round % 2 === 0;
  const slot = forward ? positionInRound : n - 1 - positionInRound;
  return {
    captainId: sorted[slot].userId,
    round,
    positionInRound,
  };
}

export function snakeSlotCount(draft: Pick<DraftDoc, "captains" | "teamSize">): number {
  return draft.captains.length * Math.max(0, draft.teamSize - 1);
}

/** Number of non-skipped picks each captain currently has, keyed by captainId. */
export function teamFillCounts(
  picks: DraftPick[],
  captains: DraftCaptain[],
): Map<string, number> {
  const fills = new Map<string, number>();
  for (const c of captains) fills.set(c.userId, 0);
  for (const p of picks) {
    if (p.playerId && !p.skipped) {
      fills.set(p.captainId, (fills.get(p.captainId) ?? 0) + 1);
    }
  }
  return fills;
}

export function isAllTeamsFull(draft: Pick<DraftDoc, "captains" | "teamSize" | "picks">): boolean {
  const need = Math.max(0, draft.teamSize - 1);
  const fills = teamFillCounts(draft.picks, draft.captains);
  return draft.captains.every((c) => (fills.get(c.userId) ?? 0) >= need);
}

/**
 * Decide who is on clock right now.
 *
 * Phase 1 (snake): while `attempts < snakeSlotCount`, follow snake order.
 *   Even if a captain's team is already full at this index (rare — happens only if
 *   they got bonus picks during a prior makeup pass), advance to the next captain
 *   whose team needs more.
 *
 * Phase 2 (makeup): cycle through captains in order, picking the next one whose
 *   team still has empty slots.
 *
 * Returns null when every team is full.
 */
export function determineCurrentCaptain(
  draft: Pick<DraftDoc, "captains" | "teamSize" | "picks">,
): string | null {
  const n = draft.captains.length;
  if (n === 0) return null;
  const need = Math.max(0, draft.teamSize - 1);
  const fills = teamFillCounts(draft.picks, draft.captains);

  const isFull = (id: string) => (fills.get(id) ?? 0) >= need;
  if (draft.captains.every((c) => isFull(c.userId))) return null;

  const attempts = draft.picks.length;
  const snakeLen = snakeSlotCount(draft);

  if (attempts < snakeLen) {
    const slot = captainAtSnakeIndex(draft.captains, attempts);
    if (slot && !isFull(slot.captainId)) return slot.captainId;
    // Snake slot lands on a full team — fall through to makeup search.
  }

  // Phase 2: round-robin among incomplete teams (in captain order).
  const sorted = sortByOrder(draft.captains);
  for (const c of sorted) {
    if (!isFull(c.userId)) return c.userId;
  }
  return null;
}

/** Round/position metadata for the current attempt — used for log entries. */
export function currentSlotMeta(
  draft: Pick<DraftDoc, "captains" | "teamSize" | "picks">,
): { round: number; positionInRound: number } {
  const n = Math.max(1, draft.captains.length);
  const attempts = draft.picks.length;
  return {
    round: Math.floor(attempts / n),
    positionInRound: attempts % n,
  };
}

export function shouldStopByCap(draft: Pick<DraftDoc, "endsAt">, now: Date): boolean {
  if (!draft.endsAt) return false;
  return now.getTime() >= draft.endsAt.getTime();
}
