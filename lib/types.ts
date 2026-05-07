import type { ObjectId } from "mongodb";

export type Role = "player" | "captain" | "admin";

export interface UserDoc {
  _id: ObjectId;
  lastName: string;
  firstName: string;
  phone: string;
  passwordHash: string;
  isAdmin: boolean;
  avatarId: number;
  createdAt: Date;
}

export interface PublicUser {
  id: string;
  lastName: string;
  firstName: string;
  phone: string;
  isAdmin: boolean;
  avatarId: number;
}

export type DraftStatus = "idle" | "scheduled" | "live" | "completed" | "stopped";

export interface DraftPick {
  round: number;
  pickIndex: number;
  captainId: string;
  playerId: string | null;
  pickedAt: Date;
  skipped: boolean;
}

export interface DraftCaptain {
  userId: string;
  order: number;
  teamName?: string | null;
}

export type BestOf = 1 | 3 | 5 | 7;

export type DraftType = "snake" | "linear" | "random";

export interface DraftDoc {
  _id: ObjectId;
  status: DraftStatus;
  startAt: Date | null;
  startedAt: Date | null;
  endsAt: Date | null;
  completedAt: Date | null;
  captains: DraftCaptain[];
  currentTurnCaptainId: string | null;
  currentTurnIndex: number;
  turnDeadline: Date | null;
  pickWindowSeconds: number;
  totalCapMinutes: number;
  teamSize: number;
  bestOf: BestOf;
  draftType: DraftType;
  pickSequence: string[];
  picks: DraftPick[];
  pickedPlayerIds: string[];
  updatedAt: Date;
  createdAt: Date;
}

export interface DraftStateDto {
  id: string;
  status: DraftStatus;
  startAt: string | null;
  startedAt: string | null;
  endsAt: string | null;
  completedAt: string | null;
  pickWindowSeconds: number;
  totalCapMinutes: number;
  teamSize: number;
  bestOf: BestOf;
  draftType: DraftType;
  pickSequence: string[];
  captains: Array<{
    userId: string;
    order: number;
    lastName: string;
    firstName: string;
    avatarId: number;
    teamName: string | null;
  }>;
  currentTurnCaptainId: string | null;
  currentTurnIndex: number;
  turnDeadline: string | null;
  picks: Array<{
    round: number;
    pickIndex: number;
    captainId: string;
    playerId: string | null;
    pickedAt: string;
    skipped: boolean;
  }>;
  pickedPlayerIds: string[];
  availablePlayers: Array<{
    id: string;
    lastName: string;
    firstName: string;
    avatarId: number;
  }>;
  teams: Array<{
    captainId: string;
    captainName: string;
    captainAvatarId: number;
    teamName: string | null;
    members: Array<{ id: string; lastName: string; firstName: string; avatarId: number }>;
  }>;
}

export interface MatchPlayerSnapshot {
  userId: string;
  lastName: string;
  firstName: string;
  avatarId: number;
}

export interface MatchTeam {
  captainId: string;
  captainLastName: string;
  captainFirstName: string;
  captainAvatarId: number;
  teamName: string | null;
  members: MatchPlayerSnapshot[];
  finalRank: number | null;
}

export interface MatchDoc {
  _id: ObjectId;
  bestOf: BestOf;
  totalCapMinutes: number;
  startedAt: Date;
  completedAt: Date;
  teams: MatchTeam[];
  finalized: boolean;
  archivedAt: Date;
  finalizedAt: Date | null;
  updatedAt: Date;
}

export interface MatchDto {
  id: string;
  bestOf: BestOf;
  totalCapMinutes: number;
  startedAt: string;
  completedAt: string;
  archivedAt: string;
  finalizedAt: string | null;
  finalized: boolean;
  teams: Array<{
    captainId: string;
    captainLastName: string;
    captainFirstName: string;
    captainAvatarId: number;
    teamName: string | null;
    members: MatchPlayerSnapshot[];
    finalRank: number | null;
  }>;
}

export interface LeaderboardEntry {
  userId: string;
  lastName: string;
  firstName: string;
  avatarId: number;
  matches: number;
  wins: number;
  points: number;
}
