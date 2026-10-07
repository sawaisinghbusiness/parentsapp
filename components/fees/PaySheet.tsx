"use client";

import { useState } from "react";
import clsx from "clsx";
import { Check, Copy } from "lucide-react";
import { api, ApiError } from "@/lib/api";
import { useL } from "@/lib/i18n";
import { rupees } from "@/lib/format";
import { F } from "@/lib/text/fees";
import { Sheet } from "@/components/ui";

export interface PayInfo {
  studentId: string;
  srNo: string;
  childName: string;
  asOf: string;
  upiId: string;
  upiName: string;
  dueNow: number;
  full: number;
  fineIncluded: boolean;
  /** Fee detail's own total, offered first when it is neither "due now" nor "full". */
  suggest?: number;
}

type Choice = "due" | "full" | "this" | "other";

/** Each app opens straight to the payment; "any app" lets the phone ask which one. */
const APPS = [
  { key: "any", name: { hi: "कोई भी UPI ऐप", en: "Any UPI app" }, mark: "₹", bg: "#6C4FE0", scheme: "upi://pay" },
  { key: "phonepe", name: { hi: "PhonePe", en: "PhonePe" }, mark: "Pe", bg: "#5F259F", scheme: "phonepe://pay" },
  { key: "gpay", name: { hi: "Google Pay", en: "Google Pay" }, mark: "G", bg: "#1A73E8", scheme: "tez://upi/pay" },
  { key: "paytm", name: { hi: "Paytm", en: "Paytm" }, mark: "Pt", bg: "#00B9F1", scheme: "paytmmp://pay" },
] as const;

/**
 * Bottom sheet: pick the amount → pay in a UPI app → type the UTR → the school checks it.
 * Nothing here is money yet; the office verifies the UTR against the bank and makes the receipt.
 */
export function PaySheet({ info, onClose, onSent }: { info: PayInfo; onClose: () => void; onSent: () => void }) {
  const L = useL();
  const suggest = info.suggest && info.suggest !== info.dueNow && info.suggest !== info.full && info.suggest <= info.full ? info.suggest : 0;
  const [choice, setChoice] = useState<Choice>(suggest ? "this" : info.dueNow > 0 ? "due" : "full");
  const [other, setOther] = useState("");
  const [app, setApp] = useState<(typeof APPS)[number]["key"]>("any");
  const [utr, setUtr] = useState("");
  const [paidOn, setPaidOn] = useState(info.asOf);
  const [sent, setSent] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  const amount = choice === "due" ? info.dueNow : choice === "full" ? info.full : choice === "this" ? suggest : Math.floor(Number(other.replace(/\D/g, "")) || 0);
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
      setSent(rupees(amount));
      onSent();
    } catch (err) {
      setError(err instanceof ApiError && err.message ? err.message : L({ hi: "भेजा नहीं जा सका। दोबारा कोशिश करें।", en: "Could not send. Please try again." }));
    } finally {
      setBusy(false);
    }
  }

  const opts: { key: Choice; label: string; value?: number }[] = [
    ...(suggest ? [{ key: "this" as const, label: L({ hi: "यह किस्त", en: "This instalment" }), value: suggest }] : []),
    ...(info.dueNow > 0 ? [{ key: "due" as const, label: L(F.optDue), value: info.dueNow }] : []),
    ...(info.full > info.dueNow ? [{ key: "full" as const, label: L(F.optFull), value: info.full }] : []),
    { key: "other", label: L(F.optOther) },
  ];

  return (
    <Sheet title={sent ? L({ hi: "भेज दिया", en: "Sent" }) : amountOk ? `${L({ hi: "भरें", en: "Pay" })} ${rupees(amount)}` : L(F.payUpi)} onClose={onClose}>
      {sent ? (
        <div className="space-y-4 pt-2">
          <p className="flex items-center gap-2 text-xl font-bold">
            <Check className="h-6 w-6 text-jade-600" strokeWidth={2.5} aria-hidden /> {sent}
          </p>
          <p className="text-ink-700">{L(F.thanks)}</p>
          <button onClick={onClose} className="btn-primary w-full">
            {L(F.close)}
          </button>
        </div>
      ) : (
        <div className="space-y-5">
          <p className="text-[13px] text-ink-500">
            {L({ hi: "किसे:", en: "To" })} <span className="font-semibold text-ink-900">{info.upiName}</span> · {info.upiId}
          </p>

          <fieldset>
            <legend className="mb-2 text-[15px] font-semibold">{L(F.howMuch)}</legend>
            <div className="space-y-2">
              {opts.map((o) => (
                <label key={o.key} className={clsx("flex min-h-[54px] cursor-pointer items-center gap-3 rounded-xl px-3.5 py-2", choice === o.key ? "bg-brand-50 ring-1 ring-brand-600" : "bg-ink-50")}>
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
            <legend className="mb-2 text-[15px] font-semibold">{L(F.step1)}</legend>
            <div className="space-y-2">
              {APPS.map((a) => (
                <label key={a.key} className="flex min-h-[54px] cursor-pointer items-center gap-3 rounded-xl bg-ink-50 px-3">
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
            <a href={amountOk ? link : undefined} aria-disabled={!amountOk} className={clsx("btn-primary mt-3 w-full", !amountOk && "pointer-events-none opacity-50")}>
              {L(F.openApp)} {amountOk ? `· ${rupees(amount)}` : ""}
            </a>
            <p className="mt-3 text-[13px] text-ink-500">{L(F.orCopy)}</p>
            <div className="mt-1.5 flex items-center gap-2 rounded-xl bg-ink-50 py-1 pl-3.5 pr-1">
              <span className="min-w-0 flex-1 truncate font-semibold">{info.upiId}</span>
              <button type="button" onClick={copy} className="flex min-h-[44px] items-center gap-1.5 rounded-lg bg-white px-3 text-[14px] font-semibold text-brand-600 ring-1 ring-ink-200">
                {copied ? <Check className="h-4 w-4 text-jade-600" aria-hidden /> : <Copy className="h-4 w-4" aria-hidden />}
                {copied ? L(F.copied) : L(F.copy)}
              </button>
            </div>
          </fieldset>

          <form onSubmit={send} className="space-y-3" noValidate>
            <h3 className="text-[15px] font-semibold">{L(F.step2)}</h3>
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
                />
              </label>
              <p className="mt-1 text-[12px] text-ink-500">{L(F.utrHelp)}</p>
            </div>
            <div className="grid grid-cols-2 gap-2.5">
              <label className="field-box">
                <small>{L(F.paidOn)}</small>
                <input type="date" value={paidOn} max={info.asOf} onChange={(e) => setPaidOn(e.target.value)} />
              </label>
              <div className="field-box bg-ink-50">
                <small>{L(F.amountPaid)}</small>
                <span className="tnum pt-4 font-bold">{amountOk ? rupees(amount) : "—"}</span>
              </div>
            </div>
            {error && (
              <p className="font-medium text-rose-700" role="alert">
                {error}
              </p>
            )}
            <button type="submit" disabled={busy || !amountOk} className="btn-primary w-full">
              {busy ? "…" : L(F.send)}
            </button>
          </form>
        </div>
      )}
    </Sheet>
  );
}
