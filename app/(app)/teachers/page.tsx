"use client";

import Link from "next/link";
import { ChevronRight, MessageCircle } from "lucide-react";
import { useApi } from "@/lib/api";
import { useParent } from "@/lib/parent";
import { useL, useT } from "@/lib/i18n";
import { initials, shade, when, type TeacherRow } from "@/lib/teachers";
import { AjrakhHeader } from "@/components/AjrakhHeader";
import { ErrorCard, Skeleton } from "@/components/ui";

/** Ask Teacher: the child's class teacher on top, then the subject teachers. */
export default function TeachersPage() {
  const { child } = useParent();
  const L = useL();
  const { lang } = useT();
  const { data, error, reload } = useApi<{ child: { name: string; classSec: string }; teachers: TeacherRow[] }>(child ? `/teachers?student=${child.id}` : null);
  const ct = data?.teachers.find((t) => t.classTeacher);
  const rest = data?.teachers.filter((t) => t !== ct) || [];
  const chat = (t: TeacherRow) => `/teachers/chat/?id=${t.id}`;
  const subj = (t: TeacherRow) => t.subjects.join(", ");

  return (
    <div className="font-ajk text-ajk-ink">
      <AjrakhHeader back="/">
        <h1 className="text-[27px] font-extrabold leading-tight">{L({ hi: "टीचर से पूछें", en: "Ask Teacher" })}</h1>
        {child && (
          <p className="text-[14.5px] text-ajk-pink">
            {child.name} · {child.classSec}
          </p>
        )}
      </AjrakhHeader>

      <div className="space-y-3 px-4 pt-4">
        {!data ? (
          error && error.status !== 401 ? (
            <ErrorCard offline={error.status === 0} onRetry={reload} />
          ) : (
            <>
              <Skeleton className="h-44 w-full rounded-2xl" />
              <Skeleton className="h-48 w-full rounded-2xl" />
            </>
          )
        ) : data.teachers.length === 0 ? (
          <p className="rounded-2xl border-[1.5px] border-ajk-sand2 bg-white px-4 py-5 text-[15px] text-ajk-mute">
            {L({ hi: "इस कक्षा के टीचर अभी तय नहीं हैं। स्कूल ऑफ़िस से पूछें।", en: "Teachers for this class are not set yet. Please ask the school office." })}
          </p>
        ) : (
          <>
            {ct && (
              <section className="rounded-2xl border-[1.5px] border-ajk-sand2 bg-white p-4">
                <div className="flex items-center gap-3">
                  <span className="grid h-[52px] w-[52px] shrink-0 place-items-center rounded-full text-[17px] font-bold text-white" style={{ background: shade(ct.name) }}>
                    {initials(ct.name)}
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-[18px] font-bold leading-tight">{ct.name}</p>
                    <p className="text-[13.5px] font-semibold text-ajk-m">
                      {L({ hi: "क्लास टीचर", en: "Class teacher" })}
                      {ct.subjects.length > 0 && <span className="font-medium text-ajk-mute"> · {subj(ct)}</span>}
                    </p>
                  </div>
                </div>
                {ct.last && (
                  <p className="mt-3 line-clamp-2 border-l-[3px] border-ajk-y pl-2.5 text-[14.5px] leading-snug">
                    {ct.last.from === "parent" && <span className="text-ajk-mute">{L({ hi: "आप: ", en: "You: " })}</span>}
                    {ct.last.text}
                  </p>
                )}
                <Link href={chat(ct)} className="mt-3.5 flex h-12 items-center justify-center gap-2 rounded-xl bg-ajk-y text-[15.5px] font-bold text-ajk-ink active:brightness-95">
                  <MessageCircle className="h-[18px] w-[18px]" aria-hidden />
                  {ct.unread > 0 ? L({ hi: `बात करें · ${ct.unread} नया`, en: `Open chat · ${ct.unread} new` }) : L({ hi: "बात करें", en: "Open chat" })}
                </Link>
              </section>
            )}

            {rest.length > 0 && (
              <>
                <h2 className="px-0.5 pt-1 text-[14.5px] font-bold text-ajk-mute">{L({ hi: "विषय के टीचर", en: "Subject teachers" })}</h2>
                <ul className="overflow-hidden rounded-2xl border-[1.5px] border-ajk-sand2 bg-white">
                  {rest.map((t) => (
                    <li key={t.id} className="border-b-[1.5px] border-dashed border-ajk-sand2 last:border-b-0">
                      <Link href={chat(t)} className="flex items-center gap-3 px-3.5 py-3 active:bg-ajk-sand/60">
                        <span className="grid h-[42px] w-[42px] shrink-0 place-items-center rounded-full text-[14px] font-bold text-white" style={{ background: shade(t.name) }}>
                          {initials(t.name)}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="flex items-baseline justify-between gap-2">
                            <span className="truncate text-[16px] font-bold leading-tight">{t.name}</span>
                            {t.last && <span className="shrink-0 text-[12px] text-ajk-mute">{when(t.last.at, lang)}</span>}
                          </span>
                          <span className="block truncate text-[13.5px] text-ajk-mute">
                            {subj(t)}
                            {t.last && ` · ${t.last.from === "parent" ? L({ hi: "आप: ", en: "You: " }) : ""}${t.last.text}`}
                          </span>
                        </span>
                        {t.unread > 0 ? (
                          <span className="grid h-5 min-w-5 shrink-0 place-items-center rounded-full bg-ajk-m px-1.5 text-[11.5px] font-bold text-white">{t.unread}</span>
                        ) : (
                          <ChevronRight className="h-4 w-4 shrink-0 text-ajk-mute/60" aria-hidden />
                        )}
                      </Link>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}
