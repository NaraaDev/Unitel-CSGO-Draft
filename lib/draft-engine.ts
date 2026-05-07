import type { DraftCaptain, DraftDoc } from "./types";

/**
 * Snake order: round 0 forward, round 1 reverse, round 2 forward, ...
 * `pickIndex` runs 0..(rounds*N - 1) where N = captain count and rounds = teamSize - 1
 * (captain auto-fills slot 1 of their own team, so they pick `teamSize - 1` more times).
 */
export function captainAtPickIndex(
  captains: DraftCaptain[],
  pickIndex: number,
): { captainId: string; round: number; positionInRound: number } | null {
  const n = captains.length;
  if (n === 0) return null;
  const sorted = [...captains].sort((a, b) => a.order - b.order);
  const round = Math.floor(pickIndex / n);
  const positionInRound = pickIndex % n;
  const forward = round % 2 === 0;
  const slot = forward ? positionInRound : n - 1 - positionInRound;
  return {
    captainId: sorted[slot].userId,
    round,
    positionInRound,
  };
}

export function totalPickCount(draft: Pick<DraftDoc, "captains" | "teamSize">): number {
  return draft.captains.length * Math.max(0, draft.teamSize - 1);
}

export function isDraftDone(draft: Pick<DraftDoc, "captains" | "teamSize" | "currentTurnIndex">): boolean {
  return draft.currentTurnIndex >= totalPickCount(draft);
}

export function nextTurnDeadline(now: Date, pickWindowSeconds: number): Date {
  return new Date(now.getTime() + pickWindowSeconds * 1000);
}

export function shouldStopByCap(draft: Pick<DraftDoc, "endsAt">, now: Date): boolean {
  if (!draft.endsAt) return false;
  return now.getTime() >= draft.endsAt.getTime();
}
