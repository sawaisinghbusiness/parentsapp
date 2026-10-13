"use client";

import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { useL, useT } from "@/lib/i18n";
import { EventPicture } from "./art";

/**
 * One school event as a row: its photo as a small square, the name, and the date and when it is.
 * Used for Upcoming Events on Home and the next event under the attendance calendar.
 */
export function EventRow({ id, title, date, today, coverUrl, scene }: { id: string; title: string; date: string; today: string; coverUrl?: string | null; scene?: string | null }) {
  const L = useL();
  const { lang } = useT();
  const loc = lang === "hi" ? "hi-IN" : "en-IN";
  const d = new Date(date + "T00:00:00");
  const n = Math.round((Date.parse(date + "T00:00:00Z") - Date.parse(today + "T00:00:00Z")) / 864e5);
  const when = n <= 0 ? L({ hi: "आज", en: "Today" }) : n === 1 ? L({ hi: "कल", en: "Tomorrow" }) : L({ hi: `${n} दिन में`, en: `In ${n} days` });
  return (
    <Link href={`/events/album/?id=${encodeURIComponent(id)}`} className="flex min-h-[64px] items-center gap-3 px-3.5 py-2.5 active:bg-ink-50">
      <span className="h-12 w-12 shrink-0 overflow-hidden rounded-[10px] bg-ink-100 ring-1 ring-inset ring-black/5">
        <EventPicture url={coverUrl} scene={scene} alt="" className="!aspect-square h-full" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[15px] font-semibold text-ink-900">{title}</span>
        <span className="block truncate text-[12.5px] text-ink-500">
          {d.toLocaleDateString(loc, { weekday: "short", day: "numeric", month: "short" })} · <span className={n <= 1 ? "font-semibold text-ink-800" : undefined}>{when}</span>
        </span>
      </span>
      <ChevronRight className="h-4 w-4 shrink-0 text-ink-300" aria-hidden />
    </Link>
  );
}
