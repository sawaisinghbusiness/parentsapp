"use client";

import { useEffect, useState } from "react";
import clsx from "clsx";
import { ChevronDown } from "lucide-react";
import { useApi } from "@/lib/api";
import { useParent } from "@/lib/parent";
import { useL, useT } from "@/lib/i18n";
import { num, ordinal } from "@/lib/format";
import type { Report } from "@/lib/exam";
import { M } from "@/lib/text/more";
import { Empty, ErrorCard, ListSkeleton, Status } from "@/components/ui";
import { CARD, RULED, Section, SUPPORT, TITLE } from "@/components/kit";
import { SubjectRows } from "../subjects";
import "@/components/study.css";

/** Preview of one exam's result: a calm summary card, the subject rows, then remark, attendance and the grade scale. */
export default function ResultDetailPreviewPage() {
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

  const figures: [string, string][] = [
    [L(M.total), `${num(c.grand)}/${c.outOf}`],
    [L(M.percent), `${num(c.percent)}%`],
  ];
  if (c.grade) figures.push([L(M.grade), c.grade]);
  if (c.rank !== null) figures.push([c.classSize ? L({ hi: `${c.classSize} में से`, en: `of ${c.classSize}` }) : L(M.rank), ordinal(c.rank, lang)]);

  return (
    <div className="study space-y-6 pb-4 pt-1">
      <Section>
        <div className={CARD}>
          <div className="px-4 pt-4">
            <p className={TITLE}>{c.exam.title}</p>
            <dl className="mt-3 grid gap-3" style={{ gridTemplateColumns: `repeat(${figures.length}, minmax(0, 1fr))` }}>
              {figures.map(([k, v]) => (
                <div key={k} className="min-w-0">
                  <dd className="tnum text-[16px] font-medium leading-6 text-ink-900">{v}</dd>
                  <dt className={clsx("mt-0.5 break-words", SUPPORT)}>{k}</dt>
                </div>
              ))}
            </dl>
          </div>
          <div className="mt-4 border-t border-[#E6ECF3] px-4 py-3">
            {!c.complete ? (
              <Status tone="wait">{L(M.incomplete)}</Status>
            ) : failed.length ? (
              <p className="text-[14px] font-medium leading-5 text-[#A32F35]">
                {L(M.needsWork)}: {failed.join(", ")}
              </p>
            ) : (
              <p className="flex items-center gap-2 text-[14px] leading-5 text-ink-500">
                {L(M.result)}: <Status tone="ok">{L(M.passed)}</Status>
              </p>
            )}
          </div>
        </div>
      </Section>

      <Section title={L(M.marks)} delay={70}>
        <SubjectRows card={c} parts />
      </Section>

      <Section delay={140}>
        <div className="space-y-3">
        {c.remark && (
          <div className={clsx(CARD, "px-4 py-4")}>
            <p className={SUPPORT}>{L({ hi: "कक्षा अध्यापक की टिप्पणी", en: "Class teacher's remark" })}</p>
            <p className="mt-1 text-[16px] leading-6 text-ink-900">{c.remark}</p>
          </div>
        )}

        {c.attendance && c.attendance.days > 0 && (
          <dl className={clsx(CARD, "flex min-h-[56px] items-center justify-between gap-3 px-4")}>
            <dt className="text-[16px] leading-6 text-ink-900">{L(M.attendance)}</dt>
            <dd className="tnum text-[16px] font-medium leading-6 text-ink-900">
              {num(c.attendance.present)} / {c.attendance.days}
            </dd>
          </dl>
        )}

        <details className={clsx(CARD, "group")}>
          <summary className="flex min-h-[48px] cursor-pointer list-none items-center justify-between gap-3 px-4 text-[16px] font-medium leading-6 text-ink-900 [&::-webkit-details-marker]:hidden">
            {L(M.gradeScale)}
            <ChevronDown className="h-5 w-5 shrink-0 text-ink-500 group-open:rotate-180" strokeWidth={1.75} aria-hidden />
          </summary>
          <ul className={clsx("tnum border-t border-[#E6ECF3]", RULED)}>
            {data.grades.scale.map((g, i) => (
              <li key={g.grade} className="flex min-h-[44px] items-center justify-between px-4 text-[16px] leading-6">
                <span className="font-medium text-ink-900">{g.grade}</span>
                <span className="text-ink-500">
                  {g.min}–{i === 0 ? 100 : data.grades.scale[i - 1].min - 1}%
                </span>
              </li>
            ))}
          </ul>
          <p className={clsx("border-t border-[#E6ECF3] px-4 py-3", SUPPORT)}>
            {L(M.passNote)} {data.grades.passPercent}%.
          </p>
        </details>
        </div>
      </Section>
    </div>
  );
}
