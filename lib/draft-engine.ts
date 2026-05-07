import type { DraftCaptain, DraftDoc, DraftPick, DraftType } from "./types";

const sortByOrder = (captains: DraftCaptain[]): DraftCaptain[] =>
  [...captains].sort((a, b) => a.order - b.order);

/**
 * Build the deterministic captain order for the entire draft.
 * Length = captains.length * (teamSize - 1).
 *
 * snake  → forward, reverse, forward, ... per round
 * linear → same captain order every round
 * random → each round shuffled independently using Math.random()
 */
export function buildPickSequence(
  captains: DraftCaptain[],
  teamSize: number,
  type: DraftType,
): string[] {
  const sorted = sortByOrder(captains).map((c) => c.userId);
  const n = sorted.length;
  const rounds = Math.max(0, teamSize - 1);
  const seq: string[] = [];
  for (let r = 0; r < rounds; r++) {
    if (type === "snake") {
      const order = r % 2 === 0 ? sorted : [...sorted].reverse();
      seq.push(...order);
    } else if (type === "linear") {
      seq.push(...sorted);
    } else {
      const shuffled = [...sorted];
      for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
      }
      seq.push(...shuffled);
    }
  }
  return seq;
}

export function captainAtIndex(
  pickSequence: string[],
  captainCount: number,
  index: number,
): { captainId: string; round: number; positionInRound: number } | null {
  if (pickSequence.length === 0 || index >= pickSequence.length) return null;
  const n = Math.max(1, captainCount);
  return {
    captainId: pickSequence[index],
    round: Math.floor(index / n),
    positionInRound: index % n,
  };
}

export function pickSlotCount(draft: Pick<DraftDoc, "captains" | "teamSize">): number {
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
  draft: Pick<DraftDoc, "captains" | "teamSize" | "picks" | "pickSequence">,
): string | null {
  const n = draft.captains.length;
  if (n === 0) return null;
  const need = Math.max(0, draft.teamSize - 1);
  const fills = teamFillCounts(draft.picks, draft.captains);

  const isFull = (id: string) => (fills.get(id) ?? 0) >= need;
  if (draft.captains.every((c) => isFull(c.userId))) return null;

  const attempts = draft.picks.length;
  const seq = draft.pickSequence ?? [];

  if (attempts < seq.length) {
    const slot = captainAtIndex(seq, n, attempts);
    if (slot && !isFull(slot.captainId)) return slot.captainId;
    // Sequence slot lands on a full team — fall through to makeup search.
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
