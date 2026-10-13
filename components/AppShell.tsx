"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import clsx from "clsx";
import { CalendarDays, ChevronLeft, Home, IndianRupee, Menu as MenuIcon, Plus, UserRound, type LucideIcon } from "lucide-react";
import { useParent } from "@/lib/parent";
import { useL, type Bi } from "@/lib/i18n";
import { Avatar, ErrorCard, OfflineNote } from "./ui";
import { ChildSheet } from "./ChildSheet";
import { TopActions } from "./TopActions";
import { SideMenu } from "./SideMenu";
import { PullRefresh } from "./PullRefresh";
import { MenuContext } from "@/lib/menu";

const TABS: { href: string; text: Bi; icon: LucideIcon }[] = [
  { href: "/", text: { hi: "होम", en: "Home" }, icon: Home },
  { href: "/calendar/", text: { hi: "कैलेंडर", en: "Calendar" }, icon: CalendarDays },
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
}

const PAGES: Record<string, PageInfo> = {
  "/calendar/": { title: { hi: "कैलेंडर", en: "Calendar" }, perChild: true, big: true, noTitle: true },
  "/fees/": { title: { hi: "फ़ीस", en: "Fees" }, perChild: true },
  "/fees/detail/": { title: { hi: "फ़ीस का ब्योरा", en: "Fee Detail" }, back: "/fees/", tab: "/fees/", perChild: true },
  "/fees/pay/": { title: { hi: "भुगतान", en: "Payment" }, back: "/fees/", tab: "/fees/", perChild: true },
  "/profile/": { title: { hi: "प्रोफ़ाइल", en: "Profile" } },
  "/id-card/": { title: { hi: "आईडी कार्ड", en: "ID Card" }, back: "/profile/", tab: "/profile/", perChild: true },
  "/exam/": { title: { hi: "परीक्षा", en: "Exam" }, back: "/", perChild: true },
  "/report-card/": { title: { hi: "रिपोर्ट कार्ड", en: "Report Card" }, back: "/", perChild: true },
  "/exam/detail/": { title: { hi: "रिज़ल्ट", en: "Result" }, back: "/exam/?tab=result", perChild: true },
  "/leave/": { title: { hi: "छुट्टी", en: "Leave" }, back: "/", perChild: true, action: { href: "/leave/apply/", text: { hi: "छुट्टी की अर्ज़ी", en: "Apply leave" } } },
  "/leave/apply/": { title: { hi: "छुट्टी की अर्ज़ी", en: "Apply Leave" }, back: "/leave/", perChild: true },
  "/homework/": { title: { hi: "होमवर्क", en: "Homework" }, back: "/", perChild: true },
  "/events/": { title: { hi: "कार्यक्रम", en: "Events" }, back: "/" },
  "/events/album/": { title: { hi: "फ़ोटो", en: "Photos" }, back: "/events/" },
  "/notice/": { title: { hi: "सूचनाएँ", en: "Notice" }, back: "/" },
  "/bus/": { title: { hi: "स्कूल बस", en: "School Bus" }, back: "/", perChild: true },
  "/meetings/": { title: { hi: "मीटिंग", en: "Meetings" }, back: "/", perChild: true },
  "/meetings/detail/": { title: { hi: "मीटिंग", en: "Meeting" }, back: "/meetings/", perChild: true },
  "/search/": { title: { hi: "खोजें", en: "Search" }, back: "/" },
  "/teachers/": { title: { hi: "टीचर से पूछें", en: "Ask Teacher" }, back: "/", perChild: true },
  "/teachers/chat/": { title: { hi: "टीचर से बात", en: "Chat" }, back: "/teachers/", perChild: true, own: true, bare: true },
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
  const [menu, setMenu] = useState(false);
  const page = PAGES[path];
  const isHome = path === "/";
  const big = !!page?.big;
  const own = !!page?.own;
  const canSwitch = !!page?.perChild && (me?.children.length || 0) > 1 && !!child;
  const lit = isHome ? "/" : page?.tab || (page && !page.back ? path : "/");
  const litIndex = TABS.findIndex((t) => t.href === lit);

  // Swipe right anywhere on the screen to open the side menu (not on a chat, whose screen is all typing,
  // and not when the swipe starts on something that scrolls sideways, like the month strip).
  const touch = useRef<{ x: number; y: number; t: number } | null>(null);
  useEffect(() => {
    if (page?.bare) return;
    const sideways = (el: Element | null) => {
      for (let n = el; n && n !== document.body; n = n.parentElement) {
        const o = getComputedStyle(n).overflowX;
        if ((o === "auto" || o === "scroll") && n.scrollWidth > n.clientWidth + 2) return true;
      }
      return false;
    };
    const start = (e: TouchEvent) => {
      const p = e.touches[0];
      touch.current = e.touches.length === 1 && !sideways(e.target as Element) ? { x: p.clientX, y: p.clientY, t: Date.now() } : null;
    };
    const end = (e: TouchEvent) => {
      const s0 = touch.current;
      touch.current = null;
      if (!s0) return;
      const p = e.changedTouches[0];
      const dx = p.clientX - s0.x;
      const dy = Math.abs(p.clientY - s0.y);
      if (dx > 70 && dy < dx * 0.5 && Date.now() - s0.t < 700) setMenu(true);
    };
    window.addEventListener("touchstart", start, { passive: true });
    window.addEventListener("touchend", end, { passive: true });
    return () => {
      window.removeEventListener("touchstart", start);
      window.removeEventListener("touchend", end);
    };
  }, [page?.bare]);

  const menuButton = (
    <button type="button" onClick={() => setMenu(true)} aria-label={L({ hi: "मेन्यू", en: "Menu" })} aria-haspopup="dialog" className="grid h-11 w-11 shrink-0 place-items-center rounded-full text-ink-900 active:bg-ink-100">
      <MenuIcon className="h-6 w-6" strokeWidth={2} aria-hidden />
    </button>
  );

  return (
    <MenuContext.Provider value={{ openMenu: () => setMenu(true) }}>
    <div className={clsx("mx-auto flex min-h-[100dvh] max-w-[560px] flex-col", own ? "bg-ink-50" : isHome || big ? "bg-ink-50" : "bg-white")}>
      {big && page && (
        <header className="pt-safe px-4">
          <div className="-ml-2.5 flex items-center gap-1 pb-1 pt-4">
            {menuButton}
            <h1 className={clsx("min-w-0 flex-1 truncate text-[28px] font-extrabold tracking-[-0.01em] text-ink-950", page.noTitle && "invisible")}>{L(page.title)}</h1>
            <TopActions />
          </div>
        </header>
      )}
      {!isHome && !big && !own && (
        <header className="pt-safe sticky top-0 z-20 bg-white/95 backdrop-blur-sm">
          <div className="grid h-14 grid-cols-[48px_1fr_48px] items-center px-1.5">
            {page?.back ? (
              <Link href={page.back} className="grid h-11 w-11 place-items-center rounded-full text-ink-900 active:bg-ink-100" aria-label={L({ hi: "वापस", en: "Back" })}>
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

      <main className={clsx("flex-1", !page?.bare && "pb-28", !isHome && !own && "space-y-3.5 px-4", !isHome && !own && (big ? "pt-3" : "pt-1"))}>
        {!isHome && !own && <OfflineNote show={stale && !!me} />}
        {error && error.status !== 401 ? (
          <div className={clsx(isHome && "px-4 pt-6")}>
            <ErrorCard offline={error.status === 0} onRetry={reload} />
          </div>
        ) : isHome ? (
          children
        ) : (
          <div key={path} className={clsx("page-in", !own && "space-y-3.5")}>
            {children}
          </div>
        )}
      </main>

      {!page?.bare && (
      <nav className="pb-safe fixed inset-x-0 bottom-0 z-20 mx-auto max-w-[560px] border-t border-ink-100 bg-white" aria-label="Main">
        <ul className="relative grid grid-cols-4">
          {/* One blue pill that slides to the lit tab. */}
          <span
            aria-hidden
            className="slide-pill pointer-events-none absolute left-0 top-[9px] flex w-1/4 justify-center"
            style={{ transform: `translateX(${Math.max(0, litIndex) * 100}%)`, opacity: litIndex < 0 ? 0 : 1 }}
          >
            <span className="h-8 w-[52px] rounded-[10px] bg-brand-600" />
          </span>
          {TABS.map(({ href, text, icon: Icon }) => {
            const on = lit === href;
            return (
              <li key={href} className="relative">
                <Link href={href} aria-current={on ? "page" : undefined} className={clsx("flex h-[66px] flex-col items-center justify-center gap-0.5 text-[12px] transition-colors duration-300", on ? "font-semibold text-brand-600" : "font-medium text-ink-400")}>
                  <span className={clsx("grid h-8 w-[52px] place-items-center rounded-[10px] transition-colors duration-300", on && "text-white")}>
                    <Icon key={on ? "on" : "off"} className={clsx("h-[22px] w-[22px]", on && "tab-icon-on")} strokeWidth={on ? 2.1 : 1.7} aria-hidden />
                  </span>
                  {L(text)}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
      )}

      {switching && <ChildSheet onClose={() => setSwitching(false)} />}
      {menu && <SideMenu onClose={() => setMenu(false)} onSwitchChild={() => setSwitching(true)} />}
      {/* Pull down to refresh (not on a chat: it reloads itself, and pulling there means scrolling up). */}
      <PullRefresh off={!!page?.bare || menu} />
    </div>
    </MenuContext.Provider>
  );
}
