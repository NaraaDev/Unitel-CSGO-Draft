import { ObjectId } from "mongodb";
import { getDrafts, getMatches, getUsers } from "./mongodb";
import {
  currentSlotMeta,
  determineCurrentCaptain,
  isAllTeamsFull,
  shouldStopByCap,
} from "./draft-engine";
import type {
  DraftDoc,
  DraftStateDto,
  LeaderboardEntry,
  MatchDoc,
  MatchDto,
  MatchTeam,
  UserDoc,
} from "./types";

const SINGLETON_FILTER = { kind: "singleton" } as const;

export async function getOrCreateDraft(): Promise<DraftDoc> {
  const drafts = await getDrafts();
  const existing = await drafts.findOne(SINGLETON_FILTER);
  if (existing) return existing;

  const now = new Date();
  const fresh: Omit<DraftDoc, "_id"> & { kind: "singleton" } = {
    kind: "singleton",
    status: "idle",
    startAt: null,
    startedAt: null,
    endsAt: null,
    completedAt: null,
    captains: [],
    currentTurnCaptainId: null,
    currentTurnIndex: 0,
    turnDeadline: null,
    pickWindowSeconds: 60,
    totalCapMinutes: 60,
    teamSize: 5,
    bestOf: 1,
    picks: [],
    pickedPlayerIds: [],
    updatedAt: now,
    createdAt: now,
  };
  await drafts.insertOne(fresh as unknown as DraftDoc);
  const inserted = await drafts.findOne(SINGLETON_FILTER);
  return inserted as DraftDoc;
}

export async function reconcileDraft(): Promise<DraftDoc> {
  let draft = await getOrCreateDraft();
  const now = new Date();
  const drafts = await getDrafts();

  if (
    draft.status === "scheduled" &&
    draft.startAt &&
    now.getTime() >= draft.startAt.getTime() &&
    draft.captains.length >= 2
  ) {
    const firstCaptainId = determineCurrentCaptain(draft);
    if (firstCaptainId) {
      const startedAt = draft.startAt;
      await drafts.updateOne(
        { _id: draft._id, status: "scheduled" },
        {
          $set: {
            status: "live",
            startedAt,
            endsAt: new Date(startedAt.getTime() + draft.totalCapMinutes * 60 * 1000),
            currentTurnCaptainId: firstCaptainId,
            currentTurnIndex: 0,
            turnDeadline: new Date(now.getTime() + draft.pickWindowSeconds * 1000),
            completedAt: null,
            updatedAt: now,
          },
        },
      );
      draft = (await drafts.findOne({ _id: draft._id })) as DraftDoc;
    }
  }

  if (
    (draft.status === "live" || draft.status === "completed" || draft.status === "stopped") &&
    draft.endsAt &&
    now.getTime() >= draft.endsAt.getTime()
  ) {
    await archiveDraftIfPossible(draft, now);
    await drafts.updateOne(
      { _id: draft._id },
      {
        $set: {
          status: "idle",
          startAt: null,
          startedAt: null,
          endsAt: null,
          completedAt: null,
          captains: [],
          currentTurnCaptainId: null,
          currentTurnIndex: 0,
          turnDeadline: null,
          picks: [],
          pickedPlayerIds: [],
          updatedAt: now,
        },
      },
    );
    return (await drafts.findOne({ _id: draft._id })) as DraftDoc;
  }

  if (draft.status !== "live") return draft;

  if (isAllTeamsFull(draft)) {
    await drafts.updateOne(
      { _id: draft._id },
      {
        $set: {
          status: "completed",
          completedAt: now,
          turnDeadline: null,
          currentTurnCaptainId: null,
          updatedAt: now,
        },
      },
    );
    return (await drafts.findOne({ _id: draft._id })) as DraftDoc;
  }

  if (draft.turnDeadline && now.getTime() >= draft.turnDeadline.getTime()) {
    return await skipCurrentTurn(draft, now);
  }

  return draft;
}

