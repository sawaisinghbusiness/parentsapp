"use client";

import { useState } from "react";
import Link from "next/link";
import clsx from "clsx";
import { Bell, Bus, CalendarOff, Check, ChevronRight, GraduationCap, IdCard, Languages, LogOut, Phone, type LucideIcon } from "lucide-react";
import { api, clearCache } from "@/lib/api";
import { useParent } from "@/lib/parent";
import { useL, useT, type Bi } from "@/lib/i18n";
import { phoneText } from "@/lib/format";
import { Avatar, Skeleton } from "@/components/ui";

/** One row of a settings group: icon, label, optional value on the right, chevron. */
function Row({ href, icon: Icon, text, value, tone }: { href: string; icon: LucideIcon; text: string; value?: string; tone?: "danger" }) {
  const inner = (
    <>
      <Icon className={clsx("h-[22px] w-[22px] shrink-0", tone ? "text-rose-600" : "text-ink-500")} strokeWidth={1.9} aria-hidden />
      <span className={clsx("min-w-0 flex-1 text-[17px] font-medium", tone ? "text-rose-700" : "text-ink-900")}>{text}</span>
      {value && <span className="tnum shrink-0 text-[15px] text-ink-500">{value}</span>}
      {!tone && <ChevronRight className="h-5 w-5 shrink-0 text-ink-300" aria-hidden />}
    </>
  );
  const cls = "flex min-h-[56px] items-center gap-3.5 px-4 active:bg-ink-50";
  return href.startsWith("tel:") ? (
    <a href={href} className={cls}>
      {inner}
    </a>
  ) : (
    <Link href={href} className={cls}>
      {inner}
    </Link>
  );
}

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="px-4 pb-1.5 text-[15px] font-semibold text-ink-500">{title}</h2>
      <div className="card divide-y divide-ink-100 overflow-hidden">{children}</div>
    </section>
  );
}

const CHILD_ROWS: { href: string; icon: LucideIcon; text: Bi }[] = [
  { href: "/more/id-card/", icon: IdCard, text: { hi: "आईडी कार्ड", en: "ID card" } },
  { href: "/more/report-card/", icon: GraduationCap, text: { hi: "रिज़ल्ट", en: "Result" } },
  { href: "/more/bus/", icon: Bus, text: { hi: "बस", en: "School bus" } },
  { href: "/more/leave/", icon: CalendarOff, text: { hi: "छुट्टी की अर्ज़ी", en: "Leave application" } },
];

/** Profile: who is signed in, their children, then plain settings groups. */
export default function ProfilePage() {
  const { me, child, pick } = useParent();
  const L = useL();
  const { lang, setLang } = useT();
  const [leaving, setLeaving] = useState(false);
  const parent = me?.children[0]?.fatherName || L({ hi: "अभिभावक", en: "Parent" });

  async function logout() {
    setLeaving(true);
    await api("/logout", { method: "POST" }).catch(() => null);
    clearCache();
    window.location.replace("/login/");
  }

  if (!me) {
    return (
      <div className="card flex items-center gap-3 p-4">
        <Skeleton className="h-14 w-14 rounded-full" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-4 w-28" />
        </div>
      </div>
    );
  }

  return (
    <div className="animate-rise space-y-5 pb-4">
      {/* The parent */}
      <section className="flex items-center gap-4 px-1 pt-1">
        <Avatar name={parent} size={56} />
        <div className="min-w-0">
          <p className="truncate text-[22px] font-semibold text-ink-900">{parent}</p>
          <p className="tnum text-[15px] text-ink-500">+91 {phoneText(me.phone)}</p>
        </div>
      </section>

      {/* Children: tap to switch whose details the app shows */}
      <Group title={me.children.length > 1 ? L({ hi: "आपके बच्चे", en: "Your children" }) : L({ hi: "आपका बच्चा", en: "Your child" })}>
        {me.children.map((c) => {
          const on = c.id === child?.id;
          return (
            <button key={c.id} onClick={() => pick(c.id)} className="flex min-h-[72px] w-full items-center gap-3 px-4 py-2 text-left active:bg-ink-50">
              <Avatar name={c.name} url={c.photoUrl} size={44} />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[17px] font-semibold text-ink-900">{c.name}</span>
                <span className="block text-sm text-ink-500">
                  {L({ hi: "कक्षा", en: "Class" })} {c.classSec}
                  {c.rollNo ? ` · ${L({ hi: "रोल", en: "Roll" })} ${c.rollNo}` : ""}
                </span>
              </span>
              {me.children.length > 1 && on && <Check className="h-6 w-6 shrink-0 text-brand-600" aria-label={L({ hi: "चुना हुआ", en: "Selected" })} />}
            </button>
          );
        })}
      </Group>

      <Group title={child ? `${child.name.split(" ")[0]} ${L({ hi: "के लिए", en: "— details" })}` : ""}>
        {CHILD_ROWS.map((r) => (
          <Row key={r.href} href={r.href} icon={r.icon} text={L(r.text)} />
        ))}
      </Group>

      <Group title={me.school.name}>
        <Row href="/more/notices/" icon={Bell} text={L({ hi: "सूचनाएँ", en: "Notices" })} />
        {me.school.officePhone && <Row href={`tel:${me.school.officePhone.replace(/\s/g, "")}`} icon={Phone} text={L({ hi: "ऑफ़िस को कॉल करें", en: "Call the office" })} value={me.school.officePhone} />}
      </Group>

      <Group title={L({ hi: "ऐप", en: "App" })}>
        <div className="flex min-h-[56px] items-center gap-3.5 px-4">
          <Languages className="h-[22px] w-[22px] shrink-0 text-ink-500" strokeWidth={1.9} aria-hidden />
          <span className="min-w-0 flex-1 text-[17px] font-medium text-ink-900">{L({ hi: "भाषा", en: "Language" })}</span>
          <div className="flex rounded-xl bg-ink-100 p-0.5" role="radiogroup" aria-label={L({ hi: "भाषा", en: "Language" })}>
            {(["hi", "en"] as const).map((l) => (
              <button key={l} role="radio" aria-checked={lang === l} onClick={() => setLang(l)} className={clsx("min-h-[44px] rounded-[10px] px-3 text-[15px] font-semibold", lang === l ? "bg-white text-ink-900 shadow-sm" : "text-ink-500")}>
                {l === "hi" ? "हिंदी" : "English"}
              </button>
            ))}
          </div>
        </div>
        <button onClick={logout} disabled={leaving} className="flex min-h-[56px] w-full items-center gap-3.5 px-4 text-left active:bg-ink-50">
          <LogOut className="h-[22px] w-[22px] shrink-0 text-rose-600" strokeWidth={1.9} aria-hidden />
          <span className="text-[17px] font-medium text-rose-700">{L({ hi: "लॉग आउट", en: "Sign out" })}</span>
        </button>
      </Group>
    </div>
  );
}
