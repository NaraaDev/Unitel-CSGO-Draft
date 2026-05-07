import type { DraftStatus } from "@/lib/types";

const STATUS_LABEL: Record<DraftStatus, string> = {
  idle: "STANDBY",
  scheduled: "SCHEDULED",
  live: "LIVE",
  completed: "COMPLETED",
  stopped: "STOPPED",
};

const STATUS_COLOR: Record<DraftStatus, string> = {
  idle: "text-muted",
  scheduled: "text-cyber",
  live: "text-fire pulse-fire",
  completed: "text-success",
  stopped: "text-danger",
};

export function StatusChip({ status }: { status: DraftStatus }) {
  return (
    <span className={`chip ${STATUS_COLOR[status]}`}>
      <span className="chip-dot" />
      {STATUS_LABEL[status]}
    </span>
  );
}
