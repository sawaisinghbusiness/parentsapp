"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { CalendarDays, ChevronDown } from "lucide-react";
import { api, ApiError, useApi } from "@/lib/api";
import { useParent } from "@/lib/parent";
import { useL } from "@/lib/i18n";
import { LEAVE_TYPES, type LeaveData, type LeaveType } from "@/lib/leave";
import { M } from "@/lib/text/more";
import { Empty, ErrorCard, ListSkeleton } from "@/components/ui";

/** Apply leave: type, from, to, full or half day (one choice), reason. */
export default function ApplyLeavePage() {
  const { child } = useParent();
  const L = useL();
  const router = useRouter();
  const { data, error, reload } = useApi<LeaveData>(child ? `/leave?student=${child.id}` : null);

  const [type, setType] = useState<LeaveType>("sick");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [half, setHalf] = useState(false);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState("");

  useEffect(() => {
    if (data?.rules.today && !from) {
      setFrom(data.rules.today);
      setTo(data.rules.today);
    }
  }, [data?.rules.today, from]);

  // Half day only makes sense for a single day.
  const oneDay = !!from && (!to || to === from);
  useEffect(() => {
    if (!oneDay) setHalf(false);
  }, [oneDay]);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    if (!child) return;
    if (to && to < from) return setProblem(L(M.badDates));
    if (reason.trim().length < 3) return setProblem(L(M.badReason));
    setBusy(true);
    setProblem("");
    try {
      await api("/leave", { method: "POST", body: { student: child.id, from, to: to || from, type, halfDay: half && oneDay, reason: reason.trim() } });
      router.replace("/leave/?sent=1");
    } catch (err) {
      const x = err instanceof ApiError ? err : null;
      setProblem(x?.status === 0 ? L({ hi: "इंटरनेट नहीं है। दोबारा कोशिश करें।", en: "No internet. Please try again." }) : x?.message || L({ hi: "अर्ज़ी नहीं गई। दोबारा कोशिश करें।", en: "Could not send. Please try again." }));
      setBusy(false);
    }
  }

  if (!data) {
    if (error && error.status !== 401) return <ErrorCard offline={error.status === 0} onRetry={reload} />;
    return <ListSkeleton />;
  }
  if (data.setupNeeded) return <Empty>{L(M.leaveSetup)}</Empty>;

  const r = data.rules;
  const max = r.reasonMax || 300;
  const count = reason.trim().length;

  return (
    <form onSubmit={send} className="animate-rise space-y-3.5" noValidate>
      <label className="field-box">
        <small>{L({ hi: "छुट्टी का प्रकार", en: "Type" })}</small>
        <select value={type} onChange={(e) => setType(e.target.value as LeaveType)}>
          {(Object.keys(LEAVE_TYPES) as LeaveType[]).map((k) => (
            <option key={k} value={k}>
              {L(LEAVE_TYPES[k])}
            </option>
          ))}
        </select>
        <ChevronDown aria-hidden />
      </label>

      <div className="grid grid-cols-2 gap-2.5">
        <label className="field-box">
          <small>{L(M.fromDate)}</small>
          <input
            type="date"
            value={from}
            min={r.minFrom}
            max={r.maxFrom}
            onChange={(e) => {
              setFrom(e.target.value);
              if (!to || to < e.target.value) setTo(e.target.value);
            }}
          />
          <CalendarDays aria-hidden />
        </label>
        <label className="field-box">
          <small>{L(M.toDate)}</small>
          <input type="date" value={to} min={from || r.minFrom} onChange={(e) => setTo(e.target.value)} />
          <CalendarDays aria-hidden />
        </label>
      </div>

      <div className="flex gap-6" role="radiogroup" aria-label={L({ hi: "कितना दिन", en: "Day" })}>
        <label className="radio">
          <input type="radio" name="span" checked={!half} onChange={() => setHalf(false)} />
          {L({ hi: "पूरा दिन", en: "Full day" })}
        </label>
        <label className="radio">
          <input type="radio" name="span" checked={half} disabled={!oneDay} onChange={() => setHalf(true)} />
          <span className={oneDay ? "" : "text-ink-400"}>{L({ hi: "आधा दिन", en: "Half day" })}</span>
        </label>
      </div>

      <label className="block">
        <span className="sr-only">{L(M.reason)}</span>
        <textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={4} maxLength={max + 20} placeholder={L(M.reasonHint)} className="textarea-box" />
        <span className={`tnum mt-1 block text-right text-[12px] ${count > max ? "text-rose-700" : "text-ink-400"}`}>
          {count}/{max}
        </span>
      </label>

      <p className="text-[13px] leading-snug text-ink-500">
        {L({ hi: "कक्षा अध्यापक इसे देखकर यहीं जवाब देंगे।", en: "The class teacher will see this and reply here." })} {L(M.leaveRule)}
      </p>

      {problem && (
        <p role="alert" className="text-[14px] text-rose-700">
          {problem}
        </p>
      )}

      <button type="submit" disabled={busy} className="btn-primary w-full">
        {busy ? L(M.sending) : L({ hi: "अर्ज़ी भेजें", en: "Apply" })}
      </button>
    </form>
  );
}
