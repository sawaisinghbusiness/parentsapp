"use client";

import { useState } from "react";
import Link from "next/link";
import clsx from "clsx";
import { Bell, ChevronDown } from "lucide-react";
import { useApi } from "@/lib/api";
import { useParent } from "@/lib/parent";
import { useL, useT } from "@/lib/i18n";
import { dayMonth, rupees, weekdayDate } from "@/lib/format";
import { Avatar, ErrorCard, OfflineNote, Skeleton } from "@/components/ui";
import { ChildSheet } from "@/components/ChildSheet";

interface Home {
  date: string;
  attendance: { status: "Present" | "Absent" | "Leave" | "HalfDay" | null; holiday: string | null };
  month?: { percent: number | null; present: number; workingDays: number };
  result?: { exam: string; percent: number; grade: string | null } | null;
  fees: { dueNow: number; fine: number; balance: number; next: { name: string; due: string; amount: number } | null } | null;
  homework: { id: string; subject: string; title: string; details: string; assignedOn: string; dueDate: string | null }[];
  notice: { id: string; title: string; body: string; date: string } | null;
}

const TODAY = {
  Present: { dot: "bg-jade-600", hi: "उपस्थित", en: "Present" },
  Absent: { dot: "bg-rose-600", hi: "अनुपस्थित", en: "Absent" },
  Leave: { dot: "bg-marigold-500", hi: "छुट्टी पर", en: "On leave" },
  HalfDay: { dot: "bg-marigold-500", hi: "आधा दिन", en: "Half day" },
} as const;

/** One cell of the dashboard: what it is, the number, one line of context. The whole cell opens the screen. */
function Tile({ href, label, value, tone, foot }: { href: string; label: string; value: React.ReactNode; tone?: "good" | "bad"; foot: React.ReactNode }) {
  return (
    <Link href={href} className="flex min-h-[112px] flex-col p-4 active:bg-ink-50">
      <span className="text-[14px] font-medium text-ink-500">{label}</span>
      <span className={clsx("tnum mt-1 text-[26px] font-semibold leading-none", tone === "bad" ? "text-rose-700" : tone === "good" ? "text-jade-700" : "text-ink-900")}>{value}</span>
      <span className="mt-auto pt-2 text-[14px] leading-snug text-ink-600">{foot}</span>
    </Link>
  );
}

/**
 * Home is the child's dashboard: four numbers a parent checks (attendance this month, fees,
 * today's homework, last result), the one thing to do (pay, only when due), then today's
 * homework and the latest message. Each number opens its screen.
 */
