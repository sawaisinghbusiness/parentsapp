"use client";

import { useEffect, useRef, useState } from "react";
import clsx from "clsx";
import { useApi } from "@/lib/api";
import { useParent } from "@/lib/parent";
import { useL, useT, type Bi, type Lang } from "@/lib/i18n";
import { clock } from "@/lib/format";
import type { EventRow } from "@/lib/events";
import { EventRow as EventLine } from "@/components/EventRow";
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
      {/* Two tabs as one pill, the teal part sliding to the chosen one. */}
      <div className="relative grid grid-cols-2 rounded-full bg-[#E8F3F5] p-1 ring-1 ring-[#CFE6EA]" role="tablist" aria-label={L({ hi: "कैलेंडर", en: "Calendar" })}>
        <span aria-hidden className="slide-pill absolute bottom-1 left-1 top-1 w-[calc(50%-4px)] rounded-full bg-[#177386] shadow-[0_2px_8px_rgba(23,115,134,.25)]" style={{ transform: tab === "timetable" ? "translateX(100%)" : "none" }} />
        {(["attendance", "timetable"] as const).map((k) => (
          <button key={k} role="tab" aria-selected={tab === k} onClick={() => setTab(k)} className={clsx("relative h-10 rounded-full text-[14.5px] transition-colors duration-300", tab === k ? "font-semibold text-white" : "font-medium text-ink-600")}>
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
const shift = (m: string, by: number) => new Date(Date.UTC(+m.slice(0, 4), +m.slice(5, 7) - 1 + by, 1)).toISOString().slice(0, 7);
const dayLine = (iso: string, lang: Lang) => new Date(iso + "T00:00:00").toLocaleDateString(lang === "hi" ? "hi-IN" : "en-IN", { weekday: "short", day: "numeric", month: "short" });
const loc = (lang: Lang) => (lang === "hi" ? "hi-IN" : "en-IN");
const MONTHS_EN = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const monthShort = (m: string, lang: Lang) => (lang === "en" ? MONTHS_EN[+m.slice(5, 7) - 1] : new Date(m + "-01T00:00:00").toLocaleDateString(loc(lang), { month: "short" }));
const weekday = (iso: string, lang: Lang) => new Date(iso + "T00:00:00").toLocaleDateString(loc(lang), { weekday: "short" });

/** How one day reads in the list: the dot on the line and the coloured word. */
type Day = MonthData["days"][number];
function dayLook(d: Day, today: string, L: (b: Bi) => string): { dot: string; text: string; word: string; note?: string } {
  if (d.mark === "P") return { dot: "bg-jade-600", text: "text-jade-700", word: L(NAME.P) };
  if (d.mark === "A") return { dot: "bg-rose-600", text: "text-rose-600", word: L(NAME.A) };
  if (d.mark === "L" || d.mark === "H") return { dot: "bg-marigold-500", text: "text-marigold-700", word: L(NAME[d.mark]) };
  if (d.holiday && !d.sunday) return { dot: "bg-[#F5B800]", text: "text-marigold-600", word: L({ hi: "छुट्टी", en: "Holiday" }), note: d.holiday };
  if (d.sunday) return { dot: "bg-ink-200", text: "text-ink-400", word: L({ hi: "रविवार", en: "Sunday" }) };
  if (d.date === today) return { dot: "bg-white ring-2 ring-inset ring-ink-300", text: "text-ink-500", word: L({ hi: "अभी हाज़िरी नहीं लगी", en: "Not marked yet" }) };
  return { dot: "bg-ink-200", text: "text-ink-400", word: L({ hi: "दर्ज नहीं", en: "Not marked" }) };
}

function Attendance({ studentId }: { studentId: string }) {
  const L = useL();
  const { lang } = useT();
  const [month, setMonth] = useState("");
  const { data, error, reload } = useApi<MonthData>(`/attendance?student=${studentId}${month ? `&month=${month}` : ""}`);
  const shown = data && (!month || data.month === month) ? data : undefined;
  const strip = useRef<HTMLDivElement>(null);
  // The session's first month and today, kept while another month loads so the strip doesn't flash.
  const kept = useRef<{ firstMonth: string; today: string } | null>(null);
  if (data) kept.current = { firstMonth: data.firstMonth, today: data.today };
  const base = kept.current;

  const current = shown?.month || month;
  const thisMonth = base?.today.slice(0, 7) || "";
  // The whole session year (12 months from its first), so later months show where the year is going.
  const months = base ? Array.from({ length: 12 }, (_, i) => shift(base.firstMonth, i)) : [];

  // The page itself doesn't scroll here: the months, the day list and the next event fill the
  // screen down to the tab bar, and only the day list moves. So the top bar and tabs never shift.
  const frame = useRef<HTMLDivElement>(null);
  const list = useRef<HTMLElement>(null);
  const [frameH, setFrameH] = useState<number>();
  useEffect(() => {
    window.scrollTo(0, 0);
    const root = document.documentElement;
    const was = [root.style.overflow, document.body.style.overflow];
    root.style.overflow = "hidden";
    document.body.style.overflow = "hidden";
    // The shell leaves room under every page for the tab bar; here the frame already stops above it,
    // and that extra room would make the page a little taller than the screen.
    const main = document.querySelector("main");
    const pad = main?.style.paddingBottom ?? "";
    if (main) main.style.paddingBottom = "0";
    const fit = () => {
      const el = frame.current;
      if (!el) return;
      const nav = document.querySelector('nav[aria-label="Main"]');
      const bottom = nav ? nav.getBoundingClientRect().top : window.innerHeight;
      setFrameH(Math.max(300, Math.floor(bottom - el.getBoundingClientRect().top - 10)));
    };
    fit();
    window.addEventListener("resize", fit);
    return () => {
      window.removeEventListener("resize", fit);
      [root.style.overflow, document.body.style.overflow] = was;
      if (main) main.style.paddingBottom = pad;
    };
  }, []);
  // This month opens at today (the bottom of the list); an earlier month opens at its 1st.
  const shownMonth = shown?.month;
  useEffect(() => {
    const el = list.current;
    if (!el || !shownMonth || !base) return;
    el.scrollTop = shownMonth === base.today.slice(0, 7) ? el.scrollHeight : 0;
  }, [shownMonth, base]);

  // Keep the chosen month in the middle of the strip.
  useEffect(() => {
    const box = strip.current;
    const el = box?.querySelector<HTMLElement>('[aria-selected="true"]');
    if (box && el) box.scrollTo({ left: el.offsetLeft - (box.clientWidth - el.clientWidth) / 2, behavior: "smooth" });
  }, [current, months.length]);

  if (!shown && !base && error && error.status !== 401) return <ErrorCard offline={error.status === 0} onRetry={reload} />;

  // Day 1 down to today (or the month's last day for a past month); future days aren't listed.
  const days = shown ? shown.days.filter((d) => d.date <= shown.today) : [];

  return (
    <div ref={frame} style={{ height: frameH }} className="flex flex-col gap-3">
      {/* Months of the session, sideways. Months still to come are shown but can't be opened. */}
      <div ref={strip} className="no-scrollbar relative -mx-4 -my-1.5 flex shrink-0 snap-x gap-2 overflow-x-auto scroll-px-4 px-4 pb-2 pt-1.5" role="tablist" aria-label={L({ hi: "महीना", en: "Month" })}>
        {!base
          ? Array.from({ length: 5 }, (_, i) => <Skeleton key={i} className="h-[50px] w-[74px] shrink-0 rounded-[7px]" />)
          : months.map((m) => {
              const on = m === current;
              const later = m > thisMonth;
              return (
                <button
                  key={m}
                  role="tab"
                  aria-selected={on}
                  disabled={later}
                  onClick={() => setMonth(m)}
                  className={clsx(
                    "relative flex h-[50px] w-[74px] shrink-0 snap-center flex-col items-center justify-center rounded-[7px] border border-ink-100 bg-white transition-colors",
                    later ? "text-ink-300" : "text-ink-900 active:bg-ink-50"
                  )}
                >
                  <span className={clsx("text-[14.5px] leading-tight", on ? "font-bold" : "font-semibold")}>{monthShort(m, lang)}</span>
                  <span className={clsx("tnum text-[11px] leading-tight", later ? "text-ink-300" : "text-ink-400")}>{m.slice(0, 4)}</span>
                  {/* The month on screen: a small red dot under its card. */}
                  {on && <span aria-hidden className="absolute -bottom-[5px] left-1/2 h-[6px] w-[6px] -translate-x-1/2 rounded-full bg-rose-600" />}
                </button>
              );
            })}
      </div>

      {/* The month as a list of days on one line: date, a dot in the day's colour, and what it was. */}
      <section ref={list} className="no-scrollbar min-h-0 flex-1 overflow-y-auto overscroll-contain rounded-2xl border border-ink-100 bg-white px-3.5 py-1.5 shadow-[0_1px_2px_rgba(15,23,42,.04)]">
        {!shown ? (
          <div className="space-y-4 py-3">
            {Array.from({ length: 6 }, (_, i) => (
              <div key={i} className="flex items-center gap-4">
                <Skeleton className="h-9 w-10" />
                <Skeleton className="h-4 w-32" />
              </div>
            ))}
          </div>
        ) : days.length === 0 ? (
          <p className="py-6 text-center text-[14px] text-ink-500">{L({ hi: "इस महीने अभी कुछ नहीं", en: "Nothing for this month yet" })}</p>
        ) : (
          <ol>
            {days.map((d, i) => {
              const k = dayLook(d, shown.today, L);
              const isToday = d.date === shown.today;
              const quiet = d.sunday && !d.mark;
              return (
                <li key={d.date} className={clsx("grid grid-cols-[38px_20px_1fr] items-center gap-x-2", quiet ? "min-h-[36px]" : "min-h-[48px]")}>
                  <span className={clsx("text-center leading-tight", quiet && "opacity-60")}>
                    <b className={clsx("tnum block font-semibold", quiet ? "text-[13.5px] text-ink-500" : "text-[16.5px] text-ink-900")}>{+d.date.slice(8)}</b>
                    <span className="block text-[11px] text-ink-400">{weekday(d.date, lang)}</span>
                  </span>
                  {/* The line runs through every row; it stops at the first and last day. */}
                  <span className="relative h-full" aria-hidden>
                    <span className={clsx("absolute left-1/2 w-0.5 -translate-x-1/2 bg-ink-100", i === 0 ? "top-1/2" : "top-0", i === days.length - 1 ? "bottom-1/2" : "bottom-0")} />
                    <span className={clsx("absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full ring-4 ring-white", quiet ? "h-1.5 w-1.5" : "h-2.5 w-2.5", k.dot)} />
                  </span>
                  <span className="min-w-0">
                    <span className={clsx("block truncate font-semibold", quiet ? "text-[13px]" : "text-[14.5px]", k.text)}>{k.word}</span>
                    {(k.note || isToday) && <span className="block truncate text-[12px] text-ink-500">{isToday ? L({ hi: "आज", en: "Today" }) : k.note}</span>}
                  </span>
                </li>
              );
            })}
          </ol>
        )}
      </section>

      <NextEvent today={shown?.today} />
    </div>
  );
}

/** The next school event as one plain row (date box, name, when), under the day list. */
function NextEvent({ today }: { today?: string }) {
  const { data } = useApi<{ events: EventRow[] }>("/events");
  const day = today || new Date().toISOString().slice(0, 10);
  const next = (data?.events || []).filter((e) => e.date >= day).sort((a, b) => a.date.localeCompare(b.date))[0];
  if (!next) return null;
  return (
    <div className="shrink-0 overflow-hidden rounded-2xl border border-ink-100 bg-white shadow-[0_1px_2px_rgba(15,23,42,.04)]">
      <EventLine id={next.id} title={next.title} date={next.date} today={day} coverUrl={next.coverUrl} scene={next.scene} />
    </div>
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
