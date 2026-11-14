"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import clsx from "clsx";
import { Check, Share2 } from "lucide-react";
import { useApi } from "@/lib/api";
import { useParent } from "@/lib/parent";
import { useL, useT } from "@/lib/i18n";
import { dayMonth, fullDate, rupees } from "@/lib/format";
import { INS_TEXT, INS_TONE, insState, type Fees, type Instalment, type Receipt } from "@/lib/fees";
import { F, HEAD } from "@/lib/text/fees";
import { CallOffice, ErrorCard, ListSkeleton, Skeleton, Status } from "@/components/ui";
import "@/components/study.css";

/** Where "Pay" goes. */
const PAY = "/fees/pay/";

const CLAIM_TONE = { pending: "wait", verified: "ok", rejected: "bad" } as const;

/** "MTNA/2026-27/01409" → "01409": the part a parent reads out at the office. */
const shortNo = (no: string) => no.split("/").pop() || no;

/** "Today", "Yesterday", "4 days ago", "3 weeks ago", "2 months ago": how long ago a payment was made. */
function ago(iso: string, lang: string) {
  const d = -daysTo(iso.slice(0, 10));
  const hi = lang === "hi";
  if (d <= 0) return hi ? "आज" : "Today";
  if (d === 1) return hi ? "कल" : "Yesterday";
  if (d < 7) return hi ? `${d} दिन पहले` : `${d} days ago`;
  if (d < 30) {
    const w = Math.floor(d / 7);
    return hi ? `${w} हफ़्ते पहले` : w === 1 ? "1 week ago" : `${w} weeks ago`;
  }
  if (d < 365) {
    const m = Math.floor(d / 30);
    return hi ? `${m} महीने पहले` : m === 1 ? "1 month ago" : `${m} months ago`;
  }
  const y = Math.floor(d / 365);
  return hi ? `${y} साल पहले` : y === 1 ? "1 year ago" : `${y} years ago`;
}

/** Whole days from today to an ISO date (negative once it has passed). */
function daysTo(iso: string) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.round((new Date(iso + "T00:00:00").getTime() - today.getTime()) / 86_400_000);
}

/**
 * Fees tab as a bill: what is due now is one card (the amount on the Home tiles' soft blue with the
 * school's fees picture, then the fee heads, a dashed line, the total and Pay inside the card, not in a
 * floating bar). Below: later bills, then paid ones with their receipt. Each row opens Fee Detail.
 * The measures are written out above the layout.
 */
