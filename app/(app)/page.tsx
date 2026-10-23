"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import clsx from "clsx";
import {
  Handshake,
  MessageCircle,
  FileText,
  Bell,
  BookOpen,
  Bus,
  CalendarCheck,
  CalendarX2,
  ChevronDown,
  ChevronRight,
  ClipboardList,
  IdCard,
  Images,
  IndianRupee,
  Megaphone,
  Menu as MenuIcon,
  Search,
  type LucideIcon,
} from "lucide-react";
import { useApi } from "@/lib/api";
import { useParent } from "@/lib/parent";
import { useL, useT, type Bi } from "@/lib/i18n";
import { dayMonth, rupees } from "@/lib/format";
import { Avatar, ErrorCard, OfflineNote, Skeleton } from "@/components/ui";
import { ChildSheet } from "@/components/ChildSheet";
import { ProfilePeek } from "@/components/ProfilePeek";
import { EventRow } from "@/components/EventRow";
import { AttendanceIcon, FeesIcon, HomeworkIcon } from "@/components/TodayIcons";
import { useMenu } from "@/lib/menu";
import { ripple } from "@/lib/motion";

interface HomeEvent {
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
  events?: HomeEvent[];
  noticeCount?: number;
}

type Action = { href: string; text: Bi; icon: LucideIcon; tone: string };
// Soft tinted icon backgrounds, phone-app style; full class strings so Tailwind keeps them.
const BLUE = "bg-[#E8F0FE] text-[#1A56C4]";
const GREEN = "bg-[#E6F6EC] text-[#138A43]";
const ORANGE = "bg-[#FFF0E0] text-[#C2610C]";
const PURPLE = "bg-[#F1EBFD] text-[#6D3FC9]";
const TEAL = "bg-[#E2F5F4] text-[#0F7C77]";
const PINK = "bg-[#FDEBEE] text-[#C4314B]";
const QUICK: Action[] = [
  { href: "/calendar/", text: { hi: "हाज़िरी", en: "Attendance" }, icon: CalendarCheck, tone: GREEN },
  { href: "/homework/", text: { hi: "होमवर्क", en: "Homework" }, icon: BookOpen, tone: BLUE },
  { href: "/fees/", text: { hi: "फ़ीस", en: "Fees" }, icon: IndianRupee, tone: ORANGE },
  { href: "/bus/", text: { hi: "बस", en: "Bus" }, icon: Bus, tone: TEAL },
];
// Behind "More" (and "View all"): the rest, opened in place.
const MORE: Action[] = [
  { href: "/teachers/", text: { hi: "टीचर से पूछें", en: "Ask Teacher" }, icon: MessageCircle, tone: PURPLE },
  { href: "/meetings/", text: { hi: "मीटिंग", en: "Meetings" }, icon: Handshake, tone: PINK },
  { href: "/exam/", text: { hi: "परीक्षा", en: "Exam" }, icon: ClipboardList, tone: BLUE },
  { href: "/report-card/", text: { hi: "रिपोर्ट कार्ड", en: "Report Card" }, icon: FileText, tone: GREEN },
  { href: "/leave/", text: { hi: "छुट्टी", en: "Leave" }, icon: CalendarX2, tone: ORANGE },
  { href: "/events/", text: { hi: "कार्यक्रम", en: "Events" }, icon: Images, tone: PINK },
  { href: "/notice/", text: { hi: "सूचना", en: "Notice" }, icon: Megaphone, tone: TEAL },
  { href: "/id-card/", text: { hi: "आईडी कार्ड", en: "ID Card" }, icon: IdCard, tone: PURPLE },
];

let arrived = false;

