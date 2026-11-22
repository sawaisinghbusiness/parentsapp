"use client";
import { ResourceStatus } from "@/components/ResourceStatus";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import clsx from "clsx";
import { BookOpen, CalendarDays, ChevronLeft, Home, IndianRupee, Menu as MenuIcon, Plus, UserRound, type LucideIcon } from "lucide-react";
import { useParent } from "@/lib/parent";
import { SahayakButton } from "./SahayakButton";
import { useL, type Bi } from "@/lib/i18n";
import { Avatar, ErrorCard, OfflineNote } from "./ui";
import { ChildSheet } from "./ChildSheet";
import { TopActions } from "./TopActions";
import { SideMenu } from "./SideMenu";
import { PullRefresh } from "./PullRefresh";
import { ActionPalette } from "@/lib/actionPalette";
import { MenuContext } from "@/lib/menu";
import { markBack, motionClass, usePageMotion } from "@/lib/pageMotion";
import { useSideMenuMotion } from "@/lib/useSideMenuMotion";

/** Five equal tabs. */
const TABS: { href: string; text: Bi; icon: LucideIcon }[] = [
  { href: "/", text: { hi: "होम", en: "Home" }, icon: Home },
  { href: "/calendar/", text: { hi: "कैलेंडर", en: "Calendar" }, icon: CalendarDays },
  { href: "/study/", text: { hi: "पढ़ाई", en: "Study" }, icon: BookOpen },
  { href: "/fees/", text: { hi: "फ़ीस", en: "Fees" }, icon: IndianRupee },
  { href: "/profile/", text: { hi: "प्रोफ़ाइल", en: "Profile" }, icon: UserRound },
];

interface PageInfo {
  title: Bi;
  /** Where Back goes; tab screens have none. */
  back?: string;
  /** The tab that stays lit on this screen. */
  tab?: string;
  /** Shows one child's data, so the child can be switched from the top bar. */
  perChild?: boolean;
  /** A + on the right, e.g. Leave → Apply. */
  action?: { href: string; text: Bi };
  /** A tab screen drawn like Home: big title on the left, the same buttons on the right, grey page. */
  big?: boolean;
  /** Big screen without the big title text (the buttons stay on the right). */
  noTitle?: boolean;
  /** The screen draws its own header (a chat shows the teacher's name there). */
  own?: boolean;
  /** No tab bar (a chat, whose message box sits at the bottom). */
  bare?: boolean;
  /** No floating AI Assistant button: it must not cover a payment, a form or the school's phone number. */
  noOwl?: boolean;
  /** No top bar at all (no menu button, no title). */
  noHeader?: boolean;
  /** Normal top bar on the shared cool canvas, so the white fee bill stands out (Fees). */
  warm?: boolean;
}

const PAGES: Record<string, PageInfo> = {
  "/calendar/": { title: { hi: "कैलेंडर", en: "Calendar" }, perChild: true },
  "/fees/": { title: { hi: "फ़ीस", en: "Fees" }, perChild: true, warm: true, noOwl: true },
  "/fees/detail/": { title: { hi: "फ़ीस का ब्योरा", en: "Fee Detail" }, back: "/fees/", tab: "/fees/", perChild: true, noOwl: true },
  "/fees/pay/": { title: { hi: "भुगतान", en: "Payment" }, back: "/fees/", tab: "/fees/", perChild: true, noOwl: true },
  "/profile/": { title: { hi: "प्रोफ़ाइल", en: "Profile" }, noOwl: true },
  "/study/": { title: { hi: "पढ़ाई का टाइमर", en: "Study timer" }, perChild: true },
  "/id-card/": { title: { hi: "आईडी कार्ड", en: "ID Card" }, back: "/profile/", tab: "/profile/", perChild: true },
  "/exam/": { title: { hi: "परीक्षा", en: "Exam" }, back: "/", perChild: true },
  "/report-card/": { title: { hi: "रिपोर्ट कार्ड", en: "Report Card" }, back: "/", perChild: true },
  "/exam/detail/": { title: { hi: "रिज़ल्ट", en: "Result" }, back: "/exam/?tab=result", perChild: true },
  "/leave/": { title: { hi: "छुट्टी", en: "Leave" }, back: "/", perChild: true, action: { href: "/leave/apply/", text: { hi: "छुट्टी की अर्ज़ी", en: "Apply leave" } } },
  "/leave/apply/": { title: { hi: "छुट्टी की अर्ज़ी", en: "Apply Leave" }, back: "/leave/", perChild: true, noOwl: true },
  "/homework/": { title: { hi: "होमवर्क", en: "Homework" }, back: "/", perChild: true },
  "/events/": { title: { hi: "कार्यक्रम", en: "Events" }, back: "/" },
  "/events/album/": { title: { hi: "फ़ोटो", en: "Photos" }, back: "/events/" },
  "/notice/": { title: { hi: "सूचनाएँ", en: "Notice" }, back: "/" },
  "/bus/": { title: { hi: "स्कूल बस", en: "School Bus" }, back: "/", perChild: true },
  "/bus/tracking/": { title: { hi: "लाइव ट्रैकिंग", en: "Live tracking" }, back: "/bus/", perChild: true },
  "/meetings/": { title: { hi: "मीटिंग", en: "Meetings" }, back: "/", perChild: true },
  "/meetings/detail/": { title: { hi: "मीटिंग", en: "Meeting" }, back: "/meetings/", perChild: true },
  "/search/": { title: { hi: "खोजें", en: "Search" }, back: "/" },
  "/teachers/": { title: { hi: "टीचर से पूछें", en: "Ask Teacher" }, back: "/", perChild: true },
  "/teachers/chat/": { title: { hi: "टीचर से बात", en: "Chat" }, back: "/teachers/", perChild: true, own: true, bare: true },
  "/assistant/": { title: { hi: "एआई असिस्टेंट", en: "AI Assistant" }, back: "/", perChild: true, own: true, bare: true },
};

