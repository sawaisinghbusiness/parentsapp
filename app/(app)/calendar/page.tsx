"use client";

import { useEffect, useState } from "react";
import clsx from "clsx";
import Link from "next/link";
import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";
import { useApi } from "@/lib/api";
import { useParent } from "@/lib/parent";
import { useL, useT, type Lang } from "@/lib/i18n";
import { clock, monthYear, num } from "@/lib/format";
import type { EventRow } from "@/lib/events";
import { EventPicture } from "@/components/art";
import { DAYS, DAYS_FULL, S } from "@/lib/text/study";
import { Empty, ErrorCard, Skeleton } from "@/components/ui";

type Tab = "attendance" | "timetable";

/** Calendar tab: the month's attendance as dots, and the class timetable as a day timeline. */
export default function CalendarPage() {
  const { child } = useParent();
  const L = useL();
  const [tab, setTab] = useState<Tab>("attendance");
  useEffect(() => {
    if (new URLSearchParams(window.location.search).get("tab") === "timetable") setTab("timetable");
  }, []);

  return (
    <div className="animate-rise space-y-4">
      {/* Two tabs as one pill, the blue part sliding to the chosen one. */}
      <div className="relative grid grid-cols-2 rounded-full bg-brand-50 p-1 ring-1 ring-brand-100" role="tablist" aria-label={L({ hi: "कैलेंडर", en: "Calendar" })}>
        <span aria-hidden className="slide-pill absolute bottom-1 left-1 top-1 w-[calc(50%-4px)] rounded-full bg-brand-700 shadow-[0_2px_8px_rgba(20,70,160,.25)]" style={{ transform: tab === "timetable" ? "translateX(100%)" : "none" }} />
        {(["attendance", "timetable"] as const).map((k) => (
          <button key={k} role="tab" aria-selected={tab === k} onClick={() => setTab(k)} className={clsx("relative h-11 rounded-full text-[15px] transition-colors duration-300", tab === k ? "font-semibold text-white" : "font-medium text-ink-600")}>
            {k === "attendance" ? L({ hi: "हाज़िरी", en: "Attendance" }) : L({ hi: "टाइम टेबल", en: "Time Table" })}
          </button>
        ))}
      </div>
      {!child ? <Skeleton className="h-72 w-full rounded-3xl" /> : tab === "attendance" ? <Attendance key={child.id} studentId={child.id} /> : <Timetable key={child.id} studentId={child.id} />}
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
  L: { hi: "छुट्टी पर", en: "On leave" },
  H: { hi: "आधा दिन", en: "Half day" },
};
const WEEK = { hi: ["सो", "मं", "बु", "गु", "शु", "श", "र"], en: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] };

const shift = (m: string, by: number) => new Date(Date.UTC(+m.slice(0, 4), +m.slice(5, 7) - 1 + by, 1)).toISOString().slice(0, 7);
const dayLine = (iso: string, lang: Lang) => new Date(iso + "T00:00:00").toLocaleDateString(lang === "hi" ? "hi-IN" : "en-IN", { weekday: "short", day: "numeric", month: "short" });

