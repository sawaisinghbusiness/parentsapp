"use client";

import { useState } from "react";
import Link from "next/link";
import clsx from "clsx";
import { Bell, ChevronDown } from "lucide-react";
import { useApi } from "@/lib/api";
import { useParent } from "@/lib/parent";
import { useL, useT } from "@/lib/i18n";
import { dayMonth, rupees } from "@/lib/format";
import { Avatar, ErrorCard, OfflineNote, SchoolMark, Skeleton } from "@/components/ui";
import { ChildSheet } from "@/components/ChildSheet";

interface Home {
  date: string;
  attendance: { status: "Present" | "Absent" | "Leave" | "HalfDay" | null; holiday: string | null };
  month?: { percent: number | null; present: number; workingDays: number };
  fees: { dueNow: number; fine: number; balance: number; next: { name: string; due: string; amount: number } | null } | null;
  homework: { id: string; subject: string; title: string; details: string; assignedOn: string; dueDate: string | null }[];
  notice: { id: string; title: string; body: string; date: string } | null;
}

const TODAY = {
  Present: { tone: "text-jade-600", hi: "उपस्थित", en: "Present" },
  Absent: { tone: "text-rose-600", hi: "अनुपस्थित", en: "Absent" },
  Leave: { tone: "text-marigold-500", hi: "छुट्टी पर", en: "On leave" },
  HalfDay: { tone: "text-marigold-500", hi: "आधा दिन", en: "Half day" },
} as const;

