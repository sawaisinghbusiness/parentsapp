"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { CalendarDays, ChevronRight, Clock3, FileText } from "lucide-react";
import { useApi } from "@/lib/api";
import { useParent } from "@/lib/parent";
import { useL, useT } from "@/lib/i18n";
import { clock, dayMonth, num, weekdayDate } from "@/lib/format";
import { abbr, subjectColor, type Report, type Schedule } from "@/lib/exam";
import { M } from "@/lib/text/more";
import { Empty, ErrorCard, LineTabs, ListSkeleton } from "@/components/ui";

type Tab = "schedule" | "result";

export default function ExamPage() {
  const { child } = useParent();
  const L = useL();
  const [tab, setTab] = useState<Tab>("schedule");
  useEffect(() => {
    if (new URLSearchParams(window.location.search).get("tab") === "result") setTab("result");
  }, []);

  return (
    <div className="animate-rise space-y-4">
      <LineTabs
        label={L(M.exam)}
        value={tab}
        onChange={setTab}
        options={[
          { key: "schedule", text: L({ hi: "टाइम टेबल", en: "Schedule" }) },
          { key: "result", text: L({ hi: "रिज़ल्ट", en: "Result" }) },
        ]}
      />
      {!child ? <ListSkeleton /> : tab === "schedule" ? <Papers key={child.id} studentId={child.id} /> : <Results key={child.id} studentId={child.id} />}
    </div>
  );
}

