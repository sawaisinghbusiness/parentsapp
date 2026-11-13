"use client";

/**
 * Home, from the mockup the user approved on 2026-11-13 (built and reviewed first as a /home-new preview).
 *
 * One colour family: navy for brand and emphasis, white cards, grey-blue lines and quiet text.
 * Gutter 16px, gap 12px between blocks, card radius 14px. The bottom tab bar lives in AppShell.
 *
 * DEMO: in development only, where the child has no data yet (no attendance this month, no notice,
 * no event), sample values fill in so the design can be judged. Production never shows them.
 */

import "@fontsource-variable/plus-jakarta-sans";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Bell, BookOpen, CalendarCheck, ChevronDown, ChevronRight, Clock, RotateCw, Trophy, Wallet, WifiOff } from "lucide-react";
import { useParent } from "@/lib/parent";
import { useApi } from "@/lib/api";
import { useL, useT } from "@/lib/i18n";
import { initials } from "@/lib/format";
import { useMenu } from "@/lib/menu";
import { ChildSheet } from "@/components/ChildSheet";

const NAVY = "#0D2A5E";
const INK = "#121C33";
const MUTED = "#5B6478";
const LINE = "#DFE5EF";
const TILE = "#EAF0FA";

type Lang = "hi" | "en";
interface Month {
  percent: number | null;
  present: number;
  absent?: number;
  workingDays: number;
}
interface HomeData {
  date: string;
  month: Month;
  events?: { id: string; title: string; date: string; time?: string }[];
  notice: { id: string; title: string; date: string } | null;
  noticeCount?: number;
  attendance?: { status: "Present" | "Absent" | "Leave" | "HalfDay" | null; holiday: string | null };
  fees?: { dueNow: number; fine: number; balance: number } | null;
  homework?: { id: string }[];
  result?: { exam: string; percent: number; grade: string } | null;
}

/** Sample values for development only (see the note at the top). */
const DEMO_ON = process.env.NODE_ENV !== "production";
const DEMO = {
  month: { percent: 92, present: 22, absent: 2, workingDays: 24 } as Month,
  notice: { id: "demo", title: "Winter Vacation Notice", date: "2026-10-30" },
  event: { id: "demo", title: "PTM Meeting", date: "2026-11-04", time: "10:00 AM - 12:00 PM" },
  noticeCount: 3,
};

/**
 * The scroll effect (approved 2026-11-13): the building moves at half the page's speed, so the cards
 * slide over it and it sinks behind them; a navy shade deepens and the greeting fades and lifts a little.
 * Writes styles straight to the elements once per frame (no re-render). Off for "Reduce motion".
 */
function useHeroScroll() {
  const img = useRef<HTMLImageElement>(null);
  const shade = useRef<HTMLDivElement>(null);
  const text = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let frame = 0;
    const paint = () => {
      frame = 0;
      const y = Math.min(Math.max(window.scrollY, 0), 320);
      if (img.current) img.current.style.transform = `translate3d(0, ${y * 0.5}px, 0) scale(${1 + y / 2400})`;
      if (shade.current) shade.current.style.opacity = String(Math.min(y / 260, 1) * 0.55);
      if (text.current) {
        text.current.style.opacity = String(Math.max(1 - y / 200, 0));
        text.current.style.transform = `translate3d(0, ${y * 0.25}px, 0)`;
      }
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(paint);
    };
    paint();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      if (frame) cancelAnimationFrame(frame);
    };
  }, []);
  return { img, shade, text };
}