/**
 * Home: the school's name on top (it is the school's own app), the child, then one big number on
 * solid sky — fees due when there is any, otherwise attendance — then attendance and today's status,
 * today's homework and the latest message.
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
      {/* School, like its letterhead */}
      <header className="pt-safe">
        <div className="flex items-center gap-2.5 px-4 pb-2 pt-3">
          {me ? <SchoolMark name={me.school.name} url={me.school.logoUrl} size={38} /> : <Skeleton className="h-[38px] w-[38px] rounded-[11px]" />}
          <div className="min-w-0 flex-1">
            <p className="truncate text-[15px] font-semibold leading-tight text-ink-900">{me?.school.name || " "}</p>
            <p className="truncate text-[13px] text-ink-500">{me?.school.address || " "}</p>
          </div>
          <Link href="/more/notices/" className="-mr-2 grid h-11 w-11 place-items-center rounded-full text-ink-800 active:bg-ink-200/60" aria-label={L({ hi: "सूचनाएँ", en: "Notices" })}>
            <Bell className="h-[23px] w-[23px]" strokeWidth={1.8} aria-hidden />
          </Link>
        </div>
      </header>

      <div className="space-y-2.5 px-3 pt-1">
        <OfflineNote show={stale && !!me} />

        {/* Child */}
        {!child ? (
          <div className="card flex items-center gap-3 p-3">
            <Skeleton className="h-10 w-10 rounded-full" />
            <div className="space-y-2">
              <Skeleton className="h-5 w-36" />
              <Skeleton className="h-4 w-24" />
            </div>
          </div>
        ) : (
          <button onClick={() => many && setSwitching(true)} disabled={!many} className="card flex w-full items-center gap-3 p-3 text-left active:bg-ink-50">
            <Avatar name={child.name} url={child.photoUrl} size={42} />
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[17px] font-semibold leading-tight text-ink-900">{child.name}</span>
              <span className="block text-[14px] text-ink-500">
                {L({ hi: "कक्षा", en: "Class" })} {child.classSec}
                {child.rollNo ? ` · ${L({ hi: "रोल", en: "Roll" })} ${child.rollNo}` : ""}
              </span>
            </span>
            {many && (
              <span className="flex shrink-0 items-center gap-0.5 text-[15px] font-semibold text-brand-700">
                {L({ hi: "बदलें", en: "Switch" })}
                <ChevronDown className="h-4 w-4" aria-hidden />
              </span>
            )}
          </button>
        )}

        {error && error.status !== 401 && !data && <ErrorCard offline={error.status === 0} onRetry={reload} />}

        {/* The one number that matters most */}
        {!data ? (
          <div className="hero space-y-3">
            <Skeleton className="h-4 w-20 bg-white/25" />
            <Skeleton className="h-10 w-40 bg-white/25" />
            <Skeleton className="h-12 w-full bg-white/25" />
          </div>
        ) : fees && due > 0 ? (
          <section className="hero">
            <p className="hero-label">{L({ hi: "फ़ीस बाकी", en: "Fees due" })}</p>
            <p className="hero-big">{rupees(due)}</p>
            <p className="hero-sub">{fees.fine > 0 ? `${L({ hi: "लेट फ़ाइन", en: "Late fine" })} ${rupees(fees.fine)} ${L({ hi: "सहित", en: "included" })}` : L({ hi: "अभी जमा करनी है", en: "Due now" })}</p>
            <div className="mt-4 grid grid-cols-2 gap-2.5">
              <Link href="/fees/?pay=1" className="btn-light">
                {L({ hi: "फ़ीस भरें", en: "Pay fees" })}
              </Link>
              <Link href="/fees/" className="btn-glass">
                {L({ hi: "विवरण", en: "Details" })}
              </Link>
            </div>
          </section>
        ) : (
          <Link href="/attendance/" className="hero block">
            <p className="hero-label">{L({ hi: "इस महीने हाज़िरी", en: "Attendance this month" })}</p>
            <p className="hero-big">{pct === null ? "—" : `${pct}%`}</p>
            <p className="hero-sub">
              {data.month && data.month.workingDays > 0
                ? `${data.month.present} / ${data.month.workingDays} ${L({ hi: "दिन उपस्थित", en: "days present" })}`
                : L({ hi: "इस महीने अभी हाज़िरी नहीं लगी", en: "No attendance marked this month yet" })}            </p>
          </Link>
        )}

        {/* Attendance and today */}
        {data && (
          <Link href="/attendance/" className="card grid grid-cols-2 divide-x divide-ink-100 active:bg-ink-50">
            <span className="p-3.5">
              <span className="block text-[14px] text-ink-500">{fees && due > 0 ? L({ hi: "इस महीने हाज़िरी", en: "This month" }) : L({ hi: "फ़ीस", en: "Fees" })}</span>
              {fees && due > 0 ? (
                <span className="tnum block text-[21px] font-semibold text-ink-900">{pct === null ? "—" : `${pct}%`}</span>
              ) : (
                <span className="block text-[21px] font-semibold text-jade-600">{fees ? L({ hi: "सब जमा", en: "Paid" }) : "—"}</span>
              )}
            </span>
            <span className="p-3.5">
              <span className="block text-[14px] text-ink-500">{L({ hi: "आज", en: "Today" })}</span>
              <span className={clsx("block text-[21px] font-semibold", today ? today.tone : "text-ink-500")}>
                {today ? L(today) : data.attendance.holiday ? L({ hi: "छुट्टी", en: "Holiday" }) : L({ hi: "अभी नहीं लगी", en: "Not marked" })}
              </span>
            </span>
          </Link>
        )}

        {/* Today's homework */}
        {hw.length > 0 && (
          <section className="pt-2">
            <div className="sec-title">
              <h2>{L({ hi: "आज का होमवर्क", en: "Today's homework" })}</h2>
              <Link href="/study/" className="-my-3 py-3 text-[14px] font-semibold text-brand-700">
                {L({ hi: "सब देखें", en: "See all" })}
              </Link>
            </div>
            <ul className="card divide-y divide-ink-100">
              {hw.slice(0, 3).map((h) => (
                <li key={h.id}>
                  <Link href="/study/" className="flex items-center gap-3 px-4 py-3 active:bg-ink-50">
                    <span className="min-w-0 flex-1">
                      <span className="block text-[13px] font-medium text-ink-500">{h.subject}</span>
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
          <section className="pt-2">
            <div className="sec-title">
              <h2>{L({ hi: "स्कूल से", en: "From the school" })}</h2>
              <Link href="/more/notices/" className="-my-3 py-3 text-[14px] font-semibold text-brand-700">
                {L({ hi: "सब संदेश", en: "All" })}
              </Link>
            </div>
            <Link href="/more/notices/" className="card block px-4 py-3 active:bg-ink-50">
              <span className="block text-[13px] text-ink-500">{dayMonth(data.notice.date, lang)}</span>
              <span className="block font-semibold leading-snug text-ink-900">{data.notice.title}</span>
              <span className="mt-0.5 line-clamp-2 block text-[15px] leading-snug text-ink-600">{data.notice.body}</span>
            </Link>
          </section>
        )}
      </div>

      {switching && <ChildSheet onClose={() => setSwitching(false)} />}
    </div>
  );
}