const norm = (p: string) => (p.endsWith("/") ? p : p + "/");

/**
 * Home draws its own header. Every other screen gets the kit's bar: Back on the left, the name in
 * the middle, and on the right either the screen's + action or (for one child's data, when there
 * is more than one child) that child's photo to switch.
 */
export function AppShell({ children }: { children: React.ReactNode }) {
  const path = norm(usePathname() || "/");
  const { me, child, stale, error, reload } = useParent();
  const L = useL();
  const [switching, setSwitching] = useState(false);
  // Design previews (/preview/meetings/ …) borrow the real screen's bar until they are approved.
  const page = PAGES[path] ?? PAGES[path.replace(/^\/preview\//, "/")];
  const isHome = path === "/";
  const isStudy = path === "/study/";
  const big = !!page?.big;
  const own = !!page?.own;
  const { active: menu, openMenu, closeMenu, layerRef } = useSideMenuMotion(!page?.bare);
  const canSwitch = !!page?.perChild && (me?.children.length || 0) > 1 && !!child;
  const lit = isHome ? "/" : page?.tab || (page && !page.back ? path : "/");
  // Open = slide in from the right, Back = from the left, between bottom tabs = fade.
  const motion = motionClass(usePageMotion(path, (p) => TABS.some((t) => t.href === p)));

  const menuButton = (
    <button type="button" onClick={openMenu} aria-label={L({ hi: "मेन्यू", en: "Menu" })} aria-haspopup="dialog" className="grid h-11 w-11 shrink-0 place-items-center rounded-full text-ink-900 active:bg-ink-100">
      <MenuIcon className="h-6 w-6" strokeWidth={2} aria-hidden />
    </button>
  );

  return (
    <ActionPalette.Provider value={!path.startsWith("/assistant/")}>
    <MenuContext.Provider value={{ openMenu }}>
    <div data-action-theme={!path.startsWith("/assistant/") ? "evergreen" : undefined} className={clsx("relative mx-auto flex min-h-[100dvh] max-w-[560px] flex-col", isStudy && "study-page", isHome ? "bg-[#F7F9FC]" : own || big ? "bg-[#F7F9FC]" : "bg-[#F7F9FC]")}>
      {big && page && (
        <header className="pt-safe px-4">
          <div className="-ml-2.5 flex items-center gap-1 pb-1 pt-4">
            {menuButton}
            <h1 className={clsx("min-w-0 flex-1 truncate text-[28px] font-extrabold tracking-[-0.01em] text-ink-950", page.noTitle && "invisible")}>{L(page.title)}</h1>
            <TopActions />
          </div>
        </header>
      )}
      {page?.noHeader && <div className="pt-safe" aria-hidden />}
      {!isHome && !big && !own && !page?.noHeader && (
        <header className={clsx("pt-safe sticky top-0 z-20 backdrop-blur-sm", "bg-[#F7F9FC]/95")}>
          <div className="grid h-14 grid-cols-[48px_1fr_48px] items-center px-1.5">
            {page?.back ? (
              <Link href={page.back} onClick={markBack} className="grid h-11 w-11 place-items-center rounded-full text-ink-900 active:bg-ink-100" aria-label={L({ hi: "वापस", en: "Back" })}>
                <ChevronLeft className="h-6 w-6" aria-hidden />
              </Link>
            ) : (
              menuButton
            )}
            <h1 className="truncate text-center text-[18px] font-bold">{page ? L(page.title) : ""}</h1>
            <span className="flex justify-end">
              {page?.action ? (
                <Link href={page.action.href} className="grid h-11 w-11 place-items-center rounded-full text-ink-900 active:bg-ink-100" aria-label={L(page.action.text)}>
                  <Plus className="h-6 w-6" aria-hidden />
                </Link>
              ) : canSwitch ? (
                <button onClick={() => setSwitching(true)} className="grid h-11 w-11 place-items-center rounded-full active:bg-ink-100" aria-label={`${L({ hi: "बच्चा बदलें", en: "Switch child" })}: ${child!.name}`}>
                  <Avatar name={child!.name} url={child!.photoUrl} size={32} tint={me!.children.findIndex((c) => c.id === child!.id)} />
                </button>
              ) : null}
            </span>
          </div>
        </header>
      )}

      <main className={clsx("relative z-10 flex-1", !page?.bare && (isHome ? "pb-40" : "pb-28"), !isHome && !own && "space-y-3.5 px-4", !isHome && !own && (big ? "pt-3" : "pt-1"))}>
        {!isHome && !own && <ResourceStatus />}
        {error && error.status !== 401 ? (
          <div className={clsx(isHome && "px-4 pt-6")}>
            <ErrorCard offline={error.status === 0} onRetry={reload} />
          </div>
        ) : isHome ? (
          <div key={path} className={motion}>
            {children}
          </div>
        ) : (
          <div key={path} className={clsx(motion, !own && "space-y-3.5")}>
            {children}
          </div>
        )}
      </main>

      {/* AI Assistant (the AI chat): when switched on in the side menu, a round button on every tab screen, Home too, that can be dragged to either side. */}
      {!page?.bare && !page?.noOwl && <SahayakButton />}

      {!page?.bare && (
      // Flat, five equal tabs (the user's design, 2026-11-13; it used to raise Study as a green disc):
      // white, a hairline on top, and a navy line over the lit tab, whose icon is filled navy.
      <>
      {/* Home only (user, 2026-11-22): a navy wave with a gold stripe fixed to the bottom of the screen, edge to
          edge, with the tab bar sitting on it as a white sheet with rounded top corners. Decoration only. */}
      {isHome && (
        <div aria-hidden className="pointer-events-none fixed inset-x-0 bottom-0 z-[19] mx-auto h-[calc(64px+56px+env(safe-area-inset-bottom,0px))] max-w-[560px]">
          <svg viewBox="0 0 400 56" preserveAspectRatio="none" className="absolute inset-x-0 top-0 h-[56px] w-full">
            <defs>
              <linearGradient id="home-wave-gold" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0" stopColor="#E8A93A" stopOpacity="0" />
                <stop offset="0.3" stopColor="#E8A93A" />
                <stop offset="1" stopColor="#F2C45A" />
              </linearGradient>
            </defs>
            {/* navy: from the left, dipping a little, then rising to meet the gold on the right (no white corner) */}
            <path d="M0 14 C 70 22, 130 36, 170 42 C 280 38, 345 26, 400 12 L400 56 L0 56 Z" fill="#0D2A5E" />
            {/* gold stripe riding the navy's top edge from the middle up to the right edge */}
            <path d="M170 40 C 250 38, 330 22, 400 2 L400 12 C 345 26, 280 38, 170 42 Z" fill="url(#home-wave-gold)" />
          </svg>
          <div className="absolute inset-x-0 bottom-0 top-[55px] bg-[#0D2A5E]" />
        </div>
      )}
      <nav className={clsx("fixed inset-x-0 bottom-0 z-20 mx-auto max-w-[560px] bg-white pb-[env(safe-area-inset-bottom,0px)]", isHome ? "rounded-t-[24px] shadow-[0_-6px_18px_rgba(13,42,94,0.18)]" : "border-t border-[#DFE5EF]")} aria-label="Main">
        <ul className="relative grid min-h-[64px] grid-cols-5">
          {TABS.map(({ href, text, icon: Icon }) => {
            const on = lit === href;
            return (
              <li key={href} className="relative">
                {on && <span className="absolute inset-x-1 top-[-1px] h-[3px] rounded-b bg-[#0D2A5E]" aria-hidden />}
                <Link href={href} aria-current={on ? "page" : undefined} className={clsx("flex h-full min-h-[64px] min-w-0 flex-col items-center justify-center gap-1 py-2 text-[12px] transition-colors duration-300", on ? "font-bold text-[#0D2A5E]" : "font-medium text-[#5B6478]")}>
                  <Icon className="h-6 w-6" strokeWidth={on ? 2.2 : 1.7} fill={on ? "currentColor" : "none"} aria-hidden />
                  <span className="block w-full min-w-0 break-words text-center leading-snug">{L(text)}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
      </>
      )}

      {switching && <ChildSheet onClose={() => setSwitching(false)} />}
      {!page?.bare && <SideMenu active={menu} layerRef={layerRef} onClose={closeMenu} onSwitchChild={() => setSwitching(true)} />}
      {/* Pull down to refresh (not on a chat: it reloads itself, and pulling there means scrolling up). */}
      <PullRefresh off={!!page?.bare || menu} />
    </div>
    </MenuContext.Provider>
    </ActionPalette.Provider>
  );
}
