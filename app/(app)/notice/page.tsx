"use client";

import { useEffect, useState } from "react";
import clsx from "clsx";
import { CalendarDays } from "lucide-react";
import { api, useApi } from "@/lib/api";
import { useParent } from "@/lib/parent";
import { useL, useT } from "@/lib/i18n";
import { weekdayDate } from "@/lib/format";
import { M } from "@/lib/text/more";
import { Empty, ErrorCard, ListSkeleton } from "@/components/ui";

interface Notice {
  id: string;
  title: string;
  body: string;
  date: string;
}
interface Page {
  page: number;
  notices: Notice[];
  hasMore: boolean;
}

/** Notices from the school: date and title, two lines of the text; tap to read it all. */
export default function NoticePage() {
  const { child } = useParent();
  const { lang } = useT();
  const L = useL();
  const { data, error, reload } = useApi<Page>(child ? `/notices?student=${child.id}` : null);
  const [older, setOlder] = useState<Notice[]>([]);
  const [page, setPage] = useState(0);
  const [more, setMore] = useState<boolean | null>(null);
  const [busy, setBusy] = useState(false);
  const [moreError, setMoreError] = useState(false);
  const [open, setOpen] = useState<Set<string>>(new Set());

  useEffect(() => {
    setOlder([]);
    setPage(0);
    setMore(null);
  }, [child?.id]);

  async function loadMore() {
    if (!child) return;
    setBusy(true);
    setMoreError(false);
    try {
      const r = await api<Page>(`/notices?student=${child.id}&page=${page + 1}`);
      setOlder((o) => [...o, ...r.notices.filter((n) => !o.some((x) => x.id === n.id))]);
      setPage(r.page);
      setMore(r.hasMore);
    } catch {
      setMoreError(true);
    } finally {
      setBusy(false);
    }
  }

  if (!data) {
    if (error && error.status !== 401) return <ErrorCard offline={error.status === 0} onRetry={reload} />;
    return <ListSkeleton rows={4} />;
  }
  const all = [...data.notices, ...older];
  if (!all.length) return <Empty>{L(M.noNotices)}</Empty>;
  const hasMore = more ?? data.hasMore;

  return (
    <div className="animate-rise space-y-2">
      <ul className="space-y-2">
        {all.map((n) => {
          const isOpen = open.has(n.id);
          const long = n.body.length > 110;
          return (
            <li key={n.id}>
              <button
                onClick={() => long && setOpen((s) => new Set(isOpen ? Array.from(s).filter((x) => x !== n.id) : [...Array.from(s), n.id]))}
                aria-expanded={long ? isOpen : undefined}
                className="row-card"
              >
                <span className="meta">
                  <span>
                    <CalendarDays aria-hidden />
                    {weekdayDate(n.date, lang)}
                  </span>
                </span>
                <span className="mt-1 block text-[15.5px] font-bold leading-snug">{n.title}</span>
                <span className={clsx("mt-1 block whitespace-pre-line break-words text-[14px] leading-relaxed text-ink-600", !isOpen && "line-clamp-2")}>{n.body}</span>
                {long && !isOpen && <span className="mt-0.5 block text-[13px] font-semibold text-brand-600">{L({ hi: "पूरा पढ़ें", en: "Read more" })}</span>}
              </button>
            </li>
          );
        })}
      </ul>
      {hasMore && (
        <button onClick={loadMore} disabled={busy} className="btn-line w-full">
          {busy ? "…" : L(M.loadMore)}
        </button>
      )}
      {moreError && <p className="px-1 text-[13px] text-rose-700">{L({ hi: "पुराने संदेश नहीं खुले। दोबारा कोशिश करें।", en: "Couldn't load older messages. Try again." })}</p>}
    </div>
  );
}
