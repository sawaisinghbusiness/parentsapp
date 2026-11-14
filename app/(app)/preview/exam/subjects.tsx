"use client";

import clsx from "clsx";
import { useL } from "@/lib/i18n";
import { num } from "@/lib/format";
import type { Card, Subject } from "@/lib/exam";
import { M } from "@/lib/text/more";
import { Status } from "@/components/ui";
import { Group, SUPPORT, TITLE } from "@/components/kit";

/** One card, a row per subject: marks and grade on the right, a thin bar for the share of the maximum. */
export function SubjectRows({ card: c, parts = false, className }: { card: Card; parts?: boolean; className?: string }) {
  return (
    <Group className={className}>
      {c.subjects.map((s) => (
        <SubjectRow key={s.subject} s={s} card={c} parts={parts} />
      ))}
    </Group>
  );
}

function SubjectRow({ s, card: c, parts }: { s: Subject; card: Card; parts: boolean }) {
  const L = useL();
  const scored = s.entered && !s.absent;
  const pct = scored && s.total !== null && c.exam.max ? Math.min(100, (s.total / c.exam.max) * 100) : 0;
  const multi = parts && c.exam.parts.length > 1 && scored;
  const below = scored && !s.passed;
  return (
    <li className="flex min-h-[72px] flex-col justify-center px-4 py-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className={clsx("break-words", TITLE)}>{s.subject}</p>
          {multi && <p className={clsx("tnum mt-1", SUPPORT)}>{c.exam.parts.map((p) => `${p.name} ${s.marks[p.key] ?? "—"}/${p.max}`).join(" · ")}</p>}
          {below && (
            <p className="mt-1">
              <Status tone="bad">{L({ hi: "पास अंक से कम", en: "Below pass" })}</Status>
            </p>
          )}
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1">
          {!s.entered ? (
            <Status tone="mute">{L(M.notEntered)}</Status>
          ) : s.absent ? (
            <Status tone="bad">{L(M.absent)}</Status>
          ) : (
            <>
              <span className="tnum text-[16px] font-medium leading-6 text-ink-900">
                {s.total === null ? "—" : num(s.total)}/{c.exam.max}
              </span>
              {s.grade && <span className={SUPPORT}>{L(M.grade)} {s.grade}</span>}
            </>
          )}
        </div>
      </div>
      {scored && (
        <div className="mt-2 h-1 overflow-hidden rounded-full bg-[#E6ECF3]" aria-hidden>
          <div className="h-full rounded-full" style={{ width: `${pct}%`, background: s.passed ? "#0D2A5E" : "#A32F35" }} />
        </div>
      )}
    </li>
  );
}
