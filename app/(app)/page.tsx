"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import clsx from "clsx";
import {
  Bell,
  BookOpen,
  Bus,
  CalendarCheck,
  CalendarX2,
  Check,
  ChevronDown,
  ChevronRight,
  ClipboardList,
  Clock3,
  IdCard,
  Images,
  IndianRupee,
  Megaphone,
  MoreHorizontal,
  PartyPopper,
  Search,
  X,
  type LucideIcon,
} from "lucide-react";
import { useApi } from "@/lib/api";
import { useParent } from "@/lib/parent";
import { useL, useT, type Bi } from "@/lib/i18n";
import { dayMonth, rupees } from "@/lib/format";
import { EventPicture } from "@/components/art";
import { Avatar, ErrorCard, OfflineNote, SchoolMark, Skeleton } from "@/components/ui";
import { ChildSheet } from "@/components/ChildSheet";
import { ProfilePeek } from "@/components/ProfilePeek";
import { ripple, tilt } from "@/lib/motion";

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
  fees: { dueNow: number; fine: number; balance: number; next: { name: string; due: string; amount: number } | null } | null;
  homework: { id: string; subject: string; title: string; assignedOn: string }[];
  events?: EventRow[];
  noticeCount?: number;
}

type Action = { href: string; text: Bi; icon: LucideIcon };
const QUICK: Action[] = [
  { href: "/calendar/", text: { hi: "हाज़िरी", en: "Attendance" }, icon: CalendarCheck },
  { href: "/homework/", text: { hi: "होमवर्क", en: "Homework" }, icon: BookOpen },
  { href: "/fees/", text: { hi: "फ़ीस", en: "Fees" }, icon: IndianRupee },
  { href: "/bus/", text: { hi: "बस", en: "Bus" }, icon: Bus },
];
// Behind "More" (and "View all"): the rest, opened in place.
const MORE: Action[] = [
  { href: "/exam/", text: { hi: "परीक्षा", en: "Exam" }, icon: ClipboardList },
  { href: "/leave/", text: { hi: "छुट्टी", en: "Leave" }, icon: CalendarX2 },
  { href: "/events/", text: { hi: "कार्यक्रम", en: "Events" }, icon: Images },
  { href: "/notice/", text: { hi: "सूचना", en: "Notice" }, icon: Megaphone },
  { href: "/id-card/", text: { hi: "आईडी कार्ड", en: "ID Card" }, icon: IdCard },
];

let arrived = false;

/** Place in the arrival order (see .enter / .pop-in in globals.css). */
const v = (i: number) => ({ "--i": i }) as React.CSSProperties;

const daysUntil = (from: string, to: string) => Math.round((Date.parse(to) - Date.parse(from)) / 864e5);

/** "Thu, 09 Oct 2026" / "गुरुवार, 9 अक्टूबर" */
const todayText = (iso: string, lang: "hi" | "en") =>
  new Date(iso + "T00:00:00").toLocaleDateString(lang === "hi" ? "hi-IN" : "en-GB", lang === "hi" ? { weekday: "long", day: "numeric", month: "long" } : { weekday: "short", day: "2-digit", month: "short", year: "numeric" });

/**
 * Home, laid out like the reference the user picked (2026-10-08): the school's mark and name, language,
 * search, notices and the child; "Hello"; a Today card (attendance, fees, homework); quick actions;
 * then upcoming events as photo cards, two to a row.
 */
