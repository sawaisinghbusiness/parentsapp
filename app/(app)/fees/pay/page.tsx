"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import clsx from "clsx";
import { Check, Copy } from "lucide-react";
import { api, ApiError, useApi } from "@/lib/api";
import { useParent } from "@/lib/parent";
import { useL } from "@/lib/i18n";
import { rupees } from "@/lib/format";
import { type Fees } from "@/lib/fees";
import { F } from "@/lib/text/fees";
import { Empty, ErrorCard, ListSkeleton } from "@/components/ui";

type Choice = "this" | "due" | "full" | "other";

/** Each app opens straight to the payment; "any app" lets the phone ask which one. */
const APPS = [
  { key: "any", name: { hi: "कोई भी UPI ऐप", en: "Any UPI app" }, mark: "₹", bg: "#6C4FE0", scheme: "upi://pay" },
  { key: "phonepe", name: { hi: "PhonePe", en: "PhonePe" }, mark: "Pe", bg: "#5F259F", scheme: "phonepe://pay" },
  { key: "gpay", name: { hi: "Google Pay", en: "Google Pay" }, mark: "G", bg: "#1A73E8", scheme: "tez://upi/pay" },
  { key: "paytm", name: { hi: "Paytm", en: "Paytm" }, mark: "Pt", bg: "#00B9F1", scheme: "paytmmp://pay" },
] as const;

/**
 * Payment, as a page: pick the amount and app → pay in the UPI app → come back and type the UTR → the
 * school checks it. Nothing here is money yet; the office matches the UTR with the bank and makes the receipt.
 * ?i=<n> comes from a Fee Detail and offers that instalment first.
 */
export default function PayPage() {
  const { child } = useParent();
  const L = useL();
  const { data, error, reload } = useApi<Fees>(child ? `/fees?student=${child.id}` : null);
  const [index, setIndex] = useState<number | null | undefined>(undefined);
  useEffect(() => {
    const i = new URLSearchParams(window.location.search).get("i");
    setIndex(i === null ? null : Number(i) || 0);
  }, []);

  if (!data || index === undefined) {
    if (error && error.status !== 401) return <ErrorCard offline={error.status === 0} onRetry={reload} />;
    return <ListSkeleton rows={3} />;
  }
  if (!data.available || !data.pay.upiId || data.session.balance <= 0 || !child) return <Empty>{!data.available ? L(F.notAvailable) : !data.pay.upiId ? L(F.noOnline) : L(F.allPaid)}</Empty>;

  const ins = index !== null ? data.instalments[index] : undefined;
  const suggest = ins && ins.outstanding > 0 ? ins.outstanding + (ins.overdue ? ins.fine : 0) : 0;
  return (
    <PayFlow
      key={child.id}
      info={{
        studentId: child.id,
        srNo: child.srNo,
        childName: child.name,
        asOf: data.asOf,
        upiId: data.pay.upiId,
        upiName: data.pay.upiName,
        dueNow: data.options.dueNow,
        full: data.options.full,
        fineIncluded: data.fine > 0,
        suggest: suggest && suggest !== data.options.dueNow && suggest !== data.options.full && suggest <= data.options.full ? suggest : 0,
      }}
    />
  );
}

interface PayInfo {
  studentId: string;
  srNo: string;
  childName: string;
  asOf: string;
  upiId: string;
  upiName: string;
  dueNow: number;
  full: number;
  fineIncluded: boolean;
  /** The instalment's own total, when it is neither "due now" nor "full". */
  suggest: number;
}

