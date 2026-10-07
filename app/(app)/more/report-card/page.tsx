"use client";

import { useEffect, useState } from "react";
import clsx from "clsx";
import { useApi } from "@/lib/api";
import { useParent } from "@/lib/parent";
import { useL } from "@/lib/i18n";
import { M } from "@/lib/text/more";
import { ErrorCard, Skeleton } from "@/components/ui";
import { InfoRow, SubHeader } from "@/components/more/parts";

interface Subject {
  subject: string;
  marks: Record<string, number>;
  absent: boolean;
  total: number | null;
  grade: string | null;
  passed: boolean;
  entered: boolean;
}
interface Card {
  exam: { id: string; title: string; max: number; parts: { key: string; name: string; max: number }[]; startDate: string | null; endDate: string | null };
  subjects: Subject[];
  grand: number;
  outOf: number;
  percent: number;
  grade: string | null;
  result: string;
  complete: boolean;
  rank: number | null;
  attendance: { present: number; days: number } | null;
}
interface Report {
  exams: { id: string; title: string; startDate: string | null; endDate: string | null }[];
  card: Card | null;
  grades: { scale: { grade: string; min: number }[]; passPercent: number };
}

const num = (n: number) => (Number.isInteger(n) ? String(n) : n.toFixed(1));

export default function ReportCardPage() {
  const { child } = useParent();
  const L = useL();
  const [exam, setExam] = useState("");
  useEffect(() => setExam(""), [child?.id]);
  const { data, error, reload } = useApi<Report>(child ? `/report-card?student=${child.id}${exam ? `&exam=${exam}` : ""}` : null);

  const body = () => {
    if (!data) {
      if (error && error.status !== 401) return <ErrorCard offline={error.status === 0} onRetry={reload} />;
      return (
        <div className="card space-y-3 p-4">
          <Skeleton className="h-8 w-32" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-2/3" />
        </div>
      );
    }
    if (!data.exams.length) return <p className="card p-5 text-ink-700">{L(M.noResult)}</p>;
    const c = data.card;
    const failed = c ? c.subjects.filter((s) => s.entered && !s.passed).map((s) => s.subject) : [];
    const multi = (c?.exam.parts.length || 0) > 1;

    return (
      <>
        {data.exams.length > 1 && (
          <div className={clsx(data.exams.length <= 3 ? "seg" : "-mx-3 flex gap-1.5 overflow-x-auto px-3 [scrollbar-width:none]")} role="tablist" aria-label={L(M.exam)}>
            {data.exams
              .slice()
              .reverse()
              .map((e) => {
                const on = (c?.exam.id || exam) === e.id;
                return (
                  <button
                    key={e.id}
                    role="tab"
                    aria-selected={on}
                    onClick={() => setExam(e.id)}
                    className={clsx(
                      data.exams.length > 3 && "min-h-[42px] shrink-0 rounded-xl px-4 text-[15px]",
                      data.exams.length > 3 && (on ? "bg-brand-600 font-semibold text-white" : "bg-white font-medium text-ink-600")
                    )}
                  >
                    {e.title}
                  </button>
                );
              })}
          </div>
        )}

        {!c ? (
          <p className="card p-5 text-ink-700">{L(M.resultError)}</p>
        ) : (
          <>
            {/* The overall result on the sky block */}
            <section className="hero">
              <p className="hero-label">{c.exam.title}</p>
              <p className="hero-big">{num(c.percent)}%</p>
              <p className="hero-sub tnum">
                {num(c.grand)} / {c.outOf}
                {c.grade ? ` · ${L(M.grade)} ${c.grade}` : ""}
                {c.rank !== null ? ` · ${L(M.rank)} ${c.rank}` : ""}
              </p>
              <p className="mt-3 border-t border-white/20 pt-2.5 text-[15px] font-medium">{!c.complete ? L(M.incomplete) : failed.length ? `${L(M.needsWork)}: ${failed.join(", ")}` : L(M.passed)}</p>
            </section>

            {/* Each subject: marks and a thin bar, so the weak one shows at a glance */}
            <section className="pt-1.5">
              <h2 className="sec-title">
                <span>{L(M.subject)}</span>
                <span className="font-medium">
                  {L({ hi: "अंक", en: "Marks" })} / {c.exam.max}
                </span>
              </h2>
              <ul className="card divide-y divide-ink-100">
                {c.subjects.map((s) => {
                  const pct = s.total !== null && c.exam.max ? Math.min(100, (s.total / c.exam.max) * 100) : 0;
                  return (
                    <li key={s.subject} className="px-4 py-3">
                      <div className="flex items-baseline justify-between gap-3">
                        <span className="min-w-0 font-medium text-ink-900">{s.subject}</span>
                        {!s.entered ? (
                          <span className="text-[15px] text-ink-500">{L(M.notEntered)}</span>
                        ) : s.absent ? (
                          <span className="text-[15px] font-medium text-rose-600">{L(M.absent)}</span>
                        ) : (
                          <span className="tnum shrink-0">
                            <span className={clsx("text-[17px] font-semibold", s.passed ? "text-ink-900" : "text-rose-600")}>{s.total === null ? "—" : num(s.total)}</span>
                            {s.grade && <span className="ml-1.5 text-[14px] text-ink-500">{s.grade}</span>}
                          </span>
                        )}
                      </div>
                      {s.entered && !s.absent && (
                        <>
                          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-ink-100" aria-hidden>
                            <div className={clsx("h-full rounded-full", s.passed ? "bg-brand-600" : "bg-rose-600")} style={{ width: `${pct}%` }} />
                          </div>
                          {multi && <p className="tnum mt-1.5 text-[13px] text-ink-500">{c.exam.parts.map((p) => `${p.name} ${s.marks[p.key] ?? "—"}`).join(" · ")}</p>}
                        </>
                      )}
                    </li>
                  );
                })}
              </ul>
            </section>

            {c.attendance && c.attendance.days > 0 && (
              <dl className="card px-4">
                <InfoRow label={L(M.attendance)} value={<span className="tnum">{num(c.attendance.present)} / {c.attendance.days}</span>} />
              </dl>
            )}

            <details className="card p-4">
              <summary className="flex min-h-[28px] cursor-pointer items-center font-medium text-ink-700">{L(M.gradeScale)}</summary>
              <ul className="tnum mt-2 grid grid-cols-2 gap-x-6 gap-y-1 text-ink-700">
                {data.grades.scale.map((g, i) => {
                  const top = i === 0 ? 100 : data.grades.scale[i - 1].min - 1;
                  return (
                    <li key={g.grade} className="flex justify-between">
                      <span className="font-semibold text-ink-900">{g.grade}</span>
                      <span>
                        {g.min}–{top}%
                      </span>
                    </li>
                  );
                })}
              </ul>
              <p className="mt-2 text-sm text-ink-500">
                {L(M.passNote)} {data.grades.passPercent}%.
              </p>
            </details>
          </>
        )}
      </>
    );
  };

  return (
    <div className="animate-rise space-y-3">
      <SubHeader title={L(M.result)} />
      {body()}
    </div>
  );
}
