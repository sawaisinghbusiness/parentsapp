"use client";

import { useEffect, useState } from "react";
import clsx from "clsx";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useApi } from "@/lib/api";
import { useParent } from "@/lib/parent";
import { useT, type Lang } from "@/lib/i18n";
import { dayMonth } from "@/lib/format";
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

/** Solid fills read in sunlight; text colour always contrasts with the fill (never same hue). */
const CELL: Record<Mark, string> = {
  P: "bg-jade-600 text-white",
  A: "bg-rose-500 text-white",
  L: "bg-marigold-400 text-ink-900",
  H: "bg-marigold-400 text-ink-900",
};
const DOT: Record<Mark, string> = { P: "bg-jade-600", A: "bg-rose-500", L: "bg-marigold-400", H: "bg-marigold-400" };
const KEY = { P: "att.Present", A: "att.Absent", L: "att.Leave", H: "att.HalfDay" } as const;

const WEEK = { hi: ["र", "सो", "मं", "बु", "गु", "शु", "श"], en: ["S", "M", "T", "W", "T", "F", "S"] };

const shift = (m: string, by: number) => {
  const d = new Date(Date.UTC(+m.slice(0, 4), +m.slice(5, 7) - 1 + by, 1));
  return d.toISOString().slice(0, 7);
};
const monthName = (m: string, lang: Lang) => new Date(m + "-01T00:00:00").toLocaleDateString(lang === "hi" ? "hi-IN" : "en-IN", { month: "long", year: "numeric" });
const pct = (n: number | null) => (n === null ? "—" : `${Number.isInteger(n) ? n : n.toFixed(1)}%`);

