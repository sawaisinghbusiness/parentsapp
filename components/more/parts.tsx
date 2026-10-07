"use client";

import clsx from "clsx";
import { useL } from "@/lib/i18n";
import { M } from "@/lib/text/more";

/** The top bar now shows Back and the screen's name, so inner screens draw no heading of their own. */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function SubHeader(_props: { title: string }) {
  return null;
}

export type LeaveStatus = "pending" | "approved" | "rejected";
const TONE: Record<LeaveStatus, string> = { pending: "text-marigold-500", approved: "text-jade-600", rejected: "text-rose-600" };

/** Status as a coloured word, no pill. */
export function StatusChip({ status }: { status: LeaveStatus }) {
  const L = useL();
  return <span className={clsx("shrink-0 text-[15px] font-semibold", TONE[status])}>{L(M[status])}</span>;
}

/** Label on the left, value on the right; one line of a details list. */
export function InfoRow({ label, value, className }: { label: string; value: React.ReactNode; className?: string }) {
  return (
    <div className={clsx("flex items-baseline justify-between gap-4 py-2.5", className)}>
      <dt className="shrink-0 text-ink-500">{label}</dt>
      <dd className="min-w-0 text-right font-semibold text-ink-900">{value}</dd>
    </div>
  );
}
