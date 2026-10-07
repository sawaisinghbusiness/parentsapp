"use client";

import { useState } from "react";
import Link from "next/link";
import { Bell, BookOpen, Bus, CalendarCheck, CalendarDays, CalendarX2, ClipboardList, Images, IndianRupee, Megaphone, Search, type LucideIcon } from "lucide-react";
import { useApi } from "@/lib/api";
import { useParent } from "@/lib/parent";
import { useL, useT, type Bi } from "@/lib/i18n";
import { dayMonth, rupees, weekdayDate } from "@/lib/format";
import { Art, EventPicture, type ArtName } from "@/components/art";
import { Avatar, ErrorCard, OfflineNote, Skeleton, TINTS } from "@/components/ui";
import { ChildSheet } from "@/components/ChildSheet";

interface EventRow {
  id: string;
  title: string;
  date: string;
  scene?: string | null;
  coverUrl?: string | null;
}
interface Home {
  date: string;
  attendance: { status: "Present" | "Absent" | "Leave" | "HalfDay" | null; holiday: string | null };
  month?: { percent: number | null; present: number; workingDays: number };
  fees: { dueNow: number; fine: number; balance: number; next: { name: string; due: string; amount: number } | null } | null;
  homework: { id: string; subject: string; title: string; assignedOn: string }[];
  events?: EventRow[];
}

const GRID: { href: string; text: Bi; icon: LucideIcon }[] = [
  { href: "/calendar/", text: { hi: "हाज़िरी", en: "Attendance" }, icon: CalendarCheck },
  { href: "/exam/", text: { hi: "परीक्षा", en: "Exam" }, icon: ClipboardList },
  { href: "/leave/", text: { hi: "छुट्टी", en: "Leave" }, icon: CalendarX2 },
  { href: "/fees/", text: { hi: "फ़ीस", en: "Fees" }, icon: IndianRupee },
  { href: "/homework/", text: { hi: "होमवर्क", en: "Homework" }, icon: BookOpen },
  { href: "/events/", text: { hi: "कार्यक्रम", en: "Events" }, icon: Images },
  { href: "/bus/", text: { hi: "बस", en: "Bus" }, icon: Bus },
  { href: "/notice/", text: { hi: "सूचना", en: "Notice" }, icon: Megaphone },
];

const daysUntil = (from: string, to: string) => Math.round((Date.parse(to) - Date.parse(from)) / 864e5);

/**
 * Home, as the kit lays it out: who and which child, a search, one banner with the single thing
 * that needs the parent today, the eight shortcuts, then upcoming events.
 */