export async function archiveDraftIfPossible(draft: DraftDoc, now: Date): Promise<void> {
  if (!draft.startedAt) return;
  if (draft.captains.length === 0) return;
  const hasAnyPick = draft.picks.some((p) => !p.skipped && p.playerId !== null);
  if (!hasAnyPick) return;

  const users = await getUsers();
  const userObjectIds = [
    ...draft.captains.map((c) => new ObjectId(c.userId)),
    ...draft.pickedPlayerIds.map((id) => new ObjectId(id)),
  ];
  const docs = await users.find({ _id: { $in: userObjectIds } }).toArray();
  const userMap = new Map(docs.map((u) => [u._id.toString(), u]));

  const teams: MatchTeam[] = draft.captains.map((cap) => {
    const captainDoc = userMap.get(cap.userId);
    const memberPicks = draft.picks
      .filter((p) => p.captainId === cap.userId && !p.skipped && p.playerId)
      .sort((a, b) => a.pickIndex - b.pickIndex);
    return {
      captainId: cap.userId,
      captainLastName: captainDoc?.lastName ?? "",
      captainFirstName: captainDoc?.firstName ?? "",
      captainAvatarId: captainDoc?.avatarId ?? 0,
      teamName: cap.teamName ?? null,
      members: memberPicks
        .map((p) => userMap.get(p.playerId as string))
        .filter((u): u is UserDoc => Boolean(u))
        .map((u) => ({
          userId: u._id.toString(),
          lastName: u.lastName,
          firstName: u.firstName,
          avatarId: u.avatarId,
        })),
      finalRank: null,
    };
  });

  const matches = await getMatches();
  const match: Omit<MatchDoc, "_id"> = {
    bestOf: draft.bestOf,
    totalCapMinutes: draft.totalCapMinutes,
    startedAt: draft.startedAt,
    completedAt: draft.completedAt ?? now,
    teams,
    finalized: false,
    archivedAt: now,
    finalizedAt: null,
    updatedAt: now,
  };
  await matches.insertOne(match as MatchDoc);
}

export async function skipCurrentTurn(draft: DraftDoc, now: Date): Promise<DraftDoc> {
  const drafts = await getDrafts();
  if (!draft.currentTurnCaptainId) return draft;

  const meta = currentSlotMeta(draft);

  // Build a "post-skip" draft snapshot to compute the next captain.
  const projected: DraftDoc = {
    ...draft,
    picks: [
      ...draft.picks,
      {
        round: meta.round,
        pickIndex: draft.picks.length,
        captainId: draft.currentTurnCaptainId,
        playerId: null,
        pickedAt: now,
        skipped: true,
      },
    ],
  };

  const nextCaptainId = determineCurrentCaptain(projected);
  const stillRunning = nextCaptainId !== null && !isAllTeamsFull(projected);

  await drafts.updateOne(
    { _id: draft._id, currentTurnIndex: draft.currentTurnIndex },
    {
      $push: {
        picks: {
          round: meta.round,
          pickIndex: draft.picks.length,
          captainId: draft.currentTurnCaptainId,
          playerId: null,
          pickedAt: now,
          skipped: true,
        },
      },
      $set: {
        currentTurnIndex: draft.currentTurnIndex + 1,
        currentTurnCaptainId: stillRunning ? nextCaptainId : null,
        turnDeadline: stillRunning ? new Date(now.getTime() + draft.pickWindowSeconds * 1000) : null,
        status: stillRunning ? "live" : "completed",
        completedAt: stillRunning ? null : now,
        updatedAt: now,
      },
    },
  );

  return (await drafts.findOne({ _id: draft._id })) as DraftDoc;
}

export async function buildDraftState(draftDoc?: DraftDoc): Promise<DraftStateDto> {
  const draft = draftDoc ?? (await reconcileDraft());
  const users = await getUsers();

  const captainIds = draft.captains.map((c) => new ObjectId(c.userId));
  const captainDocs =
    captainIds.length > 0 ? await users.find({ _id: { $in: captainIds } }).toArray() : [];

  const captainNameById = new Map(captainDocs.map((u) => [u._id.toString(), u]));

  const allUsers = await users
    .find({}, { projection: { passwordHash: 0 } })
    .sort({ createdAt: 1 })
    .toArray();

  const playersOnTeams = new Set<string>();
  for (const p of draft.picks) {
    if (p.playerId && !p.skipped) playersOnTeams.add(p.playerId);
  }
  for (const c of draft.captains) playersOnTeams.add(c.userId);

  const availablePlayers = allUsers
    .filter((u) => !u.isAdmin && !playersOnTeams.has(u._id.toString()))
    .map((u) => ({
      id: u._id.toString(),
      lastName: u.lastName,
      firstName: u.firstName,
      avatarId: u.avatarId ?? 0,
    }));

  const teams = [...draft.captains]
    .sort((a, b) => a.order - b.order)
    .map((c) => {
      const captain = captainNameById.get(c.userId);
      const captainName = captain ? `${captain.lastName} ${captain.firstName}` : "—";
      const captainAvatarId = captain?.avatarId ?? 0;
      const members: Array<{ id: string; lastName: string; firstName: string; avatarId: number }> = [];
      if (captain) {
        members.push({
          id: c.userId,
          lastName: captain.lastName,
          firstName: captain.firstName,
          avatarId: captainAvatarId,
        });
      }
      for (const p of draft.picks) {
        if (p.captainId === c.userId && p.playerId && !p.skipped) {
          const member = allUsers.find((u) => u._id.toString() === p.playerId);
          if (member) {
            members.push({
              id: member._id.toString(),
              lastName: member.lastName,
              firstName: member.firstName,
              avatarId: member.avatarId ?? 0,
            });
          }
        }
      }
      return {
        captainId: c.userId,
        captainName,
        captainAvatarId,
        teamName: c.teamName ?? null,
        members,
      };
    });

  return {
    id: draft._id.toString(),
    status: draft.status,
    startAt: draft.startAt?.toISOString() ?? null,
    startedAt: draft.startedAt?.toISOString() ?? null,
    endsAt: draft.endsAt?.toISOString() ?? null,
    completedAt: draft.completedAt?.toISOString() ?? null,
    pickWindowSeconds: draft.pickWindowSeconds,
    totalCapMinutes: draft.totalCapMinutes,
    teamSize: draft.teamSize,
    bestOf: (draft.bestOf ?? 1) as DraftStateDto["bestOf"],
    captains: draft.captains
      .map((c) => {
        const u = captainNameById.get(c.userId);
        return {
          userId: c.userId,
          order: c.order,
          lastName: u?.lastName ?? "—",
          firstName: u?.firstName ?? "—",
          avatarId: u?.avatarId ?? 0,
          teamName: c.teamName ?? null,
        };
      })
      .sort((a, b) => a.order - b.order),
    currentTurnCaptainId: draft.currentTurnCaptainId,
    currentTurnIndex: draft.currentTurnIndex,
    turnDeadline: draft.turnDeadline?.toISOString() ?? null,
    picks: draft.picks.map((p) => ({
      ...p,
      pickedAt: p.pickedAt instanceof Date ? p.pickedAt.toISOString() : p.pickedAt,
    })),
    pickedPlayerIds: draft.pickedPlayerIds,
    availablePlayers,
    teams,
  };
}

