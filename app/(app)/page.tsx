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
import { useEffect, useState } from "react";
import { Bell, BookOpen, CalendarCheck, ChevronDown, ChevronRight, Clock, FileText, RotateCw, Trophy, Wallet, WifiOff } from "lucide-react";
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
}

/** Sample values for development only (see the note at the top). */
const DEMO_ON = process.env.NODE_ENV !== "production";
const DEMO = {
  month: { percent: 92, present: 22, absent: 2, workingDays: 24 } as Month,
  notice: { id: "demo", title: "Winter Vacation Notice", date: "2026-10-30" },
  event: { id: "demo", title: "PTM Meeting", date: "2026-11-04", time: "10:00 AM - 12:00 PM" },
  noticeCount: 3,
  photo: "/img/demo-student.jpg",
};

export default function HomePage() {
  const { me, child, stale } = useParent();
  const { data, error, reload } = useApi<HomeData>(child ? `/home?student=${child.id}` : null);
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
  const unread = data ? data.noticeCount || (DEMO_ON ? DEMO.noticeCount : 0) : 0;
  const failed = error && error.status !== 401 && !data ? error : null;

  const childCard = (
    <>
      <span className="grid w-[92px] shrink-0 place-items-center bg-[#F1F4F9]">{child && <ChildPhoto name={child.name} url={child.photoUrl} />}</span>
      <span className="flex min-w-0 flex-1 flex-col justify-center pl-4 text-left">
        <span className="truncate text-[17px] font-bold">{child?.name}</span>
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
      <header className="relative h-[300px] overflow-hidden">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/img/school-hero.jpg" alt="" className="absolute inset-0 h-full w-full object-cover object-[72%_60%]" />
        <div className="absolute inset-0" style={{ background: "linear-gradient(90deg, rgba(9,30,72,.94) 0%, rgba(9,30,72,.80) 45%, rgba(9,30,72,.45) 75%, rgba(9,30,72,.2) 100%)" }} />
        <div className="absolute inset-x-0 top-0 h-[130px]" style={{ background: "linear-gradient(180deg, rgba(9,30,72,.75) 0%, rgba(9,30,72,0) 100%)" }} />
        <div className="absolute inset-x-0 bottom-0 h-[90px]" style={{ background: "linear-gradient(180deg, rgba(255,255,255,0) 0%, #fff 100%)" }} />

        <div className="pt-safe relative z-[1] px-4">
          <div className="flex items-center pt-5">
            {/* The school (logo and name) opens the side menu. */}
            <button type="button" onClick={openMenu} aria-haspopup="dialog" aria-label={L({ hi: "मेन्यू", en: "Menu" })} className="flex min-w-0 flex-1 items-center text-left active:opacity-80">
              {school?.logoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={school.logoUrl} alt="" className="h-[54px] w-[54px] shrink-0 rounded-full bg-white object-cover ring-2 ring-[#D4AF37]" />
              ) : (
                <span className="grid h-[54px] w-[54px] shrink-0 place-items-center rounded-full border-2 border-[#D4AF37] text-[15px] font-extrabold text-white">{school ? initials(school.name) : ""}</span>
              )}
              <span className="mx-3 h-10 w-px shrink-0 bg-white/35" aria-hidden />
              <span className="min-w-0 flex-1 text-white">
                <span className="block truncate text-[18px] font-bold leading-[1.2]">{school?.name || " "}</span>
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
                <span className="absolute right-[3px] top-[4px] grid h-[18px] min-w-[18px] place-items-center rounded-full bg-[#E53935] px-1 text-[10.5px] font-bold leading-none text-white ring-2 ring-[#0B2558]" aria-hidden>
                  {unread > 9 ? "9+" : unread}
                </span>
              )}
            </Link>
          </div>

          {/* The greeting stays in the left 70%, where the navy is strongest. */}
          <div className="mt-9 max-w-[70%] text-white">
            <div className="text-[19px] font-normal leading-none text-white/90">{greet}</div>
            <div className="mt-2 truncate text-[34px] font-extrabold leading-[1.1] tracking-[-0.01em]">{first}</div>
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

        {stale && me && (
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
            <Link key={href} href={href} className="flex h-[68px] flex-col items-center justify-center gap-1.5 rounded-[10px] border active:scale-95" style={{ background: TILE, borderColor: "#D3DDEE" }}>
              <Icon className="h-[28px] w-[28px]" style={{ color: NAVY }} strokeWidth={1.6} aria-hidden />
              <span className="text-[12px] font-medium">{t}</span>
            </Link>
          ))}
        </div>

        {/* ── Attendance Overview ── */}
        <section className="rounded-[14px] border bg-white px-4 py-3.5" style={{ borderColor: LINE }}>
          <div className="flex items-center justify-between gap-2">
            <h2 id="att-title" className="truncate text-[16.5px] font-bold">
              {L({ hi: "हाज़िरी का हाल", en: "Attendance Overview" })}
            </h2>
            <span className="shrink-0 rounded-full px-2.5 py-[3px] text-[11.5px] font-medium" style={{ background: TILE, color: NAVY }}>
              {L({ hi: "इस महीने", en: "This Month" })}
            </span>
          </div>
          <Overview m={month} />
        </section>

        {/* ── Latest Notices ── */}
        <section className="overflow-hidden rounded-[14px] border bg-white" style={{ borderColor: LINE }}>
          <CardHead title={L({ hi: "ताज़ा सूचनाएँ", en: "Latest Notices" })} link={L({ hi: "सब देखें", en: "View All" })} href="/notice/" />
          {notice === undefined ? (
            <RowSkeleton />
          ) : notice ? (
            <Link href="/notice/" className="flex items-center gap-3.5 px-3.5 py-3">
              <span className="grid h-[38px] w-[50px] shrink-0 place-items-center rounded-[10px]" style={{ background: TILE }}>
                <FileText className="h-5 w-5" style={{ color: NAVY }} strokeWidth={1.8} aria-hidden />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[15px] font-semibold">{notice.title}</span>
                <span className="block truncate text-[12.5px]" style={{ color: MUTED }}>
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
        <section className="overflow-hidden rounded-[14px] border bg-white" style={{ borderColor: LINE }}>
          <CardHead title={L({ hi: "आने वाले कार्यक्रम", en: "Upcoming Events" })} link={L({ hi: "कैलेंडर देखें", en: "View Calendar" })} href="/calendar/" />
          {ev === undefined ? (
            <RowSkeleton />
          ) : ev ? (
            <Link href="/events/" className="flex items-center gap-3.5 px-3.5 py-3">
              <span className="flex h-[40px] w-[54px] shrink-0 flex-col items-center justify-center rounded-[10px] leading-none" style={{ background: TILE, color: NAVY }}>
                <span className="text-[19px] font-bold">{ev.date.slice(8, 10)}</span>
                <span className="mt-0.5 text-[10.5px] font-semibold uppercase">{monthShort(ev.date, lang)}</span>
              </span>
              <span className="h-9 w-px shrink-0" style={{ background: LINE }} aria-hidden />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[15px] font-semibold">{ev.title}</span>
                <span className="mt-0.5 flex items-center gap-1.5 text-[12.5px]" style={{ color: MUTED }}>
                  <Clock className="h-[14px] w-[14px] shrink-0" strokeWidth={2} aria-hidden />
                  <span className="truncate">{ev.time || new Date(ev.date + "T00:00:00").toLocaleDateString(lang === "hi" ? "hi-IN" : "en-GB", { weekday: "long" })}</span>
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

/** The child's photo from the ERP; in development the demo photo next; else initials on navy. */
function ChildPhoto({ name, url }: { name: string; url: string | null }) {
  const choices = [url, DEMO_ON ? DEMO.photo : null].filter(Boolean) as string[];
  const [k, setK] = useState(0);
  const src = choices[k];
  return src ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt="" onError={() => setK((n) => n + 1)} className="h-[56px] w-[56px] rounded-full object-cover object-[50%_22%] ring-2 ring-white" />
  ) : (
    <span className="grid h-[56px] w-[56px] place-items-center rounded-full text-[19px] font-bold text-white" style={{ background: NAVY }}>
      {initials(name)}
    </span>
  );
}

function CardHead({ title, link, href }: { title: string; link: string; href: string }) {
  return (
    <div className="flex h-[42px] items-center justify-between gap-2 border-b px-3.5" style={{ borderColor: LINE }}>
      <h2 className="truncate text-[15.5px] font-bold">{title}</h2>
      <Link href={href} className="shrink-0 text-[12.5px] font-medium" style={{ color: INK }}>
        {link}
      </Link>
    </div>
  );
}

function RowSkeleton() {
  return (
    <div className="flex items-center gap-3.5 px-3.5 py-3" aria-busy="true">
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
      <div className="mt-3 flex items-center gap-4" aria-busy="true">
        <span className="h-11 w-24 animate-pulse rounded-lg" style={{ background: TILE }} />
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
  const pct = m.percent;
  return (
    <div className="mt-1.5 flex items-center gap-3.5">
      <div className="w-[104px] shrink-0 text-center text-[42px] font-extrabold leading-none tracking-[-0.02em]" style={{ color: NAVY }}>
        {Math.round(pct)}%
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[13.5px]">
          <span className="whitespace-nowrap">
            <b className="font-bold">{m.present}</b> {L({ hi: "उपस्थित", en: "Present" })}
          </span>
          {/* `absent` comes from the backend (Absent only); an older backend doesn't send it. */}
          {m.absent !== undefined && (
            <>
              <span className="h-4 w-px" style={{ background: LINE }} aria-hidden />
              <span className="whitespace-nowrap">
                <b className="font-bold">{m.absent}</b> {L({ hi: "अनुपस्थित", en: "Absent" })}
              </span>
            </>
          )}
        </div>
        <div className="mt-2.5 h-[7px] overflow-hidden rounded-full bg-[#E3E8F0]" role="progressbar" aria-labelledby="att-title" aria-valuenow={Math.round(pct)} aria-valuemin={0} aria-valuemax={100}>
          <div className="h-full rounded-full" style={{ width: `${pct}%`, background: NAVY }} />
        </div>
      </div>
    </div>
  );
}

function fmtDate(iso: string, lang: Lang) {
  return new Date(iso + "T00:00:00").toLocaleDateString(lang === "hi" ? "hi-IN" : "en-US", { month: "short", day: "numeric", year: "numeric" });
}

function monthShort(iso: string, lang: Lang) {
  return new Date(iso + "T00:00:00").toLocaleDateString(lang === "hi" ? "hi-IN" : "en-US", { month: "short" }).replace(".", "");
}
