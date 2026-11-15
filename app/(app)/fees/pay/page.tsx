"use client";
import { useUnsavedChanges } from "@/lib/useUnsavedChanges";

import { useEffect, useState } from "react";
import Link from "next/link";
import clsx from "clsx";
import { ChevronDown, Clock, Info } from "lucide-react";
import { api, ApiError, useApi } from "@/lib/api";
import { useParent } from "@/lib/parent";
import { useL } from "@/lib/i18n";
import { rupees } from "@/lib/format";
import { type Fees } from "@/lib/fees";
import { F } from "@/lib/text/fees";
import { Empty, ErrorCard, ListSkeleton } from "@/components/ui";
import "@/components/study.css";

type Choice = "this" | "due" | "full" | "other";

/** The parent scans the school's QR (uploaded in the ERP) with any UPI app; these logos only show what works. */
const UPI_LOGOS = [
  { name: "PhonePe", src: "/img/upi/phonepe.svg" },
  { name: "Google Pay", src: "/img/upi/googlepay.svg" },
  { name: "Paytm", src: "/img/upi/paytm.svg" },
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
  if (!data.available || !data.pay.qrUrl || data.session.balance <= 0 || !child) return <Empty>{!data.available ? L(F.notAvailable) : !data.pay.qrUrl ? L(F.noOnline) : L(F.allPaid)}</Empty>;

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
        qrUrl: data.pay.qrUrl,
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
  qrUrl: string;
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
  const [utr, setUtr] = useState("");
  const [paidOn, setPaidOn] = useState(info.asOf);
  const {markSaved}=useUnsavedChanges(step!=="sent" && (!!utr.trim()||!!other.trim()));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const amount = choice === "due" ? info.dueNow : choice === "full" ? info.full : choice === "this" ? info.suggest : Math.floor(Number(other.replace(/\D/g, "")) || 0);
  const amountOk = amount >= 1 && amount <= info.full;

  async function send(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const clean = utr.replace(/[\s-]/g, "").toUpperCase();
    if (!amountOk) return setError(L(F.enterAmount));
    if (!/^[A-Z0-9]{10,22}$/.test(clean)) return setError(L(F.utr));
    setBusy(true);
    try {
      await api("/fees/claim", { body: { student: info.studentId, amount, utr: clean, paidOn } });
      markSaved();
      setStep("sent");
    } catch (err) {
      setError(err instanceof ApiError && err.message ? err.message : L({ hi: "भेजा नहीं जा सका। दोबारा कोशिश करें।", en: "Could not send. Please try again." }));
    } finally {
      setBusy(false);
    }
  }

  if (step === "sent")
    return (
      <div className="study study-in space-y-4 pt-2">
        {/* Not a receipt yet: the school still has to match the UTR with the bank, so no green "paid" tick here. */}
        <div role="status">
          <p className="flex items-center gap-2 text-[17px] font-bold text-marigold-700">
            <Clock className="h-5 w-5 shrink-0" strokeWidth={2.2} aria-hidden />
            {L({ hi: "जानकारी भेज दी गई, स्कूल की जाँच बाकी है", en: "Details sent. School verification pending" })}
          </p>
          <p className="tnum mt-2 text-[22px] font-extrabold">{rupees(amount)}</p>
          <p className="tnum mt-0.5 break-all text-[13px] text-ink-500">UTR {utr.replace(/[\s-]/g, "").toUpperCase()}</p>
        </div>
        <p className="text-ink-700">{L(F.thanks)}</p>
        <p className="text-[14px] font-medium text-ink-900">{L({ hi: "दोबारा पेमेंट न करें। जाँच पूरी होने तक बाकी रकम पहले जैसी दिख सकती है।", en: "Please do not pay again. The balance may look unchanged until the school finishes checking." })}</p>
        <Link href="/fees/" className="btn-primary w-full">
          {L({ hi: "फ़ीस पर वापस", en: "Back to Fees" })}
        </Link>
      </div>
    );

  const opts: { key: Choice; label: string; value?: number }[] = [
    ...(info.suggest ? [{ key: "this" as const, label: L({ hi: "यह किस्त", en: "This instalment" }), value: info.suggest }] : []),
    ...(info.dueNow > 0 ? [{ key: "due" as const, label: L(F.optDue), value: info.dueNow }] : []),
    ...(info.full > info.dueNow ? [{ key: "full" as const, label: L({ hi: "पूरे सत्र की बाकी", en: "Full session" }), value: info.full }] : []),
    { key: "other", label: L(F.optOther) },
  ];

  /*
   * Same measures as the Fees page (4/8 grid, tightened with it on 2026-11-14): type 12/16 · 14/20 · 16/24 ·
   * 20/28; 12 from a title to its card, 24 between sections, 16 at a card's sides, 8 to 12 inside; rows 56
   * (one line) or 64 (two); buttons 44 to 48. The Pay button is part of the page, straight after the choices:
   * no bar floating over the content.
   */
  const card = "overflow-hidden rounded-[10px] border border-[#DCE4ED] bg-white";
  const h2 = "text-[20px] font-semibold leading-7 text-ink-900";
  const button = "action-primary flex h-12 w-full items-center justify-center rounded-xl bg-[#0D2A5E] text-[16px] font-semibold leading-6 text-white active:bg-[#0A2149] disabled:opacity-50";
  const band = { background: "linear-gradient(160deg,#F4F7FF 0%,#DCE5FF 100%)" };

  // The top of the slip, on both steps, drawn like the Fees summary: the picture, what it is, the amount
  // on the right; then whose fee and to whom underneath.
  const slip = (label: string) => (
    <section className={card}>
      <div className="flex items-center gap-3 px-4 py-3" style={band}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/img/fee-receipt.webp" alt="" className="h-11 w-11 shrink-0 object-contain" />
        <p className="min-w-0 flex-1 truncate text-[16px] font-medium leading-6 text-ink-700">{label}</p>
        <p className="tnum shrink-0 text-[28px] font-semibold leading-9 tracking-tight text-ink-900">{amountOk ? rupees(amount) : "₹ 0"}</p>
      </div>
      <dl className="space-y-1 px-4 py-3 text-[14px] leading-5">
        <div className="flex justify-between gap-4">
          <dt className="shrink-0 text-ink-500">{L({ hi: "किसकी", en: "For" })}</dt>
          <dd className="truncate text-right font-medium text-ink-900">{info.childName}</dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt className="shrink-0 text-ink-500">{L({ hi: "किसे", en: "To" })}</dt>
          <dd className="min-w-0 text-right">
            <span className="block truncate font-medium text-ink-900">{info.upiName}</span>
          </dd>
        </div>
      </dl>
    </section>
  );

  // After paying: the same slip, then two fields in one card like "How much", one button, and two
  // small ways back. Redrawn 2026-11-14 with far fewer words (the user found the first one wordy).
  if (step === "utr")
    return (
      <form onSubmit={send} className="study space-y-6 pb-4 pt-1" noValidate>
        {slip(L({ hi: "चुनी हुई रकम", en: "Amount you chose" }))}
        <section className="study-in">
          <h2 className={h2}>{L({ hi: "पेमेंट हो गया?", en: "Payment done?" })}</h2>
          <p className="mt-1 text-[14px] leading-5 text-ink-500">{L({ hi: "UPI ऐप से UTR नंबर यहाँ लिखें", en: "Enter the UTR number from your UPI app" })}</p>
          <div className={clsx(card, "mt-3 divide-y divide-[#E6ECF3] focus-within:border-[#0D2A5E]")}>
            <label className="block px-4 py-3">
              <span className="block text-[12px] leading-4 text-ink-500">{L({ hi: "UTR / Ref नंबर", en: "UTR / Ref no." })}</span>
              <input
                value={utr}
                onChange={(e) => setUtr(e.target.value.replace(/[^0-9a-zA-Z\s-]/g, "").slice(0, 26))}
                inputMode="numeric"
                autoComplete="off"
                autoCapitalize="characters"
                placeholder={L({ hi: "12 अंक", en: "12 digits" })}
                aria-invalid={!!error || undefined}
                className="tnum mt-1 block w-full bg-transparent text-[16px] font-medium leading-6 tracking-wider text-ink-900 outline-none focus:outline-none focus-visible:outline-none placeholder:font-normal placeholder:tracking-normal placeholder:text-ink-400 focus-visible:ring-0 focus-visible:ring-offset-0"
                autoFocus
                // The card shows the focus (navy border); no second ring or outline on the field itself.
                style={{ outline: "none", boxShadow: "none" }}
              />
            </label>
            <label className="block px-4 py-3">
              <span className="block text-[12px] leading-4 text-ink-500">{L(F.paidOn)}</span>
              <input type="date" value={paidOn} max={info.asOf} onChange={(e) => setPaidOn(e.target.value)} style={{ outline: "none", boxShadow: "none" }} className="tnum mt-1 block w-full bg-transparent text-[16px] font-medium leading-6 text-ink-900 outline-none focus:outline-none focus-visible:outline-none focus-visible:ring-0 focus-visible:ring-offset-0" />
            </label>
          </div>
          {error && (
            <p className="mt-2 text-[14px] font-medium leading-5 text-[#A32F35]" role="alert">
              {error}
            </p>
          )}
          <button type="submit" disabled={busy} className={clsx(button, "mt-4")}>
            {busy ? "…" : L(F.send)}
          </button>
          {/* Two quiet ways back, not second buttons: paying twice by mistake is the costly error here. */}
          <div className="mt-1 flex items-center justify-between">
            <button type="button" onClick={() => setStep("choose")} className="flex h-11 items-center text-[14px] font-medium leading-5 text-[#0D2A5E]">
              {L({ hi: "रकम बदलें", en: "Change amount" })}
            </button>
            <button type="button" onClick={() => setStep("choose")} className="flex h-11 items-center text-[14px] leading-5 text-ink-500">
              {L({ hi: "QR फिर दिखाएँ", en: "Show QR again" })}
            </button>
          </div>
        </section>
      </form>
    );

  return (
    <div className="study space-y-6 pb-4 pt-1">
      {slip(L({ hi: "फ़ीस भुगतान", en: "Fee payment" }))}

      <fieldset className="study-in">
        <legend className={h2}>{L({ hi: "कितनी रकम", en: "How much" })}</legend>
        <div className={clsx(card, "mt-3 divide-y divide-[#E6ECF3]")}>
          {opts.map((o) => {
            const two = o.value !== undefined && o.key !== "this" && info.fineIncluded;
            return (
              <label key={o.key} className={clsx("flex cursor-pointer items-center gap-3 px-4 py-2", two ? "min-h-[64px]" : "min-h-[56px]")}>
                <span className="radio min-h-0">
                  <input type="radio" name="amt" checked={choice === o.key} onChange={() => setChoice(o.key)} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className={clsx("block text-[16px] leading-6 text-ink-900", choice === o.key && "font-medium")}>{o.label}</span>
                  {two && <span className="block text-[12px] leading-4 text-ink-500">{L(F.incFine)}</span>}
                </span>
                {o.value !== undefined && <span className={clsx("tnum shrink-0 text-[16px] leading-6", choice === o.key ? "font-medium text-ink-900" : "text-ink-600")}>{rupees(o.value)}</span>}
              </label>
            );
          })}
        </div>
        {choice === "other" && (
          <div className="field-box mt-3">
            <span className="text-[16px] font-medium leading-6 text-ink-500">₹</span>
            <input inputMode="numeric" value={other} onChange={(e) => setOther(e.target.value.replace(/\D/g, "").slice(0, 7))} placeholder={L(F.enterAmount)} className="tnum text-[16px] font-medium" autoFocus />
          </div>
        )}
      </fieldset>

      {/* The school's QR, then one button for "I have paid". Nothing opens another app by itself. */}
      <div className="study-in" style={{ animationDelay: "70ms" }}>
        <div className={clsx(card, "px-4 pb-4 pt-4 text-center")}>
          <p className="text-[16px] font-semibold leading-6 text-ink-900">
            {amountOk ? L({ hi: `QR स्कैन करके ${rupees(amount)} भरें`, en: `Scan the QR and pay ${rupees(amount)}` }) : L({ hi: "पहले रकम चुनें", en: "Choose an amount first" })}
          </p>
          <div className="mx-auto mt-3 flex aspect-square w-full max-w-[260px] items-center justify-center overflow-hidden rounded-xl border border-[#DCE4ED] bg-white p-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={info.qrUrl} alt={L({ hi: "स्कूल का पेमेंट QR", en: "School payment QR" })} className="h-full w-full object-contain" />
          </div>
          <p className="mt-3 text-[13px] leading-5 text-ink-500">{L({ hi: "किसी भी UPI ऐप से स्कैन करें", en: "Pay with any UPI app" })}</p>
          <ul className="mt-2 flex items-center justify-center gap-3" aria-label={L({ hi: "UPI ऐप", en: "UPI apps" })}>
            {UPI_LOGOS.map((l) => (
              <li key={l.name} className="flex h-10 w-[76px] items-center justify-center rounded-xl border border-[#DCE4ED] bg-white">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={l.src} alt={l.name} className="h-5 w-auto max-w-[56px] object-contain" />
              </li>
            ))}
          </ul>
          {/* Same phone? You cannot scan your own screen: save the picture and pick it in the UPI app. */}
          <a href={info.qrUrl} download="school-payment-qr" className="mt-3 inline-flex min-h-[44px] items-center text-[14px] font-medium leading-5 text-[#0D2A5E]">
            {L({ hi: "इसी फ़ोन में हैं? QR सेव करें", en: "On this phone? Save the QR" })}
          </a>
        </div>
        <button type="button" onClick={() => amountOk && setStep("utr")} disabled={!amountOk} className={clsx(button, "mt-4")}>
          {amountOk ? L({ hi: `${rupees(amount)} भर दिए`, en: `I have paid ${rupees(amount)}` }) : L({ hi: "रकम चुनें", en: "Choose an amount" })}
        </button>
      </div>

      {/* What the button really does, folded away like Study's "How Pomodoro works": not a payment gateway,
          and the receipt comes from the school. */}
      <details className="group border-t border-[#DCE4ED]">
        <summary className="flex min-h-[44px] cursor-pointer list-none items-center gap-2 text-[13px] font-medium text-ink-600 [&::-webkit-details-marker]:hidden">
          <Info className="h-4 w-4" aria-hidden />
          <span className="flex-1">{L({ hi: "आगे क्या होगा", en: "What happens next" })}</span>
          <ChevronDown className="h-4 w-4 transition-transform group-open:rotate-180 motion-reduce:transition-none" aria-hidden />
        </summary>
        <p className="pb-3 text-[13px] leading-6 text-ink-600">
          {L({
            hi: "QR को किसी भी UPI ऐप से स्कैन करके दिखाई गई रकम भरें। फिर यहाँ आकर UTR नंबर लिखें, स्कूल बैंक से मिलान करके रसीद बनाएगा।",
            en: "Scan the QR with any UPI app and pay the amount shown. Then come here and enter the UTR number; the school checks it with the bank and makes the receipt.",
          })}
        </p>
      </details>
    </div>
  );
}