export function matchToDto(doc: MatchDoc): MatchDto {
  return {
    id: doc._id.toString(),
    bestOf: doc.bestOf,
    totalCapMinutes: doc.totalCapMinutes,
    startedAt: doc.startedAt.toISOString(),
    completedAt: doc.completedAt.toISOString(),
    archivedAt: doc.archivedAt.toISOString(),
    finalizedAt: doc.finalizedAt?.toISOString() ?? null,
    finalized: doc.finalized,
    teams: doc.teams.map((t) => ({ ...t })),
  };
}

export async function listMatches(opts?: {
  finalizedOnly?: boolean;
}): Promise<MatchDto[]> {
  const matches = await getMatches();
  const filter = opts?.finalizedOnly ? { finalized: true } : {};
  const docs = await matches
    .find(filter)
    .sort({ archivedAt: -1 })
    .toArray();
  return docs.map(matchToDto);
}

export async function getLeaderboard(): Promise<LeaderboardEntry[]> {
  const matches = await getMatches();
  const docs = await matches.find({ finalized: true }).toArray();
  const map = new Map<string, LeaderboardEntry>();

  const ensure = (
    userId: string,
    lastName: string,
    firstName: string,
    avatarId: number,
  ): LeaderboardEntry => {
    let entry = map.get(userId);
    if (!entry) {
      entry = { userId, lastName, firstName, avatarId, matches: 0, wins: 0, points: 0 };
      map.set(userId, entry);
    }
    return entry;
  };

  for (const match of docs) {
    const totalTeams = match.teams.length;
    if (totalTeams === 0) continue;
    for (const team of match.teams) {
      if (team.finalRank == null) continue;
      const points = totalTeams - team.finalRank + 1;
      const isWin = team.finalRank === 1;

      const captainEntry = ensure(
        team.captainId,
        team.captainLastName,
        team.captainFirstName,
        team.captainAvatarId,
      );
      captainEntry.matches += 1;
      captainEntry.points += points;
      if (isWin) captainEntry.wins += 1;

      for (const m of team.members) {
        if (m.userId === team.captainId) continue;
        const e = ensure(m.userId, m.lastName, m.firstName, m.avatarId);
        e.matches += 1;
        e.points += points;
        if (isWin) e.wins += 1;
      }
    }
  }

  return [...map.values()].sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points;
    if (b.wins !== a.wins) return b.wins - a.wins;
    return b.matches - a.matches;
  });
}

export async function listAllUsers(): Promise<
  Array<{ id: string; lastName: string; firstName: string; phone: string; isAdmin: boolean; avatarId: number }>
> {
  const users = await getUsers();
  const docs = await users
    .find({}, { projection: { passwordHash: 0 } })
    .sort({ createdAt: 1 })
    .toArray();
  return docs.map((u: UserDoc) => ({
    id: u._id.toString(),
    lastName: u.lastName,
    firstName: u.firstName,
    phone: u.phone,
    isAdmin: u.isAdmin,
    avatarId: u.avatarId ?? 0,
  }));
}
