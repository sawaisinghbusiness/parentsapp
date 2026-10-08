"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import clsx from "clsx";
import { CalendarDays, ChevronLeft, Home, IndianRupee, Plus, UserRound, type LucideIcon } from "lucide-react";
import { useParent } from "@/lib/parent";
import { useL, type Bi } from "@/lib/i18n";
import { Avatar, ErrorCard, OfflineNote } from "./ui";
import { ChildSheet } from "./ChildSheet";

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
}

const PAGES: Record<string, PageInfo> = {
  "/calendar/": { title: { hi: "कैलेंडर", en: "Calendar" }, perChild: true },
  "/fees/": { title: { hi: "फ़ीस", en: "Fees" }, perChild: true },
  "/fees/detail/": { title: { hi: "फ़ीस का ब्योरा", en: "Fee Detail" }, back: "/fees/", tab: "/fees/", perChild: true },
  "/fees/pay/": { title: { hi: "भुगतान", en: "Payment" }, back: "/fees/", tab: "/fees/", perChild: true },
  "/profile/": { title: { hi: "प्रोफ़ाइल", en: "Profile" } },
  "/id-card/": { title: { hi: "आईडी कार्ड", en: "ID Card" }, back: "/profile/", tab: "/profile/", perChild: true },
  "/exam/": { title: { hi: "परीक्षा", en: "Exam" }, back: "/", perChild: true },
  "/exam/detail/": { title: { hi: "रिज़ल्ट", en: "Result" }, back: "/exam/?tab=result", perChild: true },
  "/leave/": { title: { hi: "छुट्टी", en: "Leave" }, back: "/", perChild: true, action: { href: "/leave/apply/", text: { hi: "छुट्टी की अर्ज़ी", en: "Apply leave" } } },
  "/leave/apply/": { title: { hi: "छुट्टी की अर्ज़ी", en: "Apply Leave" }, back: "/leave/", perChild: true },
  "/homework/": { title: { hi: "होमवर्क", en: "Homework" }, back: "/", perChild: true },
  "/events/": { title: { hi: "कार्यक्रम", en: "Events" }, back: "/" },
  "/events/album/": { title: { hi: "फ़ोटो", en: "Photos" }, back: "/events/" },
  "/notice/": { title: { hi: "सूचनाएँ", en: "Notice" }, back: "/" },
  "/bus/": { title: { hi: "स्कूल बस", en: "School Bus" }, back: "/", perChild: true },
  "/search/": { title: { hi: "खोजें", en: "Search" }, back: "/" },
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
  const page = PAGES[path];
  const isHome = path === "/";
  const canSwitch = !!page?.perChild && (me?.children.length || 0) > 1 && !!child;
  const lit = isHome ? "/" : page?.tab || (page && !page.back ? path : "/");

  return (
    <div className="mx-auto flex min-h-[100dvh] max-w-[560px] flex-col bg-white">
      {!isHome && (
        <header className="pt-safe sticky top-0 z-20 bg-white/95 backdrop-blur-sm">
          <div className="grid h-14 grid-cols-[48px_1fr_48px] items-center px-1.5">
            {page?.back ? (
              <Link href={page.back} className="grid h-11 w-11 place-items-center rounded-full text-ink-900 active:bg-ink-100" aria-label={L({ hi: "वापस", en: "Back" })}>
                <ChevronLeft className="h-6 w-6" aria-hidden />
              </Link>
            ) : (
              <span />
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

      <main className={clsx("flex-1 pb-28", !isHome && "space-y-3.5 px-4 pt-1")}>
        {!isHome && <OfflineNote show={stale && !!me} />}
        {error && error.status !== 401 ? (
          <div className={clsx(isHome && "px-4 pt-6")}>
            <ErrorCard offline={error.status === 0} onRetry={reload} />
          </div>
        ) : (
          children
        )}
      </main>

      <nav className="pb-safe fixed inset-x-0 bottom-0 z-20 mx-auto max-w-[560px] border-t border-ink-100 bg-white" aria-label="Main">
        <ul className="grid grid-cols-4">
          {TABS.map(({ href, text, icon: Icon }) => {
            const on = lit === href;
            return (
              <li key={href}>
                <Link href={href} aria-current={on ? "page" : undefined} className={clsx("flex h-[62px] flex-col items-center justify-center gap-1 text-[12px]", on ? "font-semibold text-brand-600" : "font-medium text-ink-400")}>
                  <Icon className="h-[23px] w-[23px]" strokeWidth={on ? 2 : 1.7} fill={on && Icon !== IndianRupee ? "#E7E1FD" : "none"} aria-hidden />
                  {L(text)}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {switching && <ChildSheet onClose={() => setSwitching(false)} />}
    </div>
  );
}
