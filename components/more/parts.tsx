"use client";

import Link from "next/link";
import clsx from "clsx";
import { ChevronLeft } from "lucide-react";
import { useL } from "@/lib/i18n";
import { M } from "@/lib/text/more";

/** Small "‹ और" link back to the More list, then the screen's title. */
export function SubHeader({ title }: { title: string }) {
  const L = useL();
  return (
    <div className="px-1">
      <Link href="/more/" className="-ml-2 inline-flex min-h-[44px] items-center gap-0.5 pr-3 text-sm font-semibold text-brand-700">
        <ChevronLeft className="h-5 w-5" aria-hidden />
        {L(M.back)}
      </Link>
      <h1 className="text-[22px] font-bold leading-tight text-ink-900">{title}</h1>
    </div>
  );
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
