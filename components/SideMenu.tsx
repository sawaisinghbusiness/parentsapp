"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { usePathname } from "next/navigation";
import clsx from "clsx";
import {
  BookOpen,
  Bus,
  CalendarDays,
  CalendarX2,
  ClipboardList,
  FileText,
  Handshake,
  Home,
  IdCard,
  Images,
  IndianRupee,
  LogOut,
  Megaphone,
  MessageCircle,
  UserRound,
  X,
  type LucideIcon,
} from "lucide-react";
import { api, clearCache, markSignedIn } from "@/lib/api";
import { useParent } from "@/lib/parent";
import { useL, useT, type Bi } from "@/lib/i18n";
import { Avatar, SchoolMark } from "./ui";

type Item = { href: string; text: Bi; icon: LucideIcon };

const MAIN: Item[] = [
  { href: "/", text: { hi: "होम", en: "Home" }, icon: Home },
  { href: "/calendar/", text: { hi: "हाज़िरी और कैलेंडर", en: "Attendance & Calendar" }, icon: CalendarDays },
  { href: "/fees/", text: { hi: "फ़ीस", en: "Fees" }, icon: IndianRupee },
  { href: "/homework/", text: { hi: "होमवर्क", en: "Homework" }, icon: BookOpen },
];
const SCHOOL: Item[] = [
  { href: "/teachers/", text: { hi: "टीचर से पूछें", en: "Ask Teacher" }, icon: MessageCircle },
  { href: "/meetings/", text: { hi: "मीटिंग", en: "Meetings" }, icon: Handshake },
  { href: "/exam/", text: { hi: "परीक्षा", en: "Exam" }, icon: ClipboardList },
  { href: "/report-card/", text: { hi: "रिपोर्ट कार्ड", en: "Report Card" }, icon: FileText },
  { href: "/leave/", text: { hi: "छुट्टी", en: "Leave" }, icon: CalendarX2 },
  { href: "/bus/", text: { hi: "बस", en: "Bus" }, icon: Bus },
  { href: "/events/", text: { hi: "कार्यक्रम", en: "Events" }, icon: Images },
  { href: "/notice/", text: { hi: "सूचना", en: "Notice" }, icon: Megaphone },
];
const ACCOUNT: Item[] = [
  { href: "/id-card/", text: { hi: "आईडी कार्ड", en: "ID Card" }, icon: IdCard },
  { href: "/profile/", text: { hi: "प्रोफ़ाइल", en: "Profile" }, icon: UserRound },
];

