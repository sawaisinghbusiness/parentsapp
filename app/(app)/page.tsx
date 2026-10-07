"use client";

import { useState } from "react";
import Link from "next/link";
import clsx from "clsx";
import { Bell, BookOpen, Bus, CalendarClock, CalendarOff, ChevronDown, ChevronRight, GraduationCap, IdCard, IndianRupee, type LucideIcon } from "lucide-react";
import { useApi } from "@/lib/api";
import { useParent } from "@/lib/parent";
import { useL, useT, type Bi } from "@/lib/i18n";
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

const ATT: Record<string, { dot: string; text: Bi }> = {
  Present: { dot: "bg-jade-600", text: { hi: "उपस्थित", en: "Present" } },
  Absent: { dot: "bg-rose-500", text: { hi: "अनुपस्थित", en: "Absent" } },
  Leave: { dot: "bg-marigold-500", text: { hi: "छुट्टी पर", en: "On leave" } },
  HalfDay: { dot: "bg-marigold-500", text: { hi: "आधा दिन", en: "Half day" } },
};

/** One-tap shortcuts. Icons stay one colour: meaning comes from the label, not a rainbow of tiles. */
const ACTIONS: { href: string; icon: LucideIcon; text: Bi }[] = [
  { href: "/fees/", icon: IndianRupee, text: { hi: "फ़ीस", en: "Fees" } },
  { href: "/study/", icon: BookOpen, text: { hi: "होमवर्क", en: "Homework" } },
  { href: "/study/?tab=timetable", icon: CalendarClock, text: { hi: "टाइम टेबल", en: "Timetable" } },
  { href: "/more/report-card/", icon: GraduationCap, text: { hi: "रिज़ल्ट", en: "Result" } },
  { href: "/more/notices/", icon: Bell, text: { hi: "सूचनाएँ", en: "Notices" } },
  { href: "/more/leave/", icon: CalendarOff, text: { hi: "छुट्टी", en: "Leave" } },
  { href: "/more/bus/", icon: Bus, text: { hi: "बस", en: "Bus" } },
  { href: "/more/id-card/", icon: IdCard, text: { hi: "आईडी कार्ड", en: "ID card" } },
];

