"use client";

import { useState } from "react";
import Link from "next/link";
import clsx from "clsx";
import { Bell, Search } from "lucide-react";
import { useApi } from "@/lib/api";
import { useParent } from "@/lib/parent";
import { useL, useT } from "@/lib/i18n";
import { Avatar, Skeleton } from "./ui";
import { ProfilePeek } from "./ProfilePeek";

/**
 * The right side of a tab screen's top bar, the same as on Home: language, search, notices (with
 * the count of new ones) and the child's photo, which opens their details.
 */
export function TopActions() {
  const L = useL();
  const { lang, setLang } = useT();
  const { me, child } = useParent();
  // Same request as Home, so it comes from the cache and only adds the notice count.
  const { data } = useApi<{ noticeCount?: number }>(child ? `/home?student=${child.id}` : null);
  const [peek, setPeek] = useState(false);
  const unread = data?.noticeCount || 0;
  const tint = Math.max(0, me?.children.findIndex((c) => c.id === child?.id) ?? 0);

  return (
    <div className="flex shrink-0 items-center gap-1">
      <div className="relative flex shrink-0 rounded-full border border-ink-200 bg-white p-0.5" role="group" aria-label={L({ hi: "भाषा", en: "Language" })}>
        <span aria-hidden className="slide-pill absolute left-0.5 top-0.5 h-7 w-[30px] rounded-full bg-brand-600" style={{ transform: lang === "hi" ? "translateX(30px)" : "none" }} />
        {(["en", "hi"] as const).map((k) => (
          <button key={k} onClick={() => setLang(k)} aria-pressed={lang === k} className={clsx("relative h-7 w-[30px] rounded-full text-[12px] font-semibold transition-colors duration-300", lang === k ? "text-white" : "text-ink-500")}>
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
        <button onClick={() => setPeek(true)} aria-haspopup="dialog" className="ml-0.5 shrink-0 rounded-full ring-2 ring-white transition-transform duration-300 active:scale-90" aria-label={`${child.name}: ${L({ hi: "विवरण", en: "details" })}`}>
          <Avatar name={child.name} url={child.photoUrl} size={38} tint={tint} />
        </button>
      ) : (
        <Skeleton className="h-[38px] w-[38px] shrink-0 rounded-full" />
      )}
      {peek && <ProfilePeek onClose={() => setPeek(false)} />}
    </div>
  );
}
