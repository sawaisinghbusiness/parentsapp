"use client";

/**
 * Home, from the mockup the user approved on 2026-11-13 (built and reviewed first as a /home-new preview).
 *
 * Neutral surfaces and charcoal text; school blue is reserved for actions.
 * Gutter 20px, gap 24px between blocks, card radius 14px. The bottom tab bar lives in AppShell.
 *
 * Missing data remains empty; development previews use API fixtures.
 */

import "@fontsource-variable/plus-jakarta-sans";
import "@fontsource-variable/noto-sans-devanagari";
import "./home.css";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Bell, BookOpen, ChevronRight, Clock, RotateCw, Trophy, Wallet, WifiOff } from "lucide-react";
import { useParent } from "@/lib/parent";
import { useApi } from "@/lib/api";
import { useL, useT } from "@/lib/i18n";
import { initials } from "@/lib/format";
import { useMenu } from "@/lib/menu";
import { BusHomeStatus } from "@/components/BusHomeStatus";
import { ChildSheet } from "@/components/ChildSheet";
import { unseenCount } from "@/lib/noticeSeen";

const NAVY = "#0D2A5E";
const INK = "#242628";
const MUTED = "#666A6E";
const LINE = "#DCE4ED";
const TILE = "#F3F4F4";

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

/**
 * The scroll effect (approved 2026-11-13): the building moves at half the page's speed, so the cards
 * slide over it and it sinks behind them; a neutral shade deepens and the greeting fades and lifts a little.
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
  const [hour, setHour] = useState(9);
  useEffect(() => setHour(new Date().getHours()), []);
  // No dangling comma: the parent's name isn't sent, so the greeting stands on its own (audit 2026-11-16).
  const greet = hour < 12 ? L({ hi: "सुप्रभात", en: "Good Morning" }) : hour < 17 ? L({ hi: "नमस्ते", en: "Good Afternoon" }) : L({ hi: "शुभ संध्या", en: "Good Evening" });

  // Only school data is shown, including genuine empty states.
  const notice = data?.notice;
  const ev = data ? data.events?.[0] || null : undefined;
  const unread = unseenCount(child?.id, data?.noticeCount ?? 0, notice?.date);
  const failed = error && error.status !== 401 && !data ? error : null;
  // One message per failure: the "saved copy" strip only when a saved copy is on screen and the phone is offline.
  const offlineStrip = !failed && me && (stale || homeStale) && (!error || error.status === 0);
  // Without an uploaded school photo, the St. Paul building (its name is on the sign) is only used for St. Paul.
  // The school's own photo from ERP Settings; until a school uploads one, every school shows this photo (user, 2026-11-17).
  const hero = school?.heroUrl || "/img/school-hero-morning.webp";

  const childCard = (
    <>
      <span className="grid w-[76px] shrink-0 place-items-center">{child && <ChildPhoto key={child.id} name={child.name} url={child.photoUrl} />}</span>
      <span className="flex min-w-0 flex-1 flex-col justify-center pr-1 text-left">
        <span className="break-words text-[19px] font-semibold leading-6">{child?.name}</span>
        <span className="mt-1 break-words text-[12px] leading-5" style={{ color: MUTED }}>
          {child ? `${L({ hi: "कक्षा", en: "Class" })} ${child.classSec}  •  ${L({ hi: "रोल नं.", en: "Roll No." })} ${child.rollNo}` : ""}
        </span>
        {data && <TodayAttendance data={data} />}
      </span>
      <span className="grid w-8 shrink-0 place-items-center">
        <ChevronRight className="h-5 w-5" strokeWidth={1.8} aria-hidden />
      </span>
    </>
  );
  const cardClass = "-mx-2 flex min-h-[96px] w-[calc(100%+1rem)] items-stretch rounded-[14px] border bg-white py-2";

  return (
    <div className="parents-home" style={{ color: INK }}>
      {/* School photograph fades into the cool Home background. */}
      <header className="relative h-[calc(210px+env(safe-area-inset-top,0px))] overflow-hidden bg-[#25282A]">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        {hero ? (
          <img ref={fx.img} src={hero} alt="" className="absolute inset-0 h-full w-full object-cover object-[72%_60%] will-change-transform" />
        ) : (
          <div aria-hidden className="absolute inset-0" style={{ background: "radial-gradient(120% 90% at 85% 10%, #3D5A8A 0%, #1B3260 45%, #0D2A5E 100%)" }} />
        )}
        <div className="absolute inset-0" style={{ background: "linear-gradient(90deg, rgba(18,22,24,.52) 0%, rgba(18,22,24,.36) 45%, rgba(18,22,24,.12) 75%, rgba(18,22,24,0) 100%)" }} />
        <div className="absolute inset-x-0 top-0 h-[130px]" style={{ background: "linear-gradient(180deg, rgba(18,22,24,.28) 0%, rgba(18,22,24,0) 100%)" }} />
        {/* Darkens as the page scrolls, so the cards stand out over the building. */}
        <div ref={fx.shade} className="absolute inset-0 bg-[#25282A] opacity-0" aria-hidden />
        <div className="home-photo-fade absolute inset-x-0 bottom-0 h-[60px]" />

        <div ref={fx.text} className="pt-safe relative z-[1] px-4 will-change-[opacity,transform]">
          <div className="flex items-center pt-5">
            {/* The school (logo and name) opens the side menu. */}
            <button type="button" onClick={openMenu} aria-haspopup="dialog" aria-label={L({ hi: "मेन्यू", en: "Menu" })} className="flex min-w-0 flex-1 items-center text-left active:opacity-80">
              {school?.logoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={school.logoUrl} alt="" className="h-8 w-8 shrink-0 rounded-full bg-white object-cover ring-1 ring-white/50" />
              ) : (
                <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full border border-white/50 text-[12px] font-semibold text-white">{school ? initials(school.name) : ""}</span>
              )}
              <span className="mx-2 h-6 w-px shrink-0 bg-white/35" aria-hidden />
              <span className="min-w-0 flex-1 text-white">
                <span className="block truncate text-[14px] font-semibold leading-[1.2]">{school?.name || " "}</span>
                <span className="mt-0.5 flex items-center gap-1 text-[12px] font-medium text-white/85">
                  <span className="truncate">{town}</span>

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
                <span className="absolute right-[3px] top-[4px] grid h-[18px] min-w-[18px] place-items-center rounded-full bg-[#E53935] px-1 text-[10.5px] font-semibold leading-none text-white ring-2 ring-[#25282A]" aria-hidden>
                  {unread > 9 ? "9+" : unread}
                </span>
              )}
            </Link>
          </div>

          {/* The greeting stays in the left 70%, where the photo overlay is strongest. */}
          <div className="mt-5 max-w-full text-white">
            <div className="text-[19px] font-medium leading-snug text-white">{greet}</div>
          </div>
        </div>
      </header>

      <div className="relative z-[2] -mt-[48px] space-y-6 px-5">
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

        {offlineStrip && (
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
            <button type="button" onClick={reload} className="flex min-h-[40px] items-center gap-1.5 rounded-[10px] px-3.5 text-[13.5px] font-semibold text-white" style={{ background: INK }}>
              <RotateCw className="h-4 w-4" aria-hidden />
              {L({ hi: "फिर से", en: "Retry" })}
            </button>
          </div>
        )}

        {/* ── Four tiles: the school's illustrations, each arriving in its own way (see home.css) ── */}
        <div className="grid grid-cols-4 gap-2 border-b pb-5" style={{ borderColor: LINE }}>
          {[
            { href: "/bus/", art: "/img/tiles/bus.webp", h: "h-[32px]", fx: "bus", t: L({ hi: "ट्रांसपोर्ट", en: "Transport" }) },
            { href: "/homework/", art: "/img/tiles/homework.webp", h: "h-[42px]", fx: "rise", t: L({ hi: "होमवर्क", en: "Homework" }) },
            { href: "/fees/", art: "/img/tiles/fees.webp", h: "h-[42px]", fx: "tilt", t: L({ hi: "फ़ीस", en: "Fees" }) },
            { href: "/exam/?tab=result", art: "/img/tiles/results.webp", h: "h-[42px]", fx: "cheer", t: L({ hi: "रिज़ल्ट", en: "Results" }) },
          ].map(({ href, art, h, fx, t }, i) => (
            <Link key={href} href={href} className="home-tile flex h-[68px] flex-col items-center justify-between overflow-hidden rounded-[10px] border px-0.5 pt-1.5 active:opacity-80" style={{ animationDelay: `${i * 80}ms` }}>
              <span className="text-[11.5px] font-bold leading-[1.15]">{t}</span>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={art} alt="" className={`home-art-${fx} ${h} max-w-full object-contain object-bottom`} style={{ animationDelay: `${i * 80 + 150}ms` }} />
            </Link>
          ))}
        </div>

        {child?.bus && <BusHomeStatus key={child.id} studentId={child.id} name={child.name} />}
        {data && <TodaySummary data={data} />}

        {/* ── Latest Notices ── */}
        <section className="pt-1" style={{ borderColor: LINE }}>
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
              <ChevronRight className="h-5 w-5 shrink-0" strokeWidth={1.8} aria-hidden />
            </Link>
          ) : (
            <p className="px-3.5 py-3.5 text-[13.5px]" style={{ color: MUTED }}>{L({ hi: "अभी कोई सूचना नहीं", en: "No notices yet" })}</p>
          )}
        </section>

        {/* ── Upcoming Events ── */}
        <section className="border-t pt-2" style={{ borderColor: LINE }}>
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
              <ChevronRight className="h-5 w-5 shrink-0" strokeWidth={1.8} aria-hidden />
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
    <span className="grid h-[56px] w-[56px] place-items-center rounded-full text-[19px] font-semibold text-white" style={{ background: INK }}>
      {initials(name)}
    </span>
  );
}