function PayFlow({ info }: { info: PayInfo }) {
  const L = useL();
  const [step, setStep] = useState<"choose" | "utr" | "sent">("choose");
  const [choice, setChoice] = useState<Choice>(info.suggest ? "this" : info.dueNow > 0 ? "due" : "full");
  const [other, setOther] = useState("");
  const [app, setApp] = useState<(typeof APPS)[number]["key"]>("any");
  const [utr, setUtr] = useState("");
  const [paidOn, setPaidOn] = useState(info.asOf);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  const amount = choice === "due" ? info.dueNow : choice === "full" ? info.full : choice === "this" ? info.suggest : Math.floor(Number(other.replace(/\D/g, "")) || 0);
  const amountOk = amount >= 1 && amount <= info.full;
  // UPI note: shows on the school's bank statement, so the office can match it to the child.
  const note = `Fee ${info.srNo} ${info.childName}`.slice(0, 50);
  const query = `pa=${encodeURIComponent(info.upiId)}&pn=${encodeURIComponent(info.upiName)}&am=${amount}.00&cu=INR&tn=${encodeURIComponent(note)}`;
  const link = `${APPS.find((a) => a.key === app)!.scheme}?${query}`;

  async function copy() {
    try {
      await navigator.clipboard.writeText(info.upiId);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* old browsers: the ID is on screen to type */
    }
  }

  async function send(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const clean = utr.replace(/[\s-]/g, "").toUpperCase();
    if (!amountOk) return setError(L(F.enterAmount));
    if (!/^[A-Z0-9]{10,22}$/.test(clean)) return setError(L(F.utr));
    setBusy(true);
    try {
      await api("/fees/claim", { body: { student: info.studentId, amount, utr: clean, paidOn } });
      setStep("sent");
    } catch (err) {
      setError(err instanceof ApiError && err.message ? err.message : L({ hi: "भेजा नहीं जा सका। दोबारा कोशिश करें।", en: "Could not send. Please try again." }));
    } finally {
      setBusy(false);
    }
  }

  if (step === "sent")
    return (
      <div className="animate-rise space-y-4 pt-2">
        <p className="flex items-center gap-2 text-xl font-bold">
          <Check className="h-6 w-6 text-jade-600" strokeWidth={2.5} aria-hidden /> <span className="tnum">{rupees(amount)}</span>
        </p>
        <p className="text-ink-700">{L(F.thanks)}</p>
        <Link href="/fees/" className="btn-primary w-full">
          {L({ hi: "फ़ीस पर वापस", en: "Back to Fees" })}
        </Link>
      </div>
    );

  if (step === "utr")
    return (
      <form onSubmit={send} className="animate-rise space-y-3.5" noValidate>
        <div className="row-card">
          <p className="mlabel !px-0">{L({ hi: "UPI ऐप में भरे", en: "Paid in UPI app" })}</p>
          <p className="tnum mt-0.5 text-[22px] font-extrabold">{rupees(amount)}</p>
        </div>
        <p className="text-[15px] leading-relaxed text-ink-700">
          {L({
            hi: "पेमेंट हो गया हो तो UPI ऐप में दिख रहा 12 अंक का UTR / Ref नंबर यहाँ लिखें। स्कूल जाँच कर रसीद बनाएगा।",
            en: "If the payment went through, type the 12-digit UTR / Ref number from your UPI app here. The school will check it and make the receipt.",
          })}
        </p>
        <div>
          <label className="field-box">
            <small>{L(F.utr)}</small>
            <input
              value={utr}
              onChange={(e) => setUtr(e.target.value.replace(/[^0-9a-zA-Z\s-]/g, "").slice(0, 26))}
              inputMode="numeric"
              autoComplete="off"
              autoCapitalize="characters"
              className="tnum tracking-wider"
              placeholder="6xxxxxxxxxxx"
              autoFocus
            />
          </label>
          <p className="mt-1 text-[12px] text-ink-500">{L(F.utrHelp)}</p>
        </div>
        <label className="field-box">
          <small>{L(F.paidOn)}</small>
          <input type="date" value={paidOn} max={info.asOf} onChange={(e) => setPaidOn(e.target.value)} />
        </label>
        {error && (
          <p className="font-medium text-rose-700" role="alert">
            {error}
          </p>
        )}
        <div className="sticky bottom-[calc(62px+env(safe-area-inset-bottom))] -mx-4 space-y-2 border-t border-ink-100 bg-white px-4 pb-3 pt-2.5">
          <button type="submit" disabled={busy} className="btn-primary w-full">
            {busy ? "…" : L(F.send)}
          </button>
          <a href={link} className="btn-line w-full">
            {L({ hi: "ऐप में फिर से भरें", en: "Pay again in app" })}
          </a>
          <button type="button" onClick={() => setStep("choose")} className="link w-full justify-center text-[14px]">
            {L({ hi: "रकम बदलें", en: "Change amount" })}
          </button>
        </div>
      </form>
    );

  const opts: { key: Choice; label: string; value?: number }[] = [
    ...(info.suggest ? [{ key: "this" as const, label: L({ hi: "यह किस्त", en: "This instalment" }), value: info.suggest }] : []),
    ...(info.dueNow > 0 ? [{ key: "due" as const, label: L(F.optDue), value: info.dueNow }] : []),
    ...(info.full > info.dueNow ? [{ key: "full" as const, label: L({ hi: "पूरे सत्र की बाकी", en: "Full session" }), value: info.full }] : []),
    { key: "other", label: L(F.optOther) },
  ];

  return (
    <div className="animate-rise space-y-3">
      <fieldset>
        <legend className="mlabel mb-2">{L({ hi: "कितनी रकम", en: "How much" })}</legend>
        <div className="space-y-2">
          {opts.map((o) => (
            <label key={o.key} className={clsx("flex min-h-[54px] cursor-pointer items-center gap-3 rounded-2xl px-3.5 py-2", choice === o.key ? "bg-brand-50 ring-1 ring-brand-600" : "bg-ink-50")}>
              <span className="radio min-h-0">
                <input type="radio" name="amt" checked={choice === o.key} onChange={() => setChoice(o.key)} />
              </span>
              <span className="flex-1">
                <span className="block text-[15px] font-medium">{o.label}</span>
                {o.value !== undefined && o.key !== "this" && info.fineIncluded && <span className="block text-[12px] text-ink-500">{L(F.incFine)}</span>}
              </span>
              {o.value !== undefined && <span className="tnum font-bold">{rupees(o.value)}</span>}
            </label>
          ))}
        </div>
        {choice === "other" && (
          <div className="field-box mt-2">
            <span className="text-lg font-semibold text-ink-500">₹</span>
            <input inputMode="numeric" value={other} onChange={(e) => setOther(e.target.value.replace(/\D/g, "").slice(0, 7))} placeholder={L(F.enterAmount)} className="tnum text-lg font-semibold" autoFocus />
          </div>
        )}
      </fieldset>

      <fieldset>
        <legend className="mlabel mb-2 mt-2">{L({ hi: "किससे भरें", en: "Pay with" })}</legend>
        <div className="space-y-2">
          {APPS.map((a) => (
            <label key={a.key} className="flex min-h-[54px] cursor-pointer items-center gap-3 rounded-2xl bg-ink-50 px-3">
              <span className="grid h-8 w-8 shrink-0 place-items-center rounded-[9px] text-[12px] font-bold text-white" style={{ background: a.bg }} aria-hidden>
                {a.mark}
              </span>
              <span className="flex-1 text-[15px] font-semibold">{L(a.name)}</span>
              <span className="radio min-h-0">
                <input type="radio" name="app" checked={app === a.key} onChange={() => setApp(a.key)} />
              </span>
            </label>
          ))}
        </div>
      </fieldset>

      <p className="text-[13px] text-ink-500">
        {L({ hi: "किसे:", en: "To:" })} <span className="font-semibold text-ink-900">{info.upiName}</span> · {info.upiId}
      </p>
      <div className="flex items-center gap-2">
        <p className="min-w-0 flex-1 text-[13px] leading-snug text-ink-500">{L(F.orCopy)}</p>
        <button type="button" onClick={copy} className="flex min-h-[44px] shrink-0 items-center gap-1.5 rounded-lg bg-white px-3 text-[14px] font-semibold text-brand-600 ring-1 ring-ink-200">
          {copied ? <Check className="h-4 w-4 text-jade-600" aria-hidden /> : <Copy className="h-4 w-4" aria-hidden />}
          {copied ? L(F.copied) : L(F.copy)}
        </button>
      </div>

      <div className="sticky bottom-[calc(62px+env(safe-area-inset-bottom))] -mx-4 border-t border-ink-100 bg-white px-4 pb-3 pt-2.5">
        {/* Opens the UPI app; when the parent comes back, the page is already asking for the UTR. */}
        <a href={amountOk ? link : undefined} onClick={() => amountOk && setStep("utr")} aria-disabled={!amountOk} className={clsx("btn-primary w-full", !amountOk && "pointer-events-none opacity-50")}>
          {L({ hi: "अभी भरें", en: "Pay Now" })} {amountOk ? <span className="tnum">{rupees(amount)}</span> : null}
        </a>
      </div>
    </div>
  );
}
