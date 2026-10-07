"use client";

import { useEffect, useState } from "react";
import clsx from "clsx";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useApi } from "@/lib/api";
import { useParent } from "@/lib/parent";
import { useL, useT, type Lang } from "@/lib/i18n";
import { ErrorCard, Skeleton } from "@/components/ui";

type Mark = "P" | "A" | "L" | "H";

interface MonthData {
  month: string;
  today: string;
  firstMonth: string;
  days: { date: string; mark: Mark | null; holiday: string | null; sunday: boolean }[];
  totals: { present: number; absent: number; leave: number; half: number; workingDays: number; percent: number | null };
  session: { percent: number | null; workingDays: number };
}

const DOT: Record<Mark, string> = { P: "bg-jade-600", A: "bg-rose-600", L: "bg-marigold-500", H: "bg-marigold-500" };
const NAME: Record<Mark, { hi: string; en: string }> = {
  P: { hi: "उपस्थित", en: "Present" },
  A: { hi: "अनुपस्थित", en: "Absent" },
  L: { hi: "छुट्टी", en: "Leave" },
  H: { hi: "आधा दिन", en: "Half day" },
};
const WEEK = { hi: ["र", "सो", "मं", "बु", "गु", "शु", "श"], en: ["S", "M", "T", "W", "T", "F", "S"] };

const shift = (m: string, by: number) => new Date(Date.UTC(+m.slice(0, 4), +m.slice(5, 7) - 1 + by, 1)).toISOString().slice(0, 7);
const loc = (lang: Lang) => (lang === "hi" ? "hi-IN" : "en-IN");
const monthName = (m: string, lang: Lang) => new Date(m + "-01T00:00:00").toLocaleDateString(loc(lang), { month: "long", year: "numeric" });
const dayLine = (iso: string, lang: Lang) => new Date(iso + "T00:00:00").toLocaleDateString(loc(lang), { day: "numeric", month: "short", weekday: "long" });
const pct = (n: number | null) => (n === null ? "—" : `${Number.isInteger(n) ? n : n.toFixed(1)}%`);

/**
 * Attendance: the month's percentage and how it splits (one thin bar), a plain calendar where
 * each school day carries a small coloured dot, then the days the child was not fully present.
 */
