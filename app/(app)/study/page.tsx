"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import clsx from "clsx";
import { Minus, Pause, Play, Plus, Square } from "lucide-react";
import { useApi } from "@/lib/api";
import { useParent } from "@/lib/parent";
import { useL, useT } from "@/lib/i18n";
import { Fireworks } from "@/components/Fireworks";

/**
 * Study: the child picks a subject and studies with a timer, either one block of time or Pomodoro
 * (25 min focus, 5 min break, 4 rounds). Sessions are kept on this phone only (per child): today's
 * total, the week as bars, and today's sessions. The timer runs from a saved end time, so it stays
 * right if the screen turns off or the app is closed. Finishing a whole block sets off fireworks.
 */

interface Session {
  subject: string;
  minutes: number;
  /** When it ended, ISO. */
  at: string;
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

/** A short two-note chime made in the browser (no sound file), then a buzz. */
function chime() {
  try {
    const Ctx = window.AudioContext || (window as any).webkitAudioContext;
    const ctx = new Ctx();
    [880, 1175].forEach((f, i) => {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.frequency.value = f;
      o.connect(g);
      g.connect(ctx.destination);
      const t = ctx.currentTime + i * 0.28;
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.3, t + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.5);
      o.start(t);
      o.stop(t + 0.55);
    });
  } catch {
    /* no sound on this phone */
  }
  navigator.vibrate?.([300, 120, 300]);
}