export default function HomePage() {
  const fx = useHeroScroll();
  const { me, child, stale } = useParent();
  const { data, error, stale: homeStale, reload } = useApi<HomeData>(child ? `/home?student=${child.id}` : null);
  const L = useL();
  const { lang } = useT();
  const { openMenu } = useMenu();
  const [switching, setSwitching] = useState(false);
  const many = (me?.children.length || 0) > 1;
  const school = me?.school;
  const town = school?.address?.split(",").map((s) => s.trim()).filter(Boolean).pop() || "";
  const first = child?.name.split(" ")[0] || "";
  const [hour, setHour] = useState(9);
  useEffect(() => setHour(new Date().getHours()), []);
  const greet = hour < 12 ? L({ hi: "सुप्रभात,", en: "Good Morning," }) : hour < 17 ? L({ hi: "नमस्ते,", en: "Good Afternoon," }) : L({ hi: "शुभ संध्या,", en: "Good Evening," });

  // Real data first; in development the sample fills only what is empty.
  const month = data ? (data.month.percent === null && DEMO_ON ? DEMO.month : data.month) : undefined;
  const notice = data ? data.notice || (DEMO_ON ? DEMO.notice : null) : undefined;
  const ev = data ? data.events?.[0] || (DEMO_ON ? DEMO.event : null) : undefined;
  const unread = data ? data.noticeCount ?? (DEMO_ON ? DEMO.noticeCount : 0) : 0;
  const failed = error && error.status !== 401 && !data ? error : null;

  const childCard = (
    <>
      <span className="grid w-[92px] shrink-0 place-items-center bg-[#F1F4F9]">{child && <ChildPhoto key={child.id} name={child.name} url={child.photoUrl} />}</span>
      <span className="flex min-w-0 flex-1 flex-col justify-center pl-4 text-left">
        <span className="truncate text-[17px] font-semibold">{child?.name}</span>
        <span className="mt-1 truncate text-[13.5px]" style={{ color: MUTED }}>
          {child ? `${L({ hi: "कक्षा", en: "Class" })} ${child.classSec}  •  ${L({ hi: "रोल नं.", en: "Roll No." })} ${child.rollNo}` : ""}
        </span>
      </span>
      <span className="grid w-11 place-items-center">
        <ChevronRight className="h-5 w-5" strokeWidth={2.4} aria-hidden />
      </span>
    </>
  );
  const cardClass = "flex h-[76px] w-full items-stretch overflow-hidden rounded-[14px] border bg-white shadow-[0_4px_14px_rgba(13,42,94,0.08)]";

  return (
    <div style={{ fontFamily: "'Plus Jakarta Sans Variable', system-ui, sans-serif", color: INK }}>
      {/* ── Header: photo on the right, navy behind the text, fading to white at the bottom ── */}
      <header className="relative h-[calc(268px+env(safe-area-inset-top,0px))] overflow-hidden bg-[#0B2558]">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img ref={fx.img} src="/img/school-hero.jpg" alt="" className="absolute inset-0 h-full w-full object-cover object-[72%_60%] will-change-transform" />
        <div className="absolute inset-0" style={{ background: "linear-gradient(90deg, rgba(9,30,72,.94) 0%, rgba(9,30,72,.80) 45%, rgba(9,30,72,.45) 75%, rgba(9,30,72,.2) 100%)" }} />
        <div className="absolute inset-x-0 top-0 h-[130px]" style={{ background: "linear-gradient(180deg, rgba(9,30,72,.75) 0%, rgba(9,30,72,0) 100%)" }} />
        {/* Darkens as the page scrolls, so the cards stand out over the building. */}
        <div ref={fx.shade} className="absolute inset-0 bg-[#0B2558] opacity-0" aria-hidden />
        <div className="absolute inset-x-0 bottom-0 h-[90px]" style={{ background: "linear-gradient(180deg, rgba(255,255,255,0) 0%, #fff 100%)" }} />

        <div ref={fx.text} className="pt-safe relative z-[1] px-4 will-change-[opacity,transform]">
          <div className="flex items-center pt-5">
            {/* The school (logo and name) opens the side menu. */}
            <button type="button" onClick={openMenu} aria-haspopup="dialog" aria-label={L({ hi: "मेन्यू", en: "Menu" })} className="flex min-w-0 flex-1 items-center text-left active:opacity-80">
              {school?.logoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={school.logoUrl} alt="" className="h-[54px] w-[54px] shrink-0 rounded-full bg-white object-cover ring-2 ring-[#D4AF37]" />
              ) : (
                <span className="grid h-[54px] w-[54px] shrink-0 place-items-center rounded-full border-2 border-[#D4AF37] text-[15px] font-semibold text-white">{school ? initials(school.name) : ""}</span>
              )}
              <span className="mx-3 h-10 w-px shrink-0 bg-white/35" aria-hidden />
              <span className="min-w-0 flex-1 text-white">
                <span className="block truncate text-[18px] font-semibold leading-[1.2]">{school?.name || " "}</span>
                <span className="mt-0.5 flex items-center gap-1 text-[14px] font-medium text-white/85">
                  <span className="truncate">{town}</span>
                  <ChevronDown className="h-4 w-4 shrink-0" strokeWidth={2.4} aria-hidden />
                </span>
              </span>
            </button>
            <Link
              href="/notice/"
              className="relative grid h-11 w-11 shrink-0 place-items-center text-white"
              aria-label={unread ? `${L({ hi: "सूचनाएँ", en: "Notices" })}, ${unread} ${L({ hi: "नई", en: "new" })}` : L({ hi: "सूचनाएँ", en: "Notices" })}
            >
              <Bell className="h-[26px] w-[26px]" strokeWidth={1.9} aria-hidden />
              {unread > 0 && (
                <span className="absolute right-[3px] top-[4px] grid h-[18px] min-w-[18px] place-items-center rounded-full bg-[#E53935] px-1 text-[10.5px] font-semibold leading-none text-white ring-2 ring-[#0B2558]" aria-hidden>
                  {unread > 9 ? "9+" : unread}
                </span>
              )}
            </Link>
          </div>

          {/* The greeting stays in the left 70%, where the navy is strongest. */}
          <div className="mt-7 max-w-[70%] text-white">
            <div className="text-[19px] font-normal leading-none text-white/90">{greet}</div>
            <div className="mt-2 truncate text-[32px] font-semibold leading-[1.1] tracking-[-0.01em]">{first}</div>
          </div>
        </div>
      </header>

      <div className="relative z-[2] -mt-[58px] space-y-3 px-4">
        {/* ── Child card: opens the switcher when there are siblings, else the profile ── */}
        {many ? (
          <button type="button" onClick={() => setSwitching(true)} aria-haspopup="dialog" className={cardClass} style={{ borderColor: LINE }} aria-label={child ? `${child.name}: ${L({ hi: "बच्चा बदलें", en: "switch child" })}` : undefined}>
            {childCard}
          </button>
        ) : (
          <Link href="/profile/" className={cardClass} style={{ borderColor: LINE }}>
            {childCard}
          </Link>
        )}

        {(stale || homeStale) && me && (
          <p className="flex items-center gap-2 rounded-[10px] px-3.5 py-2.5 text-[13px]" style={{ background: TILE, color: MUTED }}>
            <WifiOff className="h-4 w-4 shrink-0" aria-hidden />
            {L({ hi: "इंटरनेट नहीं है, पिछली बार की जानकारी दिख रही है।", en: "You're offline. Showing what was saved last time." })}
          </p>
        )}
        {failed && (
          <div className="flex items-center gap-3 rounded-[14px] border bg-white px-4 py-3.5" style={{ borderColor: LINE }}>
            <p className="min-w-0 flex-1 text-[13.5px]" style={{ color: MUTED }}>
              {failed.status === 0 ? L({ hi: "इंटरनेट नहीं है।", en: "No internet connection." }) : L({ hi: "जानकारी नहीं आ पाई।", en: "Couldn't load your details." })}
            </p>
            <button type="button" onClick={reload} className="flex min-h-[40px] items-center gap-1.5 rounded-[10px] px-3.5 text-[13.5px] font-semibold text-white" style={{ background: NAVY }}>
              <RotateCw className="h-4 w-4" aria-hidden />
              {L({ hi: "फिर से", en: "Retry" })}
            </button>
          </div>
        )}

        {/* ── Four tiles ── */}
        <div className="grid grid-cols-4 gap-3">
          {[
            { href: "/calendar/", icon: CalendarCheck, t: L({ hi: "हाज़िरी", en: "Attendance" }) },
            { href: "/homework/", icon: BookOpen, t: L({ hi: "होमवर्क", en: "Homework" }) },
            { href: "/fees/", icon: Wallet, t: L({ hi: "फ़ीस", en: "Fees" }) },
            { href: "/exam/?tab=result", icon: Trophy, t: L({ hi: "रिज़ल्ट", en: "Results" }) },
          ].map(({ href, icon: Icon, t }) => (
            <Link key={href} href={href} className="flex h-[68px] flex-col items-center justify-center gap-2 rounded-[10px] bg-white transition-colors hover:bg-slate-50 active:bg-slate-100">
              <Icon className="h-[28px] w-[28px]" style={{ color: NAVY }} strokeWidth={1.6} aria-hidden />
              <span className="text-[12px] font-medium">{t}</span>
            </Link>
          ))}
        </div>

        {data && <TodaySummary data={data} />}

        {/* ── Attendance Overview ── */}
        {/* The "premium" attendance card (user, 2026-11-13): soft shadow, no border, a ring. */}
        <section className="rounded-[18px] bg-white p-4" style={{ boxShadow: "0 1px 2px rgba(13,42,94,0.04), 0 8px 24px -6px rgba(13,42,94,0.12)" }}>
          <div className="flex items-center justify-between gap-2">
            <h2 id="att-title" className="truncate text-[16px] font-bold">
              {L({ hi: "हाज़िरी", en: "Attendance" })}
            </h2>
            <span className="shrink-0 text-[12px]" style={{ color: MUTED }}>
              {L({ hi: "इस महीने", en: "This Month" })}
            </span>
          </div>
          <Overview m={month} />
        </section>

        {/* ── Latest Notices ── */}
        <section className="border-t bg-white pt-2" style={{ borderColor: LINE }}>
          <CardHead title={L({ hi: "ताज़ा सूचनाएँ", en: "Latest Notices" })} link={L({ hi: "सब देखें", en: "View All" })} href="/notice/" />
          {notice === undefined ? (
            <RowSkeleton />
          ) : notice ? (
            <Link href="/notice/" className="flex min-h-[72px] items-center gap-3 py-3">
              <span className="min-w-0 flex-1">
                <span className="block break-words text-[15px] font-medium leading-5">{notice.title}</span>
                <span className="mt-1 block text-[12px] leading-5" style={{ color: MUTED }}>
                  {L({ hi: "स्कूल की सूचना", en: "School Announcement" })} • {fmtDate(notice.date, lang)}
                </span>
              </span>
              <ChevronRight className="h-5 w-5 shrink-0" strokeWidth={2.4} aria-hidden />
            </Link>
          ) : (
            <p className="px-3.5 py-3.5 text-[13.5px]" style={{ color: MUTED }}>{L({ hi: "अभी कोई सूचना नहीं", en: "No notices yet" })}</p>
          )}
        </section>

        {/* ── Upcoming Events ── */}
        <section className="border-t bg-white pt-2" style={{ borderColor: LINE }}>
          <CardHead title={L({ hi: "आने वाले कार्यक्रम", en: "Upcoming Events" })} link={L({ hi: "सब देखें", en: "View All" })} href="/events/" />
          {ev === undefined ? (
            <RowSkeleton />
          ) : ev ? (
            <Link href="/events/" className="flex min-h-[72px] items-center gap-3 py-3">
              <span className="flex w-11 shrink-0 flex-col items-center justify-center self-start pt-0.5 leading-none" style={{ color: MUTED }}>
                <span className="text-[20px] font-medium tabular-nums" style={{ color: INK }}>{Number(ev.date.slice(8, 10))}</span>
                <span className="mt-1 text-[12px]">{monthShort(ev.date, lang)}</span>
              </span>

              <span className="min-w-0 flex-1">
                <span className="block break-words text-[15px] font-medium leading-5">{ev.title}</span>
                <span className="mt-0.5 flex items-center gap-1.5 text-[12.5px]" style={{ color: MUTED }}>
                  <Clock className="h-[14px] w-[14px] shrink-0" strokeWidth={2} aria-hidden />
                  <span className="break-words">{ev.time || new Date(ev.date + "T00:00:00").toLocaleDateString(lang === "hi" ? "hi-IN" : "en-GB", { weekday: "long" })}</span>
                </span>
              </span>
              <ChevronRight className="h-5 w-5 shrink-0" strokeWidth={2.4} aria-hidden />
            </Link>
          ) : (
            <p className="px-3.5 py-3.5 text-[13.5px]" style={{ color: MUTED }}>{L({ hi: "अभी कोई कार्यक्रम नहीं", en: "No upcoming events" })}</p>
          )}
        </section>

      </div>

      {switching && <ChildSheet onClose={() => setSwitching(false)} />}
    </div>
  );
}

