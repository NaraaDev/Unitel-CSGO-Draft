import type { ObjectId } from "mongodb";

export type Role = "player" | "captain" | "admin";

export interface UserDoc {
  _id: ObjectId;
  lastName: string;
  firstName: string;
  phone: string;
  passwordHash: string;
  isAdmin: boolean;
  createdAt: Date;
}

export interface PublicUser {
  id: string;
  lastName: string;
  firstName: string;
  phone: string;
  isAdmin: boolean;
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
}

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
  captains: Array<{
    userId: string;
    order: number;
    lastName: string;
    firstName: string;
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
  }>;
  teams: Array<{
    captainId: string;
    captainName: string;
    members: Array<{ id: string; lastName: string; firstName: string }>;
  }>;
}
