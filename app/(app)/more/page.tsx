"use client";

import { useState } from "react";
import clsx from "clsx";
import { LogOut } from "lucide-react";
import { api, clearCache } from "@/lib/api";
import { useParent } from "@/lib/parent";
import { useT } from "@/lib/i18n";
import { phoneText } from "@/lib/format";
import { Avatar, CallOffice } from "@/components/ui";

export default function MorePage() {
  const { me, child, pick } = useParent();
  const { t, lang, setLang } = useT();
  const [leaving, setLeaving] = useState(false);

  async function logout() {
    setLeaving(true);
    await api("/logout", { method: "POST" }).catch(() => null);
    clearCache();
    window.location.replace("/login/");
  }

  return (
    <div className="animate-rise space-y-3">
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
