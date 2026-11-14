"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import clsx from "clsx";
import Link from "next/link";
import { ChevronDown, ChevronRight, Info, Minus, Pause, Play, Plus, Square } from "lucide-react";
import { useApi } from "@/lib/api";
import { useParent } from "@/lib/parent";
import { useL, useT } from "@/lib/i18n";
import { DurationRuler, useDurationScrub } from "./DurationRuler";
import { Fireworks } from "@/components/Fireworks";
import "./study.css";

/**
 * Study: the child picks a subject and studies with a timer, either one block of time or Pomodoro
 * (25 min focus, 5 min break, 4 rounds). Sessions are kept on this phone only (per child): today's
 * total, the week as bars with the weekly report, and today's sessions. The timer runs from a saved end time, so it stays
 * right if the screen turns off or the app is closed. Finishing a whole block sets off fireworks.
 *
 * Look, 2026-11-14 (second pass, after the user found the first one generic): the two tabs are two different
 * screens. Timer is a clock-face dial of 60 ticks with the length chooser, homework to do and the week.
 * Pomodoro is the same dial with the four rounds as four steps under it, one sentence of how it runs, and
 * today's rounds (the strip and the "how it runs" table of the first try confused the user, 2026-11-14).
 * Nothing sits in a card: the time is the one large thing, the rest are plain ruled lists on the canvas.
 * Burnt orange actions with ink text, weights 400 to 500 with 600 for headings only. A tab's screen slides in from its
 * own side; the sections under it rise in once. The normal header comes from AppShell.
 */

interface Session {
  subject: string;
  minutes: number;
  /** When it ended, ISO. */
  at: string;
  /** Which tab it was studied on (sessions saved before 2026-11-14 have none: they count as the timer). */
  mode?: Mode;
}
type Mode = "timer" | "pomodoro";
interface Running {
  subject: string;
  mode: Mode;
  /** Pomodoro only: studying or on a break, and which round (1-4). */
  phase: "focus" | "break";
  round: number;
  /** This block's length, in seconds. */
  total: number;
  /** While running: when it ends (ms). While paused: null. */
  endsAt: number | null;
  /** While paused: seconds left. */
  left: number;
}

const PRESETS = [15, 25, 45, 60];
const POMO = { focus: 25, rest: 5, rounds: 4 };
const FALLBACK = ["Maths", "English", "Hindi", "Science", "Social Science"];
const key = (child: string, what: "log" | "run") => `pa:study:${what}:${child}`;
const load = <T,>(k: string, d: T): T => {
  try {
    const raw = localStorage.getItem(k);
    return raw ? (JSON.parse(raw) as T) : d;
  } catch {
    return d;
  }
};
const save = (k: string, v: unknown) => {
  try {
    if (v === null) localStorage.removeItem(k);
    else localStorage.setItem(k, JSON.stringify(v));
  } catch {
    /* storage blocked: the timer still works, it just isn't remembered */
  }
};
const dayKey = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const mmss = (s: number) => `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(Math.floor(s % 60)).padStart(2, "0")}`;
const hm = (min: number, hi: boolean) => {
  const h = Math.floor(min / 60);
  const m = Math.round(min % 60);
  if (hi) return h ? `${h} घंटे ${m} मिनट` : `${m} मिनट`;
  return h ? `${h} h ${m} min` : `${m} min`;
};

/** Completion stays silent; supported phones can give a brief vibration. */
function notifyCompletion() {
  try { navigator.vibrate?.([120, 60, 120]); } catch { /* Optional vibration. */ }
}

interface HomeworkItem {
  id: string;
  subject: string;
  title: string;
  dueDate: string | null;
  status?: "pending" | "checked" | "not_submitted" | null;
}

