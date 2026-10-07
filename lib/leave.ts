import type { Bi } from "./i18n";

export type LeaveStatus = "pending" | "approved" | "rejected";
export type LeaveType = "sick" | "family" | "casual" | "other";

export interface Leave {
  id: string;
  from: string;
  to: string;
  days: number;
  /** Older applications (and schools on an older server) have no type or half day. */
  type?: LeaveType | null;
  halfDay?: boolean;
  reason: string;
  status: LeaveStatus;
  decidedBy: string | null;
  decidedAt: string | null;
  createdAt: string;
}
export interface LeaveData {
  setupNeeded: boolean;
  rules: { today: string; minFrom: string; maxFrom: string; maxDays: number; reasonMax: number };
  requests: Leave[];
}

export const LEAVE_TYPES: Record<LeaveType, Bi> = {
  sick: { hi: "बीमारी", en: "Sick" },
  family: { hi: "घर का काम / शादी", en: "Family function" },
  casual: { hi: "ज़रूरी काम", en: "Casual" },
  other: { hi: "दूसरा कारण", en: "Other" },
};