export default function AttendancePage() {
  const { child } = useParent();
  const L = useL();
  const { lang } = useT();
  const [month, setMonth] = useState("");
  useEffect(() => setMonth(""), [child?.id]);

  const { data, error, reload } = useApi<MonthData>(child ? `/attendance?student=${child.id}${month ? `&month=${month}` : ""}` : null);
  const shown = data && (!month || data.month === month) ? data : undefined;

  if (!shown && error && error.status !== 401) return <ErrorCard offline={error.status === 0} onRetry={reload} />;

  const current = shown?.month || month;
  const canPrev = !!shown && current > shown.firstMonth;
  const canNext = !!shown && current < shown.today.slice(0, 7);
  const t = shown?.totals;
  const lead = shown ? new Date(shown.days[0].date + "T00:00:00").getDay() : 0;
  const notPresent = shown ? shown.days.filter((d) => (d.mark && d.mark !== "P") || d.holiday) : [];

  return (
    <div className="animate-rise space-y-4 pb-2">
      {/* Month */}
      <div className="flex items-center justify-between">
        <button onClick={() => setMonth(shift(current, -1))} disabled={!canPrev} aria-label={L({ hi: "पिछला महीना", en: "Previous month" })} className="grid h-11 w-11 place-items-center rounded-full text-ink-700 active:bg-ink-200/60 disabled:opacity-25">
          <ChevronLeft className="h-6 w-6" aria-hidden />
        </button>
        <p className="text-[18px] font-semibold text-ink-900">{current ? monthName(current, lang) : " "}</p>
        <button onClick={() => setMonth(shift(current, 1))} disabled={!canNext} aria-label={L({ hi: "अगला महीना", en: "Next month" })} className="grid h-11 w-11 place-items-center rounded-full text-ink-700 active:bg-ink-200/60 disabled:opacity-25">
          <ChevronRight className="h-6 w-6" aria-hidden />
        </button>
      </div>

      {/* Summary */}
      <section className="card p-4">
        {!t || !shown ? (
          <div className="space-y-3">
            <Skeleton className="h-8 w-24" />
            <Skeleton className="h-2 w-full" />
            <Skeleton className="h-4 w-48" />
          </div>
        ) : t.workingDays === 0 ? (
          <p className="text-ink-600">{L({ hi: "इस महीने अभी हाज़िरी नहीं लगी।", en: "No attendance marked this month yet." })}</p>
        ) : (
          <>
            <div className="flex items-end justify-between gap-3">
              <div>
                <p className="tnum text-[30px] font-semibold leading-none text-ink-900">{pct(t.percent)}</p>
                <p className="mt-1.5 text-[14px] text-ink-500">
                  {L({ hi: "इस महीने", en: "This month" })} · {t.workingDays} {L({ hi: "स्कूल के दिन", en: "school days" })}
                </p>
              </div>
              {shown.session.workingDays > 0 && (
                <p className="tnum text-right text-[14px] leading-snug text-ink-500">
                  {L({ hi: "सत्र में अब तक", en: "Session so far" })}
                  <span className="block text-[17px] font-semibold text-ink-800">{pct(shown.session.percent)}</span>
                </p>
              )}
            </div>

            {/* How the month splits, in one bar */}
            <div className="mt-4 flex h-2 overflow-hidden rounded-full bg-ink-100" aria-hidden>
              {(["P", "H", "L", "A"] as Mark[]).map((m) => {
                const n = { P: t.present, A: t.absent, L: t.leave, H: t.half }[m];
                return n ? <span key={m} className={DOT[m]} style={{ width: `${(n / t.workingDays) * 100}%` }} /> : null;
              })}
            </div>
            <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-[14px] text-ink-600">
              {(["P", "A", "L", "H"] as Mark[]).map((m) => {
                const n = { P: t.present, A: t.absent, L: t.leave, H: t.half }[m];
                if (!n && (m === "L" || m === "H")) return null;
                return (
                  <li key={m} className="flex items-center gap-1.5">
                    <span className={clsx("dot h-2 w-2", DOT[m])} aria-hidden />
                    {L(NAME[m])} <span className="tnum font-semibold text-ink-900">{n}</span>
                  </li>
                );
              })}
            </ul>
          </>
        )}
      </section>

      {/* Calendar: plain dates, a small dot for what happened */}
      <section className="card px-2 pb-2 pt-3">
        <div className="grid grid-cols-7 text-center">
          {WEEK[lang].map((w, i) => (
            <span key={i} className="pb-2 text-[13px] font-medium text-ink-400">
              {w}
            </span>
          ))}
          {!shown
            ? Array.from({ length: 35 }, (_, i) => (
                <span key={i} className="grid h-12 place-items-center">
                  <Skeleton className="h-7 w-7 rounded-full" />
                </span>
              ))
            : [
                ...Array.from({ length: lead }, (_, i) => <span key={`b${i}`} />),
                ...shown.days.map((d) => {
                  const isToday = d.date === shown.today;
                  const future = d.date > shown.today;
                  const off = d.sunday || !!d.holiday;
                  return (
                    <span key={d.date} className="flex h-12 flex-col items-center justify-center" aria-label={`${dayLine(d.date, lang)}${d.mark ? `: ${L(NAME[d.mark])}` : d.holiday ? `: ${d.holiday}` : ""}`}>
                      <span className={clsx("tnum grid h-8 w-8 place-items-center rounded-full text-[15px]", isToday ? "bg-brand-600 font-semibold text-white" : future || (off && !d.mark) ? "text-ink-400" : "font-medium text-ink-900")}>{+d.date.slice(8)}</span>
                      <span className={clsx("mt-0.5 h-1.5 w-1.5 rounded-full", d.mark ? DOT[d.mark] : "bg-transparent")} />
                    </span>
                  );
                }),
              ]}
        </div>
      </section>

      {/* The days that need explaining */}
      {shown && t && t.workingDays > 0 && (
        <section>
          <h2 className="px-1 pb-1.5 text-[15px] font-semibold text-ink-700">{L({ hi: "इस महीने की छुट्टियाँ और अनुपस्थिति", en: "Days off and absences" })}</h2>
          <ul className="card divide-y divide-ink-100">
            {notPresent.length === 0 ? (
              <li className="px-4 py-3 text-ink-600">{L({ hi: "इस महीने हर दिन उपस्थित रहा।", en: "Present every school day this month." })}</li>
            ) : (
              notPresent.map((d) => (
                <li key={d.date} className="flex min-h-[52px] items-center justify-between gap-3 px-4 py-2.5">
                  <span className="text-ink-900">{dayLine(d.date, lang)}</span>
                  <span className="flex shrink-0 items-center gap-1.5 text-[15px] text-ink-600">
                    <span className={clsx("dot h-2 w-2", d.mark ? DOT[d.mark] : "bg-ink-300")} aria-hidden />
                    {d.mark ? L(NAME[d.mark]) : d.holiday}
                  </span>
                </li>
              ))
            )}
          </ul>
        </section>
      )}
    </div>
  );
}
