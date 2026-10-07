"use client";

import { useState } from "react";
import Link from "next/link";
import clsx from "clsx";
import { Bell, BookOpen, CalendarCheck, ChevronDown, ChevronRight, IndianRupee, type LucideIcon } from "lucide-react";
import { useApi } from "@/lib/api";
import { useParent } from "@/lib/parent";
import { useL, useT } from "@/lib/i18n";
import { dayMonth, rupees, weekdayDate } from "@/lib/format";
import { Avatar, ErrorCard, OfflineNote, Skeleton } from "@/components/ui";
import { ChildSheet } from "@/components/ChildSheet";

interface Home {
  date: string;
  attendance: { status: "Present" | "Absent" | "Leave" | "HalfDay" | null; holiday: string | null };
  fees: { dueNow: number; fine: number; balance: number; next: { name: string; due: string; amount: number } | null } | null;
  homework: { id: string; subject: string; title: string; details: string; assignedOn: string; dueDate: string | null }[];
  notice: { id: string; title: string; body: string; date: string } | null;
}

/** One line of the "today" list: icon, what it is, a short detail, and what to do (if anything). */
function Line({ href, icon: Icon, title, detail, end }: { href: string; icon: LucideIcon; title: React.ReactNode; detail?: React.ReactNode; end?: React.ReactNode }) {
  return (
    <Link href={href} className="flex min-h-[68px] items-center gap-4 px-4 py-3 active:bg-ink-50">
      <Icon className="h-6 w-6 shrink-0 text-ink-500" strokeWidth={1.8} aria-hidden />
      <span className="min-w-0 flex-1">
        <span className="block text-[17px] font-semibold leading-snug text-ink-900">{title}</span>
        {detail && <span className="mt-0.5 block text-[15px] leading-snug text-ink-500">{detail}</span>}
      </span>
      {end ?? <ChevronRight className="h-5 w-5 shrink-0 text-ink-300" aria-hidden />}
    </Link>
  );
}

/**
 * Home answers one question: what about my child needs me today? The child at the top, then a
 * short list (attendance, fees, homework), then what the school said. Everything else is a tab
 * or in Profile, so nothing here competes for attention.
 */
