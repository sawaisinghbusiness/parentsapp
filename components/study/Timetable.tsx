"use client";

import { useEffect, useState } from "react";
import clsx from "clsx";
import { useApi } from "@/lib/api";
import { useL, useT } from "@/lib/i18n";
import { ErrorCard, Skeleton } from "@/components/ui";
import { DAYS, DAYS_FULL, S } from "@/lib/text/study";

interface Period {
  id: string;
  label: string;
  start: string;
  end: string;
  isBreak: boolean;
}

interface Week {
  setupNeeded: boolean;
  today: string;
  /** 1 = Monday … 6 = Saturday; 0 on Sunday. */
  todayDay: number;
  periods: Period[];
  days: Record<string, Record<string, { subject: string; teacher: string | null }>>;
}

const nowHHMM = () => {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
};

export function Timetable({ studentId }: { studentId: string }) {
  const L = useL();
  const { lang } = useT();
  const { data, error, reload } = useApi<Week>(`/timetable?student=${studentId}`);
  const [day, setDay] = useState<number | null>(null);
  const [now, setNow] = useState(nowHHMM);

  useEffect(() => {
    const t = setInterval(() => setNow(nowHHMM()), 60_000);
    return () => clearInterval(t);
  }, []);

  if (!data) {
    if (error && error.status !== 401) return <ErrorCard offline={error.status === 0} onRetry={reload} />;
    return (
      <div className="space-y-3">
        <div className="grid grid-cols-6 gap-1.5">
          {DAYS.hi.map((d) => (
            <Skeleton key={d} className="h-11 rounded-xl" />
          ))}
        </div>
        <div className="card space-y-4 p-4">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="flex gap-4">
              <Skeleton className="h-10 w-14" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-5 w-1/2" />
                <Skeleton className="h-4 w-1/3" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  const hasAny = Object.keys(data.days).length > 0;
  if (data.setupNeeded || !data.periods.length || !hasAny) return <p className="card p-4 text-ink-600">{L(S.noTimetable)}</p>;

  const today = data.todayDay;
  const shown = day ?? (today >= 1 && today <= 6 ? today : 1);
  const cells = data.days[shown] || {};
  const lessons = data.periods.filter((p) => !p.isBreak);
  const emptyDay = !lessons.some((p) => cells[p.id]);
  // Trim breaks and free periods after the last lesson of the day.
  const lastUsed = data.periods.reduce((last, p, i) => (cells[p.id] ? i : last), -1);
  const rows = data.periods.slice(0, lastUsed + 1);
  const isNow = (p: Period) => shown === today && !!p.start && !!p.end && p.start <= now && now < p.end;

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-6 gap-1.5" role="tablist" aria-label={L(S.timetable)}>
        {DAYS[lang].map((d, i) => {
          const n = i + 1;
          const on = n === shown;
          return (
            <button
              key={n}
              role="tab"
              aria-selected={on}
              aria-label={DAYS_FULL[lang][i]}
              onClick={() => setDay(n)}
              className={clsx(
                "relative flex h-11 min-w-0 items-center justify-center rounded-xl text-[15px] transition-colors",
                on ? "bg-brand-600 font-semibold text-white" : "font-medium text-ink-600 active:bg-ink-200/60"
              )}
            >
              {d}
              {n === today && !on && <span className="absolute bottom-1 h-1 w-1 rounded-full bg-brand-600" aria-hidden />}
            </button>
          );
        })}
      </div>

      {today === 0 && day === null && <p className="px-1 text-sm text-ink-500">{L(S.sundayNote)}</p>}

      {emptyDay ? (
        <p className="card p-4 text-ink-600">{L(S.noLessons)}</p>
      ) : (
        <ol className="card px-4 py-1" aria-label={DAYS_FULL[lang][shown - 1]}>
          {rows.map((p, i) => {
            const prevBreak = i > 0 && rows[i - 1].isBreak;
            if (p.isBreak)
              return (
                <li key={p.id} className="-mx-4 flex items-center gap-3 border-y border-ink-100 bg-ink-50 px-4 py-1.5 text-sm text-ink-500">
                  <span className="tnum w-14 shrink-0">{p.start}</span>
                  <span>
                    {p.label}
                    {p.end && <span className="tnum"> · {p.end} {lang === "hi" ? "तक" : "till"}</span>}
                  </span>
                </li>
              );
            const c = cells[p.id];
            const live = isNow(p);
            return (
              <li key={p.id} className={clsx("flex gap-3 py-3", i > 0 && !prevBreak && "border-t border-ink-100")}>
                <div className="tnum w-14 shrink-0 pt-0.5 leading-tight">
                  <p className="font-medium text-ink-900">{p.start || "—"}</p>
                  {p.end && <p className="text-sm text-ink-500">{p.end}</p>}
                </div>
                <div className="min-w-0 flex-1">
                  {c ? (
                    <>
                      <p className="break-words font-semibold leading-snug text-ink-900">{c.subject}</p>
                      {c.teacher && <p className="truncate text-sm text-ink-500">{c.teacher}</p>}
                    </>
                  ) : (
                    <p className="text-ink-400">{L(S.empty)}</p>
                  )}
                </div>
                {live && (
                  <span className="shrink-0 self-start pt-0.5 text-sm font-semibold text-brand-700">
                    {L(S.now)}
                  </span>
                )}
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}
