"use client";

import { useEffect, useMemo, useState } from "react";
import clsx from "clsx";
import { BookOpen, CalendarDays } from "lucide-react";
import { api, useApi } from "@/lib/api";
import { useParent } from "@/lib/parent";
import { useL, useT, type Bi } from "@/lib/i18n";
import { dayMonth, weekdayDate } from "@/lib/format";
import { S } from "@/lib/text/study";
import { Empty, ErrorCard, ListSkeleton, Status, type Tone } from "@/components/ui";

type HwStatus = "pending" | "checked" | "not_submitted";
interface Homework {
  id: string;
  subject: string;
  title: string;
  details: string;
  assignedOn: string;
  dueDate: string | null;
  /** What the teacher marked; servers without homework checking send none. */
  status?: HwStatus | null;
}
interface Page {
  setupNeeded: boolean;
  today: string;
  items: Homework[];
  nextBefore: string | null;
}

const STATUS: Record<HwStatus, { tone: Tone; text: Bi }> = {
  pending: { tone: "wait", text: { hi: "बाकी", en: "Pending" } },
  checked: { tone: "ok", text: { hi: "जाँच हो गई", en: "Checked" } },
  not_submitted: { tone: "bad", text: { hi: "जमा नहीं किया", en: "Not submitted" } },
};

const addDays = (iso: string, n: number) => new Date(Date.parse(iso + "T00:00:00Z") + n * 864e5).toISOString().slice(0, 10);
/** Monday of the week `iso` falls in. */
const mondayOf = (iso: string) => addDays(iso, -((new Date(iso + "T00:00:00Z").getUTCDay() + 6) % 7));

/** Homework, newest first, in weeks: subject, date, the task, and what the teacher marked. */
export default function HomeworkPage() {
  const { child } = useParent();
  return child ? <List key={child.id} studentId={child.id} /> : <ListSkeleton rows={4} />;
}

function List({ studentId }: { studentId: string }) {
  const L = useL();
  const { data, error, reload } = useApi<Page>(`/homework?student=${studentId}`);
  const [older, setOlder] = useState<Homework[]>([]);
  const [cursor, setCursor] = useState<string | null | undefined>(undefined);
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    setOlder([]);
    setCursor(undefined);
  }, [studentId]);

  const next = cursor === undefined ? data?.nextBefore ?? null : cursor;

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
    if (!data) return [];
    const thisWeek = mondayOf(data.today);
    const lastWeek = addDays(thisWeek, -7);
    const seen = new Set<string>();
    const out: { key: string; label: Bi; items: Homework[] }[] = [];
    for (const h of [...data.items, ...older]) {
      if (seen.has(h.id)) continue;
      seen.add(h.id);
      const key = h.assignedOn >= thisWeek ? "this" : h.assignedOn >= lastWeek ? "last" : "earlier";
      const label = key === "this" ? { hi: "इस हफ़्ते", en: "This week" } : key === "last" ? { hi: "पिछले हफ़्ते", en: "Last week" } : { hi: "पहले", en: "Earlier" };
      const g = out.find((x) => x.key === key);
      if (g) g.items.push(h);
      else out.push({ key, label, items: [h] });
    }
    return out;
  }, [data, older]);

  if (!data) {
    if (error && error.status !== 401) return <ErrorCard offline={error.status === 0} onRetry={reload} />;
    return <ListSkeleton rows={4} />;
  }
  if (data.setupNeeded) return <Empty>{L(S.hwNotStarted)}</Empty>;
  if (!groups.length) return <Empty>{L(S.noHomework)}</Empty>;

  return (
    <div className="animate-rise space-y-4">
      {groups.map((g) => (
        <section key={g.key} className="space-y-2">
          <h2 className="mlabel">{L(g.label)}</h2>
          <ul className="space-y-2">
            {g.items.map((h) => (
              <Item key={h.id} h={h} today={data.today} />
            ))}
          </ul>
        </section>
      ))}
      {next && (
        <div>
          <button className="btn-line w-full" onClick={loadOlder} disabled={busy}>
            {busy ? L(S.loading) : L(S.older)}
          </button>
          {failed && <p className="mt-2 px-1 text-[13px] text-rose-600">{L(S.olderFailed)}</p>}
        </div>
      )}
    </div>
  );
}

const LONG = 160;

function Item({ h, today }: { h: Homework; today: string }) {
  const L = useL();
  const { lang } = useT();
  const [open, setOpen] = useState(false);
  const long = h.details.length > LONG || h.details.split("\n").length > 3;
  const st = h.status ? STATUS[h.status] : null;

  let due: { text: string; soon: boolean } | null = null;
  if (h.dueDate && h.status !== "checked") {
    if (h.dueDate === today) due = { text: L(S.dueToday), soon: true };
    else if (h.dueDate === addDays(today, 1)) due = { text: L(S.dueTomorrow), soon: true };
    else if (h.dueDate > today) due = { text: `${L(S.dueBy)}: ${dayMonth(h.dueDate, lang)}`, soon: false };
  }

  return (
    <li className="row-card">
      <div className="flex items-center justify-between gap-2">
        <span className="meta">
          <span>
            <BookOpen aria-hidden />
            {h.subject}
          </span>
          <span>
            <CalendarDays aria-hidden />
            {weekdayDate(h.assignedOn, lang)}
          </span>
        </span>
        {st && <Status tone={st.tone}>{L(st.text)}</Status>}
      </div>
      <p className="mt-1 text-[15.5px] font-bold leading-snug">{h.title}</p>
      {h.details && (
        <>
          <p className={clsx("mt-1 whitespace-pre-line break-words text-[14px] text-ink-700", long && !open && "line-clamp-3")}>{h.details}</p>
          {long && (
            <button className="link -my-2 text-[13px]" onClick={() => setOpen((o) => !o)} aria-expanded={open}>
              {open ? L(S.readLess) : L(S.readMore)}
            </button>
          )}
        </>
      )}
      {due && <p className={clsx("mt-1 text-[13px]", due.soon ? "font-medium text-marigold-600" : "text-ink-500")}>{due.text}</p>}
    </li>
  );
}