function Attendance({ studentId }: { studentId: string }) {
  const L = useL();
  const { lang } = useT();
  const [month, setMonth] = useState("");
  const { data, error, reload } = useApi<MonthData>(`/attendance?student=${studentId}${month ? `&month=${month}` : ""}`);
  const shown = data && (!month || data.month === month) ? data : undefined;

  if (!shown && error && error.status !== 401) return <ErrorCard offline={error.status === 0} onRetry={reload} />;

  const current = shown?.month || month;
  const canPrev = !!shown && current > shown.firstMonth;
  const canNext = !!shown && current < shown.today.slice(0, 7);
  const t = shown?.totals;
  // Monday-first grid: Sunday (0) goes to the end.
  const lead = shown ? (new Date(shown.days[0].date + "T00:00:00").getDay() + 6) % 7 : 0;
  const holidays = shown ? shown.days.filter((d) => d.holiday && !d.sunday) : [];

  return (
    <div className="space-y-3.5">
      <section className="rounded-[20px] border border-ink-100 bg-white px-3 pb-3 pt-2.5 shadow-[0_1px_2px_rgba(15,23,42,.04)]">
        <div className="flex items-center justify-between">
          <button onClick={() => setMonth(shift(current, -1))} disabled={!canPrev} aria-label={L({ hi: "पिछला महीना", en: "Previous month" })} className="grid h-11 w-11 place-items-center rounded-full text-ink-900 active:bg-ink-100 disabled:opacity-25">
            <ChevronLeft className="h-6 w-6" aria-hidden />
          </button>
          <p className="text-[21px] font-extrabold tracking-[-0.01em] text-ink-950">{current ? monthYear(current, lang) : " "}</p>
          <button onClick={() => setMonth(shift(current, 1))} disabled={!canNext} aria-label={L({ hi: "अगला महीना", en: "Next month" })} className="grid h-11 w-11 place-items-center rounded-full text-ink-900 active:bg-ink-100 disabled:opacity-25">
            <ChevronRight className="h-6 w-6" aria-hidden />
          </button>
        </div>
        <div className="mt-1 grid grid-cols-7 text-center">
          {WEEK[lang].map((w) => (
            <span key={w} className="pb-2 pt-1 text-[13px] text-ink-400">
              {w}
            </span>
          ))}
          {!shown
            ? Array.from({ length: 35 }, (_, i) => (
                <span key={i} className="grid h-12 place-items-center">
                  <Skeleton className="h-9 w-9 rounded-full bg-ink-200/60" />
                </span>
              ))
            : [
                ...Array.from({ length: lead }, (_, i) => <span key={`b${i}`} />),
                ...shown.days.map((d) => {
                  const isToday = d.date === shown.today;
                  const hol = !!d.holiday && !d.sunday;
                  const dim = d.date > shown.today || d.sunday;
                  // Each day says what it was by its circle: blue present, red absent, amber leave / half day, grey holiday.
                  const look = isToday
                    ? "bg-brand-700 font-bold text-white shadow-[0_4px_12px_rgba(20,70,160,.3)]"
                    : d.mark === "P"
                      ? "bg-brand-50 font-semibold text-brand-800"
                      : d.mark === "A"
                        ? "bg-rose-50 font-semibold text-rose-600"
                        : d.mark === "L" || d.mark === "H"
                          ? "bg-marigold-50 font-semibold text-marigold-700"
                          : hol
                            ? "bg-ink-100 font-medium text-ink-600"
                            : dim
                              ? "text-ink-300"
                              : "text-ink-900";
                  return (
                    <span key={d.date} className="grid h-12 place-items-center" aria-label={`${dayLine(d.date, lang)}${d.mark ? `: ${L(NAME[d.mark])}` : d.holiday ? `: ${d.holiday}` : ""}`}>
                      <span className={clsx("tnum grid h-10 w-10 place-items-center rounded-full text-[16px] transition-colors", look)}>{+d.date.slice(8)}</span>
                    </span>
                  );
                }),
              ]}
        </div>
      </section>

      {t && shown && (
        <>
          <div className="grid grid-cols-3 gap-2.5">
            {[
              [L({ hi: "उपस्थित", en: "Present" }), t.present + t.half / 2, "text-jade-600"],
              [L({ hi: "अनुपस्थित", en: "Absent" }), t.absent, "text-rose-600"],
              [L({ hi: "छुट्टियाँ", en: "Holidays" }), holidays.length, "text-brand-700"],
            ].map(([k, v, color]) => (
              <div key={k as string} className="rounded-2xl border border-ink-100 bg-white px-3.5 py-3 shadow-[0_1px_2px_rgba(15,23,42,.04)]">
                <p className="text-[14px] text-ink-500">{k as string}</p>
                <p className={clsx("tnum mt-0.5 text-[32px] font-extrabold leading-none", color as string)}>{num(v as number)}</p>
              </div>
            ))}
          </div>

          {t.workingDays > 0 && (
            <p className="px-0.5 text-[13px] text-ink-500">
              {L({ hi: "इस महीने", en: "This month" })} <b className="tnum font-semibold text-ink-900">{t.percent === null ? "—" : `${num(t.percent)}%`}</b>
              {shown.session.percent !== null && (
                <>
                  {" · "}
                  {L({ hi: "सत्र में अब तक", en: "session so far" })} <b className="tnum font-semibold text-ink-900">{num(shown.session.percent)}%</b>
                </>
              )}
            </p>
          )}
        </>
      )}

      <NextEvent today={shown?.today} />
    </div>
  );
}

