"use client";

import { useState } from "react";
import Link from "next/link";
import clsx from "clsx";
import { Bell, Bus, CalendarOff, ChevronRight, GraduationCap, IdCard, LogOut } from "lucide-react";
import { api, clearCache } from "@/lib/api";
import { useParent } from "@/lib/parent";
import { useL, useT } from "@/lib/i18n";
import { phoneText } from "@/lib/format";
import { M } from "@/lib/text/more";
import { Avatar, CallOffice } from "@/components/ui";

const LINKS = [
  { href: "/more/notices/", icon: Bell, title: M.notices, sub: M.noticesSub },
  { href: "/more/leave/", icon: CalendarOff, title: M.leave, sub: M.leaveSub },
  { href: "/more/bus/", icon: Bus, title: M.bus, sub: M.busSub },
  { href: "/more/id-card/", icon: IdCard, title: M.idCard, sub: M.idCardSub },
  { href: "/more/report-card/", icon: GraduationCap, title: M.result, sub: M.resultSub },
];

export default function MorePage() {
  const { me, child, pick } = useParent();
  const { t, lang, setLang } = useT();
  const L = useL();
  const [leaving, setLeaving] = useState(false);

  async function logout() {
    setLeaving(true);
    await api("/logout", { method: "POST" }).catch(() => null);
    clearCache();
    window.location.replace("/login/");
  }

  return (
    <div className="animate-rise space-y-3">
      <nav className="card overflow-hidden" aria-label={L(M.back)}>
        <ul className="divide-y divide-ink-100">
          {LINKS.map(({ href, icon: Icon, title, sub }) => (
            <li key={href}>
              <Link href={href} className="flex min-h-[64px] items-center gap-3.5 px-4 py-2.5 active:bg-ink-50">
                <Icon className="h-[22px] w-[22px] shrink-0 text-ink-500" strokeWidth={1.9} aria-hidden />
                <span className="min-w-0 flex-1">
                  <span className="block font-semibold leading-snug text-ink-900">{L(title)}</span>
                  <span className="block truncate text-sm text-ink-500">{L(sub)}</span>
                </span>
                <ChevronRight className="h-5 w-5 shrink-0 text-ink-400" aria-hidden />
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      {me && me.children.length > 0 && (
        <section className="card p-4">
          <p className="card-title">{t("more.children")}</p>
          <ul className="mt-2 divide-y divide-ink-100">
            {me.children.map((c) => (
              <li key={c.id}>
                <button onClick={() => pick(c.id)} className="flex min-h-[64px] w-full items-center gap-3 py-2 text-left">
                  <Avatar name={c.name} url={c.photoUrl} size={44} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-semibold text-ink-900">{c.name}</span>
                    <span className="block text-sm text-ink-500">
                      {c.classSec}
                      {c.rollNo ? ` · ${t("common.roll")} ${c.rollNo}` : ""}
                    </span>
                  </span>
                  {child?.id === c.id && <span className="dot bg-brand-600" aria-label="selected" />}
                </button>
              </li>
            ))}
          </ul>
          <p className="mt-2 text-sm text-ink-500">{phoneText(me.phone)}</p>
        </section>
      )}

      <section className="card p-4">
        <p className="card-title">{t("more.language")}</p>
        <div className="mt-3 grid grid-cols-2 gap-2" role="radiogroup">
          {(["hi", "en"] as const).map((l) => (
            <button
              key={l}
              role="radio"
              aria-checked={lang === l}
              onClick={() => setLang(l)}
              className={clsx("btn border", lang === l ? "border-brand-600 bg-brand-50 text-brand-800" : "border-ink-200 bg-white text-ink-700")}
            >
              {l === "hi" ? "हिंदी" : "English"}
            </button>
          ))}
        </div>
      </section>

      {me?.school.officePhone && (
        <section className="card space-y-3 p-4">
          <p className="card-title">{me.school.name}</p>
          {me.school.address && <p className="text-ink-700">{me.school.address}</p>}
          <CallOffice phone={me.school.officePhone} className="w-full" />
        </section>
      )}

      <button onClick={logout} disabled={leaving} className="btn-quiet w-full text-rose-700">
        <LogOut className="h-5 w-5" aria-hidden /> {t("more.logout")}
      </button>
    </div>
  );
}