export default function FeesPage() {
  const { child } = useParent();
  const L = useL();
  const { lang } = useT();
  const { data, error, reload } = useApi<Fees>(child ? `/fees?student=${child.id}` : null);

  if (!data) {
    if (error && error.status !== 401) return <ErrorCard offline={error.status === 0} onRetry={reload} />;
    return (
      <div className="space-y-3">
        <Skeleton className="h-[300px] w-full rounded-[10px]" />
        <ListSkeleton rows={3} />
      </div>
    );
  }

  // Pending UPI payments stay on top until the school checks them; checked ones show for a while below.
  const claims = data.claims.slice(0, 10);
  const named = new Set(data.available ? data.instalments.map((i) => i.name) : []);
  const paidBy = (name: string) => data.receipts.filter((r) => r.instalments.split(/\s*,\s*/).includes(name)).sort((a, b) => b.date.localeCompare(a.date))[0];
  // Receipts that name no instalment (e.g. a lump sum) have no row to live on, so they get their own list.
  const loose = data.receipts.filter((r) => !r.instalments.split(/\s*,\s*/).some((n) => named.has(n)));
  const headName = (h: { key: string; name?: string }) => (HEAD[h.key] ? L(HEAD[h.key]) : h.name || h.key.replace(/_fee$/, "").replace(/_/g, " "));

  async function share(r: Receipt) {
    const text = `${child?.name} · ${L(F.receiptNo)} ${r.receiptNo}\n${dayMonth(r.date, lang)} · ${rupees(r.amount)} (${r.mode})`;
    try {
      if (navigator.share) await navigator.share({ text });
      else await navigator.clipboard.writeText(text);
    } catch {
      /* user closed the share sheet */
    }
  }

  const receiptList = (list: Receipt[]) => (
    <ul className="divide-y divide-[#E6ECF3] overflow-hidden rounded-[10px] border border-[#DCE4ED] bg-white">
      {list.map((r) => (
        <li key={r.id}>
          <button onClick={() => share(r)} className="flex min-h-[72px] w-full items-center gap-4 px-4 py-3 text-left active:bg-[#F1F5F9]">
            {/* The user's layout (2026-11-14): receipt and instalment as the heading, date and mode under it;
                the amount in the top right corner, share in the bottom right. */}
            <span className="min-w-0 flex-1">
              <span className="tnum block truncate text-[16px] font-medium leading-6 text-ink-900">
                {L(F.receiptNo)} {shortNo(r.receiptNo)}
                {r.instalments ? ` · ${r.instalments}` : ""}
              </span>
              <span className="mt-1 block truncate text-[14px] leading-5 text-ink-500">
                {fullDate(r.date, lang)} · {r.mode}
              </span>
            </span>
            <span className="flex shrink-0 flex-col items-end justify-between gap-1 self-stretch">
              <span className="tnum text-[16px] font-medium leading-6 text-ink-900">{rupees(r.amount)}</span>
              <Share2 className="h-5 w-5 text-[#0D2A5E]" aria-label={L(F.share)} />
            </span>
          </button>
        </li>
      ))}
    </ul>
  );

  const heading = (text: string) => <h2 className="text-[20px] font-semibold leading-7 text-ink-900">{text}</h2>;

  if (!data.available) {
    return (
      <div className="animate-rise space-y-4">
        <section className="space-y-4 rounded-[10px] border border-[#DCE4ED] bg-white p-4">
          <p className="text-[16px] leading-6 text-ink-700">{L(F.notAvailable)}</p>
          <CallOffice phone={data.pay.officePhone} className="w-full" />
        </section>
        {loose.length > 0 && receiptList(loose)}
      </div>
    );
  }

  const { session, instalments } = data;
  const rows = instalments.map((i, k) => ({ i, k, st: insState(i) }));
  const unpaid = rows.filter((r) => r.st !== "paid");
  const overdue = unpaid.filter((r) => r.i.overdue);
  // The bill is what is late if anything is, else the next instalment; the rest wait below it.
  const owing = overdue.length ? overdue : unpaid.slice(0, 1);
  const later = unpaid.filter((r) => !owing.includes(r));
  const paid = rows.filter((r) => r.st === "paid").reverse();
  const toPay = (i: Instalment) => i.outstanding + (i.overdue ? i.fine : 0);
  const owe = owing.reduce((s, { i }) => s + toPay(i), 0);
  const first = owing[0];

  // Fee heads of everything on the bill, added up by head.
  const heads = new Map<string, { label: string; amount: number }>();
  let already = 0;
  let fine = 0;
  for (const { i } of owing) {
    if (i.heads?.length) for (const h of i.heads) heads.set(h.key, { label: headName(h), amount: (heads.get(h.key)?.amount || 0) + h.amount });
    else heads.set(i.name, { label: `${i.name} ${L({ hi: "फ़ीस", en: "fee" })}`, amount: i.amount });
    already += i.paid;
    if (i.overdue) fine += i.fine;
  }
  const days = first ? daysTo(first.i.due) : 0;

  /*
   * The page's measures (2026-11-14; every number is on the 4/8 grid):
   *   type      12/16 caption · 14/20 supporting · 16/24 body and card titles · 20/28 section titles · 32/40 the amount
   *   weights   400 text · 500 amounts · 600 titles, the amount, buttons
   *   space     8 between lines of one group · 12 between the parts of a card and between the cards of a
   *             list · 16 at a card's sides · 12 title to its card · 32 between sections (tightened after the
   *             user found the first cards too tall and airy); a paid instalment is one line
   *   cards     16 corners, hairline border; inner space (16) never more than the space around a card
   *
   * The structure follows a fees screen the user showed (2026-11-14): the year in one summary card (what
   * is left, how much of the year is paid), then every instalment with its status, its amount and its own
   * Pay button. After two tries the user still found full cards too tall, so each instalment is two lines
   * and what it is made of opens from the row (Fee Detail). Only the first unpaid one's Pay is filled.
   */
  const card = "overflow-hidden rounded-[10px] border border-[#DCE4ED] bg-white";
  const money = "tnum shrink-0 text-[16px] font-medium leading-6 text-ink-900";
  const support = "tnum block truncate text-[14px] leading-5 text-ink-500";
  const band = { background: "linear-gradient(160deg,#F4F7FF 0%,#DCE5FF 100%)" };
  const left = data.options.full;
  const pct = session.total > 0 ? Math.min(100, Math.round((session.paid / session.total) * 100)) : 0;
  const firstUnpaid = unpaid[0]?.k;

  return (
    <div className="study space-y-6 pb-4 pt-1">
      {/* The year: what is left to pay, how far along, total and paid. */}
      <section className={clsx(card, "study-in")}>
        {/* One line: the picture, what it is, and the amount on the right. */}
        <div className="flex items-center gap-3 px-4 py-3" style={band}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/img/fee-receipt.png" alt="" className="h-11 w-11 shrink-0 object-contain" />
          {/* Always "Total due"; when nothing is left it simply reads ₹0 (the user removed the "All paid" words). */}
          <p className={clsx("min-w-0 flex-1 text-[16px] font-medium leading-6", left > 0 ? "text-[#A32F35]" : "text-ink-700")}>{L({ hi: "कुल बाकी", en: "Total due" })}</p>
          <p className={clsx("tnum shrink-0 text-[28px] font-semibold leading-9 tracking-tight", left > 0 ? "text-[#A32F35]" : "text-ink-900")}>{rupees(left)}</p>
        </div>
        <p className="tnum px-4 pb-2 pt-3 text-[14px] leading-5 text-ink-600">
          {L({ hi: `${rupees(session.total)} में से ${rupees(session.paid)} जमा`, en: `${rupees(session.paid)} of ${rupees(session.total)} paid` })}
        </p>
        <PaidBar pct={pct} childId={child?.id || ""} label={L({ hi: "जमा हुआ हिस्सा", en: "Share paid" })} />
      </section>

      {claims.length > 0 && (
        <section className="study-in" style={{ animationDelay: "70ms" }}>
          {heading(L({ hi: "भेजे हुए भुगतान", en: "Payments sent" }))}
          <ul className={clsx(card, "mt-3 divide-y divide-[#E6ECF3]")}>
            {claims.map((c) => (
              <li key={c.id} className="px-4 py-4">
                <div className="flex items-center justify-between gap-2">
                  <span className={money}>{rupees(c.amount)}</span>
                  <Status tone={CLAIM_TONE[c.status]}>{L(c.status === "pending" ? F.claimPending : c.status === "verified" ? F.claimVerified : F.claimRejected)}</Status>
                </div>
                <p className={clsx(support, "mt-1")}>
                  UTR {c.utr} · {dayMonth(c.paidOn, lang)}
                </p>
                {c.status === "rejected" && c.rejectReason && <p className="mt-2 text-[14px] leading-5 text-ink-700">{c.rejectReason}</p>}
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Every instalment, unpaid ones first: its own card, its own Pay. */}
      <section className="study-in" style={{ animationDelay: "140ms" }}>
        {heading(L({ hi: "किस्तें", en: "Instalments" }))}
        <ul className="mt-3 space-y-3">
          {[...unpaid, ...paid].map(({ i, k, st }) => {
            const list = i.heads?.length ? i.heads.map((h) => ({ label: headName(h), amount: h.amount })) : [{ label: `${i.name} ${L({ hi: "फ़ीस", en: "fee" })}`, amount: i.amount }];
            const lateFine = i.overdue ? i.fine : 0;
            const r = st === "paid" ? paidBy(i.name) : undefined;
            const on = r?.date || i.paidOn;
            // A paid instalment is settled: one line, opening its details.
            if (st === "paid")
              return (
                <li key={i.name} className={card}>
                  <Link href={`/fees/detail/?i=${k}`} className="flex items-center gap-3 px-4 py-3 active:bg-[#F1F5F9]">
                    {/* Settled (the user's layout, 2026-11-14): name over the amount on the left; the "Paid"
                        label with a green dot on its right, over how long ago, on the right. */}
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[16px] font-medium leading-6 text-ink-900">{i.name}</span>
                      <span className="tnum mt-1 block text-[14px] font-medium leading-5 text-ink-700">{rupees(i.amount)}</span>
                    </span>
                    {/* Pinned to the card's corners: "Paid" at the top right, how long ago at the bottom right. */}
                    <span className="flex shrink-0 flex-col items-end justify-between gap-2 self-stretch">
                      <span className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border border-ink-900 bg-transparent py-px pl-2.5 pr-2 text-[12px] font-semibold leading-5 text-ink-900">
                        {L(F.insPaid)}
                        <span className="h-2 w-2 rounded-full bg-[#21A04F]" aria-hidden />
                      </span>
                      {on && <span className="tnum text-[12px] leading-4 text-ink-500">{ago(on, lang)}</span>}
                    </span>
                  </Link>
                </li>
              );
            return (
              <li key={i.name} className={card}>
                {/* One line, evenly spaced: name on the left, status in the middle, last date on the right; the same 16 all round. */}
                <div className="flex items-center justify-between gap-3 p-4">
                  <h3 className="min-w-0 truncate text-[16px] font-semibold leading-6 text-ink-900">{i.name}</h3>
                  {st === "overdue" ? (
                    /* Same outlined look as "Paid", with a red dot instead of the green one. */
                    <span className="inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border border-ink-900 bg-transparent py-px pl-2.5 pr-2 text-[12px] font-semibold leading-5 text-ink-900">
                      {L(INS_TEXT[st])}
                      <span className="h-2 w-2 rounded-full bg-[#D93636]" aria-hidden />
                    </span>
                  ) : (
                    <Status tone={INS_TONE[st]}>{L(INS_TEXT[st])}</Status>
                  )}
                  <p className={clsx("tnum shrink-0 whitespace-nowrap text-right text-[12px] leading-4", st === "overdue" ? "text-[#A32F35]" : "text-ink-500")}>
                    {L({ hi: `आख़िरी तारीख ${fullDate(i.due, lang)}`, en: `Last date ${fullDate(i.due, lang)}` })}
                  </p>
                </div>

                {/* What it is made of, then what is paid and what is left: names left, amounts in one column. */}
                <dl className="tnum space-y-2 border-t border-[#E6ECF3] px-4 pt-3 text-[14px] leading-5">
                  {list.map((h) => (
                    <div key={h.label} className="flex justify-between gap-4">
                      <dt className="text-ink-600">{h.amount < 0 ? `${h.label} (${L({ hi: "छूट", en: "discount" })})` : h.label}</dt>
                      <dd className={h.amount < 0 ? "text-[#21613F]" : "text-ink-900"}>{h.amount < 0 ? `− ${rupees(-h.amount)}` : rupees(h.amount)}</dd>
                    </div>
                  ))}
                  {lateFine > 0 && (
                    <div className="flex justify-between gap-4">
                      <dt className="text-ink-600">{L(F.fine)}</dt>
                      <dd className="text-[#A32F35]">{rupees(lateFine)}</dd>
                    </div>
                  )}
                  {i.paid > 0 && (
                    <div className="flex justify-between gap-4">
                      <dt className="text-ink-600">{L({ hi: "पहले जमा", en: "Already paid" })}</dt>
                      <dd className="text-[#21613F]">− {rupees(i.paid)}</dd>
                    </div>
                  )}
                </dl>
                <div className="tnum mx-4 mt-3 flex justify-between gap-4 border-t border-dashed border-[#C9D3E0] pt-3 text-[16px] font-semibold leading-6 text-ink-900">
                  <span>{L({ hi: "बाकी", en: "Due" })}</span>
                  <span>{rupees(toPay(i))}</span>
                </div>

                <div className="flex items-center gap-2 px-4 pb-4 pt-3">
                  {data.pay.qrUrl && (
                    <Link
                      href={`${PAY}?i=${k}`}
                      className={clsx(
                        "flex h-11 flex-1 items-center justify-center rounded-xl text-[16px] font-semibold leading-6",
                        k === firstUnpaid ? "bg-[#0D2A5E] text-white active:bg-[#0A2149]" : "border border-[#0D2A5E] bg-white text-[#0D2A5E] active:bg-[#EAF0F6]"
                      )}
                    >
                      {L({ hi: `${rupees(toPay(i))} भरें`, en: `Pay ${rupees(toPay(i))}` })}
                    </Link>
                  )}
                  <Link href={`/fees/detail/?i=${k}`} className={clsx("flex h-11 items-center justify-center rounded-xl text-[14px] font-semibold leading-5 text-[#0D2A5E] active:bg-[#EAF0F6]", data.pay.qrUrl ? "px-4" : "flex-1 border border-[#DCE4ED]")}>
                    {L({ hi: "ब्योरा", en: "Details" })}
                  </Link>
                </div>
              </li>
            );
          })}
        </ul>
        {!data.pay.qrUrl && unpaid.length > 0 && (
          <p className="mt-3 text-[14px] leading-5 text-ink-600">
            {L(F.noOnline)}{" "}
            {data.pay.officePhone && (
              <a href={`tel:${data.pay.officePhone.replace(/\s/g, "")}`} className="tnum font-semibold text-[#0D2A5E]">
                {data.pay.officePhone}
              </a>
            )}
          </p>
        )}
      </section>

      {/* Payment history: every receipt, newest first; a tap shares it. */}
      {data.receipts.length > 0 && (
        <section className="study-in" style={{ animationDelay: "210ms" }}>
          {heading(L({ hi: "भुगतान का इतिहास", en: "Payment history" }))}
          <div className="mt-3">{receiptList(data.receipts)}</div>
        </section>
      )}
    </div>
  );
}

/**
 * The share of the year paid, as a bar along the card's bottom edge, its percent written at the bar's end. It grows from the share
 * last seen on this phone to today's, so after a payment the parent watches it move up (the user's ask,
 * 2026-11-14); the first time it grows from 0. One ease-out, off for "Reduce motion".
 */
function PaidBar({ pct, childId, label }: { pct: number; childId: string; label: string }) {
  const key = `pa:fees:paid-pct:${childId}`;
  const [shown, setShown] = useState<number | null>(null);
  useEffect(() => {
    let from = 0;
    try {
      from = Math.min(pct, Number(localStorage.getItem(key)) || 0);
      localStorage.setItem(key, String(pct));
    } catch {
      /* storage blocked: grow from 0 */
    }
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setShown(pct);
      return;
    }
    setShown(from);
    // Two frames so the starting width is drawn before it moves.
    let r2 = 0;
    const r1 = requestAnimationFrame(() => (r2 = requestAnimationFrame(() => setShown(pct))));
    return () => {
      cancelAnimationFrame(r1);
      cancelAnimationFrame(r2);
    };
  }, [pct, key]);
  const w = shown ?? 0;
  const move = "1.2s cubic-bezier(.16,1,.3,1)";
  // The percent sits inside the green part, at its end; while that part is too short to hold it, just after it.
  const inside = w >= 14;
  return (
    <div className="relative h-5 bg-[#EAF0F6]" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={pct} aria-label={label}>
      <div className="h-full bg-[#21613F]" style={{ width: `${w}%`, transition: `width ${move}` }} />
      <span
        className={clsx("tnum absolute top-0 px-2 text-[12px] font-semibold leading-5", inside ? "text-white" : "text-[#21613F]")}
        style={{ left: `${w}%`, transform: inside ? "translateX(-100%)" : "none", transition: `left ${move}` }}
        aria-hidden
      >
        {pct}%
      </span>
    </div>
  );
}
