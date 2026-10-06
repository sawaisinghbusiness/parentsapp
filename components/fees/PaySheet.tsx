"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import clsx from "clsx";
import { Check, Copy, X } from "lucide-react";
import { api, ApiError } from "@/lib/api";
import { useL } from "@/lib/i18n";
import { rupees } from "@/lib/format";
import { F } from "@/lib/text/fees";

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
}

type Choice = "due" | "full" | "other";

/**
 * Bottom sheet: pick the amount → pay in any UPI app → type the UTR → the school checks it.
 * Nothing here is money yet; the office verifies the UTR against the bank and makes the receipt.
 */
export function PaySheet({ info, onClose, onSent }: { info: PayInfo; onClose: () => void; onSent: () => void }) {
  const L = useL();
  const [choice, setChoice] = useState<Choice>(info.dueNow > 0 ? "due" : "full");
  const [other, setOther] = useState("");
  const [utr, setUtr] = useState("");
  const [paidOn, setPaidOn] = useState(info.asOf);
  const [sent, setSent] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const esc = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", esc);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", esc);
    };
  }, [onClose]);

  const amount = choice === "due" ? info.dueNow : choice === "full" ? info.full : Math.floor(Number(other.replace(/\D/g, "")) || 0);
  const amountOk = amount >= 1 && amount <= info.full;
  // UPI note: shows on the school's bank statement, so the office can match it to the child.
  const note = `Fee ${info.srNo} ${info.childName}`.slice(0, 50);
  const upiLink = `upi://pay?pa=${encodeURIComponent(info.upiId)}&pn=${encodeURIComponent(info.upiName)}&am=${amount}.00&cu=INR&tn=${encodeURIComponent(note)}`;

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
    ...(info.dueNow > 0 ? [{ key: "due" as const, label: L(F.optDue), value: info.dueNow }] : []),
    ...(info.full > info.dueNow ? [{ key: "full" as const, label: L(F.optFull), value: info.full }] : []),
    { key: "other", label: L(F.optOther) },
  ];

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end justify-center" role="dialog" aria-modal="true" aria-label={L(F.payUpi)}>
      <button className="absolute inset-0 animate-fadeIn bg-night-950/50" onClick={onClose} aria-label={L(F.close)} />
      <div className="pb-safe relative max-h-[92dvh] w-full max-w-[560px] animate-slide-up overflow-y-auto rounded-t-3xl bg-white">
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-ink-100 bg-white px-5 py-3">
          <h2 className="text-lg font-bold">{L(F.payUpi)}</h2>
          <button onClick={onClose} className="-mr-2 grid h-11 w-11 place-items-center rounded-xl text-ink-500" aria-label={L(F.close)}>
            <X className="h-6 w-6" aria-hidden />
          </button>
        </div>

        {sent ? (
          <div className="space-y-4 px-5 py-6">
            <p className="flex items-center gap-2 text-xl font-bold text-ink-900">
              <span className="dot bg-jade-600" aria-hidden /> {sent}
            </p>
            <p className="text-ink-700">{L(F.thanks)}</p>
            <button onClick={onClose} className="btn-primary w-full">
              {L(F.close)}
            </button>
          </div>
        ) : (
          <div className="space-y-6 px-5 pb-6 pt-4">
            {/* Amount */}
            <fieldset>
              <legend className="mb-2 font-semibold text-ink-800">{L(F.howMuch)}</legend>
              <div className="space-y-2">
                {opts.map((o) => (
                  <label key={o.key} className={clsx("flex min-h-[56px] cursor-pointer items-center gap-3 rounded-xl border px-4 py-2", choice === o.key ? "border-brand-600 bg-brand-50" : "border-ink-200")}>
                    <input type="radio" name="amt" checked={choice === o.key} onChange={() => setChoice(o.key)} className="h-5 w-5 accent-brand-600" />
                    <span className="flex-1">
                      <span className="block font-medium text-ink-900">{o.label}</span>
                      {o.value !== undefined && info.fineIncluded && <span className="block text-xs text-ink-500">{L(F.incFine)}</span>}
                    </span>
                    {o.value !== undefined && <span className="tnum font-bold text-ink-900">{rupees(o.value)}</span>}
                  </label>
                ))}
              </div>
              {choice === "other" && (
                <div className="mt-2 flex items-center overflow-hidden rounded-xl border border-ink-300 focus-within:border-brand-500 focus-within:ring-4 focus-within:ring-brand-100">
                  <span className="px-3 text-lg font-semibold text-ink-500">₹</span>
                  <input
                    inputMode="numeric"
                    value={other}
                    onChange={(e) => setOther(e.target.value.replace(/\D/g, "").slice(0, 7))}
                    placeholder={L(F.enterAmount)}
                    className="tnum min-h-[52px] w-full pr-3 text-lg font-semibold outline-none"
                    autoFocus
                  />
                </div>
              )}
            </fieldset>

            {/* Step 1: pay */}
            <section className="space-y-3">
              <h3 className="font-semibold text-ink-800">{L(F.step1)}</h3>
              <p className="text-sm text-ink-600">
                {L(F.checkName)} <span className="font-semibold text-ink-900">{info.upiName}</span>
              </p>
              <a href={amountOk ? upiLink : undefined} aria-disabled={!amountOk} className={clsx("btn-primary w-full", !amountOk && "pointer-events-none opacity-50")}>
                {L(F.openApp)} {amountOk ? `· ${rupees(amount)}` : ""}
              </a>
              <p className="text-sm text-ink-600">{L(F.orCopy)}</p>
              <div className="flex items-center gap-2 rounded-xl border border-ink-200 bg-ink-50 py-1 pl-4 pr-1">
                <span className="min-w-0 flex-1 truncate font-semibold text-ink-900">{info.upiId}</span>
                <button type="button" onClick={copy} className="flex min-h-[44px] items-center gap-1.5 rounded-lg bg-white px-3 text-sm font-semibold text-brand-700 ring-1 ring-ink-200">
                  {copied ? <Check className="h-4 w-4 text-jade-600" aria-hidden /> : <Copy className="h-4 w-4" aria-hidden />}
                  {copied ? L(F.copied) : L(F.copy)}
                </button>
              </div>
            </section>

            {/* Step 2: tell the school */}
            <form onSubmit={send} className="space-y-3" noValidate>
              <h3 className="font-semibold text-ink-800">{L(F.step2)}</h3>
              <div>
                <label htmlFor="utr" className="mb-1.5 block text-sm font-medium text-ink-700">
                  {L(F.utr)}
                </label>
                <input
                  id="utr"
                  value={utr}
                  onChange={(e) => setUtr(e.target.value.replace(/[^0-9a-zA-Z\s-]/g, "").slice(0, 26))}
                  inputMode="numeric"
                  autoComplete="off"
                  autoCapitalize="characters"
                  className="field tnum tracking-wider"
                  placeholder="6xxxxxxxxxxx"
                />
                <p className="mt-1 text-xs text-ink-500">{L(F.utrHelp)}</p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="paidOn" className="mb-1.5 block text-sm font-medium text-ink-700">
                    {L(F.paidOn)}
                  </label>
                  <input id="paidOn" type="date" value={paidOn} max={info.asOf} onChange={(e) => setPaidOn(e.target.value)} className="field" />
                </div>
                <div>
                  <p className="mb-1.5 text-sm font-medium text-ink-700">{L(F.amountPaid)}</p>
                  <p className="tnum flex min-h-[52px] items-center rounded-xl bg-ink-50 px-4 text-lg font-bold text-ink-900">{amountOk ? rupees(amount) : "—"}</p>
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
      </div>
    </div>,
    document.body
  );
}
