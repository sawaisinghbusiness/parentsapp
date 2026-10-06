"use client";

import { useEffect, useMemo, useState } from "react";
import clsx from "clsx";
import { api, useApi } from "@/lib/api";
import { useL, useT } from "@/lib/i18n";
import { dayMonth, weekdayDate } from "@/lib/format";
import { ErrorCard, Skeleton } from "@/components/ui";
import { S } from "@/lib/text/study";

export interface Homework {
  id: string;
  subject: string;
  title: string;
  details: string;
  assignedOn: string;
  dueDate: string | null;
}

interface Page {
  setupNeeded: boolean;
  today: string;
  items: Homework[];
  nextBefore: string | null;
}

const addDays = (iso: string, n: number) => new Date(Date.parse(iso + "T00:00:00Z") + n * 864e5).toISOString().slice(0, 10);

export function HomeworkList({ studentId }: { studentId: string }) {
  const L = useL();
  const { lang } = useT();
  const { data, error, reload } = useApi<Page>(`/homework?student=${studentId}`);

  // Older pages are fetched on demand and kept only while this screen is open.
  const [older, setOlder] = useState<Homework[]>([]);
  const [cursor, setCursor] = useState<string | null | undefined>(undefined);
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    setOlder([]);
    setCursor(undefined);
    setFailed(false);
  }, [studentId]);

  const next = cursor === undefined ? data?.nextBefore ?? null : cursor;
  const loadedOlder = cursor !== undefined;

  async function loadOlder() {
    if (!next || busy) return;
    setBusy(true);
    setFailed(false);
    try {
      const p = await api<Page>(`/homework?student=${studentId}&before=${next}`);
      setOlder((o) => [...o, ...p.items]);
      setCursor(p.nextBefore);
    } catch {
      setFailed(true);
    } finally {
      setBusy(false);
    }
  }

  const groups = useMemo(() => {
    const seen = new Set<string>();
    const out: { date: string; items: Homework[] }[] = [];
    for (const h of [...(data?.items || []), ...older]) {
      if (seen.has(h.id)) continue;
      seen.add(h.id);
      const last = out[out.length - 1];
      if (last && last.date === h.assignedOn) last.items.push(h);
      else out.push({ date: h.assignedOn, items: [h] });
    }
    return out;
  }, [data, older]);

  if (!data) {
    if (error && error.status !== 401) return <ErrorCard offline={error.status === 0} onRetry={reload} />;
    return (
      <div className="space-y-2">
        <Skeleton className="mx-1 h-4 w-16" />
        <div className="card space-y-4 p-4">
          {[0, 1].map((i) => (
            <div key={i} className="space-y-2">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-5 w-3/4" />
              <Skeleton className="h-4 w-32" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (data.setupNeeded) return <p className="card p-4 text-ink-600">{L(S.hwNotStarted)}</p>;
  if (!groups.length) return <p className="card p-4 text-ink-600">{L(S.noHomework)}</p>;

  const today = data.today;
  // "कल" also means tomorrow in Hindi, so today and yesterday carry their date too.
  const heading = (d: string) => (d === today ? `${L(S.today)} · ${weekdayDate(d, lang)}` : d === addDays(today, -1) ? `${L(S.yesterday)} · ${weekdayDate(d, lang)}` : weekdayDate(d, lang));

  return (
    <div className="space-y-4">
      {groups.map((g) => (
        <section key={g.date}>
          <h2 className="mb-1.5 px-1 text-sm font-semibold text-ink-600">{heading(g.date)}</h2>
          <ul className="card divide-y divide-ink-100 px-4">
            {g.items.map((h) => (
              <Item key={h.id} h={h} today={today} />
            ))}
          </ul>
        </section>
      ))}

      {next ? (
        <div>
          <button className="btn-quiet w-full" onClick={loadOlder} disabled={busy}>
            {busy ? L(S.loading) : L(S.older)}
          </button>
          {failed && <p className="mt-2 px-1 text-sm text-rose-600">{L(S.olderFailed)}</p>}
        </div>
      ) : (
        loadedOlder && <p className="px-1 text-sm text-ink-500">{L(S.noOlder)}</p>
      )}
    </div>
  );
}

/** Long details start folded to four lines. */
const LONG = 220;

function Item({ h, today }: { h: Homework; today: string }) {
  const L = useL();
  const { lang } = useT();
  const [open, setOpen] = useState(false);
  const long = h.details.length > LONG || h.details.split("\n").length > 4;

  let due: { text: string; soon: boolean } | null = null;
  if (h.dueDate) {
    if (h.dueDate === today) due = { text: L(S.dueToday), soon: true };
    else if (h.dueDate === addDays(today, 1)) due = { text: L(S.dueTomorrow), soon: true };
    else due = { text: `${L(S.dueBy)}: ${dayMonth(h.dueDate, lang)}`, soon: false };
  }

  return (
    <li className="py-3.5">
      <p className="text-sm font-semibold text-brand-700">{h.subject}</p>
      <p className="font-semibold leading-snug text-ink-900">{h.title}</p>
      {h.details && (
        <>
          <p className={clsx("mt-1 whitespace-pre-line break-words text-ink-700", long && !open && "line-clamp-4")}>{h.details}</p>
          {long && (
            <button className="link -my-1 text-sm" onClick={() => setOpen((o) => !o)} aria-expanded={open}>
              {open ? L(S.readLess) : L(S.readMore)}
            </button>
          )}
        </>
      )}
      {due && (
        <p className={clsx("tnum mt-1.5 flex items-center gap-2 text-sm", due.soon ? "font-medium text-ink-800" : "text-ink-500")}>
          {due.soon && <span className="dot bg-marigold-500" aria-hidden />}
          {due.text}
        </p>
      )}
    </li>
  );
}
