"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import clsx from "clsx";
import { BookOpen, CalendarCheck, Home, IndianRupee, Menu } from "lucide-react";
import { useParent } from "@/lib/parent";
import { useT, type TextKey } from "@/lib/i18n";
import { Avatar, OfflineNote, Skeleton } from "./ui";

const TABS: { href: string; key: TextKey; icon: typeof Home }[] = [
  { href: "/", key: "tab.home", icon: Home },
  { href: "/fees/", key: "tab.fees", icon: IndianRupee },
  { href: "/study/", key: "tab.study", icon: BookOpen },
  { href: "/attendance/", key: "tab.attendance", icon: CalendarCheck },
  { href: "/more/", key: "tab.more", icon: Menu },
];

const norm = (p: string) => (p.endsWith("/") ? p : p + "/");

/** Dark top bar with the school and the child being shown, the screen, then the tab bar. */
export function AppShell({ children }: { children: React.ReactNode }) {
  const path = norm(usePathname() || "/");
  const { me, child, pick, stale } = useParent();
  const { t } = useT();
  const many = (me?.children.length || 0) > 1;

  return (
    <div className="mx-auto flex min-h-[100dvh] max-w-[560px] flex-col">
      <header className="pt-safe sticky top-0 z-20 bg-night-900 text-white">
        <div className="flex h-14 items-center gap-3 px-4">
          {me?.school.logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={me.school.logoUrl} alt="" className="h-8 w-8 rounded-lg bg-white object-contain p-0.5" />
          ) : null}
          <p className="min-w-0 flex-1 truncate text-[15px] font-semibold text-white/90">{me?.school.name || " "}</p>
        </div>

        {/* The child: one shows as a header line, siblings as a row of chips to switch between. */}
        <div className="px-4 pb-4">
          {!child ? (
            <div className="flex items-center gap-3">
              <Skeleton className="h-12 w-12 rounded-full !bg-night-700" />
              <div className="space-y-2">
                <Skeleton className="h-4 w-36 !bg-night-700" />
                <Skeleton className="h-3 w-24 !bg-night-700" />
              </div>
            </div>
          ) : many ? (
            <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-0.5 [scrollbar-width:none]" role="tablist">
              {me!.children.map((c) => {
                const on = c.id === child.id;
                return (
                  <button
                    key={c.id}
                    role="tab"
                    aria-selected={on}
                    onClick={() => pick(c.id)}
                    className={clsx(
                      "flex min-h-[52px] shrink-0 items-center gap-2.5 rounded-2xl border py-1.5 pl-1.5 pr-4 text-left transition",
                      on ? "border-marigold-400 bg-white text-ink-900" : "border-night-600 bg-night-800 text-white/80"
                    )}
                  >
                    <Avatar name={c.name} url={c.photoUrl} size={40} />
                    <span className="leading-tight">
                      <span className="block text-[15px] font-semibold">{c.name.split(" ")[0]}</span>
                      <span className={clsx("block text-xs", on ? "text-ink-500" : "text-white/55")}>{c.classSec}</span>
                    </span>
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <Avatar name={child.name} url={child.photoUrl} size={48} />
              <div className="min-w-0">
                <p className="truncate text-lg font-bold leading-tight">{child.name}</p>
                <p className="text-sm text-white/65">
                  {child.classSec}
                  {child.rollNo ? ` · ${t("common.roll")} ${child.rollNo}` : ""}
                </p>
              </div>
            </div>
          )}
        </div>
      </header>

      <main className="flex-1 space-y-3 px-3 pb-28 pt-3">
        <OfflineNote show={stale && !!me} />
        {children}
      </main>

      <nav className="pb-safe fixed inset-x-0 bottom-0 z-20 mx-auto max-w-[560px] border-t border-ink-200 bg-white shadow-bar" aria-label="Main">
        <ul className="grid grid-cols-5">
          {TABS.map(({ href, key, icon: Icon }) => {
            const on = href === "/" ? path === "/" : path.startsWith(href);
            return (
              <li key={href}>
                <Link href={href} aria-current={on ? "page" : undefined} className={clsx("relative flex h-16 flex-col items-center justify-center gap-1 text-xs font-semibold", on ? "text-brand-700" : "text-ink-500")}>
                  {on && <span className="absolute inset-x-5 top-0 h-[3px] rounded-b-full bg-brand-600" aria-hidden />}
                  <Icon className="h-6 w-6" strokeWidth={on ? 2.3 : 1.9} aria-hidden />
                  {t(key)}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </div>
  );
}