export default function StudyPage() {
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

  const [mode, setMode] = useState<Mode>("timer");
  const [subject, setSubject] = useState("");
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
    (subj: string, secs: number) => {
      const s: Session = { subject: subj, minutes: Math.round(secs / 60), at: new Date().toISOString() };
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
    chime();
    if (run.phase === "focus") {
      setDone(record(run.subject, run.total));
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
    setDone(run.phase === "focus" ? record(run.subject, run.total - left) : null);
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
  const best = week.reduce((b, w) => (w.min > b.min ? w : b), week[0]);
  const bySubject = Object.entries(thisWeek.reduce<Record<string, number>>((m, s) => ((m[s.subject] = (m[s.subject] || 0) + s.minutes), m), {})).sort((a, b) => b[1] - a[1]);
  const topSubject = bySubject[0]?.[1] || 1;
  const change = lastMin ? Math.round(((weekMin - lastMin) / lastMin) * 100) : null;

  const total = run ? run.total : left;
  const R = 108;
  const C = 2 * Math.PI * R;
  // The teal ring is the whole block; green fills over it as the time runs.
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

  return (
    <div className="relative">
      {/* Soft colour behind the glass, so the cards read as frosted glass. */}
      <div aria-hidden className="pointer-events-none absolute -inset-x-4 -top-6 bottom-0 overflow-hidden">
        <span className="absolute -left-16 top-24 h-64 w-64 rounded-full bg-[#177386] opacity-25 blur-3xl" />
        <span className="absolute -right-20 top-[340px] h-72 w-72 rounded-full bg-[#39bc13] opacity-20 blur-3xl" />
        <span className="absolute left-10 top-[640px] h-56 w-56 rounded-full bg-[#1E88E5] opacity-10 blur-3xl" />
      </div>

      <div className="relative space-y-4">
        {/* Timer or Pomodoro: stays under the top bar while the page scrolls. */}
        <div className="glass sticky top-[calc(3.5rem+env(safe-area-inset-top))] z-10 grid grid-cols-2 rounded-2xl p-1" style={{ background: "rgb(255 255 255 / 0.9)" }} role="tablist" aria-label={L({ hi: "टाइमर का तरीका", en: "Timer type" })}>
          {(["timer", "pomodoro"] as const).map((m) => (
            <button
              key={m}
              type="button"
              role="tab"
              aria-selected={mode === m}
              disabled={busy}
              onClick={() => setMode(m)}
              className={clsx("h-10 rounded-xl text-[14.5px] font-semibold transition-all disabled:opacity-60", mode === m ? "glass-chip text-ink-900" : "text-ink-500")}
            >
              {m === "timer" ? L({ hi: "टाइमर", en: "Timer" }) : L({ hi: "पोमोडोरो", en: "Pomodoro" })}
            </button>
          ))}
        </div>

        {/* Subject */}
        <section>
          <h2 className="mb-2 px-0.5 text-[13.5px] font-semibold text-ink-500">{L({ hi: "विषय", en: "Subject" })}</h2>
          <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 pb-1">
            {subjects.map((s) => (
              <button
                key={s}
                type="button"
                disabled={busy}
                onClick={() => setSubject(s)}
                aria-pressed={subject === s}
                className={clsx("h-10 shrink-0 rounded-xl border px-4 text-[14px] font-semibold transition-colors disabled:opacity-50", subject === s ? "border-ink-900 bg-ink-900 text-white" : "glass-chip border-white/70 text-ink-800")}
              >
                {s}
              </button>
            ))}
          </div>
        </section>

        {/* Timer */}
        <section className="glass rounded-3xl px-4 pb-5 pt-5">
          <div className="relative mx-auto h-[248px] w-[248px]">
            <svg viewBox="0 0 248 248" className="h-full w-full -rotate-90" aria-hidden>
              <circle cx="124" cy="124" r={R} fill="none" stroke={onBreak ? "#9CC9D2" : "#177386"} strokeWidth="12" />
              <circle cx="124" cy="124" r={R} fill="none" stroke="#39bc13" strokeWidth="12" strokeLinecap="round" strokeDasharray={C} strokeDashoffset={C * (1 - doneFrac)} opacity={doneFrac > 0 ? 1 : 0} style={{ transition: run?.endsAt ? "stroke-dashoffset .25s linear" : "stroke-dashoffset .4s ease" }} />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-[13px] font-semibold text-ink-500">
                {run ? run.subject : subject}
                {(run ? run.mode : mode) === "pomodoro" && ` · ${L({ hi: "राउंड", en: "Round" })} ${run ? run.round : 1}/${POMO.rounds}`}
              </span>
              <span className="tnum mt-0.5 text-[46px] font-bold leading-none tracking-tight text-ink-900" role="timer" aria-live="off">
                {mmss(left)}
              </span>
              <span className={clsx("mt-1.5 text-[12.5px]", onBreak ? "font-semibold text-[#177386]" : "text-ink-400")}>{status}</span>
            </div>
          </div>

          {/* Pomodoro rounds */}
          {(run ? run.mode : mode) === "pomodoro" && (
            <div className="mt-3 flex items-center justify-center gap-2" aria-label={L({ hi: "राउंड", en: "Rounds" })}>
              {Array.from({ length: POMO.rounds }, (_, i) => {
                const r = run?.round || 1;
                const finished = !!run && (i + 1 < r || (i + 1 === r && run.phase === "break"));
                return <span key={i} className={clsx("h-2.5 w-2.5 rounded-full", finished ? "bg-[#39bc13]" : i + 1 === r && run ? "bg-[#177386]" : "bg-ink-200")} />;
              })}
            </div>
          )}

          {/* Length (before starting) */}
          {!run &&
            (mode === "timer" ? (
              <div className="mt-4 space-y-3">
                <div className="grid grid-cols-4 gap-2">
                  {PRESETS.map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setMinutes(m)}
                      aria-pressed={minutes === m}
                      className={clsx("glass-chip h-10 rounded-xl border text-[14px] font-semibold transition-colors", minutes === m ? "border-[#177386] text-[#0F5A69] ring-1 ring-[#177386]" : "border-white/70 text-ink-700")}
                    >
                      {m} {L({ hi: "मि", en: "min" })}
                    </button>
                  ))}
                </div>
                <div className="flex items-center justify-center gap-4">
                  <button type="button" onClick={() => setMinutes((m) => Math.max(5, m - 5))} aria-label={L({ hi: "5 मिनट कम", en: "5 minutes less" })} className="glass-chip grid h-10 w-10 place-items-center rounded-full border border-white/70 text-ink-800">
                    <Minus className="h-4 w-4" aria-hidden />
                  </button>
                  <span className="tnum w-24 text-center text-[15px] font-semibold text-ink-800">
                    {minutes} {L({ hi: "मिनट", en: "minutes" })}
                  </span>
                  <button type="button" onClick={() => setMinutes((m) => Math.min(180, m + 5))} aria-label={L({ hi: "5 मिनट ज़्यादा", en: "5 minutes more" })} className="glass-chip grid h-10 w-10 place-items-center rounded-full border border-white/70 text-ink-800">
                    <Plus className="h-4 w-4" aria-hidden />
                  </button>
                </div>
              </div>
            ) : (
              <p className="mt-4 text-center text-[13.5px] leading-snug text-ink-600">
                {L({
                  hi: `${POMO.focus} मिनट पढ़ाई, ${POMO.rest} मिनट ब्रेक, ऐसे ${POMO.rounds} राउंड। ब्रेक के बाद अगला राउंड अपने आप शुरू होगा।`,
                  en: `${POMO.focus} min study, ${POMO.rest} min break, ${POMO.rounds} rounds. The next round starts by itself after each break.`,
                })}
              </p>
            ))}

          {/* Controls */}
          <div className="mt-5 flex justify-center gap-3">
            {!run ? (
              <button type="button" onClick={start} disabled={!subject} className="glass-green flex h-12 min-w-[200px] items-center justify-center rounded-2xl px-6 text-[16px] font-semibold text-white disabled:opacity-50">
                {L({ hi: "पढ़ाई शुरू करें", en: "Start studying" })}
              </button>
            ) : (
              <>
                {run.endsAt ? (
                  <button type="button" onClick={pause} className="glass-chip flex h-12 min-w-[132px] items-center justify-center gap-2 rounded-2xl border border-white/70 px-5 text-[15px] font-semibold text-ink-900">
                    <Pause className="h-5 w-5" aria-hidden />
                    {L({ hi: "रोकें", en: "Pause" })}
                  </button>
                ) : (
                  <button type="button" onClick={resume} className="glass-green flex h-12 min-w-[132px] items-center justify-center gap-2 rounded-2xl px-5 text-[15px] font-semibold text-white">
                    <Play className="h-5 w-5" fill="currentColor" aria-hidden />
                    {L({ hi: "फिर शुरू", en: "Resume" })}
                  </button>
                )}
                <button type="button" onClick={stop} className="glass-chip flex h-12 min-w-[132px] items-center justify-center gap-2 rounded-2xl border border-white/70 px-5 text-[15px] font-semibold text-rose-600">
                  <Square className="h-4 w-4" fill="currentColor" aria-hidden />
                  {L({ hi: "ख़त्म करें", en: "Finish" })}
                </button>
              </>
            )}
          </div>
          {done && (
            <p className="mt-3 text-center text-[14px] font-semibold text-jade-700" role="status">
              {L({ hi: `शाबाश! ${done.subject} ${hm(done.minutes, true)} पढ़ा।`, en: `Well done! ${hm(done.minutes, false)} of ${done.subject}.` })}
            </p>
          )}
        </section>
        {party && <Fireworks onDone={() => setParty(false)} />}

        {/* Today and this week */}
        <section className="glass rounded-3xl p-4">
          <div className="flex items-baseline justify-between">
            <h2 className="text-[15px] font-semibold text-ink-900">{L({ hi: "आज", en: "Today" })}</h2>
            <span className="tnum text-[15px] font-bold text-[#0F5A69]">{hm(todayMin, hi)}</span>
          </div>
          <div className="mt-4 flex h-[92px] items-end justify-between gap-2" aria-label={L({ hi: "इस हफ़्ते", en: "This week" })}>
            {week.map((w) => (
              <div key={w.k} className="flex flex-1 flex-col items-center gap-1.5">
                <div className="flex h-[68px] w-full max-w-[28px] items-end overflow-hidden rounded-md bg-white/60" title={hm(w.min, hi)}>
                  <div className={clsx("w-full rounded-md", w.k === today ? "bg-[#177386]" : "bg-[#9CC9D2]")} style={{ height: `${Math.round((w.min / top) * 100)}%` }} />
                </div>
                <span className={clsx("text-[11px]", w.k === today ? "font-bold text-ink-900" : "text-ink-400")}>{w.label}</span>
              </div>
            ))}
          </div>
          {todays.length > 0 && (
            <ul className="mt-4 divide-y divide-white/70 border-t border-white/70">
              {todays.map((s) => (
                <li key={s.at} className="flex items-center justify-between py-2.5 text-[14px]">
                  <span className="font-medium text-ink-800">{s.subject}</span>
                  <span className="tnum text-ink-500">
                    {hm(s.minutes, hi)} · {new Date(s.at).toLocaleTimeString(hi ? "hi-IN" : "en-IN", { hour: "numeric", minute: "2-digit" })}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Weekly report */}
        <section className="glass rounded-3xl p-4">
          <h2 className="text-[15px] font-semibold text-ink-900">{L({ hi: "हफ़्ते की रिपोर्ट", en: "Weekly report" })}</h2>
          <p className="text-[12.5px] text-ink-500">{L({ hi: "पिछले 7 दिन", en: "Last 7 days" })}</p>
          {weekMin === 0 ? (
            <p className="mt-3 text-[14px] text-ink-500">{L({ hi: "इस हफ़्ते अभी कोई पढ़ाई दर्ज नहीं। टाइमर से पढ़ाई शुरू करें।", en: "No study recorded this week yet. Start the timer to begin." })}</p>
          ) : (
            <>
              <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-3">
                <div>
                  <dt className="text-[12.5px] text-ink-500">{L({ hi: "कुल पढ़ाई", en: "Total" })}</dt>
                  <dd className="tnum text-[17px] font-bold text-ink-900">{hm(weekMin, hi)}</dd>
                </div>
                <div>
                  <dt className="text-[12.5px] text-ink-500">{L({ hi: "रोज़ औसत", en: "Daily average" })}</dt>
                  <dd className="tnum text-[17px] font-bold text-ink-900">{hm(weekMin / 7, hi)}</dd>
                </div>
                <div>
                  <dt className="text-[12.5px] text-ink-500">{L({ hi: "पढ़ाई वाले दिन", en: "Days studied" })}</dt>
                  <dd className="tnum text-[17px] font-bold text-ink-900">{daysStudied} / 7</dd>
                </div>
                <div>
                  <dt className="text-[12.5px] text-ink-500">{L({ hi: "सबसे अच्छा दिन", en: "Best day" })}</dt>
                  <dd className="text-[17px] font-bold text-ink-900">{new Date(best.k + "T00:00:00").toLocaleDateString(hi ? "hi-IN" : "en-IN", { weekday: "short", day: "numeric" })}</dd>
                </div>
              </dl>
              {change !== null && (
                <p className={clsx("mt-3 text-[13.5px] font-semibold", change >= 0 ? "text-jade-700" : "text-rose-600")}>
                  {change >= 0
                    ? L({ hi: `पिछले हफ़्ते से ${change}% ज़्यादा`, en: `${change}% more than last week` })
                    : L({ hi: `पिछले हफ़्ते से ${-change}% कम`, en: `${-change}% less than last week` })}
                </p>
              )}
              <h3 className="mt-4 text-[13px] font-semibold text-ink-500">{L({ hi: "विषय के हिसाब से", en: "By subject" })}</h3>
              <ul className="mt-2 space-y-2.5">
                {bySubject.map(([subj, min]) => (
                  <li key={subj}>
                    <div className="flex items-baseline justify-between text-[13.5px]">
                      <span className="font-medium text-ink-800">{subj}</span>
                      <span className="tnum text-ink-500">{hm(min, hi)}</span>
                    </div>
                    <div className="mt-1 h-2 overflow-hidden rounded-full bg-white/70">
                      <div className="h-full rounded-full bg-[#39bc13]" style={{ width: `${Math.max(4, Math.round((min / topSubject) * 100))}%` }} />
                    </div>
                  </li>
                ))}
              </ul>
            </>
          )}
        </section>
      </div>
    </div>
  );
}