/** A failed photo falls back to initials; a new URL gets a fresh attempt. */
function ChildPhoto({ name, url }: { name: string; url: string | null }) {
  const [failedUrl, setFailedUrl] = useState<string | null>(null);
  return url && failedUrl !== url ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={url} alt="" onError={() => setFailedUrl(url)} className="h-[56px] w-[56px] rounded-full object-cover object-[50%_22%] ring-2 ring-white" />
  ) : (
    <span className="grid h-[56px] w-[56px] place-items-center rounded-full text-[19px] font-semibold text-white" style={{ background: NAVY }}>
      {initials(name)}
    </span>
  );
}

/** Only backend values appear here; missing fields never become invented statuses. */
function TodaySummary({ data }: { data: HomeData }) {
  const L = useL();
  const { lang } = useT();
  const currentDay = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata" }).format(new Date());
  if (data.date !== currentDay) return null;
  const a = data.attendance;
  const marks = {
    Present: L({ hi: "उपस्थित", en: "Present" }),
    Absent: L({ hi: "अनुपस्थित", en: "Absent" }),
    Leave: L({ hi: "छुट्टी", en: "On leave" }),
    HalfDay: L({ hi: "आधा दिन", en: "Half day" }),
  };
  const rows = [
    a && { href: "/calendar/", label: L({ hi: "हाज़िरी", en: "Attendance" }), value: a.holiday || (a.status ? marks[a.status] : L({ hi: "अभी नहीं लगी", en: "Not marked yet" })) },
    data.homework && { href: "/homework/", label: L({ hi: "होमवर्क", en: "Homework" }), value: data.homework.length ? L({ hi: data.homework.length + " काम देखें", en: data.homework.length + " to view" }) : L({ hi: "कोई काम नहीं दिया गया", en: "Nothing assigned" }) },
    data.fees && { href: data.fees.dueNow > 0 ? "/fees/pay/" : "/fees/", label: L({ hi: "अभी देय फ़ीस", en: "Fees due now" }), value: new Intl.NumberFormat(lang === "hi" ? "hi-IN" : "en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(data.fees.dueNow + data.fees.fine) },
    data.result !== undefined && { href: "/exam/?tab=result", label: L({ hi: "रिज़ल्ट", en: "Results" }), value: data.result ? L({ hi: "उपलब्ध · " + data.result.exam, en: "Available · " + data.result.exam }) : L({ hi: "अभी जारी नहीं हुआ", en: "Not published yet" }) },
  ].filter((row): row is { href: string; label: string; value: string } => !!row);
  if (!rows.length) return null;
  return (
    <section className="py-2" aria-labelledby="today-title">
      <h2 id="today-title" className="mb-1 text-[16px] font-semibold">{L({ hi: "आज की जानकारी", en: "Today at school" })}</h2>
      <ul className="divide-y" style={{ borderColor: LINE }}>
        {rows.map(row => <li key={row.href}>
          <Link href={row.href} className="flex min-h-11 items-center gap-3 py-2 text-[13px]">
            <span className="w-[104px] shrink-0" style={{ color: MUTED }}>{row.label}</span>
            <span className="min-w-0 flex-1 break-words text-right font-medium tabular-nums">{row.value}</span>
            <ChevronRight className="h-4 w-4 shrink-0" style={{ color: MUTED }} aria-hidden />
          </Link>
        </li>)}
      </ul>
    </section>
  );
}

function CardHead({ title, link, href }: { title: string; link: string; href: string }) {
  return (
    <div className="flex min-h-[44px] items-center justify-between gap-3" style={{ borderColor: LINE }}>
      <h2 className="min-w-0 text-[16px] font-semibold leading-6">{title}</h2>
      <Link href={href} className="flex min-h-11 shrink-0 items-center text-[13px] font-medium" style={{ color: INK }}>
        {link}
      </Link>
    </div>
  );
}

function RowSkeleton() {
  return (
    <div className="flex min-h-[72px] items-center gap-3 py-3" aria-busy="true">
      <span className="h-[38px] w-[50px] shrink-0 animate-pulse rounded-[10px]" style={{ background: TILE }} />
      <span className="flex-1 space-y-2">
        <span className="block h-3.5 w-40 animate-pulse rounded" style={{ background: TILE }} />
        <span className="block h-3 w-28 animate-pulse rounded" style={{ background: TILE }} />
      </span>
    </div>
  );
}

function Overview({ m }: { m: Month | undefined }) {
  const L = useL();
  if (!m)
    return (
      <div className="mt-3 flex items-center gap-5" aria-busy="true">
        <span className="h-[96px] w-[96px] animate-pulse rounded-full" style={{ background: TILE }} />
        <span className="h-3 flex-1 animate-pulse rounded" style={{ background: TILE }} />
      </div>
    );
  // Nothing marked this month yet (production; development shows the sample instead).
  if (m.percent === null)
    return (
      <div className="mt-3 flex items-center gap-3 rounded-[10px] px-3.5 py-3" style={{ background: TILE }}>
        <CalendarCheck className="h-6 w-6 shrink-0" style={{ color: NAVY }} strokeWidth={1.7} aria-hidden />
        <p className="text-[13.5px] leading-snug" style={{ color: MUTED }}>
          {L({ hi: "इस महीने अभी हाज़िरी नहीं लगी है।", en: "No attendance marked yet this month." })}
        </p>
      </div>
    );
  // A ring with the percent in the middle; Present, Absent and days marked beside it.
  const pct = Math.max(0, Math.min(100, m.percent));
  const R = 40;
  const C = 2 * Math.PI * R;
  return (
    <div className="mt-3 flex items-center gap-5">
      <div className="relative h-[96px] w-[96px] shrink-0" role="img" aria-label={`${L({ hi: "इस महीने की हाज़िरी", en: "Attendance this month" })}: ${Math.round(pct)}%`}>
        <svg viewBox="0 0 96 96" className="h-full w-full -rotate-90" aria-hidden>
          <circle cx="48" cy="48" r={R} fill="none" stroke="#E6EBF3" strokeWidth="9" />
          <circle cx="48" cy="48" r={R} fill="none" stroke={NAVY} strokeWidth="9" strokeLinecap="round" strokeDasharray={C} strokeDashoffset={C * (1 - pct / 100)} style={{ transition: "stroke-dashoffset .9s cubic-bezier(.2,.8,.2,1)" }} />
        </svg>
        <span className="absolute inset-0 grid place-items-center text-[24px] font-extrabold tracking-[-0.02em]" style={{ color: NAVY }} aria-hidden>
          {Math.round(pct)}%
        </span>
      </div>
      <dl className="min-w-0 flex-1 space-y-2 text-[13.5px]">
        <Stat dot="#1E9E55" label={L({ hi: "उपस्थित", en: "Present" })} value={m.present} />
        {/* `absent` comes from the backend (Absent only); an older backend doesn't send it. */}
        {m.absent !== undefined && <Stat dot="#E5484D" label={L({ hi: "अनुपस्थित", en: "Absent" })} value={m.absent} />}
        <Stat dot="#C4CCDA" label={L({ hi: "कुल दिन", en: "Days marked" })} value={m.workingDays} />
      </dl>
    </div>
  );
}

function Stat({ dot, label, value }: { dot: string; label: string; value: number }) {
  return (
    <div className="flex items-center gap-2.5">
      <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: dot }} aria-hidden />
      <dt className="min-w-0 flex-1 truncate" style={{ color: MUTED }}>
        {label}
      </dt>
      <dd className="font-bold tabular-nums">{value}</dd>
    </div>
  );
}

function fmtDate(iso: string, lang: Lang) {
  return new Date(iso + "T00:00:00").toLocaleDateString(lang === "hi" ? "hi-IN" : "en-US", { month: "short", day: "numeric", year: "numeric" });
}

function monthShort(iso: string, lang: Lang) {
  return new Date(iso + "T00:00:00").toLocaleDateString(lang === "hi" ? "hi-IN" : "en-US", { month: "short" }).replace(".", "");
}