export default function AttendancePage() {
  const { child } = useParent();
  const { t, lang } = useT();
  const [month, setMonth] = useState("");
  // Another child may have a different month open; start each child on the current month.
  useEffect(() => setMonth(""), [child?.id]);

  const { data, error, reload } = useApi<MonthData>(child ? `/attendance?student=${child.id}${month ? `&month=${month}` : ""}` : null);
  const shown = data && (!month || data.month === month) ? data : undefined;

  if (!shown && error && error.status !== 401) return <ErrorCard offline={error.status === 0} onRetry={reload} />;

  const current = shown?.month || month;
  const canPrev = !!shown && current > shown.firstMonth;
  const canNext = !!shown && current < shown.today.slice(0, 7);
  const tot = shown?.totals;
  const holidays = shown ? Array.from(new Map(shown.days.filter((d) => d.holiday).map((d) => [d.holiday!, d.date])).entries()) : [];
  const lead = shown ? new Date(shown.days[0].date + "T00:00:00").getDay() : 0;

  return (
    <div className="animate-rise space-y-3">
      {/* Summary: this month's percent, the counts, and the session so far */}
      <section className="card p-4">
        <p className="card-title">{t("att.thisMonth")}</p>
        {!tot ? (
          <div className="mt-2 space-y-2">
            <Skeleton className="h-9 w-24" />
            <Skeleton className="h-4 w-56" />
          </div>
        ) : tot.workingDays === 0 ? (
          <p className="mt-1 text-ink-600">{t("att.noneMarked")}</p>
        ) : (
          <>
            <p className="tnum mt-0.5 text-[32px] font-extrabold leading-tight tracking-tight text-ink-900">
              {pct(tot.percent)}
              <span className="ml-2 text-base font-medium text-ink-500">
                {tot.workingDays} {t("att.days")}
              </span>
            </p>
            <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-ink-700">
              {(["P", "A", "L", "H"] as Mark[]).map((m) => {
                const n = { P: tot.present, A: tot.absent, L: tot.leave, H: tot.half }[m];
                if (!n && m !== "P" && m !== "A") return null;
                return (
                  <li key={m} className="flex items-center gap-1.5">
                    <span className={clsx("dot", DOT[m])} aria-hidden />
                    {t(KEY[m])} <span className="tnum font-semibold text-ink-900">{n}</span>
                  </li>
                );
              })}
            </ul>
          </>
        )}
        {shown && shown.session.workingDays > 0 && (
          <p className="tnum mt-3 border-t border-ink-100 pt-3 text-ink-600">
            {t("att.session")}: <span className="font-semibold text-ink-900">{pct(shown.session.percent)}</span> · {shown.session.workingDays} {t("att.days")}
          </p>
        )}
      </section>

      {/* Calendar */}
      <section className="card p-3">
        <div className="flex items-center justify-between">
          <button onClick={() => setMonth(shift(current, -1))} disabled={!canPrev} aria-label={t("att.prev")} className="grid h-11 w-11 place-items-center rounded-xl text-ink-700 hover:bg-ink-50 disabled:opacity-30">
            <ChevronLeft className="h-6 w-6" aria-hidden />
          </button>
          <p className="text-lg font-bold text-ink-900">{current ? monthName(current, lang) : " "}</p>
          <button onClick={() => setMonth(shift(current, 1))} disabled={!canNext} aria-label={t("att.next")} className="grid h-11 w-11 place-items-center rounded-xl text-ink-700 hover:bg-ink-50 disabled:opacity-30">
            <ChevronRight className="h-6 w-6" aria-hidden />
          </button>
        </div>

        <div className="mt-2 grid grid-cols-7 gap-1.5 text-center">
          {WEEK[lang].map((w, i) => (
            <span key={i} className={clsx("pb-1 text-xs font-semibold", i === 0 ? "text-rose-600" : "text-ink-500")}>
              {w}
            </span>
          ))}
          {!shown
            ? Array.from({ length: 35 }, (_, i) => <Skeleton key={i} className="aspect-square rounded-xl" />)
            : [
                ...Array.from({ length: lead }, (_, i) => <span key={`b${i}`} />),
                ...shown.days.map((d) => {
                  const n = +d.date.slice(8);
                  const future = d.date > shown.today;
                  const off = !d.mark && (d.sunday || d.holiday);
                  return (
                    <span
                      key={d.date}
                      title={d.holiday || undefined}
                      aria-label={`${dayMonth(d.date, lang)}${d.mark ? `: ${t(KEY[d.mark])}` : d.holiday ? `: ${d.holiday}` : ""}`}
                      className={clsx(
                        "tnum relative grid aspect-square place-items-center rounded-xl text-[15px] font-semibold",
                        d.mark ? CELL[d.mark] : future ? "text-ink-300" : off ? "bg-ink-100 text-ink-400" : "bg-ink-50 text-ink-700",
                        d.date === shown.today && "ring-2 ring-brand-600 ring-offset-1"
                      )}
                    >
                      {n}
                      {d.mark === "H" && <span className="absolute bottom-0.5 text-[10px] leading-none">½</span>}
                    </span>
                  );
                }),
              ]}
        </div>

        {/* Legend */}
        <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5 px-1 text-xs text-ink-600">
          {(["P", "A", "L"] as Mark[]).map((m) => (
            <li key={m} className="flex items-center gap-1.5">
              <span className={clsx("h-3 w-3 rounded", DOT[m])} aria-hidden />
              {m === "L" ? `${t("att.Leave")} / ${t("att.HalfDay")}` : t(KEY[m])}
            </li>
          ))}
          <li className="flex items-center gap-1.5">
            <span className="h-3 w-3 rounded bg-ink-100 ring-1 ring-ink-200" aria-hidden />
            {t("att.holidays")}
          </li>
        </ul>
      </section>

      {holidays.length > 0 && (
        <section className="card p-4">
          <p className="card-title">{t("att.holidays")}</p>
          <ul className="mt-1 divide-y divide-ink-100">
            {holidays.map(([title, date]) => (
              <li key={title} className="flex items-baseline justify-between gap-3 py-2.5">
                <span className="font-medium text-ink-900">{title}</span>
                <span className="shrink-0 text-sm text-ink-500">{dayMonth(date, lang)}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <p className="px-2 text-xs text-ink-500">{t("att.note")}</p>
    </div>
  );
}