export function StudyScreen() {
  const { child } = useParent();
  const L = useL();
  const { lang } = useT();
  const hi = lang === "hi";
  const id = child?.id || "";

  // The child's own subjects from the timetable; a common list until it loads or if there is none.
  const { data: tt } = useApi<{ days: Record<string, Record<string, { subject: string }>> }>(id ? `/timetable?student=${id}` : null);
  const subjects = useMemo(() => {
    const set = new Set<string>();
    Object.values(tt?.days || {}).forEach((d) => Object.values(d).forEach((c) => c?.subject && set.add(c.subject)));
    return set.size ? [...set] : FALLBACK;
  }, [tt]);

  // Homework still to do, so the child can see what to study without leaving the timer.
  const { data: hw } = useApi<{ items: HomeworkItem[] }>(id ? `/homework?student=${id}` : null);
  const toDo = (hw?.items || []).filter((h) => h.status !== "checked").slice(0, 3);

  const [mode, setMode] = useState<Mode>("timer");
  const [subject, setSubject] = useState("");
  // Steps of 5 minutes; one more "−" below 5 gives 1 minute (handy for a quick try or a demo).
  const [minutes, setMinutes] = useState(25);
  const [run, setRun] = useState<Running | null>(null);
  const [log, setLog] = useState<Session[]>([]);
  const [now, setNow] = useState(Date.now());
  const [done, setDone] = useState<Session | null>(null);
  // Fireworks only when a whole block of study was finished (not when stopped early, not after a break).
  const [party, setParty] = useState(false);
  const wake = useRef<any>(null);

  // This child's saved sessions and any timer that was running.
  useEffect(() => {
    if (!id) return;
    setLog(load<Session[]>(key(id, "log"), []));
    // A timer saved before Pomodoro existed has no mode / phase / round: it was a plain timer.
    const r = load<Partial<Running> | null>(key(id, "run"), null);
    setRun(r ? ({ mode: "timer", phase: "focus", round: 1, ...r } as Running) : null);
    if (r?.mode) setMode(r.mode);
  }, [id]);
  useEffect(() => {
    if (!subject && subjects.length) setSubject(subjects[0]);
  }, [subjects, subject]);

  const left = run ? (run.endsAt ? Math.max(0, (run.endsAt - now) / 1000) : run.left) : (mode === "pomodoro" ? POMO.focus : minutes) * 60;

  const record = useCallback(
    (subj: string, secs: number, how: Mode) => {
      const s: Session = { subject: subj, minutes: Math.round(secs / 60), at: new Date().toISOString(), mode: how };
      if (s.minutes < 1) return null;
      const next = [s, ...load<Session[]>(key(id, "log"), [])].slice(0, 400);
      setLog(next);
      save(key(id, "log"), next);
      return s;
    },
    [id]
  );

  const setRunning = (r: Running | null) => {
    setRun(r);
    if (id) save(key(id, "run"), r);
  };
  const block = (r: Omit<Running, "endsAt" | "left" | "total">, mins: number): Running => ({ ...r, total: mins * 60, left: mins * 60, endsAt: Date.now() + mins * 60 * 1000 });

  // Tick while running.
  useEffect(() => {
    if (!run?.endsAt) return;
    const t = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(t);
  }, [run?.endsAt]);

  // A block has run out: record it, celebrate a finished study block, and in Pomodoro go on to the next part.
  useEffect(() => {
    if (!run?.endsAt || now < run.endsAt) return;
    notifyCompletion();
    if (run.phase === "focus") {
      setDone(record(run.subject, run.total, run.mode));
      setParty(true);
      if (run.mode === "pomodoro" && run.round < POMO.rounds) setRunning(block({ ...run, phase: "break" }, POMO.rest));
      else setRunning(null);
    } else {
      setRunning(block({ ...run, phase: "focus", round: run.round + 1 }, POMO.focus));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [now, run]);

  // Keep the screen on while the timer runs (where the phone allows it).
  useEffect(() => {
    if (!run?.endsAt) return;
    let live = true;
    (navigator as any).wakeLock
      ?.request("screen")
      .then((w: any) => (live ? (wake.current = w) : w.release()))
      .catch(() => null);
    return () => {
      live = false;
      wake.current?.release?.().catch?.(() => null);
      wake.current = null;
    };
  }, [run?.endsAt]);

  const start = () => {
    setDone(null);
    setNow(Date.now());
    setRunning(block({ subject, mode, phase: "focus", round: 1 }, mode === "pomodoro" ? POMO.focus : minutes));
  };
  const pause = () => run?.endsAt && setRunning({ ...run, endsAt: null, left });
  const resume = () => {
    if (!run) return;
    setNow(Date.now());
    setRunning({ ...run, endsAt: Date.now() + run.left * 1000 });
  };
  const stop = () => {
    if (!run) return;
    setDone(run.phase === "focus" ? record(run.subject, run.total - left, run.mode) : null);
    setRunning(null);
  };

  // Today and the last 7 days.
  const today = dayKey(new Date());
  const todays = log.filter((s) => dayKey(new Date(s.at)) === today);
  const todayMin = todays.reduce((a, s) => a + s.minutes, 0);
  const week = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    const k = dayKey(d);
    return { k, label: d.toLocaleDateString(hi ? "hi-IN" : "en-IN", { weekday: "narrow" }), min: log.filter((s) => dayKey(new Date(s.at)) === k).reduce((a, s) => a + s.minutes, 0) };
  });
  const top = Math.max(30, ...week.map((w) => w.min));

  // Weekly report: the last 7 days against the 7 before, and time per subject.
  const since = (days: number) => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() - days);
    return d.getTime();
  };
  const thisWeek = log.filter((s) => new Date(s.at).getTime() >= since(6));
  const lastWeek = log.filter((s) => {
    const t = new Date(s.at).getTime();
    return t >= since(13) && t < since(6);
  });
  const weekMin = thisWeek.reduce((a, s) => a + s.minutes, 0);
  const lastMin = lastWeek.reduce((a, s) => a + s.minutes, 0);
  const daysStudied = week.filter((w) => w.min > 0).length;
  const bySubject = Object.entries(thisWeek.reduce<Record<string, number>>((m, s) => ((m[s.subject] = (m[s.subject] || 0) + s.minutes), m), {})).sort((a, b) => b[1] - a[1]);
  const topSubject = bySubject[0]?.[1] || 1;
  const change = lastMin ? Math.round(((weekMin - lastMin) / lastMin) * 100) : null;

  const total = run ? run.total : left;
  // A light track is the whole block; green fills over it as the time runs.
  const doneFrac = run ? 1 - left / total : 0;
  const busy = !!run;
  const onBreak = run?.phase === "break";
  const status = !run
    ? L({ hi: "शुरू करने के लिए तैयार", en: "Ready to start" })
    : !run.endsAt
      ? L({ hi: "रुका हुआ", en: "Paused" })
      : onBreak
        ? L({ hi: "ब्रेक: थोड़ा आराम करें", en: "Break: rest a little" })
        : L({ hi: "पढ़ाई चल रही है", en: "Studying" });

  // The subject: one quiet row of choices, no heading of its own.
  const subjectRow = (
    <div className="no-scrollbar -mx-4 flex gap-1.5 overflow-x-auto px-4" role="group" aria-label={L({ hi: "विषय", en: "Subject" })}>
      {subjects.map((s) => (
        <button key={s} type="button" disabled={busy} onClick={() => setSubject(s)} aria-pressed={(run ? run.subject : subject) === s} className={clsx("h-9 shrink-0 rounded-full border px-3.5 text-[14px] transition-colors disabled:opacity-50", (run ? run.subject : subject) === s ? "border-[#BE4D25] bg-white font-medium text-[#9B3C1B] disabled:opacity-100" : "border-[#E4DDD3] bg-white text-ink-800")}>
          {s}
        </button>
      ))}
    </div>
  );

  // What is on screen: the running block's own mode, else the chosen tab.
  const view: Mode = run ? run.mode : mode;
  const scrub = useDurationScrub(minutes, setMinutes, !run && view === "timer");
  const durationChoices = PRESETS.includes(minutes) ? PRESETS : [15, minutes, 45, 60];
  const round = run?.round || 1;
  const cycleSeconds = (POMO.focus + POMO.rest) * 60;
  const cycleElapsed = run?.mode === "pomodoro" ? (run.phase === "break" ? POMO.focus * 60 : 0) + Math.max(0, run.total - left) : 0;
  const roundProgress = Math.min(1, Math.max(0, (round - 1 + cycleElapsed / cycleSeconds) / (POMO.rounds - 1)));
  const pomoToday = todays.filter((s) => s.mode === "pomodoro");
  // The dial: 60 ticks like a clock face; they darken one by one as the block runs.
  const lit = Math.round(doneFrac * 60);
  const stagger = (i: number) => ({ animationDelay: `${i * 70}ms` });

  const controls = !run ? (
    <button type="button" onClick={start} disabled={!subject} className="study-pop mx-auto flex h-12 items-center justify-center gap-2.5 rounded-full bg-[#BE4D25] pl-6 pr-7 text-[16px] font-semibold text-white transition-transform active:scale-[0.97] active:bg-[#9D3A18] disabled:opacity-50">
      <Play className="h-6 w-6" fill="currentColor" aria-hidden />
      {view === "pomodoro" ? L({ hi: "पहला राउंड शुरू करें", en: "Start round 1" }) : L({ hi: "पढ़ाई शुरू करें", en: "Start studying" })}
    </button>
  ) : (
    <div className="grid w-full grid-cols-2 gap-2">
      {run.endsAt ? (
        <button type="button" onClick={pause} className="study-pop flex h-12 items-center justify-center gap-2 rounded-[12px] border border-[#E4DDD3] bg-white text-[15px] font-medium text-ink-900 active:bg-[#F0ECE5]">
          <Pause className="h-4 w-4" fill="currentColor" aria-hidden />
          {L({ hi: "रोकें", en: "Pause" })}
        </button>
      ) : (
        <button type="button" onClick={resume} className="study-pop flex h-12 items-center justify-center gap-2 rounded-[12px] bg-[#BE4D25] text-[15px] font-semibold text-white active:bg-[#9D3A18]">
          <Play className="h-4 w-4" fill="currentColor" aria-hidden />
          {L({ hi: "फिर शुरू", en: "Resume" })}
        </button>
      )}
      <button type="button" onClick={stop} style={{ animationDelay: "60ms" }} className="study-pop flex h-12 items-center justify-center gap-2 rounded-[12px] border border-[#E4DDD3] bg-white text-[15px] font-medium text-[#A32F35] active:bg-[#FCEEEF]">
        <Square className="h-3.5 w-3.5" fill="currentColor" aria-hidden />
        {L({ hi: "ख़त्म करें", en: "Finish" })}
      </button>
    </div>
  );

  const doneLine = done && (
    <p className="study-in text-center text-[13.5px] font-medium text-[#21613F]" role="status">
      {L({ hi: `${done.subject} · ${hm(done.minutes, true)} पढ़ाई पूरी`, en: `${done.subject} · ${hm(done.minutes, false)} studied` })}
    </p>
  );

  // The time: the same dial, in the same place, on both tabs.
  const dial = (
            <div className="study-dial relative h-[224px] w-[224px]">
              <svg viewBox="0 0 232 232" className="h-full w-full" aria-hidden>
                {Array.from({ length: 60 }, (_, i) => {
                  const five = i % 5 === 0;
                  return <line key={i} x1="116" y1={five ? 6 : 10} x2="116" y2="20" transform={`rotate(${i * 6} 116 116)`} stroke={i < lit ? (onBreak ? "#7C827A" : "#BE4D25") : (five ? "#66758A" : "#CED4DD")} strokeWidth={five ? 2.5 : 1.5} strokeLinecap="round" style={{ transition: "stroke .4s ease" }} />;
                })}
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                {view === "pomodoro" && (
                  <span className="mb-1 text-[13px] font-medium text-ink-600">
                    {onBreak ? L({ hi: "ब्रेक", en: "Break" }) : L({ hi: `राउंड ${round} / ${POMO.rounds}`, en: `Round ${round} of ${POMO.rounds}` })}
                  </span>
                )}
                <span data-swipe="duration" {...(!run && view === "timer" ? scrub.bindings : {})} onKeyDown={scrub.keyboard} tabIndex={!run && view === "timer" ? 0 : undefined} className={clsx("tnum select-none text-[52px] font-semibold leading-none tracking-tight text-ink-900", !run && view === "timer" && "cursor-ew-resize touch-none")} role={!run && view === "timer" ? "slider" : "timer"} aria-label={!run && view === "timer" ? L({"hi":"पढ़ाई के मिनट","en":"Study minutes"}) : undefined} aria-valuemin={!run && view === "timer" ? 1 : undefined} aria-valuemax={!run && view === "timer" ? 180 : undefined} aria-valuenow={!run && view === "timer" ? minutes : undefined} aria-valuetext={!run && view === "timer" ? `${minutes} min` : undefined} aria-live="off">
                  <span key={run ? "run" : `len-${minutes}`} className={clsx("inline-block", !run && "study-tick")}>{mmss(left)}</span>
                </span>
                <span className={clsx("mt-1.5 text-[13px]", run?.endsAt ? "font-medium text-[#21613F]" : "text-ink-500")}>{status}</span>
              </div>
            </div>
  );

  return (
    <div className="study space-y-5 pb-16 pt-1">
      {/* Timer or Pomodoro: two tabs as one pill, the white selection sliding to the chosen one (as on Calendar). */}
      <div className="relative grid grid-cols-2 rounded-full bg-[#F0ECE5] p-1 ring-1 ring-[#E4DDD3]" role="tablist" aria-label={L({ hi: "टाइमर का तरीका", en: "Timer type" })}>
        <span aria-hidden className="slide-pill absolute bottom-1 left-1 top-1 w-[calc(50%-4px)] rounded-full bg-[#24324B]" style={{ transform: view === "pomodoro" ? "translateX(100%)" : "none" }} />
        {(["timer", "pomodoro"] as const).map((m) => (
          <button key={m} type="button" role="tab" aria-selected={view === m} disabled={busy} onClick={() => setMode(m)} className={clsx("relative h-10 rounded-full text-[14.5px] transition-colors duration-300", view === m ? "font-semibold text-white" : "font-medium text-ink-600", busy && view !== m && "opacity-50")}>
            {m === "timer" ? L({ hi: "टाइमर", en: "Timer" }) : L({ hi: "पोमोडोरो", en: "Pomodoro" })}
          </button>
        ))}
      </div>

      {/* Each tab is its own screen; it slides in from its tab's side when chosen. */}
      {view === "timer" ? (
        <div key="timer" className="study-from-left space-y-8" role="tabpanel">
          <div className="space-y-4">
          {/* The dial: the one large thing on the page. No card around it. */}
          <section className="flex flex-col items-center">
            {dial}

            {/* Length, before starting: one row, the chosen length in words. */}
            {!run && (
              <div className="mt-4 flex w-full items-center gap-2">
                <button type="button" onClick={() => setMinutes((m) => (m > 5 ? m - 5 : 1))} aria-label={L({ hi: "5 मिनट कम", en: "5 minutes less" })} className="grid h-10 w-10 shrink-0 place-items-center rounded-[10px] border border-[#E4DDD3] bg-white text-ink-800 active:bg-[#F0ECE5]">
                  <Minus className="h-4 w-4" aria-hidden />
                </button>
                <div {...scrub.bindings} data-swipe="duration" data-duration-presets="true" className="relative grid flex-1 grid-cols-4 gap-1 rounded-[10px] bg-[#F0ECE5] p-[3px]">
                  {/* The white highlight under the chosen length; it slides when the length changes. */}
                  {!scrub.active && (
                    <span
                      aria-hidden
                      className="pointer-events-none absolute bottom-[3px] top-[3px] rounded-lg bg-white shadow-sm"
                      style={{ left: "3px", width: "calc((100% - 6px - 12px) / 4)", transform: `translateX(calc(${Math.max(0, durationChoices.indexOf(minutes))} * (100% + 4px)))`, transition: "transform .42s cubic-bezier(.2,.8,.2,1)" }}
                    />
                  )}
                  {scrub.active && <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10"><DurationRuler position={scrub.position} /></div>}
                  {durationChoices.map((m, index) => (
                    <button key={index} type="button" onKeyDown={minutes === m ? scrub.keyboard : undefined} onClick={() => { if (!scrub.consumeClick()) setMinutes(m); }} aria-pressed={minutes === m} aria-label={`${m} ${L({ hi: "मिनट", en: "minutes" })}`} className={clsx("tnum relative h-[34px] rounded-lg text-[13.5px] transition-colors duration-300", minutes === m && "touch-none select-none cursor-ew-resize", scrub.active && "opacity-0", minutes === m ? "font-semibold text-[#BE4D25]" : "font-medium text-ink-500")}>
                      <span key={minutes === m ? `on-${m}` : `off-${index}`} className={clsx("inline-block", minutes === m && "study-tick")}>{m}</span>
                    </button>
                  ))}
                </div>
                <button type="button" onClick={() => setMinutes((m) => (m < 5 ? 5 : Math.min(180, m + 5)))} aria-label={L({ hi: "5 मिनट ज़्यादा", en: "5 minutes more" })} className="grid h-10 w-10 shrink-0 place-items-center rounded-[10px] border border-[#E4DDD3] bg-white text-ink-800 active:bg-[#F0ECE5]">
                  <Plus className="h-4 w-4" aria-hidden />
                </button>
              </div>
            )}
          </section>

          {subjectRow}
          <div className="space-y-3">
            {controls}
            {doneLine}
          </div>
          </div>

          {/* Homework still to do: what to study, one tap from the timer. */}
          {toDo.length > 0 && (
            <section className="study-in" style={stagger(1)}>
              <div className="flex items-center justify-between">
                <h2 className="text-[16px] font-semibold text-ink-900">{L({ hi: "बाकी होमवर्क", en: "Homework to do" })}</h2>
                <Link href="/homework/" className="-my-2 flex min-h-[44px] items-center text-[13px] font-medium text-[#BE4D25]">
                  {L({ hi: "सब देखें", en: "View all" })}
                </Link>
              </div>
              <ul className="mt-1 divide-y divide-[#E4DDD3] border-y border-[#E4DDD3]">
                {toDo.map((h) => (
                  <li key={h.id}>
                    <Link href="/homework/" className="flex min-h-[52px] items-center gap-3 py-2">
                      <span className="w-[72px] shrink-0 truncate text-[12.5px] text-ink-500">{h.subject}</span>
                      <span className="min-w-0 flex-1 truncate text-[14.5px] font-medium text-ink-900">{h.title}</span>
                      <ChevronRight className="h-4 w-4 shrink-0 text-ink-400" aria-hidden />
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {/* This week: the seven days, then the totals, then today's sessions. */}
          <section className="study-in space-y-3" style={stagger(2)}>
            <div className="flex items-baseline justify-between">
              <h2 className="text-[16px] font-semibold text-ink-900">{L({ hi: "इस हफ़्ते", en: "This week" })}</h2>
              <span className="tnum text-[13px] text-ink-500">
                {L({ hi: "आज", en: "Today" })} <span className="font-medium text-ink-900">{hm(todayMin, hi)}</span>
              </span>
            </div>
            {weekMin === 0 ? (
              <p className="text-[13.5px] leading-5 text-ink-500">{L({ hi: "इस हफ़्ते अभी कोई पढ़ाई दर्ज नहीं है।", en: "No study sessions yet this week" })}</p>
            ) : (
              <>
                <div className="grid h-[74px] grid-cols-7 items-end gap-1.5">
                  {week.map((w) => (
                    <div key={w.k} className="flex h-full flex-col items-center justify-end gap-1.5" title={hm(w.min, hi)}>
                      <span className={clsx("block w-2.5 rounded-full", w.min === 0 ? "bg-[#E4DDD3]" : w.k === today ? "bg-[#BE4D25]" : "bg-[#B9C7DC]")} style={{ height: w.min === 0 ? 3 : `${Math.max(8, Math.round((w.min / top) * 100))}%` }} />
                      <span className={clsx("text-[11px]", w.k === today ? "font-semibold text-ink-900" : "text-ink-500")}>{w.label}</span>
                    </div>
                  ))}
                </div>
                <dl className="grid grid-cols-3 border-t border-[#E4DDD3] pt-3">
                  {[
                    [L({ hi: "कुल", en: "Total" }), hm(weekMin, hi)],
                    [L({ hi: "रोज़ औसत", en: "Daily average" }), hm(weekMin / 7, hi)],
                    [L({ hi: "दिन", en: "Days" }), `${daysStudied} / 7`],
                  ].map(([k, v], i) => (
                    <div key={k} className={clsx("min-w-0", i > 0 && "border-l border-[#E4DDD3] pl-3")}>
                      <dt className="text-[12px] text-ink-500">{k}</dt>
                      <dd className="tnum truncate text-[15px] font-medium text-ink-900">{v}</dd>
                    </div>
                  ))}
                </dl>
                {change !== null && (
                  <p className="text-[13px] text-ink-600">
                    {change >= 0 ? L({ hi: `पिछले हफ़्ते से ${change}% ज़्यादा`, en: `${change}% more than last week` }) : L({ hi: `पिछले हफ़्ते से ${-change}% कम`, en: `${-change}% less than last week` })}
                  </p>
                )}
                <ul className="space-y-2 border-t border-[#E4DDD3] pt-3">
                  {bySubject.map(([subj, min]) => (
                    <li key={subj}>
                      <div className="flex items-baseline justify-between text-[13px]">
                        <span className="font-medium text-ink-800">{subj}</span>
                        <span className="tnum text-ink-500">{hm(min, hi)}</span>
                      </div>
                      <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-[#F0ECE5]">
                        <div className="h-full rounded-full bg-[#BE4D25]" style={{ width: `${Math.max(4, Math.round((min / topSubject) * 100))}%` }} />
                      </div>
                    </li>
                  ))}
                </ul>
              </>
            )}
            {todays.length > 0 && (
              <ul className="divide-y divide-[#E4DDD3] border-t border-[#E4DDD3]">
                {todays.map((s) => (
                  <li key={s.at} className="flex items-center justify-between py-2.5 text-[13.5px]">
                    <span className="font-medium text-ink-800">{s.subject}</span>
                    <span className="tnum text-ink-500">
                      {hm(s.minutes, hi)} · {new Date(s.at).toLocaleTimeString(hi ? "hi-IN" : "en-IN", { hour: "numeric", minute: "2-digit" })}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      ) : (
        <div key="pomodoro" className="study-from-right space-y-8" role="tabpanel">
          <div className="space-y-4">
            <section className="flex flex-col items-center">

              <div className="relative mb-5 w-full pt-2" data-round-timeline>
                <div className="absolute left-[12.5%] right-[12.5%] top-[13px] h-[3px] overflow-hidden rounded-full bg-[#E4DDD3]" role="progressbar" aria-label="Pomodoro rounds" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(roundProgress * 100)}>
                  <div className="h-full bg-[#BE4D25]" style={{ width: (roundProgress * 100) + "%" }} />
                </div>
                <ol className="relative grid grid-cols-4">
                  {Array.from({ length: POMO.rounds }, (_, i) => <li key={i} aria-current={i + 1 === round ? "step" : undefined} className="flex flex-col items-center gap-2">
                    <span className={clsx("relative h-[13px] w-[13px] rounded-full border-2", i + 1 <= round ? "border-[#BE4D25] bg-[#BE4D25]" : "border-[#C7C5C1] bg-[#FFFCF7]")} />
                    <span className={clsx("text-[12px]", i + 1 === round ? "font-semibold text-[#9B3C1B]" : "text-ink-500")}>{L({ hi: "\u0930\u093e\u0909\u0902\u0921", en: "Round" })} {i + 1}</span>
                  </li>)}
                </ol>
              </div>
              {dial}


            </section>
            {subjectRow}
            <div className="space-y-3">
              {controls}
              {doneLine}
            </div>
          </div>

          {/* Today's finished rounds only: the week's totals live on the Timer tab. */}
          <section className="study-in" style={stagger(2)}>
            <div className="flex items-baseline justify-between">
              <h2 className="text-[16px] font-semibold text-ink-900">{L({ hi: "आज के राउंड", en: "Rounds today" })}</h2>
              <span className="tnum text-[13px] font-medium text-ink-900">{pomoToday.length}</span>
            </div>
            {pomoToday.length === 0 ? (
              <p className="mt-1 text-[13.5px] leading-5 text-ink-500">{L({ hi: "आज अभी कोई राउंड पूरा नहीं हुआ", en: "No rounds finished yet today" })}</p>
            ) : (
              <ul className="mt-1 divide-y divide-[#E4DDD3] border-y border-[#E4DDD3]">
                {pomoToday.map((s) => (
                  <li key={s.at} className="flex items-center justify-between py-2.5 text-[13.5px]">
                    <span className="font-medium text-ink-800">{s.subject}</span>
                    <span className="tnum text-ink-500">
                      {hm(s.minutes, hi)} · {new Date(s.at).toLocaleTimeString(hi ? "hi-IN" : "en-IN", { hour: "numeric", minute: "2-digit" })}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>
          <details className="group border-t border-[#E4DDD3]">
            <summary className="flex min-h-[44px] cursor-pointer list-none items-center gap-2 text-[13px] font-medium text-ink-600 [&::-webkit-details-marker]:hidden">
              <Info className="h-4 w-4" aria-hidden />
              <span className="flex-1">{L({"hi":"पोमोडोरो कैसे काम करता है","en":"How Pomodoro works"})}</span>
              <ChevronDown className="h-4 w-4 transition-transform group-open:rotate-180 motion-reduce:transition-none" aria-hidden />
            </summary>
              <p className="pb-3 text-[13px] leading-6 text-ink-600">
                {L({
                  hi: `हर राउंड: ${POMO.focus} मिनट पढ़ाई, फिर ${POMO.rest} मिनट का ब्रेक। अगला राउंड अपने आप शुरू होता है।`,
                  en: `Each round: ${POMO.focus} min study, then a ${POMO.rest} min break. The next round starts by itself.`,
                })}
              </p>
          </details>
        </div>
      )}

      {party && <Fireworks onDone={() => setParty(false)} />}
    </div>
  );
}
