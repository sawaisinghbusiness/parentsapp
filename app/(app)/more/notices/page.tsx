"use client";

import { useEffect, useMemo, useState } from "react";
import { api, useApi } from "@/lib/api";
import { useParent } from "@/lib/parent";
import { useL, useT } from "@/lib/i18n";
import { weekdayDate } from "@/lib/format";
import { M } from "@/lib/text/more";
import { ErrorCard, Skeleton } from "@/components/ui";
import { SubHeader } from "@/components/more/parts";

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

const istToday = () => new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });
const minusDay = (iso: string) => new Date(Date.parse(iso + "T00:00:00Z") - 86_400_000).toISOString().slice(0, 10);

export default function NoticesPage() {
  const { child } = useParent();
  const { lang } = useT();
  const L = useL();
  const { data, error, reload } = useApi<Page>(child ? `/notices?student=${child.id}` : null);
  const [older, setOlder] = useState<Notice[]>([]);
  const [page, setPage] = useState(0);
  const [more, setMore] = useState<boolean | null>(null);
  const [busy, setBusy] = useState(false);
  const [moreError, setMoreError] = useState(false);

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

  const groups = useMemo(() => {
    const all = [...(data?.notices || []), ...older];
    const m = new Map<string, Notice[]>();
    for (const n of all) m.set(n.date, [...(m.get(n.date) || []), n]);
    return Array.from(m.entries());
  }, [data, older]);

  const today = istToday();
  const heading = (d: string) => (d === today ? L(M.today) : d === minusDay(today) ? L(M.yesterday) : weekdayDate(d, lang));
  const hasMore = more ?? data?.hasMore ?? false;

  return (
    <div className="animate-rise space-y-3">
      <SubHeader title={L(M.notices)} />

      {!data ? (
        error && error.status !== 401 ? (
          <ErrorCard offline={error.status === 0} onRetry={reload} />
        ) : (
          <div className="card space-y-4 p-4">
            {[0, 1, 2].map((i) => (
              <div key={i} className="space-y-2">
                <Skeleton className="h-4 w-40" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-3/4" />
              </div>
            ))}
          </div>
        )
      ) : groups.length === 0 ? (
        <p className="card p-5 text-ink-600">{L(M.noNotices)}</p>
      ) : (
        <>
          {groups.map(([date, list]) => (
            <section key={date} aria-label={heading(date)}>
              <h2 className="px-2 pb-1.5 pt-1 text-sm font-semibold text-ink-500">{heading(date)}</h2>
              <ul className="card divide-y divide-ink-100 overflow-hidden">
                {list.map((n) => (
                  <li key={n.id} className="p-4">
                    <p className="font-semibold leading-snug text-ink-900">{n.title}</p>
                    <p className="mt-1 whitespace-pre-line break-words text-ink-700">{n.body}</p>
                  </li>
                ))}
              </ul>
            </section>
          ))}
          {hasMore && (
            <button onClick={loadMore} disabled={busy} className="btn-quiet w-full">
              {busy ? "…" : L(M.loadMore)}
            </button>
          )}
          {moreError && <p className="px-2 text-sm text-rose-700">{L({ hi: "पुराने संदेश नहीं खुले। दोबारा कोशिश करें।", en: "Couldn't load older messages. Try again." })}</p>}
        </>
      )}
    </div>
  );
}