export default function HomePage() {
  const { me, child, stale } = useParent();
  const { data, error, reload } = useApi<Home>(child ? `/home?student=${child.id}` : null);
  const L = useL();
  const { lang } = useT();
  const [switching, setSwitching] = useState(false);
  const many = (me?.children.length || 0) > 1;
  const tint = Math.max(0, me?.children.findIndex((c) => c.id === child?.id) ?? 0);
  const first = child?.name.split(" ")[0] || "";

  // The banner: the one thing that matters most today.
  let banner: { title: string; text: string; href: string; button: string; art: ArtName } | null = null;
  if (data && child) {
    const f = data.fees;
    const due = f ? f.dueNow + f.fine : 0;
    const newHw = data.homework.filter((h) => h.assignedOn === data.date);
    const pct = data.month?.percent;
    if (f && due > 0)
      banner = {
        title: `${L({ hi: "फ़ीस बाकी", en: "Fees due" })} ${rupees(due)}`,
        text: f.fine > 0 ? `${L({ hi: "लेट फ़ाइन सहित", en: "Includes late fine" })} ${rupees(f.fine)}` : L({ hi: "आख़िरी तारीख निकल गई है", en: "The last date has passed" }),
        href: "/fees/?pay=1",
        button: L({ hi: "अभी भरें", en: "Pay now" }),
        art: "child",
      };
    else if (data.attendance.status === "Absent")
      banner = {
        title: L({ hi: `${first} आज अनुपस्थित है`, en: `${first} is absent today` }),
        text: L({ hi: "बीमार है तो छुट्टी की अर्ज़ी भेज दें", en: "If unwell, send a leave application" }),
        href: "/leave/apply/",
        button: L({ hi: "अर्ज़ी भेजें", en: "Apply leave" }),
        art: "calflag",
      };
    else if (newHw.length > 0)
      banner = {
        title: L({ hi: `आज ${newHw.length} होमवर्क मिला`, en: `${newHw.length} new homework today` }),
        text: Array.from(new Set(newHw.map((h) => h.subject))).join(", "),
        href: "/homework/",
        button: L({ hi: "देखें", en: "View" }),
        art: "notebook",
      };
    else if (f?.next && daysUntil(data.date, f.next.due) <= 10)
      banner = {
        title: `${L({ hi: "अगली फ़ीस", en: "Next fees" })} ${rupees(f.next.amount)}`,
        text: `${L({ hi: "आख़िरी तारीख", en: "Last date" })} ${dayMonth(f.next.due, lang)}`,
        href: "/fees/",
        button: L({ hi: "विवरण", en: "Details" }),
        art: "child",
      };
    else
      banner = {
        title: pct == null ? L({ hi: "इस महीने की हाज़िरी", en: "Attendance this month" }) : `${L({ hi: "इस महीने हाज़िरी", en: "Attendance this month" })} ${pct}%`,
        text: data.month && data.month.workingDays > 0 ? `${data.month.present} / ${data.month.workingDays} ${L({ hi: "दिन उपस्थित", en: "days present" })}` : L({ hi: "अभी हाज़िरी नहीं लगी", en: "Not marked yet" }),
        href: "/calendar/",
        button: L({ hi: "कैलेंडर", en: "Calendar" }),
        art: "calflag",
      };
  }

  const events = data?.events || [];

  return (
    <div className="animate-fadeIn">
      <header className="pt-safe">
        <div className="flex items-center gap-2 px-4 pb-1 pt-3">
          <div className="min-w-0 flex-1">
            {child ? (
              <>
                <p className="truncate text-[12px] font-semibold uppercase tracking-[0.03em] text-ink-400">
                  {child.srNo} · {L({ hi: "कक्षा", en: "Class" })} {child.classSec}
                </p>
                <h1 className="truncate text-[21px] font-bold leading-tight">
                  {L({ hi: "नमस्ते,", en: "Hello," })} {first}
                </h1>
              </>
            ) : (
              <div className="space-y-1.5 py-1">
                <Skeleton className="h-3 w-36" />
                <Skeleton className="h-6 w-44" />
              </div>
            )}
          </div>
          <Link href="/notice/" className="grid h-11 w-11 place-items-center rounded-full text-ink-900 active:bg-ink-100" aria-label={L({ hi: "सूचनाएँ", en: "Notices" })}>
            <Bell className="h-[22px] w-[22px]" strokeWidth={1.8} aria-hidden />
          </Link>
          {child &&
            (many ? (
              <button onClick={() => setSwitching(true)} className="rounded-full active:opacity-80" aria-label={`${L({ hi: "बच्चा बदलें", en: "Switch child" })}: ${child.name}`}>
                <Avatar name={child.name} url={child.photoUrl} size={42} tint={tint} />
              </button>
            ) : (
              <Link href="/profile/" className="rounded-full" aria-label={L({ hi: "प्रोफ़ाइल", en: "Profile" })}>
                <Avatar name={child.name} url={child.photoUrl} size={42} tint={tint} />
              </Link>
            ))}
        </div>
      </header>

      <div className="space-y-4 px-4 pt-2">
        <OfflineNote show={stale && !!me} />

        <Link href="/search/" className="flex min-h-[48px] items-center gap-2.5 rounded-xl border border-ink-200 px-3.5 text-[15px] text-ink-400 active:bg-ink-50">
          <Search className="h-[18px] w-[18px]" aria-hidden />
          {L({ hi: "होमवर्क, सूचना खोजें", en: "Search homework, notices" })}
        </Link>

        {error && error.status !== 401 && !data && <ErrorCard offline={error.status === 0} onRetry={reload} />}

        {!banner ? (
          <div className="banner space-y-2.5">
            <Skeleton className="h-5 w-40 bg-brand-100" />
            <Skeleton className="h-3.5 w-32 bg-brand-100" />
            <Skeleton className="h-10 w-24 bg-brand-100" />
          </div>
        ) : (
          <section className="banner">
            <p className="text-[17px] font-bold leading-snug">{banner.title}</p>
            <p className="mb-3 mt-1 text-[13px] leading-snug text-ink-500">{banner.text}</p>
            <Link href={banner.href} className="btn-dark">
              {banner.button}
            </Link>
            <Art name={banner.art} />
          </section>
        )}

        <nav className="grid grid-cols-4 gap-x-1.5 gap-y-3 pt-1" aria-label={L({ hi: "सब कुछ", en: "Everything" })}>
          {GRID.map(({ href, text, icon: Icon }, k) => (
            <Link key={href} href={href} className="icon-tile">
              <span style={{ background: TINTS[k][0], color: TINTS[k][1] }}>
                <Icon className="h-6 w-6" strokeWidth={1.6} aria-hidden />
              </span>
              {L(text)}
            </Link>
          ))}
        </nav>

        {events.length > 0 && (
          <section className="space-y-2.5 pt-1">
            <div className="sec-head">
              <h2>{L({ hi: "आने वाले कार्यक्रम", en: "Upcoming events" })}</h2>
              <Link href="/events/">{L({ hi: "सब देखें ›", en: "View all ›" })}</Link>
            </div>
            <ul className="no-scrollbar -mx-4 flex gap-3 overflow-x-auto px-4 pb-1">
              {events.map((e) => (
                <li key={e.id} className="w-[160px] shrink-0">
                  <EventPicture url={e.coverUrl} scene={e.scene} alt={e.title} className="rounded-xl" />
                  <p className="mt-2 truncate text-[14px] font-semibold">{e.title}</p>
                  <p className="meta">
                    <span>
                      <CalendarDays aria-hidden />
                      {weekdayDate(e.date, lang)}
                    </span>
                  </p>
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>

      {switching && <ChildSheet onClose={() => setSwitching(false)} />}
    </div>
  );
}