/** Today never displays an earlier cached day's attendance as current. */
function isToday(date: string) {
  return date === new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata" }).format(new Date());
}
function TodayAttendance({ data }: { data: HomeData }) {
  const L = useL();
  if (!isToday(data.date) || !data.attendance) return null;
  const a = data.attendance;
  const labels = { Present: L({hi:"उपस्थित",en:"Present"}), Absent: L({hi:"अनुपस्थित",en:"Absent"}), Leave: L({hi:"छुट्टी",en:"On leave"}), HalfDay: L({hi:"आधा दिन",en:"Half day"}) };
  const color = a.holiday ? MUTED : a.status === "Present" ? "#21613F" : a.status === "Absent" ? "#A32F35" : MUTED;
  return <span className="mt-2 flex items-baseline gap-1.5 text-[12px] leading-5" style={{color}}>
    <span>{L({hi:"आज",en:"Today"})}</span><span aria-hidden>·</span>
    <span className="font-semibold">{a.holiday || (a.status ? labels[a.status] : L({hi:"हाज़िरी अभी नहीं लगी",en:"Attendance not marked"}))}</span>
  </span>;
}
function TodaySummary({ data }: { data: HomeData }) {
  const L = useL();
  const { lang } = useT();
  if (!isToday(data.date)) return null;
  const due = data.fees ? data.fees.dueNow + data.fees.fine : 0;
  const rows = [
    data.fees && { href: due > 0 ? "/fees/pay/" : "/fees/", label: L({hi:"अभी देय फ़ीस",en:"Fees due now"}), value: new Intl.NumberFormat(lang === "hi" ? "hi-IN" : "en-IN", {style:"currency",currency:"INR",maximumFractionDigits:0}).format(due), detail: due > 0 ? L({hi:"विवरण देखें और भुगतान करें",en:"View details & pay"}) : L({hi:"अभी कोई फ़ीस देय नहीं",en:"No payment due now"}), icon: Wallet },
    data.homework && { href: "/homework/", label: L({hi:"आज का होमवर्क",en:"Today's homework"}), value: data.homework.length ? String(data.homework.length) : "", detail: data.homework.length ? L({hi:"डायरी में काम देखें",en:"View assignments in the diary"}) : L({hi:"कोई काम नहीं दिया गया",en:"Nothing assigned"}), icon: BookOpen },
    data.result !== undefined && { href: "/exam/?tab=result", label: L({hi:"परीक्षा का रिज़ल्ट",en:"Exam results"}), value: "", detail: data.result ? data.result.exam : L({hi:"अभी जारी नहीं हुआ",en:"Not published yet"}), icon: Trophy },
  ].filter((row): row is Exclude<typeof row, false | null | undefined> => !!row);
  if (!rows.length) return null;
  return <section aria-labelledby="today-title">
    <h2 id="today-title" className="mb-3 text-[18px] font-semibold">{L({hi:"आज की जानकारी",en:"Today at school"})}</h2>
    <ul className="home-updates">
      {rows.map(({href,label,value,detail,icon:Icon}) => <li key={href}>
        <Link href={href} className="home-update">
          <Icon className="h-5 w-5 shrink-0" strokeWidth={1.7} aria-hidden />
          <span className="min-w-0 flex-1"><span className="block text-[14px] font-semibold">{label}</span><span className="mt-1 block break-words text-[12px] leading-5" style={{color:MUTED}}>{detail}</span></span>
          {value && <span className="max-w-[40%] break-words text-right text-[18px] font-semibold tabular-nums">{value}</span>}
          <ChevronRight className="h-4 w-4 shrink-0" strokeWidth={1.8} aria-hidden />
        </Link>
      </li>)}
    </ul>
  </section>;
}

function CardHead({ title, link, href }: { title: string; link: string; href: string }) {
  return (
    <div className="flex min-h-[44px] items-center justify-between gap-3" style={{ borderColor: LINE }}>
      <h2 className="min-w-0 text-[18px] font-semibold leading-6">{title}</h2>
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

function fmtDate(iso: string, lang: Lang) {
  return new Date(iso + "T00:00:00").toLocaleDateString(lang === "hi" ? "hi-IN" : "en-US", { month: "short", day: "numeric", year: "numeric" });
}

function monthShort(iso: string, lang: Lang) {
  return new Date(iso + "T00:00:00").toLocaleDateString(lang === "hi" ? "hi-IN" : "en-US", { month: "short" }).replace(".", "");
}
