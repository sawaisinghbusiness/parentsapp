"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { BookOpen, CalendarDays, Megaphone, Search } from "lucide-react";
import { useApi } from "@/lib/api";
import { useParent } from "@/lib/parent";
import { useL, useT } from "@/lib/i18n";
import { weekdayDate } from "@/lib/format";

interface Hw {
  id: string;
  subject: string;
  title: string;
  details: string;
  assignedOn: string;
}
interface Notice {
  id: string;
  title: string;
  body: string;
  date: string;
}

/** Searches this child's homework and the school's notices already on the phone. */
export default function SearchPage() {
  const { child } = useParent();
  const L = useL();
  const { lang } = useT();
  const [q, setQ] = useState("");
  const hw = useApi<{ items: Hw[] }>(child ? `/homework?student=${child.id}` : null);
  const notices = useApi<{ notices: Notice[] }>(child ? `/notices?student=${child.id}` : null);

  const term = q.trim().toLowerCase();
  const found = useMemo(() => {
    if (term.length < 2) return null;
    const has = (...xs: string[]) => xs.some((x) => x.toLowerCase().includes(term));
    return {
      hw: (hw.data?.items || []).filter((h) => has(h.subject, h.title, h.details)),
      notices: (notices.data?.notices || []).filter((n) => has(n.title, n.body)),
    };
  }, [term, hw.data, notices.data]);

  return (
    <div className="space-y-4">
      <label className="field-box">
        <Search aria-hidden />
        <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder={L({ hi: "होमवर्क, सूचना खोजें", en: "Search homework, notices" })} autoFocus enterKeyHint="search" />
      </label>

      {!found ? (
        <p className="px-0.5 text-[14px] text-ink-500">{L({ hi: "विषय, होमवर्क या सूचना का कोई शब्द लिखें।", en: "Type a subject, or a word from homework or a notice." })}</p>
      ) : found.hw.length + found.notices.length === 0 ? (
        <p className="row-card text-[15px] text-ink-500">{L({ hi: "कुछ नहीं मिला।", en: "Nothing found." })}</p>
      ) : (
        <ul className="space-y-2">
          {found.hw.map((h) => (
            <li key={h.id}>
              <Link href="/homework/" className="row-card">
                <span className="meta">
                  <span>
                    <BookOpen aria-hidden />
                    {L({ hi: "होमवर्क", en: "Homework" })} · {h.subject}
                  </span>
                  <span>
                    <CalendarDays aria-hidden />
                    {weekdayDate(h.assignedOn, lang)}
                  </span>
                </span>
                <span className="mt-1 block text-[15px] font-bold">{h.title}</span>
              </Link>
            </li>
          ))}
          {found.notices.map((n) => (
            <li key={n.id}>
              <Link href="/notice/" className="row-card">
                <span className="meta">
                  <span>
                    <Megaphone aria-hidden />
                    {L({ hi: "सूचना", en: "Notice" })}
                  </span>
                  <span>
                    <CalendarDays aria-hidden />
                    {weekdayDate(n.date, lang)}
                  </span>
                </span>
                <span className="mt-1 block text-[15px] font-bold">{n.title}</span>
                <span className="mt-0.5 line-clamp-2 block text-[14px] text-ink-600">{n.body}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
