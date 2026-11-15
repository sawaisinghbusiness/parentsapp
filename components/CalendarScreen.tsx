"use client";

import { useEffect, useRef, useState } from "react";
import clsx from "clsx";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useApi } from "@/lib/api";
import { useParent } from "@/lib/parent";
import { useL, useT, type Lang } from "@/lib/i18n";
import { clock } from "@/lib/format";
import type { EventRow } from "@/lib/events";
import { EventRow as EventLine } from "@/components/EventRow";
import { DAYS, DAYS_FULL, S } from "@/lib/text/study";
import { Empty, ErrorCard, Skeleton } from "@/components/ui";
import "./study.css";

type Tab = "attendance" | "timetable";

/**
 * Calendar tab: the month's attendance, and the class timetable.
 *
 * Redrawn 2026-11-14 like a school register (the user found the old page confusing): one month heading
 * with previous / next, then the dates. Every marked day is the same round filled circle in its status
 * colour (the user's choice: no squares, no letters, no counts block); absences, leave, half days and
 * holidays are also written out in words under the grid when there are any.
 * The timetable is a ruled list: time, subject, teacher. Nothing is in a card, and the page scrolls
 * normally. A tab's screen slides in from its own side (study.css).
 */
export function CalendarScreen() {
  const { child } = useParent();
  const L = useL();
  const [tab, setTab] = useState<Tab>("attendance");
  useEffect(() => {
    if (new URLSearchParams(window.location.search).get("tab") === "timetable") setTab("timetable");
  }, []);

  return (
    <div className="study space-y-5 pt-1">
      {/* Two tabs as one pill, the navy part sliding to the chosen one. */}
      <div className="relative grid grid-cols-2 rounded-full bg-[#EAF0F6] p-1 ring-1 ring-[#DCE4ED]" role="tablist" aria-label={L({ hi: "कैलेंडर", en: "Calendar" })}>
        <span aria-hidden className="slide-pill absolute bottom-1 left-1 top-1 w-[calc(50%-4px)] rounded-full bg-[#0D2A5E]" style={{ transform: tab === "timetable" ? "translateX(100%)" : "none" }} />
        {(["attendance", "timetable"] as const).map((k) => (
          <button key={k} role="tab" aria-selected={tab === k} onClick={() => setTab(k)} className={clsx("relative min-h-[44px] rounded-full text-[14.5px] transition-colors duration-300", tab === k ? "font-semibold text-white" : "font-medium text-ink-600")}>
            {k === "attendance" ? L({ hi: "हाज़िरी", en: "Attendance" }) : L({ hi: "टाइम टेबल", en: "Time table" })}
          </button>
        ))}
      </div>
      {!child ? (
        <Skeleton className="h-72 w-full rounded-[14px]" />
      ) : tab === "attendance" ? (
        <div key="a" className="study-from-left">
          <Attendance key={child.id} studentId={child.id} />
        </div>
      ) : (
        <div key="t" className="study-from-right">
          <Timetable key={child.id} studentId={child.id} />
        </div>
      )}
    </div>
  );
}

/* ───────────── Attendance ───────────── */

type Mark = "P" | "A" | "L" | "H";
interface MonthData {
  month: string;
  today: string;
  firstMonth: string;
  days: { date: string; mark: Mark | null; holiday: string | null; sunday: boolean }[];
  totals: { present: number; absent: number; leave: number; half: number; workingDays: number; percent: number | null };
  session: { percent: number | null; workingDays: number };
}

