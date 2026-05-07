import { ObjectId } from "mongodb";
import { getDrafts, getUsers } from "./mongodb";
import { captainAtPickIndex, isDraftDone, shouldStopByCap, totalPickCount } from "./draft-engine";
import type { DraftDoc, DraftStateDto, UserDoc } from "./types";

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
  const draft = await getOrCreateDraft();
  if (draft.status !== "live") return draft;

  const now = new Date();
  const drafts = await getDrafts();

  if (shouldStopByCap(draft, now)) {
    await drafts.updateOne(
      { _id: draft._id },
      {
        $set: {
          status: "stopped",
          completedAt: now,
          turnDeadline: null,
          currentTurnCaptainId: null,
          updatedAt: now,
        },
      },
    );
    return (await drafts.findOne({ _id: draft._id })) as DraftDoc;
  }

  if (isDraftDone(draft)) {
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

export async function skipCurrentTurn(draft: DraftDoc, now: Date): Promise<DraftDoc> {
  const drafts = await getDrafts();
  const slot = captainAtPickIndex(draft.captains, draft.currentTurnIndex);
  if (!slot) return draft;

  const nextIndex = draft.currentTurnIndex + 1;
  const nextSlot = captainAtPickIndex(draft.captains, nextIndex);
  const stillRunning = nextIndex < totalPickCount(draft);

  await drafts.updateOne(
    { _id: draft._id, currentTurnIndex: draft.currentTurnIndex },
    {
      $push: {
        picks: {
          round: slot.round,
          pickIndex: draft.currentTurnIndex,
          captainId: slot.captainId,
          playerId: null,
          pickedAt: now,
          skipped: true,
        },
      },
      $set: {
        currentTurnIndex: nextIndex,
        currentTurnCaptainId: stillRunning && nextSlot ? nextSlot.captainId : null,
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
    captainIds.length > 0
      ? await users.find({ _id: { $in: captainIds } }).toArray()
      : [];

  const captainNameById = new Map(captainDocs.map((u) => [u._id.toString(), u]));

  const allUsers = await users
    .find({}, { projection: { passwordHash: 0 } })
    .sort({ createdAt: 1 })
    .toArray();

  const playersOnTeams = new Set<string>();
  for (const p of draft.picks) {
    if (p.playerId) playersOnTeams.add(p.playerId);
  }
  for (const c of draft.captains) playersOnTeams.add(c.userId);

  const availablePlayers = allUsers
    .filter((u) => !u.isAdmin && !playersOnTeams.has(u._id.toString()))
    .map((u) => ({
      id: u._id.toString(),
      lastName: u.lastName,
      firstName: u.firstName,
    }));

  const teams = [...draft.captains]
    .sort((a, b) => a.order - b.order)
    .map((c) => {
      const captain = captainNameById.get(c.userId);
      const captainName = captain ? `${captain.lastName} ${captain.firstName}` : "—";
      const members: Array<{ id: string; lastName: string; firstName: string }> = [];
      if (captain) {
        members.push({
          id: c.userId,
          lastName: captain.lastName,
          firstName: captain.firstName,
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
            });
          }
        }
      }
      return { captainId: c.userId, captainName, members };
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
    captains: draft.captains
      .map((c) => {
        const u = captainNameById.get(c.userId);
        return {
          userId: c.userId,
          order: c.order,
          lastName: u?.lastName ?? "—",
          firstName: u?.firstName ?? "—",
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

export async function listAllUsers(): Promise<Array<{ id: string; lastName: string; firstName: string; phone: string; isAdmin: boolean }>> {
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
  }));
}
