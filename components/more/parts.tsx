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
const DOT: Record<LeaveStatus, string> = { pending: "bg-marigold-500", approved: "bg-jade-600", rejected: "bg-rose-500" };

/** Neutral chip with a coloured dot: meaning by the dot, never same-hue background and text. */
export function StatusChip({ status }: { status: LeaveStatus }) {
  const L = useL();
  return (
    <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-ink-200 bg-white px-2.5 py-0.5 text-sm font-semibold text-ink-700">
      <span className={clsx("dot h-2 w-2", DOT[status])} aria-hidden />
      {L(M[status])}
    </span>
  );
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
