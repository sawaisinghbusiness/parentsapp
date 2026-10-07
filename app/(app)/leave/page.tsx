"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { CalendarX2, Clock3, Plus } from "lucide-react";
import { api, ApiError, useApi } from "@/lib/api";
import { useParent } from "@/lib/parent";
import { useL, useT, type Lang } from "@/lib/i18n";
import { monthYear, num, weekdayDate } from "@/lib/format";
import { LEAVE_TYPES, type Leave, type LeaveData, type LeaveStatus } from "@/lib/leave";
import { M } from "@/lib/text/more";
import { Empty, ErrorCard, ListSkeleton, Status, type Tone } from "@/components/ui";

const TONE: Record<LeaveStatus, Tone> = { pending: "wait", approved: "ok", rejected: "bad" };
const range = (q: Leave, lang: Lang) => (q.from === q.to ? weekdayDate(q.from, lang) : `${weekdayDate(q.from, lang)} – ${weekdayDate(q.to, lang)}`);

/** The child's leave applications, newest first, grouped by month. + on the top bar applies. */
export default function LeavePage() {
  const { child } = useParent();
  const L = useL();
  const { lang } = useT();
  const { data, error, reload } = useApi<LeaveData>(child ? `/leave?student=${child.id}` : null);
  const [sent, setSent] = useState(false);
  const [asking, setAsking] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState("");

  useEffect(() => {
    if (new URLSearchParams(window.location.search).get("sent") === "1") {
      setSent(true);
      window.history.replaceState(null, "", window.location.pathname);
    }
  }, []);

  const groups = useMemo(() => {
    const m = new Map<string, Leave[]>();
    for (const q of (data?.requests || []).slice().sort((a, b) => b.from.localeCompare(a.from))) {
      const k = q.from.slice(0, 7);
      m.set(k, [...(m.get(k) || []), q]);
    }
    return Array.from(m.entries());
  }, [data]);

  async function cancel(id: string) {
    setBusy(true);
    setProblem("");
    try {
      await api(`/leave/${id}`, { method: "DELETE" });
      reload();
    } catch (err) {
      setProblem(err instanceof ApiError && err.message ? err.message : L({ hi: "अर्ज़ी वापस नहीं हुई। दोबारा कोशिश करें।", en: "Could not cancel. Please try again." }));
    } finally {
      setAsking(null);
      setBusy(false);
    }
  }

  if (!data) {
    if (error && error.status !== 401) return <ErrorCard offline={error.status === 0} onRetry={reload} />;
    return <ListSkeleton />;
  }
  if (data.setupNeeded) return <Empty>{L(M.leaveSetup)}</Empty>;

  return (
    <div className="animate-rise space-y-3">
      {sent && (
        <p role="status" className="rounded-xl bg-jade-50 px-3.5 py-2.5 text-[14px] font-medium text-jade-800">
          {L(M.sent)}
        </p>
      )}
      {problem && (
        <p role="alert" className="text-[14px] text-rose-700">
          {problem}
        </p>
      )}

      {groups.length === 0 ? (
        <div className="space-y-3">
          <Empty>{L(M.noPast)}</Empty>
          <Link href="/leave/apply/" className="btn-primary w-full">
            <Plus className="h-5 w-5" aria-hidden /> {L({ hi: "छुट्टी की अर्ज़ी भेजें", en: "Apply for leave" })}
          </Link>
        </div>
      ) : (
        groups.map(([month, list]) => (
          <section key={month} className="space-y-2">
            <h2 className="mlabel pt-1">{monthYear(month, lang)}</h2>
            <ul className="space-y-2">
              {list.map((q) => (
                <li key={q.id} className="row-card">
                  <div className="flex items-start justify-between gap-2">
                    <p className="tnum text-[15px] font-bold leading-snug">{range(q, lang)}</p>
                    <Status tone={TONE[q.status]}>{L(M[q.status])}</Status>
                  </div>
                  <p className="meta mt-1.5">
                    <span>
                      <CalendarX2 aria-hidden />
                      {q.type ? L(LEAVE_TYPES[q.type]) : L({ hi: "छुट्टी", en: "Leave" })}
                    </span>
                    <span>
                      <Clock3 aria-hidden />
                      {q.halfDay ? L({ hi: "आधा दिन", en: "Half day" }) : q.days === 1 ? L({ hi: "पूरा दिन", en: "Full day" }) : `${num(q.days)} ${L(M.days)}`}
                    </span>
                  </p>
                  <p className="mt-1.5 whitespace-pre-line break-words text-[14px] text-ink-700">{q.reason}</p>
                  {q.status !== "pending" && q.decidedBy && (
                    <p className="mt-1 text-[13px] text-ink-400">{lang === "hi" ? `${q.decidedBy} ${L(M.by)}` : `${L(M.by)} ${q.decidedBy}`}</p>
                  )}
                  {q.status === "pending" &&
                    (asking === q.id ? (
                      <div className="mt-2 flex flex-wrap items-center gap-2">
                        <span className="text-[14px] text-ink-700">{L(M.cancelSure)}</span>
                        <button onClick={() => cancel(q.id)} disabled={busy} className="btn min-h-[44px] border border-ink-200 bg-white px-4 text-[14px] text-rose-700">
                          {L(M.yesCancel)}
                        </button>
                        <button onClick={() => setAsking(null)} className="btn min-h-[44px] px-3 text-[14px] text-ink-700">
                          {L(M.no)}
                        </button>
                      </div>
                    ) : (
                      <button onClick={() => setAsking(q.id)} className="link -mb-2 text-[14px] !text-ink-500">
                        {L(M.cancel)}
                      </button>
                    ))}
                </li>
              ))}
            </ul>
          </section>
        ))
      )}
    </div>
  );
}
