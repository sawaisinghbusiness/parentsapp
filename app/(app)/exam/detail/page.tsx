"use client";

import { useEffect, useState } from "react";
import clsx from "clsx";
import { useApi } from "@/lib/api";
import { useParent } from "@/lib/parent";
import { useL, useT } from "@/lib/i18n";
import { num, ordinal } from "@/lib/format";
import { abbr, type Report } from "@/lib/exam";
import { M } from "@/lib/text/more";
import { Empty, ErrorCard, ListSkeleton, TINTS } from "@/components/ui";

/** One exam: total, percent, grade and rank on top, then every subject with its bar. */
export default function ResultDetailPage() {
  const { child } = useParent();
  const L = useL();
  const { lang } = useT();
  const [exam, setExam] = useState<string | null>(null);
  useEffect(() => setExam(new URLSearchParams(window.location.search).get("id") || ""), []);
  const { data, error, reload } = useApi<Report>(child && exam !== null ? `/report-card?student=${child.id}${exam ? `&exam=${encodeURIComponent(exam)}` : ""}` : null);

  if (!data) {
    if (error && error.status !== 401) return <ErrorCard offline={error.status === 0} onRetry={reload} />;
    return <ListSkeleton rows={5} />;
  }
  const c = data.card;
  if (!c) return <Empty>{L(M.resultError)}</Empty>;
  const failed = c.subjects.filter((s) => s.entered && !s.passed).map((s) => s.subject);

  return (
    <div className="animate-rise space-y-4">
      <h2 className="text-center text-[15px] font-semibold text-ink-500">{c.exam.title}</h2>

      <dl className="grid grid-cols-4 rounded-2xl bg-brand-50 px-2 py-3 text-center">
        {[
          [L(M.total), `${num(c.grand)}/${c.outOf}`],
          [L(M.percent), `${num(c.percent)}%`],
          [L(M.grade), c.grade || "—"],
          [c.classSize ? L({ hi: `${c.classSize} में से`, en: `of ${c.classSize}` }) : L(M.rank), c.rank !== null ? ordinal(c.rank, lang) : "—"],
        ].map(([k, v]) => (
          <div key={k}>
            <dd className="tnum text-[16px] font-extrabold">{v}</dd>
            <dt className="text-[12px] text-ink-500">{k}</dt>
          </div>
        ))}
      </dl>

      <p className={clsx("text-[14px] font-medium", failed.length ? "text-rose-600" : "text-ink-700")}>
        {!c.complete ? L(M.incomplete) : failed.length ? `${L(M.needsWork)}: ${failed.join(", ")}` : `${L(M.result)}: ${L(M.passed)}`}
      </p>

      <ul className="space-y-4">
        {c.subjects.map((s, k) => {
          const pct = s.total !== null && c.exam.max ? Math.min(100, (s.total / c.exam.max) * 100) : 0;
          const multi = c.exam.parts.length > 1;
          return (
            <li key={s.subject} className="grid grid-cols-[40px_1fr] items-center gap-3">
              <span className="grid h-10 w-10 place-items-center rounded-xl text-[13px] font-bold" style={{ background: TINTS[k % TINTS.length][0], color: TINTS[k % TINTS.length][1] }} aria-hidden>
                {abbr(s.subject)}
              </span>
              <div className="min-w-0">
                <div className="mb-1.5 flex items-baseline justify-between gap-2">
                  <span className="truncate text-[15px] font-semibold">{s.subject}</span>
                  {!s.entered ? (
                    <span className="text-[13px] text-ink-500">{L(M.notEntered)}</span>
                  ) : s.absent ? (
                    <span className="text-[13px] font-medium text-rose-600">{L(M.absent)}</span>
                  ) : (
                    <span className={clsx("tnum shrink-0 text-[14px] font-medium", s.passed ? "text-ink-500" : "text-rose-600")}>
                      {s.total === null ? "—" : num(s.total)}/{c.exam.max}
                      {s.grade && <span className="ml-1.5 font-semibold text-ink-900">{s.grade}</span>}
                    </span>
                  )}
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-ink-100" aria-hidden>
                  <div className={clsx("h-full rounded-full", s.passed ? "bg-brand-600" : "bg-rose-600")} style={{ width: `${s.entered && !s.absent ? pct : 0}%` }} />
                </div>
                {multi && s.entered && !s.absent && <p className="tnum mt-1 text-[12px] text-ink-400">{c.exam.parts.map((p) => `${p.name} ${s.marks[p.key] ?? "—"}/${p.max}`).join(" · ")}</p>}
              </div>
            </li>
          );
        })}
      </ul>

      {c.remark && (
        <p className="row-card text-[14px] leading-relaxed text-ink-700">
          <span className="mb-0.5 block text-[12px] font-semibold text-ink-400">{L({ hi: "कक्षा अध्यापक की टिप्पणी", en: "Class teacher's remark" })}</span>
          {c.remark}
        </p>
      )}

      {c.attendance && c.attendance.days > 0 && (
        <dl className="kv">
          <div>
            <dt>{L(M.attendance)}</dt>
            <dd className="tnum">
              {num(c.attendance.present)} / {c.attendance.days}
            </dd>
          </div>
        </dl>
      )}

      <details className="row-card">
        <summary className="flex min-h-[28px] cursor-pointer items-center text-[14px] font-medium text-ink-700">{L(M.gradeScale)}</summary>
        <ul className="tnum mt-2 grid grid-cols-2 gap-x-6 gap-y-1 text-[14px] text-ink-700">
          {data.grades.scale.map((g, i) => (
            <li key={g.grade} className="flex justify-between">
              <span className="font-semibold text-ink-900">{g.grade}</span>
              <span>
                {g.min}–{i === 0 ? 100 : data.grades.scale[i - 1].min - 1}%
              </span>
            </li>
          ))}
        </ul>
        <p className="mt-2 text-[13px] text-ink-500">
          {L(M.passNote)} {data.grades.passPercent}%.
        </p>
      </details>
    </div>
  );
}