const NAME: Record<Mark, { hi: string; en: string }> = {
  P: { hi: "उपस्थित", en: "Present" },
  A: { hi: "अनुपस्थित", en: "Absent" },
  L: { hi: "छुट्टी", en: "Leave" },
  H: { hi: "आधा दिन", en: "Half day" },
};
const shift = (m: string, by: number) => new Date(Date.UTC(+m.slice(0, 4), +m.slice(5, 7) - 1 + by, 1)).toISOString().slice(0, 7);
const loc = (lang: Lang) => (lang === "hi" ? "hi-IN" : "en-IN");
const WEEK: Record<Lang, string[]> = { en: ["S", "M", "T", "W", "T", "F", "S"], hi: ["र", "सो", "मं", "बु", "गु", "शु", "श"] };
const dayWords = (iso: string, lang: Lang) => new Date(iso + "T00:00:00").toLocaleDateString(loc(lang), { weekday: "short", day: "numeric", month: "short" });
/** The circle behind a marked date: one size for all, dark enough for the white number (4.5:1). */
const FILL: Record<Mark, string> = { P: "bg-[#0F6E33]", A: "bg-[#B91C1C]", L: "bg-[#924F04]", H: "bg-[#924F04]" };

function Attendance({ studentId }: { studentId: string }) {
  const L = useL();
  const { lang } = useT();
  const [month, setMonth] = useState("");
  const { data, error, reload } = useApi<MonthData>(`/attendance?student=${studentId}${month ? `&month=${month}` : ""}`);
  const shown = data && (!month || data.month === month) ? data : undefined;
  // The session's first month and today, kept while another month loads so the heading doesn't flash.
  const kept = useRef<{ firstMonth: string; today: string } | null>(null);
  if (data) kept.current = { firstMonth: data.firstMonth, today: data.today };
  const base = kept.current;

  if (!shown && !base && error && error.status !== 401) return <ErrorCard offline={error.status === 0} onRetry={reload} />;

  const thisMonth = base?.today.slice(0, 7) || "";
  const current = shown?.month || month || thisMonth;
  const canPrev = !!base && current > base.firstMonth;
  const canNext = !!base && current < thisMonth;
  // Empty cells before the 1st, so it falls under its weekday (weeks start on Sunday).
  const lead = shown?.days.length ? new Date(shown.days[0].date + "T00:00:00").getDay() : 0;
  // The days written out in words: absences, leave and half days so far, and the month's holidays.
  const notes = shown ? shown.days.filter((d) => (d.holiday && !d.sunday) || (d.date <= shown.today && !d.sunday && d.mark && d.mark !== "P")) : [];
  const arrow = "grid h-11 w-11 place-items-center rounded-full text-ink-900 active:bg-[#EAF0F6] disabled:text-ink-300";

  return (
    <div className="space-y-6">
      <section>
        {/* One month heading, with the way to the months before and after. */}
        <div className="-mx-2.5 flex items-center">
          <button type="button" disabled={!canPrev} onClick={() => setMonth(shift(current, -1))} aria-label={L({ hi: "पिछला महीना", en: "Previous month" })} className={arrow}>
            <ChevronLeft className="h-5 w-5" aria-hidden />
          </button>
          <h2 className="flex-1 text-center text-[18px] font-semibold text-ink-900" aria-live="polite">
            {current ? new Date(current + "-01T00:00:00").toLocaleDateString(loc(lang), { month: "long", year: "numeric" }) : " "}
          </h2>
          <button type="button" disabled={!canNext} onClick={() => setMonth(shift(current, 1))} aria-label={L({ hi: "अगला महीना", en: "Next month" })} className={arrow}>
            <ChevronRight className="h-5 w-5" aria-hidden />
          </button>
        </div>

        {!shown ? (
          <Skeleton className="mt-3 h-[330px] w-full rounded-[14px]" />
        ) : (
          <div key={shown.month} className="study-in">
            {/* The dates: a marked day is a filled circle in its colour, all the same size. */}
            <div className="mt-4 grid grid-cols-7 text-center" role="grid" aria-label={L({ hi: "हाज़िरी", en: "Attendance" })}>
              {WEEK[lang].map((w, i) => (
                <span key={i} className="pb-1 text-[12px] font-medium text-ink-500">
                  {w}
                </span>
              ))}
              {Array.from({ length: lead }, (_, i) => (
                <span key={`e${i}`} />
              ))}
              {shown.days.map((d) => {
                const later = d.date > shown.today;
                const isToday = d.date === shown.today;
                const holiday = !!d.holiday && !d.sunday;
                const mark = !later && !d.sunday && !holiday ? d.mark : null;
                const word = d.sunday ? L({ hi: "रविवार", en: "Sunday" }) : holiday ? d.holiday : mark ? L(NAME[mark]) : later ? "" : L({ hi: "दर्ज नहीं", en: "Not marked" });
                return (
                  <span key={d.date} role="gridcell" aria-label={`${+d.date.slice(8)}${word ? ` · ${word}` : ""}`} className="flex h-[46px] items-center justify-center">
                    <span
                      className={clsx(
                        "tnum grid h-9 w-9 place-items-center rounded-full text-[15px] leading-none",
                        mark ? `${FILL[mark]} font-semibold text-white` : holiday ? "bg-[#EAF0F6] text-ink-500" : d.sunday || later ? "text-ink-400" : "text-ink-900",
                        // Today keeps a navy ring, marked or not, so it can always be found.
                        isToday && "ring-2 ring-[#0D2A5E] ring-offset-2 ring-offset-[#F7F9FC]"
                      )}
                    >
                      {+d.date.slice(8)}
                    </span>
                  </span>
                );
              })}
            </div>

            {/* What the colours mean. Half day shares the leave colour and has no entry of its own (the user removed it). */}
            <p className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[12.5px] text-ink-600">
              {(["P", "A", "L"] as const).map((m) => (
                <span key={m} className="inline-flex items-center gap-1.5">
                  <span className={clsx("h-2.5 w-2.5 rounded-full", FILL[m])} aria-hidden />
                  {L(NAME[m])}
                </span>
              ))}
              <span className="inline-flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-[#DCE4ED]" aria-hidden />
                {L({ hi: "स्कूल बंद", en: "Holiday" })}
              </span>
            </p>
          </div>
        )}
      </section>

      {/* The same days in words: this is the part a parent reads. */}
      {shown && notes.length > 0 && (
        <section key={`n${shown.month}`} className="study-in" style={{ animationDelay: "70ms" }}>
          <h2 className="text-[16px] font-semibold text-ink-900">{L({ hi: "इस महीने ध्यान देने वाले दिन", en: "Days to note this month" })}</h2>
            <ul className="mt-2 divide-y divide-[#DCE4ED] border-y border-[#DCE4ED]">
              {notes.map((d) => {
                const holiday = !!d.holiday && !d.sunday;
                return (
                  <li key={d.date} className="flex min-h-[48px] items-center gap-3 py-2 text-[14.5px]">
                    <span className="tnum w-[104px] shrink-0 text-ink-600">{dayWords(d.date, lang)}</span>
                    <span className={clsx("min-w-0 flex-1 font-medium", holiday ? "text-ink-900" : d.mark === "A" ? "text-[#B91C1C]" : "text-[#924F04]")}>
                      {holiday ? d.holiday : L(NAME[d.mark as Mark])}
                    </span>
                    {holiday && <span className="shrink-0 text-[12.5px] text-ink-500">{L({ hi: "स्कूल बंद", en: "Holiday" })}</span>}
                  </li>
                );
              })}
            </ul>
        </section>
      )}

      <NextEvent today={base?.today} />
    </div>
  );
}

