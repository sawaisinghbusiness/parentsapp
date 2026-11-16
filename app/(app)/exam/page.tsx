"use client";

import { useEffect, useState } from "react";
import clsx from "clsx";
import { useApi } from "@/lib/api";
import { useParent } from "@/lib/parent";
import { useL, useT } from "@/lib/i18n";
import { clock, dayMonth, num } from "@/lib/format";
import type { Report, Schedule } from "@/lib/exam";
import { SubjectRows } from "./subjects";
import { M } from "@/lib/text/more";
import { Empty, ErrorCard, ListSkeleton } from "@/components/ui";
import { CARD, Group, Row, Section, SUPPORT, TITLE, DateBlock, Tabs } from "@/components/kit";
import "@/components/study.css";

type Tab = "schedule" | "result";

/** The Exam screen in the kit look: schedule as dated rows, result as one summary and subject rows. */
export default function ExamPage() {
  const { child } = useParent();
  const L = useL();
  // Unknown until the link is read, so opening "?tab=result" doesn't first load the schedule (audit 2026-11-16).
  const [tab, setTab] = useState<Tab | null>(null);
  useEffect(() => {
    setTab(new URLSearchParams(window.location.search).get("tab") === "result" ? "result" : "schedule");
  }, []);

  return (
    <div className="study space-y-6 pb-4 pt-1">
      <Tabs
        label={L(M.exam)}
        value={tab ?? "schedule"}
        onChange={setTab}
        options={[
          { key: "schedule", text: L({ hi: "टाइम टेबल", en: "Schedule" }) },
          { key: "result", text: L({ hi: "रिज़ल्ट", en: "Result" }) },
        ]}
      />
      {!child || !tab ? <ListSkeleton /> : tab === "schedule" ? <Papers key={child.id} studentId={child.id} /> : <Results key={child.id} studentId={child.id} />}
    </div>
  );
}

const weekday = (iso: string, lang: string) => new Date(iso + "T00:00:00").toLocaleDateString(lang === "hi" ? "hi-IN" : "en-IN", { weekday: lang === "hi" ? "long" : "short" });

/** Each paper of the next exam: date, time, syllabus; total and pass marks once when every paper shares them. */
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

  const first = data.papers[0];
  const shared = data.papers.every((p) => p.max === first.max && p.pass === first.pass);
  const marks = (max: number, pass: number) => `${L({ hi: "कुल", en: "Total" })} ${max} · ${L({ hi: "पास", en: "Pass" })} ${pass}`;

  return (
    <>
      <Section>
        <div className={clsx(CARD, "px-4 py-4")}>
          <p className={TITLE}>{data.exam.title}</p>
          <p className={clsx("tnum mt-1", SUPPORT)}>
            {dayMonth(data.exam.startDate, lang)} – {dayMonth(data.exam.endDate, lang)}
          </p>
          {shared && <p className={clsx("tnum mt-1", SUPPORT)}>{marks(first.max, first.pass)}</p>}
        </div>
      </Section>
      <Section delay={70}>
        <Group>
          {data.papers.map((p) => (
            <Row
              key={p.subject + p.date}
              lead={<DateBlock iso={p.date} lang={lang} />}
              title={p.subject}
              sub={
                <>
                  <span className="tnum">
                    {weekday(p.date, lang)} · {clock(p.start)}–{clock(p.end)}
                  </span>
                  {p.syllabus && <> · {p.syllabus}</>}
                  {!shared && <span className="tnum mt-1 block">{marks(p.max, p.pass)}</span>}
                </>
              }
            />
          ))}
        </Group>
      </Section>
    </>
  );
}

/** The latest exam as one summary and a row per subject, then every exam to open. */
function Results({ studentId }: { studentId: string }) {
  const L = useL();
  const { data, error, reload } = useApi<Report>(`/report-card?student=${studentId}`);

  if (!data) {
    if (error && error.status !== 401) return <ErrorCard offline={error.status === 0} onRetry={reload} />;
    return <ListSkeleton />;
  }
  const c = data.card;
  if (!data.exams.length || !c) return <Empty>{L(M.noResult)}</Empty>;

  return (
    <>
      <Section>
        <div className={clsx(CARD, "px-4 py-4")}>
          <p className={TITLE}>{c.exam.title}</p>
          <p className="tnum mt-2 text-[28px] font-semibold leading-9 text-ink-900">
            {num(c.grand)} / {c.outOf}
          </p>
          <p className={clsx("tnum mt-1", SUPPORT)}>
            {num(c.percent)}%{c.grade ? ` · ${L(M.grade)} ${c.grade}` : ""}
          </p>
        </div>
        <SubjectRows card={c} className="mt-3" />
      </Section>

      <Section title={L({ hi: "सारे रिज़ल्ट", en: "All results" })} delay={70}>
        <Group>
          {data.exams
            .slice()
            .reverse()
            .map((e) => {
              const pct = e.percent ?? (e.id === c.exam.id ? c.percent : undefined);
              const grand = e.grand ?? (e.id === c.exam.id ? c.grand : undefined);
              const outOf = e.outOf ?? (e.id === c.exam.id ? c.outOf : undefined);
              return (
                <Row
                  key={e.id}
                  href={`/exam/detail/?id=${e.id}`}
                  title={e.title}
                  sub={
                    grand !== undefined && outOf ? (
                      <span className="tnum">
                        {num(grand)} / {outOf}
                        {pct !== undefined && ` · ${num(pct)}%`}
                      </span>
                    ) : (
                      L({ hi: "विषयवार अंक देखें", en: "See subject-wise marks" })
                    )
                  }
                />
              );
            })}
        </Group>
      </Section>
    </>
  );
}
