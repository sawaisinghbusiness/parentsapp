"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import clsx from "clsx";
import { BookOpen, CalendarCheck, ChevronDown, ChevronLeft, Home, IndianRupee, UserRound } from "lucide-react";
import { useParent } from "@/lib/parent";
import { useL, type Bi } from "@/lib/i18n";
import { Avatar, ErrorCard, OfflineNote } from "./ui";
import { ChildSheet } from "./ChildSheet";

const TABS: { href: string; text: Bi; icon: typeof Home }[] = [
  { href: "/", text: { hi: "होम", en: "Home" }, icon: Home },
  { href: "/fees/", text: { hi: "फ़ीस", en: "Fees" }, icon: IndianRupee },
  { href: "/study/", text: { hi: "पढ़ाई", en: "Study" }, icon: BookOpen },
  { href: "/attendance/", text: { hi: "हाज़िरी", en: "Attendance" }, icon: CalendarCheck },
  { href: "/more/", text: { hi: "प्रोफ़ाइल", en: "Profile" }, icon: UserRound },
];

/** Title of each screen, where Back goes, and whether it shows one child's data (then the child can be switched). */
const PAGES: Record<string, { title: Bi; back?: string; perChild?: boolean }> = {
  "/fees/": { title: { hi: "फ़ीस", en: "Fees" }, perChild: true },
  "/study/": { title: { hi: "पढ़ाई", en: "Study" }, perChild: true },
  "/attendance/": { title: { hi: "हाज़िरी", en: "Attendance" }, perChild: true },
  "/more/": { title: { hi: "प्रोफ़ाइल", en: "Profile" } },
  "/more/notices/": { title: { hi: "सूचनाएँ", en: "Notices" }, back: "/" },
  "/more/leave/": { title: { hi: "छुट्टी की अर्ज़ी", en: "Leave application" }, back: "/", perChild: true },
  "/more/bus/": { title: { hi: "बस", en: "School bus" }, back: "/", perChild: true },
  "/more/id-card/": { title: { hi: "आईडी कार्ड", en: "ID card" }, back: "/", perChild: true },
  "/more/report-card/": { title: { hi: "रिज़ल्ट", en: "Result" }, back: "/", perChild: true },
};

const norm = (p: string) => (p.endsWith("/") ? p : p + "/");

/**
 * Home draws its own header. Every other screen gets one slim bar: Back (on inner screens), the
 * screen's name, and — only where the screen is about one child and there is more than one —
 * a small button to switch child. The tab bar sits at the bottom.
 */
export function AppShell({ children }: { children: React.ReactNode }) {
  const path = norm(usePathname() || "/");
  const { me, child, stale, error, reload } = useParent();
  const L = useL();
  const [switching, setSwitching] = useState(false);
  const page = PAGES[path];
  const isHome = path === "/";
  const canSwitch = !!page?.perChild && (me?.children.length || 0) > 1 && !!child;

  return (
    <div className="mx-auto flex min-h-[100dvh] max-w-[560px] flex-col">
      {!isHome && (
        <header className="pt-safe sticky top-0 z-20 bg-canvas text-ink-900">
          <div className="flex h-16 items-center gap-1 px-2">
            {page?.back ? (
              <Link href={page.back} className="grid h-11 w-11 place-items-center rounded-full text-ink-800 active:bg-ink-200/60" aria-label={L({ hi: "वापस", en: "Back" })}>
                <ChevronLeft className="h-6 w-6" aria-hidden />
              </Link>
            ) : (
              <span className="w-3" />
            )}
            <h1 className="min-w-0 flex-1 truncate pt-0.5 text-[24px] font-semibold tracking-tight text-ink-900">{page ? L(page.title) : ""}</h1>
            {canSwitch && (
              <button onClick={() => setSwitching(true)} className="flex min-h-[44px] items-center gap-2 pr-2 text-[15px] font-semibold text-ink-800" aria-label={L({ hi: "बच्चा बदलें", en: "Switch child" })}>
                <Avatar name={child!.name} url={child!.photoUrl} size={28} />
                {child!.name.split(" ")[0]}
                <ChevronDown className="-ml-1 h-4 w-4 text-ink-500" aria-hidden />
              </button>
            )}
          </div>
        </header>
      )}

      <main className={clsx("flex-1 pb-28", !isHome && "space-y-3 px-3 pt-3")}>
        {!isHome && <OfflineNote show={stale && !!me} />}
        {error && error.status !== 401 ? (
          <div className={clsx(isHome && "px-3 pt-6")}>
            <ErrorCard offline={error.status === 0} onRetry={reload} />
          </div>
        ) : (
          children
        )}
      </main>

      <nav className="pb-safe fixed inset-x-0 bottom-0 z-20 mx-auto max-w-[560px] border-t border-ink-200 bg-white" aria-label="Main">
        <ul className="grid grid-cols-5">
          {TABS.map(({ href, text, icon: Icon }) => {
            const on = href === "/" ? path === "/" : path.startsWith(href) && !(href === "/more/" && PAGES[path]?.back);
            return (
              <li key={href}>
                <Link href={href} aria-current={on ? "page" : undefined} className={clsx("flex h-[64px] flex-col items-center justify-center gap-1 text-[13px]", on ? "font-semibold text-brand-700" : "font-medium text-ink-500")}>
                  <Icon className="h-[23px] w-[23px]" strokeWidth={on ? 2.3 : 1.8} aria-hidden />
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
