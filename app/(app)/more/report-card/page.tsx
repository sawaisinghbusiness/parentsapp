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
          <div className="-mx-3 flex gap-2 overflow-x-auto px-3 pb-0.5 [scrollbar-width:none]" role="tablist" aria-label={L(M.exam)}>
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
                      "min-h-[44px] shrink-0 rounded-xl border px-4 text-[15px] font-semibold",
                      on ? "border-brand-600 bg-white text-brand-800 ring-1 ring-brand-600" : "border-ink-200 bg-white text-ink-700"
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
            <section className="card p-4">
              <p className="card-title">{c.exam.title}</p>
              <div className="mt-1 flex items-end justify-between gap-3">
                <p className="tnum text-[32px] font-extrabold leading-tight tracking-tight text-ink-900">
                  {num(c.percent)}%
                </p>
                {c.grade && (
                  <p className="pb-1 text-right text-ink-500">
                    {L(M.grade)} <span className="tnum text-2xl font-extrabold text-ink-900">{c.grade}</span>
                  </p>
                )}
              </div>
              <p className="mt-2 flex items-start gap-2 text-ink-800">
                <span className={clsx("dot mt-2", !c.complete ? "bg-ink-400" : failed.length ? "bg-marigold-500" : "bg-jade-600")} aria-hidden />
                <span>{!c.complete ? L(M.incomplete) : failed.length ? `${L(M.needsWork)}: ${failed.join(", ")}` : L(M.passed)}</span>
              </p>
              <dl className="mt-2 divide-y divide-ink-100 border-t border-ink-100">
                <InfoRow label={L(M.total)} value={<span className="tnum">{num(c.grand)} / {c.outOf}</span>} />
                {c.rank !== null && <InfoRow label={L(M.rank)} value={<span className="tnum">{c.rank}</span>} />}
                {c.attendance && c.attendance.days > 0 && (
                  <InfoRow label={L(M.attendance)} value={<span className="tnum">{num(c.attendance.present)} / {c.attendance.days}</span>} />
                )}
              </dl>
            </section>

            <section className="card p-4">
              <div className="flex items-baseline justify-between text-sm font-semibold text-ink-500">
                <span>{L(M.subject)}</span>
                <span>
                  {L(M.marks)} / {c.exam.max} · {L(M.grade)}
                </span>
              </div>
              <ul className="mt-1 divide-y divide-ink-100">
                {c.subjects.map((s) => (
                  <li key={s.subject} className="flex min-h-[52px] items-center gap-3 py-2">
                    <span className="min-w-0 flex-1">
                      <span className="block font-semibold text-ink-900">{s.subject}</span>
                      {multi && s.entered && !s.absent && (
                        <span className="tnum block text-sm text-ink-500">{c.exam.parts.map((p) => `${p.name} ${s.marks[p.key] ?? "—"}`).join(" · ")}</span>
                      )}
                    </span>
                    {!s.entered ? (
                      <span className="text-ink-500">{L(M.notEntered)}</span>
                    ) : s.absent ? (
                      <span className="flex items-center gap-1.5 text-ink-700">
                        <span className="dot bg-rose-500" aria-hidden />
                        {L(M.absent)}
                      </span>
                    ) : (
                      <>
                        <span className="tnum w-12 text-right text-lg font-bold text-ink-900">{s.total === null ? "—" : num(s.total)}</span>
                        <span className="tnum flex w-12 items-center justify-end gap-1.5 font-semibold text-ink-800">
                          {!s.passed && <span className="dot h-2 w-2 bg-marigold-500" aria-hidden />}
                          {s.grade}
                        </span>
                      </>
                    )}
                  </li>
                ))}
              </ul>
            </section>

            <details className="card p-4">
              <summary className="flex min-h-[28px] cursor-pointer items-center font-semibold text-ink-700">{L(M.gradeScale)}</summary>
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