export default function HomePage() {
  const { me, child, stale } = useParent();
  const { data, error, reload } = useApi<Home>(child ? `/home?student=${child.id}` : null);
  const L = useL();
  const { lang, setLang } = useT();
  const [switching, setSwitching] = useState(false);
  const [more, setMore] = useState(false);
  const [peek, setPeek] = useState(false);
  const many = (me?.children.length || 0) > 1;
  const tint = Math.max(0, me?.children.findIndex((c) => c.id === child?.id) ?? 0);
  const first = child?.name.split(" ")[0] || "";
  const school = me?.school;
  const unread = data?.noticeCount || 0;
  const events = (data?.events || []).slice(0, 2);
  // The arrival plays once per visit to the app; coming back to Home later, it is simply there.
  const [calm] = useState(arrived);
  useEffect(() => {
    arrived = true;
  }, []);

  return (
    <div className={clsx("animate-fadeIn", calm && "calm")}>
      <header className="pt-safe px-4">
        {/* One row like the reference: school, then language, search, notices and the child, all at the top. */}
        <div className="enter flex items-center gap-1.5 pt-4" style={v(0)}>
          {school ? <SchoolMark name={school.name} url={school.logoUrl} size={44} /> : <Skeleton className="h-11 w-11 rounded-xl" />}
          <div className="ml-0.5 min-w-0 flex-1">
            {school ? (
              <>
                <p className="line-clamp-2 text-[13.5px] font-semibold leading-tight text-brand-800">{school.name}</p>
                {school.address && <p className="mt-0.5 truncate text-[11.5px] text-ink-500">{school.address}</p>}
              </>
            ) : (
              <Skeleton className="h-4 w-24" />
            )}
          </div>
          <div className="relative flex shrink-0 rounded-full border border-ink-200 bg-white p-0.5" role="group" aria-label={L({ hi: "भाषा", en: "Language" })}>
            <span aria-hidden className="slide-pill absolute left-0.5 top-0.5 h-7 w-[30px] rounded-full bg-brand-600" style={{ transform: lang === "hi" ? "translateX(30px)" : "none" }} />
            {(["en", "hi"] as const).map((k) => (
              <button
                key={k}
                onClick={() => setLang(k)}
                aria-pressed={lang === k}
                className={clsx("relative h-7 w-[30px] rounded-full text-[12px] font-semibold transition-colors duration-300", lang === k ? "text-white" : "text-ink-500")}
              >
                {k === "en" ? "EN" : "हि"}
              </button>
            ))}
          </div>
          <Link href="/search/" className="grid h-10 w-9 shrink-0 place-items-center rounded-full text-brand-800 active:bg-ink-100" aria-label={L({ hi: "खोजें", en: "Search" })}>
            <Search className="h-[21px] w-[21px]" strokeWidth={2} aria-hidden />
          </Link>
          <Link href="/notice/" className="relative grid h-10 w-9 shrink-0 place-items-center rounded-full text-brand-800 active:bg-ink-100" aria-label={unread ? `${unread} ${L({ hi: "नई सूचनाएँ", en: "new notices" })}` : L({ hi: "सूचनाएँ", en: "Notices" })}>
            <Bell className={clsx("h-[21px] w-[21px]", unread > 0 && "bell-ring")} strokeWidth={2} aria-hidden />
            {unread > 0 && (
              <span className="badge-pop absolute right-0 top-1 grid h-[17px] min-w-[17px] place-items-center rounded-full border-2 border-ink-50 bg-rose-600 px-0.5 text-[10px] font-bold leading-none text-white">
                {unread > 9 ? "9+" : unread}
              </span>
            )}
          </Link>
          {child ? (
            <button
              onClick={() => setPeek(true)}
              aria-haspopup="dialog"
              className="shrink-0 rounded-full ring-2 ring-white transition-transform duration-300 active:scale-90"
              aria-label={`${child.name}: ${L({ hi: "विवरण", en: "details" })}`}
            >
              <Avatar name={child.name} url={child.photoUrl} size={38} tint={tint} />
            </button>
          ) : (
            <Skeleton className="h-[38px] w-[38px] shrink-0 rounded-full" />
          )}
        </div>

        <div className="mt-5">
          <div className="min-w-0">
            {child ? (
              <>
                {many ? (
                  <button onClick={() => setSwitching(true)} className="flex max-w-full items-center gap-1.5 text-left" aria-label={`${L({ hi: "बच्चा बदलें", en: "Switch child" })}: ${child.name}`}>
                    <Greeting name={first} />
                    <ChevronDown className="enter h-5 w-5 shrink-0 text-brand-800" style={v(3)} strokeWidth={2.4} aria-hidden />
                  </button>
                ) : (
                  <Greeting name={first} />
                )}
                <p className="enter mt-0.5 text-[15px] text-ink-500" style={v(2)}>
                  {L({ hi: "कक्षा", en: "Class" })} {child.classSec.replace(/\s*-\s*/, "-")}
                  {child.rollNo && ` · ${L({ hi: "रोल", en: "Roll" })} ${child.rollNo}`}
                </p>
              </>
            ) : (
              <div className="space-y-2 py-1">
                <Skeleton className="h-7 w-44" />
                <Skeleton className="h-4 w-32" />
              </div>
            )}
          </div>
        </div>
      </header>

      <div className="space-y-6 px-4 pt-4">
        <OfflineNote show={stale && !!me} />
        {error && error.status !== 401 && !data && <ErrorCard offline={error.status === 0} onRetry={reload} />}

        <Today data={data} />

        <section className="enter" style={v(4)}>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-[19px] font-bold text-brand-800">{L({ hi: "जल्दी पहुँचें", en: "Quick Actions" })}</h2>
            <button onClick={() => setMore((m) => !m)} className="flex min-h-[44px] items-center gap-0.5 text-[14px] font-medium text-brand-600" aria-expanded={more}>
              {more ? L({ hi: "कम दिखाएँ", en: "Show less" }) : L({ hi: "सब देखें", en: "View all" })}
              <ChevronRight className={clsx("h-4 w-4 transition-transform", more && "rotate-90")} aria-hidden />
            </button>
          </div>
          <div className="grid grid-cols-5 gap-1.5">
            {QUICK.map((a, k) => (
              <QuickTile key={a.href} {...a} i={k} />
            ))}
            <button onClick={() => setMore((m) => !m)} onPointerDown={ripple} aria-expanded={more} className="quick-tile pop-in" style={v(QUICK.length)}>
              <span>
                <MoreHorizontal className={clsx("h-6 w-6 transition-transform duration-500", more && "rotate-90")} strokeWidth={2.2} aria-hidden />
              </span>
              {L({ hi: "और", en: "More" })}
            </button>
            {/* Opened later, so these pop in on their own, without the page's starting delay. */}
            {more && MORE.map((a, k) => <QuickTile key={a.href} {...a} i={k - 5} />)}
          </div>
        </section>

        {events.length > 0 && data && (
          <section className="enter" style={v(5)}>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-[19px] font-bold text-brand-800">{L({ hi: "आने वाले कार्यक्रम", en: "Upcoming Events" })}</h2>
              <Link href="/events/" className="flex min-h-[44px] items-center gap-0.5 text-[14px] font-medium text-brand-600">
                {L({ hi: "सब देखें", en: "View all" })}
                <ChevronRight className="h-4 w-4" aria-hidden />
              </Link>
            </div>
            <ul className={clsx("grid gap-3", events.length > 1 && "grid-cols-2")}>
              {events.map((e, k) => {
                const n = daysUntil(data.date, e.date);
                return (
                  <li key={e.id} className="enter" style={v(6 + k * 1.5)}>
                    <Link href={`/events/album/?id=${encodeURIComponent(e.id)}`} className="event-card tilt" {...tilt}>
                      <EventPicture url={e.coverUrl} scene={e.scene} alt="" className={events.length > 1 ? "!aspect-[4/5]" : "!aspect-[16/8]"} />
                      <i className="glare" aria-hidden />
                      <span className="absolute left-2.5 top-2.5 rounded-full bg-white px-2.5 py-1 text-[12.5px] font-semibold text-ink-900">{dayMonth(e.date, lang)}</span>
                      <span className="absolute inset-x-3 bottom-3 text-white">
                        <span className="line-clamp-2 block text-[16px] font-semibold leading-snug">{e.title}</span>
                        <span className="mt-1 flex items-center gap-1 text-[12.5px] text-white/90">
                          <Clock3 className="h-3.5 w-3.5" aria-hidden />
                          {n <= 0 ? L({ hi: "आज", en: "Today" }) : n === 1 ? L({ hi: "कल", en: "Tomorrow" }) : L({ hi: `${n} दिन में`, en: `In ${n} days` })}
                        </span>
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </section>
        )}
      </div>

      {switching && <ChildSheet onClose={() => setSwitching(false)} />}
      {peek && <ProfilePeek onClose={() => setPeek(false)} />}
    </div>
  );
}

/** "Hello," then the name, each sliding up out of its line. */
function Greeting({ name }: { name: string }) {
  const L = useL();
  return (
    <h1 className="truncate text-[clamp(21px,6.4vw,26px)] font-bold leading-tight text-brand-800">
      <span className="reveal">
        <span style={v(0)}>{L({ hi: "नमस्ते,", en: "Hello," })}</span>
      </span>{" "}
      <span className="reveal">
        <span style={v(1)}>{name}</span>
      </span>
    </h1>
  );
}

function QuickTile({ href, text, icon: Icon, i }: Action & { i: number }) {
  const L = useL();
  return (
    <Link href={href} onPointerDown={ripple} className="quick-tile pop-in" style={v(i)}>
      <span>
        <Icon className="h-6 w-6" strokeWidth={1.8} aria-hidden />
      </span>
      {L(text)}
    </Link>
  );
}

/** The three things a parent checks every morning, each a row that opens its screen. */
function Today({ data }: { data: Home | undefined }) {
  const L = useL();
  const { lang } = useT();
  const shownDue = useCountUp(data?.fees ? data.fees.dueNow + data.fees.fine : 0);

  if (!data)
    return (
      <section className="today-card space-y-3 pb-4">
        <Skeleton className="h-6 w-24" />
        {[0, 1, 2].map((k) => (
          <div key={k} className="flex items-center gap-3.5">
            <Skeleton className="h-12 w-12 rounded-xl" />
            <Skeleton className="h-4 w-28" />
          </div>
        ))}
      </section>
    );

  const a = data.attendance;
  const att: { icon: React.ReactNode; tile: string; note: string } =
    a.status === "Present"
      ? { icon: <Mark className="bg-jade-600" icon={Check} draw />, tile: "bg-jade-50", note: L({ hi: "आज उपस्थित", en: "Present today" }) }
      : a.status === "Absent"
        ? { icon: <Mark className="bg-rose-600" icon={X} />, tile: "bg-rose-50", note: L({ hi: "आज अनुपस्थित", en: "Absent today" }) }
        : a.status === "Leave" || a.status === "HalfDay"
          ? { icon: <Mark className="bg-marigold-500" icon={Check} />, tile: "bg-marigold-50", note: a.status === "Leave" ? L({ hi: "आज छुट्टी पर", en: "On leave today" }) : L({ hi: "आज आधा दिन", en: "Half day today" }) }
          : a.holiday
            ? { icon: <PartyPopper className="h-6 w-6 text-brand-600" strokeWidth={1.8} aria-hidden />, tile: "bg-brand-50", note: a.holiday === "Sunday" ? L({ hi: "आज रविवार है", en: "Sunday" }) : a.holiday }
            : { icon: <Clock3 className="h-6 w-6 text-ink-500" strokeWidth={1.8} aria-hidden />, tile: "bg-ink-100", note: L({ hi: "अभी हाज़िरी नहीं लगी", en: "Not marked yet" }) };

  const f = data.fees;
  const due = f ? f.dueNow + f.fine : 0;
  const feeNote = !f
    ? L({ hi: "विवरण देखें", en: "See details" })
    : due > 0
      ? `${rupees(shownDue)} ${L({ hi: "बाकी", en: "due" })}`
      : f.next
        ? `${L({ hi: "अगली", en: "Next" })} ${rupees(f.next.amount)} · ${dayMonth(f.next.due, lang)}`
        : L({ hi: "कोई फ़ीस बाकी नहीं", en: "No fees due" });

  const newHw = data.homework.filter((h) => h.assignedOn === data.date).length;
  const hwNote = newHw ? L({ hi: `आज ${newHw} होमवर्क मिला`, en: `${newHw} new today` }) : data.homework.length ? L({ hi: `${data.homework.length} बाकी`, en: `${data.homework.length} to do` }) : L({ hi: "आज कोई होमवर्क नहीं", en: "None today" });

  return (
    <section className="today-card enter" style={v(3)}>
      <div className="flex items-baseline justify-between gap-2">
        <h2 className="text-[20px] font-bold text-brand-800">{L({ hi: "आज", en: "Today" })}</h2>
        <span className="truncate text-[13.5px] text-ink-500">{todayText(data.date, lang)}</span>
      </div>
      <ul>
        <TodayRow i={4} href="/calendar/" tile={att.tile} icon={att.icon} title={L({ hi: "हाज़िरी", en: "Attendance" })} note={att.note} />
        <TodayRow
          i={5}
          href={due > 0 ? "/fees/pay/" : "/fees/"}
          tile="bg-brand-50"
          icon={<IndianRupee className="h-6 w-6 text-brand-600" strokeWidth={1.8} aria-hidden />}
          title={L({ hi: "फ़ीस", en: "Fees" })}
          note={feeNote}
          end={
            due > 0 ? (
              <span className="pay-pulse rounded-full bg-brand-600 px-3.5 py-2 text-[13.5px] font-semibold text-white">{L({ hi: "अभी भरें", en: "Pay now" })}</span>
            ) : null
          }
        />
        <TodayRow
          i={6}
          href="/homework/"
          tile="bg-brand-50"
          icon={<BookOpen className="h-6 w-6 text-brand-600" strokeWidth={1.8} aria-hidden />}
          title={L({ hi: "होमवर्क", en: "Homework" })}
          note={hwNote}
          end={<span className="text-[14.5px] font-semibold text-brand-600">{L({ hi: "देखें", en: "View" })}</span>}
        />
      </ul>
    </section>
  );
}

/** A round status mark that pops in; with `draw` its tick draws itself. */
function Mark({ className, icon: Icon, draw }: { className: string; icon: LucideIcon; draw?: boolean }) {
  return (
    <span className={clsx("tick-pop grid h-7 w-7 place-items-center rounded-full text-white", className)}>
      <Icon className={clsx("h-4 w-4", draw && "tick-draw")} strokeWidth={3} aria-hidden />
    </span>
  );
}

/** Counts up to `target` once (about 0.9 s, easing out); jumps straight there for "Reduce motion". */
function useCountUp(target: number) {
  const [n, setN] = useState(0);
  useEffect(() => {
    if (!target || arrived || window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setN(target);
      return;
    }
    let raf = 0;
    const start = performance.now() + 450;
    const step = (now: number) => {
      const t = Math.min(1, Math.max(0, (now - start) / 900));
      setN(Math.round(target * (1 - Math.pow(1 - t, 3))));
      if (t < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [target]);
  return n;
}

function TodayRow({ i, href, tile, icon, title, note, end }: { i: number; href: string; tile: string; icon: React.ReactNode; title: string; note: string; end?: React.ReactNode }) {
  return (
    <li className="enter border-b border-ink-100 last:border-0" style={v(i)}>
      <Link href={href} onPointerDown={ripple} className="relative -mx-4 flex min-h-[72px] items-center gap-3.5 overflow-hidden px-4 py-3">
        <span className={clsx("grid h-12 w-12 shrink-0 place-items-center rounded-xl", tile)}>{icon}</span>
        <span className="min-w-0 flex-1">
          <span className="block text-[16px] font-semibold text-ink-900">{title}</span>
          <span className="block truncate text-[13px] text-ink-500">{note}</span>
        </span>
        {end}
        <ChevronRight className="h-[18px] w-[18px] shrink-0 text-ink-400" aria-hidden />
      </Link>
    </li>
  );
}