/** The next school event as a photo banner: date, how many days to go, and the name. */
function NextEvent({ today }: { today?: string }) {
  const L = useL();
  const { lang } = useT();
  const { data } = useApi<{ events: EventRow[] }>("/events");
  const day = today || new Date().toISOString().slice(0, 10);
  const next = (data?.events || []).filter((e) => e.date >= day).sort((a, b) => a.date.localeCompare(b.date))[0];
  if (!next) return null;
  const n = Math.round((Date.parse(next.date + "T00:00:00Z") - Date.parse(day + "T00:00:00Z")) / 864e5);
  return (
    <Link href={`/events/album/?id=${encodeURIComponent(next.id)}`} className="relative block overflow-hidden rounded-[20px] active:opacity-90">
      <EventPicture url={next.coverUrl} scene={next.scene} alt="" className="!aspect-[16/7]" />
      <span aria-hidden className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
      <span className="absolute inset-x-4 bottom-3 text-white">
        <span className="line-clamp-1 block text-[19px] font-bold">{next.title}</span>
        <span className="mt-0.5 flex items-center gap-1.5 text-[13px] text-white/90">
          <CalendarDays className="h-3.5 w-3.5" aria-hidden />
          {dayLine(next.date, lang)} · {n <= 0 ? L({ hi: "आज", en: "Today" }) : n === 1 ? L({ hi: "कल", en: "Tomorrow" }) : L({ hi: `${n} दिन में`, en: `In ${n} days` })}
        </span>
      </span>
    </Link>
  );
}

/* ───────────── Time Table ───────────── */

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
        <Skeleton className="h-14 w-full rounded-xl" />
        {[0, 1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-12 w-full rounded-xl" />
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
              className={clsx("flex min-h-[54px] flex-col items-center justify-center rounded-xl text-[11.5px] leading-tight", on ? "bg-brand-600 text-brand-100" : "bg-ink-50 text-ink-500")}
            >
              {d}
              <b className={clsx("tnum text-[16px]", on ? "text-white" : n === today ? "text-brand-600" : "text-ink-900")}>{+addDays(monday, i).slice(8)}</b>
            </button>
          );
        })}
      </div>

      {rows.length === 0 ? (
        <Empty>{L(S.noLessons)}</Empty>
      ) : (
        <ol aria-label={DAYS_FULL[lang][shown - 1]}>
          {rows.map((p) => {
            const c = cells[p.id];
            const live = shown === today && p.start <= now && now < p.end;
            const quiet = p.isBreak || !c;
            return (
              <li key={p.id} className="grid grid-cols-[46px_14px_1fr] gap-x-1.5">
                <span className="tnum pt-3.5 text-[13px] text-ink-500">{clock(p.start)}</span>
                <span className="relative" aria-hidden>
                  <span className="absolute inset-y-0 left-[6px] w-0.5 bg-brand-100" />
                  <span className={clsx("absolute left-[2px] top-[18px] h-2.5 w-2.5 rounded-full ring-2 ring-white", quiet ? "bg-ink-300" : "bg-brand-600")} />
                </span>
                <div
                  className={clsx(
                    "my-1 rounded-xl border px-3 py-2.5 text-[15px]",
                    p.isBreak ? "border-dashed border-ink-200 bg-ink-50 font-medium text-ink-400" : live ? "border-brand-600 bg-brand-50 font-semibold" : c ? "border-ink-100 font-semibold" : "border-ink-100 font-medium text-ink-400"
                  )}
                >
                  {p.isBreak ? p.label : c ? c.subject : L(S.empty)}
                  {c?.teacher && <span className="ml-1.5 text-[13px] font-normal text-ink-500">{c.teacher}</span>}
                  {live && <span className="ml-1.5 text-[11px] font-bold uppercase text-brand-600">{L(S.now)}</span>}
                </div>
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}