export default function HomePage() {
  const { me, child, stale } = useParent();
  const { data, error, reload } = useApi<Home>(child ? `/home?student=${child.id}` : null);
  const L = useL();
  const { lang } = useT();
  const [switching, setSwitching] = useState(false);
  const many = (me?.children.length || 0) > 1;

  const fees = data?.fees;
  const due = fees ? fees.dueNow + fees.fine : 0;
  const hw = data?.homework || [];
  const pct = data?.month?.percent ?? null;
  const today = data?.attendance.status ? TODAY[data.attendance.status] : null;

  return (
    <div className="animate-fadeIn">
      <header className="pt-safe px-4">
        <div className="flex h-12 items-center gap-2.5">
          {me?.school.logoUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={me.school.logoUrl} alt="" className="h-6 w-6 rounded object-contain" />
          )}
          <p className="min-w-0 flex-1 truncate text-[15px] font-medium text-ink-600">{me?.school.name || " "}</p>
          <Link href="/more/notices/" className="-mr-2 grid h-11 w-11 place-items-center rounded-full text-ink-700 active:bg-ink-200/60" aria-label={L({ hi: "सूचनाएँ", en: "Notices" })}>
            <Bell className="h-[22px] w-[22px]" strokeWidth={1.8} aria-hidden />
          </Link>
        </div>

        {!child ? (
          <div className="flex items-center gap-3 py-3">
            <Skeleton className="h-11 w-11 rounded-full" />
            <div className="space-y-2">
              <Skeleton className="h-6 w-40" />
              <Skeleton className="h-4 w-28" />
            </div>
          </div>
        ) : (
          <button onClick={() => many && setSwitching(true)} disabled={!many} className="flex w-full items-center gap-3 py-3 text-left">
            <Avatar name={child.name} url={child.photoUrl} size={44} />
            <span className="min-w-0 flex-1">
              <span className="flex items-center gap-1 text-[20px] font-semibold leading-tight text-ink-900">
                <span className="truncate">{child.name}</span>
                {many && <ChevronDown className="h-5 w-5 shrink-0 text-ink-500" aria-hidden />}
              </span>
              <span className="block text-[14px] text-ink-500">
                {L({ hi: "कक्षा", en: "Class" })} {child.classSec}
                {child.rollNo ? ` · ${L({ hi: "रोल", en: "Roll" })} ${child.rollNo}` : ""}
                {data ? ` · ${weekdayDate(data.date, lang)}` : ""}
              </span>
            </span>
          </button>
        )}
      </header>

      <div className="space-y-4 px-3 pt-1">
        <OfflineNote show={stale && !!me} />
        {error && error.status !== 401 && !data && <ErrorCard offline={error.status === 0} onRetry={reload} />}

        {/* Dashboard */}
        {!data ? (
          <div className="card grid grid-cols-2 divide-x divide-y divide-ink-100">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="space-y-3 p-4">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-7 w-16" />
                <Skeleton className="h-4 w-24" />
              </div>
            ))}
          </div>
        ) : (
          <section className="card grid grid-cols-2 overflow-hidden [&>*:nth-child(-n+2)]:border-b [&>*:nth-child(odd)]:border-r [&>*]:border-ink-100">
            <Tile
              href="/attendance/"
              label={L({ hi: "इस महीने हाज़िरी", en: "Attendance this month" })}
              value={pct === null ? "—" : `${pct}%`}
              foot={
                <>
                  {pct !== null && (
                    <span className="mb-2 block h-1.5 overflow-hidden rounded-full bg-ink-100">
                      <span className={clsx("block h-full rounded-full", pct >= 75 ? "bg-jade-600" : "bg-rose-600")} style={{ width: `${pct}%` }} />
                    </span>
                  )}
                  <span className="flex items-center gap-1.5">
                    {today ? <span className={clsx("dot h-2 w-2", today.dot)} aria-hidden /> : null}
                    {L({ hi: "आज", en: "Today" })}: {today ? L(today) : data.attendance.holiday ? L({ hi: "छुट्टी", en: "holiday" }) : L({ hi: "अभी नहीं लगी", en: "not marked" })}
                  </span>
                </>
              }
            />
            <Tile
              href="/fees/"
              label={L({ hi: "फ़ीस", en: "Fees" })}
              value={!fees ? "—" : due > 0 ? rupees(due) : L({ hi: "सब जमा", en: "Paid" })}
              tone={!fees ? undefined : due > 0 ? "bad" : "good"}
              foot={
                !fees
                  ? L({ hi: "जानकारी नहीं मिली", en: "Not available" })
                  : due > 0
                    ? fees.fine > 0
                      ? `${L({ hi: "बाकी, फ़ाइन", en: "due, fine" })} ${rupees(fees.fine)} ${L({ hi: "सहित", en: "incl." })}`
                      : L({ hi: "बाकी है", en: "due now" })
                    : fees.next
                      ? `${L({ hi: "अगली", en: "Next" })} ${rupees(fees.next.amount)} · ${dayMonth(fees.next.due, lang)}`
                      : L({ hi: "पूरे साल की जमा", en: "Whole year paid" })
              }
            />
            <Tile
              href="/study/"
              label={L({ hi: "आज का होमवर्क", en: "Homework today" })}
              value={hw.length}
              foot={<span className="line-clamp-1">{hw.length ? Array.from(new Set(hw.map((h) => h.subject))).join(", ") : L({ hi: "आज कोई नहीं", en: "None today" })}</span>}
            />
            <Tile
              href="/more/report-card/"
              label={L({ hi: "पिछला रिज़ल्ट", en: "Last result" })}
              value={data.result ? `${data.result.percent}%` : "—"}
              foot={<span className="line-clamp-1">{data.result ? `${data.result.grade ? data.result.grade + " · " : ""}${data.result.exam}` : L({ hi: "अभी नहीं आया", en: "Not out yet" })}</span>}
            />
          </section>
        )}

        {/* The one thing to do, only when there is one */}
        {data && fees && due > 0 && (
          <Link href="/fees/" className="btn-primary w-full">
            <span className="tnum">{rupees(due)}</span> {L({ hi: "फ़ीस भरें", en: "— pay fees" })}
          </Link>
        )}

        {/* Today's homework */}
        {hw.length > 0 && (
          <section>
            <div className="flex items-center justify-between px-1 pb-1.5">
              <h2 className="text-[15px] font-semibold text-ink-700">{L({ hi: "आज का होमवर्क", en: "Today's homework" })}</h2>
              <Link href="/study/" className="link -my-3 text-[15px]">
                {L({ hi: "सब देखें", en: "See all" })}
              </Link>
            </div>
            <ul className="card divide-y divide-ink-100">
              {hw.slice(0, 3).map((h) => (
                <li key={h.id}>
                  <Link href="/study/" className="flex items-center gap-3 px-4 py-3 active:bg-ink-50">
                    <span className="min-w-0 flex-1">
                      <span className="block text-[14px] font-medium text-ink-500">{h.subject}</span>
                      <span className="block leading-snug text-ink-900">{h.title}</span>
                    </span>
                    {h.dueDate && <span className="shrink-0 text-[14px] text-ink-500">{dayMonth(h.dueDate, lang)}</span>}
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* Latest message */}
        {data?.notice && (
          <section>
            <div className="flex items-center justify-between px-1 pb-1.5">
              <h2 className="text-[15px] font-semibold text-ink-700">{L({ hi: "स्कूल से", en: "From the school" })}</h2>
              <Link href="/more/notices/" className="link -my-3 text-[15px]">
                {L({ hi: "सब संदेश", en: "All" })}
              </Link>
            </div>
            <Link href="/more/notices/" className="card flex items-start gap-3 px-4 py-3 active:bg-ink-50">
              <span className="min-w-0 flex-1">
                <span className="block font-semibold leading-snug text-ink-900">{data.notice.title}</span>
                <span className="mt-0.5 line-clamp-2 block text-[15px] leading-snug text-ink-600">{data.notice.body}</span>
              </span>
              <span className="shrink-0 pt-0.5 text-[14px] text-ink-500">{dayMonth(data.notice.date, lang)}</span>
            </Link>
          </section>
        )}
      </div>

      {switching && <ChildSheet onClose={() => setSwitching(false)} />}
    </div>
  );
}
