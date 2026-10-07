"use client";

import { useEffect, useState } from "react";
import { api, ApiError, useApi } from "@/lib/api";
import { useParent } from "@/lib/parent";
import { useL, useT, type Lang } from "@/lib/i18n";
import { dayMonth } from "@/lib/format";
import { M } from "@/lib/text/more";
import { ErrorCard, Skeleton } from "@/components/ui";
import { StatusChip, SubHeader, type LeaveStatus } from "@/components/more/parts";

interface Leave {
  id: string;
  from: string;
  to: string;
  days: number;
  reason: string;
  status: LeaveStatus;
  decidedBy: string | null;
  decidedAt: string | null;
  createdAt: string;
}
interface LeaveData {
  setupNeeded: boolean;
  rules: { today: string; minFrom: string; maxFrom: string; maxDays: number; reasonMax: number };
  requests: Leave[];
}

const range = (from: string, to: string, lang: Lang) => (from === to ? dayMonth(from, lang) : `${dayMonth(from, lang)} – ${dayMonth(to, lang)}`);

export default function LeavePage() {
  const { child } = useParent();
  const { lang } = useT();
  const L = useL();
  const { data, error, reload } = useApi<LeaveData>(child ? `/leave?student=${child.id}` : null);

  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState("");
  const [done, setDone] = useState(false);
  const [asking, setAsking] = useState<string | null>(null);
  const [cancelling, setCancelling] = useState(false);

  // The form starts on today once the server's date is known.
  useEffect(() => {
    if (data?.rules.today && !from) {
      setFrom(data.rules.today);
      setTo(data.rules.today);
    }
  }, [data?.rules.today, from]);
  useEffect(() => {
    setReason("");
    setProblem("");
    setDone(false);
  }, [child?.id]);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    if (!child) return;
    setDone(false);
    if (to && to < from) return setProblem(L(M.badDates));
    if (reason.trim().length < 3) return setProblem(L(M.badReason));
    setBusy(true);
    setProblem("");
    try {
      await api("/leave", { method: "POST", body: { student: child.id, from, to: to || from, reason: reason.trim() } });
      setReason("");
      setDone(true);
      reload();
    } catch (err) {
      const x = err instanceof ApiError ? err : null;
      setProblem(
        x?.status === 0
          ? L({ hi: "इंटरनेट नहीं है। दोबारा कोशिश करें।", en: "No internet. Please try again." })
          : x?.message || L({ hi: "अर्ज़ी नहीं गई। दोबारा कोशिश करें।", en: "Could not send. Please try again." })
      );
    } finally {
      setBusy(false);
    }
  }

  async function cancel(id: string) {
    setCancelling(true);
    try {
      await api(`/leave/${id}`, { method: "DELETE" });
      reload();
    } catch (err) {
      setProblem(err instanceof ApiError && err.message ? err.message : L({ hi: "अर्ज़ी वापस नहीं हुई। दोबारा कोशिश करें।", en: "Could not cancel. Please try again." }));
    } finally {
      setAsking(null);
      setCancelling(false);
    }
  }

  if (!data && error && error.status !== 401) {
    return (
      <div className="space-y-3">
        <SubHeader title={L(M.leave)} />
        <ErrorCard offline={error.status === 0} onRetry={reload} />
      </div>
    );
  }

  const r = data?.rules;
  const max = r?.reasonMax || 300;
  const count = reason.trim().length;

  return (
    <div className="animate-rise space-y-3">
      <SubHeader title={L(M.leave)} />

      {data?.setupNeeded ? (
        <p className="card p-5 text-ink-700">{L(M.leaveSetup)}</p>
      ) : (
        <form onSubmit={send} className="card space-y-4 p-4" noValidate>
          <p className="font-semibold text-ink-900">
            {L(M.newLeave)}
            {child ? <span className="font-normal text-ink-500"> · {child.name.split(" ")[0]}</span> : null}
          </p>
          <div className="grid grid-cols-2 gap-3">
            <label className="block min-w-0">
              <span className="mb-1.5 block text-sm font-semibold text-ink-700">{L(M.fromDate)}</span>
              <input
                type="date"
                value={from}
                min={r?.minFrom}
                max={r?.maxFrom}
                onChange={(e) => {
                  setFrom(e.target.value);
                  if (!to || to < e.target.value) setTo(e.target.value);
                }}
                className="field px-3"
              />
            </label>
            <label className="block min-w-0">
              <span className="mb-1.5 block text-sm font-semibold text-ink-700">{L(M.toDate)}</span>
              <input type="date" value={to} min={from || r?.minFrom} onChange={(e) => setTo(e.target.value)} className="field px-3" />
            </label>
          </div>
          <label className="block">
            <span className="mb-1.5 flex items-baseline justify-between text-sm font-semibold text-ink-700">
              {L(M.reason)}
              <span className={count > max ? "tnum font-medium text-rose-700" : "tnum font-medium text-ink-400"}>
                {count}/{max}
              </span>
            </span>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
              maxLength={max + 20}
              placeholder={L(M.reasonHint)}
              className="field min-h-[100px] resize-none py-3 leading-snug"
            />
          </label>
          {problem && (
            <p role="alert" className="text-rose-700">
              {problem}
            </p>
          )}
          {done && (
            <p role="status" className="font-medium text-jade-600">
              {L(M.sent)}
            </p>
          )}
          <button type="submit" disabled={busy || !data} className="btn-primary w-full">
            {busy ? L(M.sending) : L(M.send)}
          </button>
          <p className="text-sm text-ink-500">{L(M.leaveRule)}</p>
        </form>
      )}

      {!data?.setupNeeded && (
        <section className="pt-1.5">
          <h2 className="sec-title">{L(M.past)}</h2>
          <div className="card px-4">
          {!data ? (
            <div className="space-y-3 py-4">
              <Skeleton className="h-5 w-48" />
              <Skeleton className="h-4 w-full" />
            </div>
          ) : data.requests.length === 0 ? (
            <p className="py-3 text-ink-600">{L(M.noPast)}</p>
          ) : (
            <ul className="divide-y divide-ink-100">
              {data.requests.map((q) => (
                <li key={q.id} className="py-3">
                  <div className="flex items-start justify-between gap-3">
                    <p className="tnum font-medium text-ink-900">
                      {range(q.from, q.to, lang)}
                      <span className="font-normal text-ink-500">
                        {" "}
                        · {q.days} {q.days === 1 ? L(M.day) : L(M.days)}
                      </span>
                    </p>
                    <StatusChip status={q.status} />
                  </div>
                  <p className="mt-0.5 whitespace-pre-line break-words text-[15px] text-ink-500">{q.reason}</p>
                  {q.status !== "pending" && q.decidedBy && (
                    <p className="mt-1 text-sm text-ink-500">
                      {lang === "hi" ? `${q.decidedBy} ${L(M.by)}` : `${L(M.by)} ${q.decidedBy}`}
                      {q.decidedAt ? ` · ${dayMonth(q.decidedAt.slice(0, 10), lang)}` : ""}
                    </p>
                  )}
                  {q.status === "pending" &&
                    (asking === q.id ? (
                      <div className="mt-2 flex flex-wrap items-center gap-2">
                        <span className="text-ink-700">{L(M.cancelSure)}</span>
                        <button onClick={() => cancel(q.id)} disabled={cancelling} className="btn min-h-[44px] border border-ink-200 bg-white px-4 text-rose-700">
                          {L(M.yesCancel)}
                        </button>
                        <button onClick={() => setAsking(null)} className="btn min-h-[44px] px-4 text-ink-700">
                          {L(M.no)}
                        </button>
                      </div>
                    ) : (
                      <button onClick={() => setAsking(q.id)} className="link -mb-2 text-sm !text-ink-600">
                        {L(M.cancel)}
                      </button>
                    ))}
                </li>
              ))}
            </ul>
          )}
          </div>
        </section>
      )}
    </div>
  );
}