/** The side menu: every screen of the app in one list, the child on top, sign out at the foot. */
export function SideMenu({ onClose, onSwitchChild }: { onClose: () => void; onSwitchChild: () => void }) {
  const { me, child } = useParent();
  const L = useL();
  const { lang, setLang } = useT();
  const path = usePathname();
  const panel = useRef<HTMLDivElement>(null);
  const [shown, setShown] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const swipe = useRef<number | null>(null);
  const many = (me?.children.length || 0) > 1;
  const tint = Math.max(0, me?.children.findIndex((c) => c.id === child?.id) ?? 0);

  // Slide in on the next frame; Esc closes; the page behind doesn't scroll.
  useEffect(() => {
    const raf = requestAnimationFrame(() => setShown(true));
    panel.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && close();
    window.addEventListener("keydown", onKey);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = overflow;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function close() {
    setShown(false);
    setTimeout(onClose, 220);
  }

  async function logout() {
    setLeaving(true);
    await api("/logout", { method: "POST" }).catch(() => null);
    clearCache();
    markSignedIn(false);
    window.location.replace("/login/");
  }

  const group = (title: Bi | null, items: Item[]) => (
    <div className="py-1.5">
      {title && <p className="px-5 pb-1 pt-2 text-[12.5px] font-semibold text-ink-400">{L(title)}</p>}
      <ul>
        {items.map(({ href, text, icon: Icon }) => {
          const on = path === href;
          return (
            <li key={href}>
              <Link
                href={href}
                onClick={close}
                aria-current={on ? "page" : undefined}
                className={clsx("mx-2 flex min-h-[48px] items-center gap-3.5 rounded-xl px-3 text-[15.5px] active:bg-ink-100", on ? "bg-ink-100 font-semibold text-ink-900" : "font-medium text-ink-800")}
              >
                <Icon className="h-[21px] w-[21px] shrink-0 text-ink-900" strokeWidth={1.8} aria-hidden />
                {L(text)}
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );

  // Drawn on <body>, so the page's own layers (and the tab bar) can't sit on top of it.
  return createPortal(
    <div className="fixed inset-0 z-50" role="dialog" aria-modal="true" aria-label={L({ hi: "मेन्यू", en: "Menu" })}>
      <button type="button" aria-label={L({ hi: "बंद करें", en: "Close" })} onClick={close} className={clsx("absolute inset-0 bg-ink-950/40 transition-opacity duration-200", shown ? "opacity-100" : "opacity-0")} />
      {/* Opens from the left edge of the app itself (it is centred, max 560px, on a wide screen). */}
      <div className="pointer-events-none absolute inset-y-0 left-1/2 w-full max-w-[560px] -translate-x-1/2 overflow-hidden">
      <div
        ref={panel}
        tabIndex={-1}
        // Swipe left on the menu to close it.
        onTouchStart={(e) => (swipe.current = e.touches[0].clientX)}
        onTouchEnd={(e) => {
          if (swipe.current !== null && swipe.current - e.changedTouches[0].clientX > 60) close();
          swipe.current = null;
        }}
        className={clsx(
          "pt-safe pb-safe pointer-events-auto absolute inset-y-0 left-0 flex w-[84%] max-w-[320px] flex-col bg-white shadow-[8px_0_32px_rgba(15,23,42,.18)] outline-none focus:outline-none focus-visible:outline-none transition-transform duration-200 ease-out motion-reduce:transition-none",
          shown ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {/* School */}
        <div className="flex items-center gap-3 border-b border-ink-100 px-4 pb-4 pt-4">
          {me?.school && <SchoolMark name={me.school.name} url={me.school.logoUrl} size={40} />}
          <p className="line-clamp-2 min-w-0 flex-1 text-[14px] font-semibold leading-tight text-ink-900">{me?.school.name}</p>
          <button type="button" onClick={close} aria-label={L({ hi: "बंद करें", en: "Close" })} className="grid h-10 w-10 shrink-0 place-items-center rounded-full text-ink-700 active:bg-ink-100">
            <X className="h-5 w-5" aria-hidden />
          </button>
        </div>

        <div className="no-scrollbar min-h-0 flex-1 overflow-y-auto overscroll-contain">
          {/* Child */}
          {child && (
            <div className="flex items-center gap-3 px-5 py-4">
              <Avatar name={child.name} url={child.photoUrl} size={44} tint={tint} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-[16px] font-semibold text-ink-900">{child.name}</p>
                <p className="truncate text-[13px] text-ink-500">
                  {L({ hi: "कक्षा", en: "Class" })} {child.classSec}
                </p>
              </div>
              {many && (
                <button
                  type="button"
                  onClick={() => {
                    close();
                    setTimeout(onSwitchChild, 230);
                  }}
                  className="shrink-0 rounded-lg border border-ink-200 px-3 py-1.5 text-[13px] font-semibold text-ink-800 active:bg-ink-50"
                >
                  {L({ hi: "बदलें", en: "Switch" })}
                </button>
              )}
            </div>
          )}
          <div className="border-t border-ink-100">{group(null, MAIN)}</div>
          <div className="border-t border-ink-100">{group({ hi: "स्कूल", en: "School" }, SCHOOL)}</div>
          <div className="border-t border-ink-100">{group({ hi: "खाता", en: "Account" }, ACCOUNT)}</div>
        </div>

        {/* Language and sign out */}
        <div className="flex items-center gap-2 border-t border-ink-100 px-4 py-3">
          <div className="flex rounded-lg border border-ink-200 p-0.5" role="group" aria-label={L({ hi: "भाषा", en: "Language" })}>
            {(["en", "hi"] as const).map((k) => (
              <button key={k} type="button" onClick={() => setLang(k)} aria-pressed={lang === k} className={clsx("h-9 rounded-md px-3 text-[13px] font-semibold", lang === k ? "bg-ink-900 text-white" : "text-ink-600")}>
                {k === "en" ? "English" : "हिंदी"}
              </button>
            ))}
          </div>
          <button type="button" onClick={logout} disabled={leaving} className="ml-auto flex h-10 items-center gap-2 rounded-lg px-3 text-[14px] font-semibold text-rose-600 active:bg-rose-50 disabled:opacity-50">
            <LogOut className="h-[18px] w-[18px]" aria-hidden />
            {L({ hi: "साइन आउट", en: "Sign out" })}
          </button>
        </div>
      </div>
      </div>
    </div>,
    document.body
  );
}
