"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import clsx from "clsx";
import { api, useApi } from "@/lib/api";
import { useParent } from "@/lib/parent";
import { useL, useT } from "@/lib/i18n";
import { weekdayDate } from "@/lib/format";
import { M } from "@/lib/text/more";
import { markNoticesSeen } from "@/lib/noticeSeen";
import { Empty, ErrorCard, ListSkeleton } from "@/components/ui";
import { Button, Group, Section } from "@/components/kit";
import "@/components/study.css";

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

/** Notices from the school as ruled rows in one card; two lines of text, "Read more" only when it is cut. */
export default function NoticePage() {
  const { child } = useParent();
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

  // Opening the list counts as reading: the Home bell stops showing these as new.
  const newest = data?.notices.reduce((m, n) => (n.date > m ? n.date : m), "");
  useEffect(() => {
    if (child && newest) markNoticesSeen(child.id, newest);
  }, [child, newest]);

  if (!data) {
    if (error && error.status !== 401) return <ErrorCard offline={error.status === 0} onRetry={reload} />;
    return <ListSkeleton rows={4} />;
  }
  const all = [...data.notices, ...older];
  if (!all.length) return <Empty>{L(M.noNotices)}</Empty>;
  const hasMore = more ?? data.hasMore;
  const toggle = (id: string) => setOpen((s) => new Set(s.has(id) ? Array.from(s).filter((x) => x !== id) : [...Array.from(s), id]));

  return (
    <div className="study space-y-6 pb-4 pt-1">
      <Section>
        <Group>
          {all.map((n) => (
            <NoticeRow key={n.id} n={n} isOpen={open.has(n.id)} onToggle={() => toggle(n.id)} />
          ))}
        </Group>
      </Section>

      {(hasMore || moreError) && (
        <div className="space-y-3">
          {hasMore && (
            <Button kind="line" onClick={loadMore} disabled={busy} className="w-full">
              {busy ? "…" : L(M.loadMore)}
            </Button>
          )}
          {moreError && <p className="text-[14px] leading-5 text-[#A32F35]">{L({ hi: "पुराने संदेश नहीं खुले। दोबारा कोशिश करें।", en: "Couldn't load older messages. Try again." })}</p>}
        </div>
      )}
    </div>
  );
}

/** One notice. Whether it needs "Read more" is measured: the clamped text is taller inside than it shows. */
function NoticeRow({ n, isOpen, onToggle }: { n: Notice; isOpen: boolean; onToggle: () => void }) {
  const L = useL();
  const { lang } = useT();
  const body = useRef<HTMLParagraphElement>(null);
  const [cut, setCut] = useState(false);

  useLayoutEffect(() => {
    const el = body.current;
    if (!el || isOpen) return;
    const measure = () => setCut(el.scrollHeight > el.clientHeight + 1);
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [isOpen, n.body]);

  const id = `notice-${n.id}`;
  return (
    <li className="px-4 py-4">
      <p className="tnum text-[14px] leading-5 text-ink-500">{weekdayDate(n.date, lang)}</p>
      <h3 className="mt-1 break-words text-[16px] font-semibold leading-6 text-ink-900">{n.title}</h3>
      <p id={id} ref={body} className={clsx("mt-1 whitespace-pre-line break-words text-[16px] leading-[26px] text-ink-700", !isOpen && "line-clamp-2")}>
        {n.body}
      </p>
      {(cut || isOpen) && (
        <button onClick={onToggle} aria-expanded={isOpen} aria-controls={id} className="-mb-3 min-h-[44px] text-[14px] font-medium leading-5 text-[#0D2A5E]">
          {isOpen ? L({ hi: "कम दिखाएँ", en: "Show less" }) : L({ hi: "पूरा पढ़ें", en: "Read more" })}
        </button>
      )}
    </li>
  );
}
