"use client";

import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { useApi } from "@/lib/api";
import { useParent } from "@/lib/parent";
import { useL, useT } from "@/lib/i18n";
import { when, type TeacherRow } from "@/lib/teachers";
import { Avatar, ErrorCard, Skeleton } from "@/components/ui";

/** Ask Teacher: the child's class teacher on top, then the subject teachers. Same look as the rest of the app. */
export default function TeachersPage() {
  const { child } = useParent();
  const L = useL();
  const { data, error, reload } = useApi<{ child: { name: string; classSec: string }; teachers: TeacherRow[] }>(child ? `/teachers?student=${child.id}` : null);
  const ct = data?.teachers.find((t) => t.classTeacher);
  const rest = data?.teachers.filter((t) => t !== ct) || [];

  if (!data) {
    if (error && error.status !== 401) return <ErrorCard offline={error.status === 0} onRetry={reload} />;
    return (
      <div className="space-y-3">
        <Skeleton className="h-[76px] w-full rounded-[20px]" />
        <Skeleton className="h-[200px] w-full rounded-[20px]" />
      </div>
    );
  }

  if (data.teachers.length === 0)
    return <p className="rounded-[20px] border border-ink-100 bg-white px-4 py-5 text-[15px] text-ink-500">{L({ hi: "इस कक्षा के टीचर अभी तय नहीं हैं। स्कूल ऑफ़िस से पूछें।", en: "Teachers for this class are not set yet. Please ask the school office." })}</p>;

  return (
    <div className="space-y-4">
      {ct && (
        <section>
          <h2 className="mb-2 px-0.5 text-[13.5px] font-semibold text-ink-500">{L({ hi: "क्लास टीचर", en: "Class teacher" })}</h2>
          <ul className="overflow-hidden rounded-[20px] border border-ink-100 bg-white shadow-[0_1px_2px_rgba(15,23,42,.04)]">
            <Row t={ct} i={0} />
          </ul>
        </section>
      )}
      {rest.length > 0 && (
        <section>
          <h2 className="mb-2 px-0.5 text-[13.5px] font-semibold text-ink-500">{L({ hi: "विषय के टीचर", en: "Subject teachers" })}</h2>
          <ul className="overflow-hidden rounded-[20px] border border-ink-100 bg-white shadow-[0_1px_2px_rgba(15,23,42,.04)]">
            {rest.map((t, i) => (
              <Row key={t.id} t={t} i={i + 1} />
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

/** One teacher: name, subjects and the last message; a count when there are new replies. */
function Row({ t, i }: { t: TeacherRow; i: number }) {
  const L = useL();
  const { lang } = useT();
  return (
    <li className="border-b border-ink-100 last:border-b-0">
      <Link href={`/teachers/chat/?id=${t.id}`} className="flex min-h-[72px] items-center gap-3 px-4 py-3 active:bg-ink-50">
        <Avatar name={t.name} url={t.photoUrl} size={44} tint={i} />
        <span className="min-w-0 flex-1">
          <span className="flex items-baseline justify-between gap-2">
            <span className="truncate text-[16px] font-semibold text-ink-900">{t.name}</span>
            {t.last && <span className="shrink-0 text-[12.5px] text-ink-400">{when(t.last.at, lang)}</span>}
          </span>
          <span className="block truncate text-[13.5px] text-ink-500">{t.subjects.join(", ")}</span>
          {t.last && (
            <span className={t.unread > 0 ? "block truncate text-[13.5px] font-semibold text-ink-900" : "block truncate text-[13.5px] text-ink-500"}>
              {t.last.from === "parent" && L({ hi: "आप: ", en: "You: " })}
              {t.last.text || L({ hi: "मिलने का समय", en: "Meeting time" })}
            </span>
          )}
        </span>
        {t.unread > 0 ? (
          <span className="grid h-6 min-w-6 shrink-0 place-items-center rounded-full bg-brand-700 px-1.5 text-[12px] font-bold text-white" aria-label={L({ hi: `${t.unread} नए संदेश`, en: `${t.unread} new` })}>
            {t.unread}
          </span>
        ) : (
          <ChevronRight className="h-[18px] w-[18px] shrink-0 text-ink-300" aria-hidden />
        )}
      </Link>
    </li>
  );
}