/** The next school event, as one row under its own heading. */
function NextEvent({ today }: { today?: string }) {
  const L = useL();
  const { data } = useApi<{ events: EventRow[] }>("/events");
  const day = today || new Date().toISOString().slice(0, 10);
  const next = (data?.events || []).filter((e) => e.date >= day).sort((a, b) => a.date.localeCompare(b.date))[0];
  if (!next) return null;
  return (
    <section className="study-in" style={{ animationDelay: "140ms" }}>
      <h2 className="text-[16px] font-semibold text-ink-900">{L({ hi: "अगला कार्यक्रम", en: "Next event" })}</h2>
      <div className="-mx-4 mt-1 border-y border-[#DCE4ED]">
        <EventLine id={next.id} title={next.title} date={next.date} today={day} coverUrl={next.coverUrl} scene={next.scene} />
      </div>
    </section>
  );
}

/* ───────────── Time table ───────────── */

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

const addDays = (iso: string, n: number) => new Date(Date.parse(iso + "T00:00:00Z") + n * 864e5).toISOString().slice(0, 10);
const nowHHMM = () => {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
};

function Timetable({ studentId }: { studentId: string }) {
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
        <Skeleton className="h-12 w-full rounded-[10px]" />
        {[0, 1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-12 w-full rounded-[10px]" />
        ))}
      </div>
    );
  }
  if (data.setupNeeded || !data.periods.length || !Object.keys(data.days).length) return <Empty>{L(S.noTimetable)}</Empty>;

  const today = data.todayDay;
  const shown = day ?? (today >= 1 && today <= 6 ? today : 1);
  // Dates of this school week (on Sunday, the coming week).
  const monday = today === 0 ? addDays(data.today, 1) : addDays(data.today, -(today - 1));
  const cells = data.days[shown] || {};
  const lastUsed = data.periods.reduce((last, p, i) => (cells[p.id] ? i : last), -1);
  const rows = data.periods.slice(0, lastUsed + 1);

  return (
    <div className="space-y-4">
      {/* The six school days: the chosen one filled, today's date in navy. */}
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
              className={clsx("flex h-[52px] flex-col items-center justify-center rounded-[10px] border text-[11.5px] leading-tight transition-colors", on ? "border-[#0D2A5E] bg-[#0D2A5E] text-white/80" : "border-[#DCE4ED] bg-white text-ink-500")}
            >
              {d}
              <span className={clsx("tnum mt-0.5 text-[16px]", on ? "font-semibold text-white" : n === today ? "font-semibold text-[#0D2A5E]" : "font-medium text-ink-900")}>{+addDays(monday, i).slice(8)}</span>
            </button>
          );
        })}
      </div>

      {rows.length === 0 ? (
        <Empty>{L(S.noLessons)}</Empty>
      ) : (
        <section key={shown} className="study-in">
          <h2 className="text-[16px] font-semibold text-ink-900">
            {DAYS_FULL[lang][shown - 1]}
            {shown === today && <span className="ml-2 text-[13px] font-normal text-ink-500">{L({ hi: "आज", en: "Today" })}</span>}
          </h2>
          {/* A ruled list: when, what, who. The period on now has a navy edge and says so. */}
          <ol className="mt-2 divide-y divide-[#DCE4ED] border-y border-[#DCE4ED]">
            {rows.map((p) => {
              const c = cells[p.id];
              const live = shown === today && p.start <= now && now < p.end;
              const quiet = p.isBreak || !c;
              return (
                <li key={p.id} className={clsx("relative flex items-center gap-3 py-2.5", quiet ? "min-h-[44px]" : "min-h-[56px]")}>
                  {live && <span aria-hidden className="absolute -left-4 bottom-2 top-2 w-[3px] rounded-r-full bg-[#0D2A5E]" />}
                  <span className="tnum w-[96px] shrink-0 text-[13px] leading-5 text-ink-500">
                    {clock(p.start)} – {clock(p.end)}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className={clsx("block text-[15px] leading-5", quiet ? "text-ink-500" : "font-medium text-ink-900")}>{p.isBreak ? p.label : c ? c.subject : L(S.empty)}</span>
                    {c?.teacher && !p.isBreak && <span className="mt-0.5 block text-[12.5px] leading-[18px] text-ink-500">{c.teacher}</span>}
                  </span>
                  {live && <span className="shrink-0 rounded-full bg-[#0D2A5E] px-2 py-[2px] text-[11px] font-semibold text-white">{L(S.now)}</span>}
                </li>
              );
            })}
          </ol>
        </section>
      )}
    </div>
  );
}