/** Each paper of the next exam: syllabus, total and pass marks, date and time. */
function Papers({ studentId }: { studentId: string }) {
  const L = useL();
  const { lang } = useT();
  const { data, error, reload } = useApi<Schedule>(`/exams/schedule?student=${studentId}`);

  if (!data) {
    // A school that has not put up an exam timetable answers 404: that is "nothing yet", not an error.
    if (error?.status === 404) return <Empty>{L({ hi: "अभी किसी परीक्षा का टाइम टेबल नहीं आया।", en: "No exam timetable has been put up yet." })}</Empty>;
    if (error && error.status !== 401) return <ErrorCard offline={error.status === 0} onRetry={reload} />;
    return <ListSkeleton rows={4} />;
  }
  if (!data.exam || !data.papers.length) return <Empty>{L({ hi: "अभी किसी परीक्षा का टाइम टेबल नहीं आया।", en: "No exam timetable has been put up yet." })}</Empty>;

  return (
    <div className="space-y-2.5">
      <p className="mlabel">
        {data.exam.title} · {dayMonth(data.exam.startDate, lang)} – {dayMonth(data.exam.endDate, lang)}
      </p>
      <ul className="space-y-2">
        {data.papers.map((p) => (
          <li key={p.subject + p.date} className="row-card">
            <p className="text-[15.5px] font-bold leading-snug">
              {p.subject}
              {p.syllabus && <span className="text-[14px] font-medium text-ink-500"> · {p.syllabus}</span>}
            </p>
            <p className="meta mt-2">
              <span>
                <FileText aria-hidden />
                {L({ hi: "कुल", en: "Total" })} {p.max}
              </span>
              <span>
                {L({ hi: "पास", en: "Pass" })} {p.pass}
              </span>
              <span>
                <CalendarDays aria-hidden />
                {weekdayDate(p.date, lang)}
              </span>
              <span>
                <Clock3 aria-hidden />
                {clock(p.start)}–{clock(p.end)}
              </span>
            </p>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** The latest exam as a bar per subject (axis = that exam's maximum), then every exam to open. */
function Results({ studentId }: { studentId: string }) {
  const L = useL();
  const { data, error, reload } = useApi<Report>(`/report-card?student=${studentId}`);

  if (!data) {
    if (error && error.status !== 401) return <ErrorCard offline={error.status === 0} onRetry={reload} />;
    return <ListSkeleton />;
  }
  const c = data.card;
  if (!data.exams.length || !c) return <Empty>{L(M.noResult)}</Empty>;

  const bars = c.subjects
    .map((s, k) => ({ name: s.subject, value: s.total, color: subjectColor(s.subject, k), shown: s.entered && !s.absent && s.total !== null }))
    .filter((b) => b.shown) as { name: string; value: number; color: string }[];

  return (
    <div className="space-y-4">
      <div>
        <p className="mlabel">
          {c.exam.title} · {L({ hi: "पूर्णांक", en: "marks out of" })} {c.exam.max}
        </p>
        <Chart bars={bars} max={c.exam.max} />
        <ul className="mt-2 grid grid-cols-3 gap-x-2 gap-y-1.5 text-[12.5px] text-ink-700">
          {bars.map((b) => (
            <li key={b.name} className="flex min-w-0 items-center gap-1.5">
              <span className="dot h-[9px] w-[9px]" style={{ background: b.color }} aria-hidden />
              <span className="truncate">{b.name}</span>
            </li>
          ))}
        </ul>
      </div>

      <section className="space-y-2.5">
        <div className="sec-head">
          <h2>{L({ hi: "सारे रिज़ल्ट", en: "Overall Results" })}</h2>
        </div>
        <ul className="space-y-2">
          {data.exams
            .slice()
            .reverse()
            .map((e) => {
              const pct = e.percent ?? (e.id === c.exam.id ? c.percent : undefined);
              const grand = e.grand ?? (e.id === c.exam.id ? c.grand : undefined);
              const outOf = e.outOf ?? (e.id === c.exam.id ? c.outOf : undefined);
              return (
                <li key={e.id}>
                  <Link href={`/exam/detail/?id=${e.id}`} className="row-card flex min-h-[72px] items-center gap-3">
                    <span className="min-w-0 flex-1">
                      <span className="block text-[15.5px] font-bold">{e.title}</span>
                      <span className="meta mt-0.5">
                        {grand !== undefined && outOf ? (
                          <span className="tnum">
                            {num(grand)} / {outOf}
                          </span>
                        ) : (
                          <span>{L({ hi: "विषयवार अंक देखें", en: "See subject-wise marks" })}</span>
                        )}
                      </span>
                    </span>
                    {pct !== undefined ? <Ring percent={pct} /> : <ChevronRight className="h-5 w-5 shrink-0 text-ink-400" aria-hidden />}
                  </Link>
                </li>
              );
            })}
        </ul>
      </section>
    </div>
  );
}

/** Small % ring on an exam row. */
function Ring({ percent }: { percent: number }) {
  const r = 19;
  const C = 2 * Math.PI * r;
  const p = Math.max(0, Math.min(100, percent));
  return (
    <svg width="48" height="48" viewBox="0 0 46 46" className="shrink-0" role="img" aria-label={`${num(percent)}%`}>
      <circle cx="23" cy="23" r={r} fill="none" stroke="#E1EAFB" strokeWidth="4" />
      <circle cx="23" cy="23" r={r} fill="none" stroke="#1446A0" strokeWidth="4" strokeLinecap="round" strokeDasharray={`${(C * p) / 100} ${C}`} transform="rotate(-90 23 23)" />
      <text x="23" y="27" textAnchor="middle" fontSize="11" fontWeight="700" fill="#1F1B2E">
        {Math.round(percent)}%
      </text>
    </svg>
  );
}

/** Bar chart, one colour per subject. The axis stops at the exam's maximum, never a rounded-up 200. */
function Chart({ bars, max }: { bars: { name: string; value: number; color: string }[]; max: number }) {
  if (!bars.length) return null;
  const H = 120;
  const top = 16;
  const left = 30;
  const W = 300;
  const slot = (W - left - 6) / bars.length;
  const bw = Math.min(26, slot * 0.6);
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((f) => Math.round(max * f));
  return (
    <svg viewBox={`0 0 ${W} ${top + H + 22}`} className="mt-2 block w-full" role="img" aria-label={bars.map((b) => `${b.name} ${b.value}`).join(", ")}>
      {ticks.map((v) => {
        const y = top + H - (H * v) / max;
        return (
          <g key={v}>
            <line x1={left} x2={W} y1={y} y2={y} stroke="#ECEAF2" />
            <text x={left - 6} y={y + 3.5} textAnchor="end" fontSize="10" fill="#8E8AA3">
              {v}
            </text>
          </g>
        );
      })}
      {bars.map(({ name, value: v, color }, k) => {
        const x = left + slot * k + (slot - bw) / 2;
        const h = Math.max(4, (H * Math.min(v, max)) / max);
        const y = top + H - h;
        return (
          <g key={name + k}>
            {/* Rounded top, flat base. */}
            <path d={`M${x} ${top + H}V${y + 4}q0-4 4-4h${bw - 8}q4 0 4 4V${top + H}z`} fill={color} />
            <text x={x + bw / 2} y={y - 4} textAnchor="middle" fontSize="10.5" fontWeight="700" fill="#1F1B2E">
              {num(v)}
            </text>
            <text x={x + bw / 2} y={top + H + 15} textAnchor="middle" fontSize="10.5" fill="#625D77">
              {abbr(name)}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