export default function HomePage() {
  const { me, child, stale } = useParent();
  const { data, error, reload } = useApi<Home>(child ? `/home?student=${child.id}` : null);
  const L = useL();
  const { lang } = useT();
  const [switching, setSwitching] = useState(false);
  const many = (me?.children.length || 0) > 1;
  const parentName = child?.fatherName || "";

  const att = data?.attendance;
  const fees = data?.fees;
  const due = fees ? fees.dueNow + fees.fine : 0;

  return (
    <div className="animate-fadeIn">
      {/* Header: school, greeting. The child card overlaps its lower edge. */}
      <header className="pt-safe bg-night-900 px-4 pb-20 text-white">
        <div className="flex h-14 items-center gap-2.5">
          {me?.school.logoUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={me.school.logoUrl} alt="" className="h-8 w-8 rounded-lg bg-white object-contain p-0.5" />
          )}
          <p className="min-w-0 flex-1 truncate text-[15px] font-semibold text-white/85">{me?.school.name || " "}</p>
          <Link href="/more/notices/" className="grid h-11 w-11 place-items-center rounded-xl text-white/85" aria-label={L({ hi: "सूचनाएँ", en: "Notices" })}>
            <Bell className="h-[22px] w-[22px]" aria-hidden />
          </Link>
        </div>
        <p className="mt-3 text-[15px] text-white/60">{data ? weekdayDate(data.date, lang) : " "}</p>
        <p className="mt-0.5 text-[22px] font-bold leading-tight">
          {L({ hi: "नमस्ते", en: "Hello" })}
          {parentName ? `, ${parentName.split(" ")[0]} ${L({ hi: "जी", en: "" })}`.trimEnd() : ""}
        </p>
      </header>

      <div className="-mt-14 space-y-4 px-3">
        <OfflineNote show={stale && !!me} />

        {/* The child: who, and how today looks at a glance */}
        <section className="card overflow-hidden">
          {!child ? (
            <div className="flex items-center gap-3 p-4">
              <Skeleton className="h-16 w-16 rounded-2xl" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-5 w-40" />
                <Skeleton className="h-4 w-28" />
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-3.5 p-4">
              <Avatar name={child.name} url={child.photoUrl} size={64} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-[19px] font-bold leading-tight text-ink-900">{child.name}</p>
                <p className="mt-0.5 text-[15px] text-ink-500">
                  {L({ hi: "कक्षा", en: "Class" })} {child.classSec}
                  {child.rollNo ? ` · ${L({ hi: "रोल", en: "Roll" })} ${child.rollNo}` : ""}
                </p>
              </div>
              {many && (
                <button onClick={() => setSwitching(true)} className="flex min-h-[44px] shrink-0 items-center gap-1 rounded-xl border border-ink-200 px-3 text-sm font-semibold text-ink-700">
                  {L({ hi: "बदलें", en: "Switch" })} <ChevronDown className="h-4 w-4" aria-hidden />
                </button>
              )}
            </div>
          )}

          <div className="grid grid-cols-2 divide-x divide-ink-100 border-t border-ink-100">
            <Link href="/attendance/" className="px-4 py-3 active:bg-ink-50">
              <p className="text-[13px] font-medium text-ink-500">{L({ hi: "आज की हाज़िरी", en: "Today" })}</p>
              {!data ? (
                <Skeleton className="mt-1.5 h-5 w-24" />
              ) : (
                <p className="mt-0.5 flex items-center gap-2 text-[17px] font-bold text-ink-900">
                  {att?.status ? (
                    <>
                      <span className={clsx("dot", ATT[att.status].dot)} aria-hidden />
                      {L(ATT[att.status].text)}
                    </>
                  ) : att?.holiday ? (
                    <>
                      <span className="dot bg-ink-300" aria-hidden />
                      {L({ hi: "छुट्टी", en: "Holiday" })}
                    </>
                  ) : (
                    <span className="font-semibold text-ink-500">{L({ hi: "अभी नहीं लगी", en: "Not marked" })}</span>
                  )}
                </p>
              )}
            </Link>
            <Link href="/fees/" className="px-4 py-3 active:bg-ink-50">
              <p className="text-[13px] font-medium text-ink-500">{L({ hi: "फ़ीस", en: "Fees" })}</p>
              {!data ? (
                <Skeleton className="mt-1.5 h-5 w-24" />
              ) : (
                <p className="tnum mt-0.5 flex items-center gap-2 text-[17px] font-bold text-ink-900">
                  <span className={clsx("dot", due > 0 ? "bg-rose-500" : "bg-jade-600")} aria-hidden />
                  {due > 0 ? `${rupees(due)} ${L({ hi: "बाकी", en: "due" })}` : L({ hi: "सब जमा", en: "All paid" })}
                </p>
              )}
            </Link>
          </div>
        </section>

        {/* Shortcuts */}
        <nav className="card grid grid-cols-4 gap-y-1 px-1 py-3" aria-label={L({ hi: "सेवाएँ", en: "Services" })}>
          {ACTIONS.map(({ href, icon: Icon, text }) => (
            <Link key={href} href={href} className="flex flex-col items-center gap-1.5 rounded-xl px-1 py-2 active:bg-ink-50">
              <span className="grid h-12 w-12 place-items-center rounded-2xl bg-ink-50 ring-1 ring-ink-100">
                <Icon className="h-[22px] w-[22px] text-ink-800" strokeWidth={1.8} aria-hidden />
              </span>
              <span className="text-center text-[13px] font-medium leading-tight text-ink-700">{L(text)}</span>
            </Link>
          ))}
        </nav>

        {error && error.status !== 401 && !data && <ErrorCard offline={error.status === 0} onRetry={reload} />}

        {/* Fees due: only when something is due, so the screen stays calm otherwise */}
        {data && fees && due > 0 && (
          <section className="card p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[15px] font-semibold text-ink-900">{L({ hi: "फ़ीस जमा करनी है", en: "Fees to pay" })}</p>
                <p className="mt-0.5 text-sm text-ink-500">
                  {fees.fine > 0 ? `${rupees(fees.dueNow)} + ${L({ hi: "लेट फ़ाइन", en: "late fine" })} ${rupees(fees.fine)}` : L({ hi: "आख़िरी तारीख निकल चुकी है", en: "The due date has passed" })}
                </p>
              </div>
              <p className="tnum text-[24px] font-extrabold leading-none text-ink-900">{rupees(due)}</p>
            </div>
            <Link href="/fees/" className="btn-primary mt-4 w-full">
              {L({ hi: "अभी भरें", en: "Pay now" })}
            </Link>
          </section>
        )}

        {/* Homework */}
        <section className="card p-4">
          <div className="flex items-center justify-between">
            <h2 className="text-[17px] font-bold text-ink-900">{L({ hi: "आज का होमवर्क", en: "Today's homework" })}</h2>
            <Link href="/study/" className="link -my-2 text-sm">
              {L({ hi: "सब देखें", en: "See all" })} <ChevronRight className="h-4 w-4" aria-hidden />
            </Link>
          </div>
          {!data ? (
            <div className="mt-3 space-y-2">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-5 w-3/4" />
            </div>
          ) : data.homework.length === 0 ? (
            <p className="mt-2 text-ink-600">{L({ hi: "आज कोई होमवर्क नहीं दिया गया।", en: "No homework today." })}</p>
          ) : (
            <ul className="mt-1 divide-y divide-ink-100">
              {data.homework.slice(0, 3).map((h) => (
                <li key={h.id} className="flex gap-3 py-3 last:pb-0">
                  <span className="mt-0.5 shrink-0 rounded-lg bg-ink-50 px-2 py-1 text-[13px] font-semibold text-ink-700 ring-1 ring-ink-100">{h.subject}</span>
                  <div className="min-w-0">
                    <p className="font-medium leading-snug text-ink-900">{h.title}</p>
                    {h.dueDate && (
                      <p className="mt-0.5 text-sm text-ink-500">
                        {L({ hi: "जमा करें", en: "Due" })}: {dayMonth(h.dueDate, lang)}
                      </p>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Latest message from school */}
        {data?.notice && (
          <Link href="/more/notices/" className="card block p-4 active:bg-ink-50">
            <div className="flex items-center justify-between">
              <h2 className="text-[17px] font-bold text-ink-900">{L({ hi: "स्कूल का संदेश", en: "From the school" })}</h2>
              <span className="text-sm text-ink-500">{dayMonth(data.notice.date, lang)}</span>
            </div>
            <p className="mt-2 font-semibold text-ink-900">{data.notice.title}</p>
            <p className="mt-1 line-clamp-2 text-ink-600">{data.notice.body}</p>
          </Link>
        )}
      </div>

      {switching && <ChildSheet onClose={() => setSwitching(false)} />}
    </div>
  );
}