/** Place in the arrival order (see .enter / .pop-in in globals.css). */
const v = (i: number) => ({ "--i": i }) as React.CSSProperties;


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
  const [switching, setSwitching] = useState(false);
  // Every action shows from the start; "Show less" folds it to the first row.
  const [more, setMore] = useState(true);
  const [peek, setPeek] = useState(false);
  const { openMenu } = useMenu();
  const many = (me?.children.length || 0) > 1;
  const tint = Math.max(0, me?.children.findIndex((c) => c.id === child?.id) ?? 0);
  const unread = data?.noticeCount || 0;
  const events = (data?.events || []).slice(0, 3);
  // The arrival plays once per visit to the app; coming back to Home later, it is simply there.
  const [calm] = useState(arrived);
  useEffect(() => {
    arrived = true;
  }, []);

  // Scrolling folds the photo away (the user's ask, 2026-10-23): it stays pinned while its arched bottom edge
  // rises with the scroll and the picture drifts up a little slower (parallax). The page below does not move
  // at all until the photo has gone; then it scrolls as usual. The menu, notices and child buttons are hidden at first and
  // fade in on a white strip just before the photo is gone (the user's ask: nothing on the photo).
  const heroRef = useRef<HTMLDivElement>(null);
  const bodyRef = useRef<HTMLDivElement>(null);
  const barRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    let frame = 0;
    const paint = () => {
      frame = 0;
      const hero = heroRef.current;
      if (!hero) return;
      const h = hero.offsetHeight;
      const bar = barRef.current?.offsetHeight || 64;
      const fold = Math.min(Math.max(window.scrollY, 0), h);
      hero.style.setProperty("--fold", `${fold}px`);
      // Everything below holds still until the photo has gone: it is pushed down by exactly the scroll so far,
      // and padded by the photo's height so the end of the page can still be reached.
      const body = bodyRef.current;
      if (body) {
        body.style.transform = `translate3d(0, ${fold}px, 0)`;
        body.style.paddingBottom = `${h}px`;
      }
      const shown = Math.min(1, Math.max(0, (fold - (h - bar - 40)) / 40));
      hero.style.setProperty("--bar", String(shown));
      // The buttons can only be tapped once their strip is showing.
      if (barRef.current) barRef.current.style.pointerEvents = shown > 0.5 ? "auto" : "none";
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(paint);
    };
    paint();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (frame) cancelAnimationFrame(frame);
    };
  }, []);

  return (
    <div className={clsx("animate-fadeIn", calm && "calm")}>
      {/* The top, like the reference the user sent (2026-10-23): the school's banner photo is the hero, whole and
          clear (no zoom, no tint, nothing on it). Menu, notices and the child appear on a white strip only once the
          photo has folded away. Search sits just under it. Language is switched from the side menu and Profile. */}
      {/* Pinned to the top; it only lets taps through to its buttons, so the page under it stays usable. */}
      <div ref={heroRef} className="pointer-events-none sticky top-0 z-30 aspect-[1280/720] w-full">
        {/* Option B the user picked: the bottom edge cut as one wide arc, with a soft shadow under it. */}
        <div className="absolute inset-0 drop-shadow-[0_10px_14px_rgba(10,30,36,0.28)]">
          <div className="h-full w-full overflow-hidden [clip-path:ellipse(85%_calc(100%_-_var(--fold,0px))_at_50%_0%)]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/img/home-banner-2.webp" alt={L({ hi: "स्कूल", en: "School" })} width={1280} height={720} className="block h-full w-full object-cover will-change-transform" style={{ transform: "translate3d(0, calc(var(--fold, 0px) * -0.4), 0)" }} />
          </div>
        </div>
        <div ref={barRef} className="pt-safe absolute inset-x-0 top-0 bg-white px-4 pb-2 shadow-[0_4px_12px_rgba(15,47,60,0.12)]" style={{ opacity: "var(--bar, 0)", pointerEvents: "none" }}>
          <div className="enter flex items-center gap-2 pt-3" style={v(0)}>
            <button type="button" onClick={openMenu} aria-label={L({ hi: "मेन्यू", en: "Menu" })} aria-haspopup="dialog" className="grid h-10 w-10 shrink-0 place-items-center rounded-full text-ink-900 active:bg-ink-100">
              <MenuIcon className="h-5 w-5" strokeWidth={2.2} aria-hidden />
            </button>
            <span className="flex-1" />
            <Link href="/notice/" className="relative grid h-10 w-10 shrink-0 place-items-center rounded-full text-ink-900 active:bg-ink-100" aria-label={unread ? `${unread} ${L({ hi: "नई सूचनाएँ", en: "new notices" })}` : L({ hi: "सूचनाएँ", en: "Notices" })}>
            <Bell className={clsx("h-[21px] w-[21px]", unread > 0 && "bell-ring")} strokeWidth={2} aria-hidden />
            {unread > 0 && (
              <span className="badge-pop absolute right-0 top-1 grid h-[17px] min-w-[17px] place-items-center rounded-full border-2 border-white bg-rose-600 px-0.5 text-[10px] font-bold leading-none text-white">
                {unread > 9 ? "9+" : unread}
              </span>
            )}
          </Link>
            {child ? (
              <button
                // With more than one child the photo opens the switcher (the greeting that did this is gone).
                onClick={() => (many ? setSwitching(true) : setPeek(true))}
                aria-haspopup="dialog"
                className="shrink-0 rounded-full ring-2 ring-white shadow-sm transition-transform duration-300 active:scale-90"
                aria-label={many ? `${L({ hi: "बच्चा बदलें", en: "Switch child" })}: ${child.name}` : `${child.name}: ${L({ hi: "विवरण", en: "details" })}`}
              >
                <Avatar name={child.name} url={child.photoUrl} size={38} tint={tint} />
              </button>
            ) : (
              <Skeleton className="h-[38px] w-[38px] shrink-0 rounded-full" />
            )}
          </div>
        </div>
      </div>

      <div ref={bodyRef} className="will-change-transform">
      <div className="px-4">
        <Link href="/search/" className="enter mt-3.5 flex h-12 items-center gap-2.5 rounded-xl border border-ink-100 bg-white px-4 text-ink-500 shadow-sm" style={v(3)} aria-label={L({ hi: "खोजें", en: "Search" })}>
          <Search className="h-[18px] w-[18px] shrink-0 text-ink-700" strokeWidth={2.2} aria-hidden />
          <span className="truncate text-[14.5px]">{L({ hi: "होमवर्क, फ़ीस, सूचना खोजें", en: "Search homework, fees, notices" })}</span>
        </Link>
      </div>

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
          {/* Twelve actions, four to a row; folded, only the first row shows. */}
          <div className="grid grid-cols-4 gap-x-1 gap-y-3">
            {QUICK.map((a, k) => (
              <QuickTile key={a.href} {...a} i={k} />
            ))}
            {more && MORE.map((a, k) => <QuickTile key={a.href} {...a} i={k + QUICK.length} />)}
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
            {/* Plain rows in one card: date box, name, when. No photos. */}
            <ul className="divide-y divide-ink-100 overflow-hidden rounded-2xl border border-ink-100 bg-white shadow-[0_1px_2px_rgba(15,23,42,.04)]">
              {events.map((e) => (
                <li key={e.id}>
                  <EventRow id={e.id} title={e.title} date={e.date} today={data.date} coverUrl={e.coverUrl} scene={e.scene} />
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
      </div>

      {switching && <ChildSheet onClose={() => setSwitching(false)} />}
      {peek && <ProfilePeek onClose={() => setPeek(false)} />}
    </div>
  );
}

/** "Hello," then the name, each sliding up out of its line. */
function QuickTile({ href, text, icon: Icon, tone, i }: Action & { i: number }) {
  const L = useL();
  return (
    <Link href={href} onPointerDown={ripple} className="quick-tile pop-in" style={v(i)}>
      <span className={tone}>
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
  // The day's attendance is told in words; the icon is the same one every day (the user's icon set).
  const attNote =
    a.status === "Present"
      ? L({ hi: "आज उपस्थित", en: "Present today" })
      : a.status === "Absent"
        ? L({ hi: "आज अनुपस्थित", en: "Absent today" })
        : a.status === "Leave"
          ? L({ hi: "आज छुट्टी पर", en: "On leave today" })
          : a.status === "HalfDay"
            ? L({ hi: "आज आधा दिन", en: "Half day today" })
            : a.holiday
              ? a.holiday === "Sunday"
                ? L({ hi: "आज रविवार है", en: "Sunday" })
                : a.holiday
              : L({ hi: "अभी हाज़िरी नहीं लगी", en: "Not marked yet" });

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
        <TodayRow i={4} href="/calendar/" icon={<AttendanceIcon />} title={L({ hi: "हाज़िरी", en: "Attendance" })} note={attNote} />
        <TodayRow
          i={5}
          href={due > 0 ? "/fees/pay/" : "/fees/"}
          icon={<FeesIcon />}
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
          icon={<HomeworkIcon />}
          title={L({ hi: "होमवर्क", en: "Homework" })}
          note={hwNote}
          end={<span className="text-[14.5px] font-semibold text-brand-600">{L({ hi: "देखें", en: "View" })}</span>}
        />
      </ul>
    </section>
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

/** One line of the Today card; `icon` is a 48px tile from components/TodayIcons. */
function TodayRow({ i, href, icon, title, note, end }: { i: number; href: string; icon: React.ReactNode; title: string; note: string; end?: React.ReactNode }) {
  return (
    <li className="enter border-b border-ink-100 last:border-0" style={v(i)}>
      <Link href={href} onPointerDown={ripple} className="relative -mx-4 flex min-h-[72px] items-center gap-3.5 overflow-hidden px-4 py-3">
        <span className="h-12 w-12 shrink-0">{icon}</span>
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
