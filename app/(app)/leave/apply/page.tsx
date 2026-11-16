"use client";
import { useUnsavedChanges } from "@/lib/useUnsavedChanges";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import clsx from "clsx";
import { ChevronDown } from "lucide-react";
import { api, ApiError, useApi } from "@/lib/api";
import { useParent } from "@/lib/parent";
import { useL } from "@/lib/i18n";
import { num } from "@/lib/format";
import { LEAVE_TYPES, type LeaveData, type LeaveType } from "@/lib/leave";
import { M } from "@/lib/text/more";
import { Empty, ErrorCard, ListSkeleton } from "@/components/ui";
import { Button } from "@/components/kit";
import "@/components/study.css";

/** A visible field: 52px, 12px corners, a border you can see, navy ring on focus. */
const FIELD =
  "block h-[52px] w-full rounded-xl border border-[#C9D4E1] bg-white px-4 text-[16px] leading-6 text-ink-900 outline-none transition-colors focus-visible:!outline-none focus:border-[#0D2A5E] focus:ring-2 focus:ring-[#0D2A5E]/25";
const LABEL = "mb-2 block text-[14px] font-medium leading-5 text-ink-700";

/** Whole days from one ISO date to another, both counted. */
const spanDays = (a: string, b: string) => Math.round((Date.parse(b + "T00:00:00Z") - Date.parse(a + "T00:00:00Z")) / 864e5) + 1;