export default function HomePage() {
  const { me, child, stale } = useParent();
  const { data, error, reload } = useApi<Home>(child ? `/home?student=${child.id}` : null);
  const L = useL();
  const { lang } = useT();
  const [switching, setSwitching] = useState(false);
  const many = (me?.children.length || 0) > 1;

  const att = data?.attendance;
  const fees = data?.fees;
  const due = fees ? fees.dueNow + fees.fine : 0;
  const hw = data?.homework || [];

  return (
    <div className="animate-fadeIn">
      <header className="pt-safe px-4">
        <div className="flex h-14 items-center gap-2.5">
          {me?.school.logoUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={me.school.logoUrl} alt="" className="h-7 w-7 rounded-md object-contain" />
          )}
          <p className="min-w-0 flex-1 truncate text-[15px] font-medium text-ink-600">{me?.school.name || " "}</p>
          <Link href="/more/notices/" className="-mr-2 grid h-11 w-11 place-items-center rounded-full text-ink-700 active:bg-ink-200/60" aria-label={L({ hi: "सूचनाएँ", en: "Notices" })}>
            <Bell className="h-6 w-6" strokeWidth={1.8} aria-hidden />
          </Link>
        </div>

        {/* The child this screen is about. With siblings, tapping it switches. */}
        {!child ? (
          <div className="flex items-center gap-4 py-4">
            <Skeleton className="h-14 w-14 rounded-full" />
            <div className="space-y-2">
              <Skeleton className="h-7 w-44" />
              <Skeleton className="h-4 w-32" />
            </div>
          </div>
        ) : (
          <button onClick={() => many && setSwitching(true)} disabled={!many} className="flex w-full items-center gap-4 py-4 text-left">
            <Avatar name={child.name} url={child.photoUrl} size={56} />
            <span className="min-w-0 flex-1">
              <span className="flex items-center gap-1 text-[26px] font-semibold leading-tight text-ink-900">
                <span className="truncate">{child.name}</span>
                {many && <ChevronDown className="h-6 w-6 shrink-0 text-ink-500" aria-hidden />}
              </span>
              <span className="block text-[15px] text-ink-500">
                {L({ hi: "कक्षा", en: "Class" })} {child.classSec}
                {child.rollNo ? ` · ${L({ hi: "रोल", en: "Roll" })} ${child.rollNo}` : ""}
              </span>
            </span>
          </button>
        )}
      </header>

      <div className="space-y-6 px-3 pt-2">
        <OfflineNote show={stale && !!me} />
        {error && error.status !== 401 && !data && <ErrorCard offline={error.status === 0} onRetry={reload} />}

        {/* Today */}
        <section>
          <h2 className="px-1 pb-2 text-[15px] font-medium text-ink-500">{data ? weekdayDate(data.date, lang) : L({ hi: "आज", en: "Today" })}</h2>
          {!data ? (
            <div className="card space-y-4 p-4">
              {[0, 1, 2].map((i) => (
                <div key={i} className="flex items-center gap-4">
                  <Skeleton className="h-6 w-6 rounded-md" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-5 w-48" />
                    <Skeleton className="h-4 w-32" />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="card divide-y divide-ink-100 overflow-hidden">
              <Line
                href="/attendance/"
                icon={CalendarCheck}
                title={
                  att?.status === "Present"
                    ? L({ hi: "आज स्कूल में उपस्थित", en: "In school today" })
                    : att?.status === "Absent"
                      ? L({ hi: "आज स्कूल में अनुपस्थित", en: "Absent today" })
                      : att?.status === "Leave"
                        ? L({ hi: "आज छुट्टी पर", en: "On leave today" })
                        : att?.status === "HalfDay"
                          ? L({ hi: "आज आधे दिन", en: "Half day today" })
                          : att?.holiday
                            ? L({ hi: "आज स्कूल की छुट्टी है", en: "School holiday today" })
                            : L({ hi: "आज की हाज़िरी अभी नहीं लगी", en: "Today's attendance not marked yet" })
                }
                detail={L({ hi: "पूरे महीने की हाज़िरी देखें", en: "See the whole month" })}
                end={
                  att?.status ? (
                    <span className={clsx("dot h-3 w-3", att.status === "Present" ? "bg-jade-600" : att.status === "Absent" ? "bg-rose-500" : "bg-marigold-500")} aria-hidden />
                  ) : undefined
                }
              />

              {fees &&
                (due > 0 ? (
                  <Line
                    href="/fees/"
                    icon={IndianRupee}
                    title={
                      <span className="tnum">
                        {rupees(due)} {L({ hi: "फ़ीस बाकी", en: "fees due" })}
                      </span>
                    }
                    detail={fees.fine > 0 ? `${L({ hi: "लेट फ़ाइन", en: "Late fine" })} ${rupees(fees.fine)} ${L({ hi: "सहित", en: "included" })}` : L({ hi: "आख़िरी तारीख निकल चुकी है", en: "The due date has passed" })}
                    end={<span className="shrink-0 rounded-full bg-brand-600 px-4 py-2 text-[15px] font-semibold text-white">{L({ hi: "भरें", en: "Pay" })}</span>}
                  />
                ) : (
                  <Line
                    href="/fees/"
                    icon={IndianRupee}
                    title={L({ hi: "अभी कोई फ़ीस बाकी नहीं", en: "No fees due now" })}
                    detail={fees.next ? <span className="tnum">{`${L({ hi: "अगली किस्त", en: "Next" })} ${rupees(fees.next.amount)} · ${dayMonth(fees.next.due, lang)}`}</span> : undefined}
                  />
                ))}

              <Line
                href="/study/"
                icon={BookOpen}
                title={hw.length ? `${L({ hi: "आज का होमवर्क", en: "Homework today" })}: ${hw.length}` : L({ hi: "आज कोई होमवर्क नहीं", en: "No homework today" })}
                detail={hw.length ? Array.from(new Set(hw.map((h) => h.subject))).join(", ") : L({ hi: "पुराना होमवर्क और टाइम टेबल देखें", en: "See older homework and the timetable" })}
              />
            </div>
          )}
        </section>

        {/* What the school said */}
        {data?.notice && (
          <section>
            <div className="flex items-center justify-between px-1 pb-2">
              <h2 className="text-[15px] font-medium text-ink-500">{L({ hi: "स्कूल से", en: "From the school" })}</h2>
              <Link href="/more/notices/" className="link -my-3 text-[15px]">
                {L({ hi: "सब संदेश", en: "All messages" })}
              </Link>
            </div>
            <Link href="/more/notices/" className="card block px-4 py-4 active:bg-ink-50">
              <div className="flex items-baseline justify-between gap-3">
                <p className="text-[17px] font-semibold leading-snug text-ink-900">{data.notice.title}</p>
                <span className="shrink-0 text-sm text-ink-500">{dayMonth(data.notice.date, lang)}</span>
              </div>
              <p className="mt-1 line-clamp-3 text-[16px] leading-relaxed text-ink-600">{data.notice.body}</p>
            </Link>
          </section>
        )}
      </div>

      {switching && <ChildSheet onClose={() => setSwitching(false)} />}
    </div>
  );
}