/** Apply leave with labels above the fields, a two-option day control and the length in days. */
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
  const {markSaved}=useUnsavedChanges(!!reason.trim());
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState("");

  // Today is filled in once when the rules arrive; after that a cleared date stays cleared (audit 2026-11-16).
  const [prefilled, setPrefilled] = useState(false);
  useEffect(() => {
    if (data?.rules.today && !prefilled) {
      setPrefilled(true);
      setFrom(data.rules.today);
      setTo(data.rules.today);
    }
  }, [data?.rules.today, prefilled]);

  // Half day only makes sense for a single day.
  const oneDay = !!from && (!to || to === from);
  useEffect(() => {
    if (!oneDay) setHalf(false);
  }, [oneDay]);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    if (!child) return;
    if (!from) return setProblem(L({ hi: "छुट्टी शुरू होने की तारीख चुनें।", en: "Choose the first day of leave." }));
    if (to && to < from) return setProblem(L(M.badDates));
    const rules = data?.rules;
    if (rules?.maxDays && spanDays(from, to || from) > rules.maxDays) return setProblem(L({ hi: `एक बार में ज़्यादा से ज़्यादा ${rules.maxDays} दिन की छुट्टी ले सकते हैं।`, en: `Leave can be at most ${rules.maxDays} days at a time.` }));
    if (reason.trim().length < 3) return setProblem(L(M.badReason));
    if (rules?.reasonMax && reason.trim().length > rules.reasonMax) return setProblem(L({ hi: `कारण ${rules.reasonMax} अक्षरों से छोटा लिखें।`, en: `Keep the reason under ${rules.reasonMax} characters.` }));
    setBusy(true);
    setProblem("");
    try {
      await api("/leave", { method: "POST", body: { student: child.id, from, to: to || from, type, halfDay: half && oneDay, reason: reason.trim() } });
      markSaved();
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

  // Display only: how long the leave is once both days are chosen.
  const days = from && to && to >= from ? (half && oneDay ? 0.5 : spanDays(from, to)) : null;
  const daysText = days === null ? "" : L({ hi: `${num(days)} दिन`, en: days === 1 ? "1 day" : `${num(days)} days` });

  const spans = [
    { key: false, text: L({ hi: "पूरा दिन", en: "Full day" }), disabled: false },
    { key: true, text: L({ hi: "आधा दिन", en: "Half day" }), disabled: !oneDay },
  ];

  return (
    <form onSubmit={send} className="study study-in space-y-6 pb-4 pt-1" noValidate>
      <div>
        <label htmlFor="leave-type" className={LABEL}>
          {L({ hi: "छुट्टी का प्रकार", en: "Type" })}
        </label>
        <div className="relative">
          <select id="leave-type" value={type} onChange={(e) => setType(e.target.value as LeaveType)} className={clsx(FIELD, "appearance-none pr-11")}>
            {(Object.keys(LEAVE_TYPES) as LeaveType[]).map((k) => (
              <option key={k} value={k}>
                {L(LEAVE_TYPES[k])}
              </option>
            ))}
          </select>
          <ChevronDown className="pointer-events-none absolute right-4 top-1/2 h-5 w-5 -translate-y-1/2 text-ink-500" strokeWidth={1.75} aria-hidden />
        </div>
      </div>

      <div>
        <div className="grid grid-cols-2 gap-3">
          <div className="min-w-0">
            <label htmlFor="leave-from" className={LABEL}>
              {L(M.fromDate)}
            </label>
            <input
              id="leave-from"
              type="date"
              value={from}
              min={r.minFrom}
              max={r.maxFrom}
              onChange={(e) => {
                setFrom(e.target.value);
                if (!to || to < e.target.value) setTo(e.target.value);
              }}
              className={clsx(FIELD, "tnum px-3")}
            />
          </div>
          <div className="min-w-0">
            <label htmlFor="leave-to" className={LABEL}>
              {L(M.toDate)}
            </label>
            <input id="leave-to" type="date" value={to} min={from || r.minFrom} onChange={(e) => setTo(e.target.value)} className={clsx(FIELD, "tnum px-3")} />
          </div>
        </div>

        <div className="mt-3 grid grid-cols-2 gap-1 rounded-xl border border-[#C9D4E1] bg-white p-1" role="radiogroup" aria-label={L({ hi: "कितना दिन", en: "Day" })}>
          {spans.map((s) => {
            const on = half === s.key;
            return (
              <button
                key={String(s.key)}
                type="button"
                role="radio"
                aria-checked={on}
                disabled={s.disabled}
                onClick={() => setHalf(s.key)}
                className={clsx(
                  "min-h-[48px] rounded-lg text-[16px] transition-colors focus-visible:!outline-[#0D2A5E] focus-visible:!outline-offset-2 disabled:text-ink-500 disabled:opacity-60",
                  on ? "bg-[#0D2A5E] font-semibold text-white" : "font-medium text-ink-700 active:bg-[#F1F5F9]"
                )}
              >
                {s.text}
              </button>
            );
          })}
        </div>

        {daysText && (
          <p className="tnum mt-3 text-[14px] leading-5 text-ink-500" aria-live="polite">
            {L({ hi: "कुल", en: "Total" })}: <span className="font-medium text-ink-900">{daysText}</span>
          </p>
        )}
      </div>

      <div>
        <label htmlFor="leave-reason" className={LABEL}>
          {L(M.reason)}
        </label>
        <textarea
          id="leave-reason"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          rows={4}
          maxLength={max + 20}
          placeholder={L(M.reasonHint)}
          className="block w-full resize-none rounded-xl border border-[#C9D4E1] bg-white px-4 py-3 text-[16px] leading-6 text-ink-900 outline-none transition-colors focus-visible:!outline-none placeholder:text-ink-500 focus:border-[#0D2A5E] focus:ring-2 focus:ring-[#0D2A5E]/25"
        />
        <span className={clsx("tnum mt-2 block text-right text-[14px] leading-5", count > max ? "text-[#A32F35]" : "text-ink-500")}>
          {count}/{max}
        </span>
      </div>

      <p className="text-[14px] leading-5 text-ink-500">
        {L({ hi: "कक्षा अध्यापक इसे देखकर यहीं जवाब देंगे।", en: "The class teacher will see this and reply here." })} {L(M.leaveRule)}
      </p>

      <div className="space-y-3">
        {problem && (
          <p role="alert" className="text-[14px] leading-5 text-[#A32F35]">
            {problem}
          </p>
        )}
        <Button type="submit" disabled={busy} className="w-full">
          {busy ? L(M.sending) : L({ hi: "अर्ज़ी भेजें", en: "Apply" })}
        </Button>
      </div>
    </form>
  );
}
