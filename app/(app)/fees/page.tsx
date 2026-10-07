"use client";

import { useEffect, useState } from "react";
import clsx from "clsx";
import { ChevronDown, Share2 } from "lucide-react";
import { useApi } from "@/lib/api";
import { useParent } from "@/lib/parent";
import { useL, useT } from "@/lib/i18n";
import { dayMonth, rupees } from "@/lib/format";
import { F, HEAD } from "@/lib/text/fees";
import { CallOffice, ErrorCard, Skeleton } from "@/components/ui";
import { PaySheet } from "@/components/fees/PaySheet";

interface Receipt {
  id: string;
  receiptNo: string;
  amount: number;
  mode: string;
  date: string;
  instalments: string;
  heads: { key: string; amount: number }[];
  ref: string | null;
}
interface Claim {
  id: string;
  amount: number;
  utr: string;
  paidOn: string;
  status: "pending" | "verified" | "rejected";
  rejectReason: string | null;
}
type Fees =
  | { asOf: string; available: false; pay: Pay; receipts: Receipt[]; claims: Claim[] }
  | {
      asOf: string;
      available: true;
      pay: Pay;
      session: { total: number; paid: number; balance: number };
      dueNow: number;
      fine: number;
      options: { dueNow: number; full: number };
      instalments: { name: string; due: string; amount: number; paid: number; outstanding: number; overdue: boolean; fine: number }[];
      receipts: Receipt[];
      claims: Claim[];
    };
interface Pay {
  upiId: string | null;
  upiName: string;
  officePhone: string;
}

type Tab = "ins" | "rec" | "online";
const CLAIM_TONE = { pending: "text-marigold-500", verified: "text-jade-600", rejected: "text-rose-600" } as const;

/**
 * Fees: what to pay now on the sky block with its one button, the year in three numbers,
 * then instalments / receipts / online payments behind a segmented switch.
 */
export default function FeesPage() {
  const { child } = useParent();
  const L = useL();
  const { lang } = useT();
  const { data, error, reload } = useApi<Fees>(child ? `/fees?student=${child.id}` : null);
  const [paying, setPaying] = useState(false);
  const [open, setOpen] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab | null>(null);

  // Home's "Pay fees" lands here with ?pay=1: open the sheet straight away.
  const canPay = !!data && data.available && data.session.balance > 0 && !!data.pay.upiId;
  useEffect(() => {
    if (canPay && new URLSearchParams(window.location.search).get("pay") === "1") {
      setPaying(true);
      window.history.replaceState(null, "", window.location.pathname);
    }
  }, [canPay]);

  if (!data) {
    if (error && error.status !== 401) return <ErrorCard offline={error.status === 0} onRetry={reload} />;
    return (
      <>
        <div className="hero space-y-3">
          <Skeleton className="h-4 w-28 bg-white/25" />
          <Skeleton className="h-10 w-40 bg-white/25" />
          <Skeleton className="h-12 w-full bg-white/25" />
        </div>
        <Skeleton className="h-[72px] w-full rounded-2xl bg-white" />
        <Skeleton className="h-48 w-full rounded-2xl bg-white" />
      </>
    );
  }

  const label = (key: string) => (HEAD[key] ? L(HEAD[key]) : key.replace(/_fee$/, "").replace(/_/g, " "));
  const tabs: { id: Tab; text: string }[] = [
    ...(data.available && data.instalments.length > 0 ? [{ id: "ins" as Tab, text: L(F.instalments) }] : []),
    { id: "rec", text: L(F.receipts) },
    ...(data.claims.length > 0 ? [{ id: "online" as Tab, text: L({ hi: "ऑनलाइन", en: "Online" }) }] : []),
  ];
  // A payment the school is still checking is what a parent comes back to look for: show it first.
  const fallback: Tab = data.claims.some((c) => c.status === "pending") ? "online" : tabs[0].id;
  const shown = tab && tabs.some((t) => t.id === tab) ? tab : fallback;

  async function share(r: Receipt) {
    const text = `${child?.name} · ${L(F.receiptNo)} ${r.receiptNo}\n${dayMonth(r.date, lang)} · ${rupees(r.amount)} (${r.mode})`;
    try {
      if (navigator.share) await navigator.share({ text });
      else await navigator.clipboard.writeText(text);
    } catch {
      /* user closed the share sheet */
    }
  }

  return (
    <div className="animate-rise space-y-2.5 pb-2">
      {/* What to pay now, and the one action on this screen */}
      {!data.available ? (
        <section className="card p-4">
          <p className="text-ink-700">{L(F.notAvailable)}</p>
          <CallOffice phone={data.pay.officePhone} className="mt-3 w-full" />
        </section>
      ) : (
        <section className="hero">
          {data.dueNow > 0 ? (
            <>
              <p className="hero-label">{L(F.dueNow)}</p>
              <p className="hero-big">{rupees(data.dueNow + data.fine)}</p>
              {data.fine > 0 && (
                <p className="hero-sub tnum">
                  {rupees(data.dueNow)} {L({ hi: "फ़ीस", en: "fee" })} + {rupees(data.fine)} {L(F.fine)}
                </p>
              )}
            </>
          ) : (
            <>
              <p className="hero-label">{L({ hi: "अभी का बकाया", en: "Due now" })}</p>
              <p className="hero-big">{L(F.allPaid)}</p>
            </>
          )}
          {data.session.balance > 0 &&
            (data.pay.upiId ? (
              <button onClick={() => setPaying(true)} className="btn-light mt-4 w-full">
                {L(F.payUpi)}
              </button>
            ) : (
              <p className="hero-sub mt-3">
                {L(F.noOnline)} {data.pay.officePhone && <a href={`tel:${data.pay.officePhone.replace(/\s/g, "")}`} className="tnum font-semibold underline">{data.pay.officePhone}</a>}
              </p>
            ))}
        </section>
      )}

      {/* The year in three numbers */}
      {data.available && (
        <dl className="card tnum grid grid-cols-3 divide-x divide-ink-100">
          {[
            [L(F.yearFee), data.session.total, "text-ink-900"],
            [L(F.paid), data.session.paid, "text-jade-600"],
            [L(F.left), data.session.balance, "text-ink-900"],
          ].map(([k, v, tone]) => (
            <div key={k as string} className="px-3.5 py-3">
              <dt className="text-[13px] text-ink-500">{k as string}</dt>
              <dd className={clsx("text-[17px] font-semibold", tone as string)}>{rupees(v as number)}</dd>
            </div>
          ))}
        </dl>
      )}

      {/* Instalments / receipts / online payments */}
      {tabs.length > 1 && (
        <div className="seg !mt-4" role="tablist">
          {tabs.map((t) => (
            <button key={t.id} role="tab" aria-selected={shown === t.id} onClick={() => setTab(t.id)}>
              {t.text}
            </button>
          ))}
        </div>
      )}

      {shown === "ins" && data.available && (
        <ul className="card divide-y divide-ink-100">
          {data.instalments.map((i) => {
            const state = i.outstanding <= 0 ? "paid" : i.overdue ? "overdue" : i.paid > 0 ? "part" : "upcoming";
            return (
              <li key={i.name} className="flex items-center justify-between gap-3 px-4 py-3">
                <div className="min-w-0">
                  <p className="font-medium text-ink-900">{i.name}</p>
                  <p className="text-[14px] text-ink-500">{dayMonth(i.due, lang)}</p>
                </div>
                <div className="text-right">
                  <p className="tnum font-semibold text-ink-900">{rupees(state === "paid" ? i.amount : i.outstanding)}</p>
                  <p className={clsx("text-[14px]", state === "paid" ? "text-jade-600" : state === "overdue" ? "text-rose-600" : state === "part" ? "text-marigold-500" : "text-ink-500")}>
                    {L(state === "paid" ? F.insPaid : state === "overdue" ? F.insOverdue : state === "part" ? F.insPart : F.insUpcoming)}
                    {i.fine > 0 && <span className="tnum"> · {L(F.fine)} {rupees(i.fine)}</span>}
                  </p>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {shown === "rec" && (
        <div className="card">
          {data.receipts.length === 0 ? (
            <p className="px-4 py-3 text-ink-600">{L(F.noReceipts)}</p>
          ) : (
            <ul className="divide-y divide-ink-100">
              {data.receipts.map((r) => {
                const isOpen = open === r.id;
                return (
                  <li key={r.id}>
                    <button onClick={() => setOpen(isOpen ? null : r.id)} aria-expanded={isOpen} className="flex min-h-[60px] w-full items-center gap-3 px-4 py-2.5 text-left">
                      <span className="min-w-0 flex-1">
                        <span className="tnum block font-medium text-ink-900">{r.receiptNo}</span>
                        <span className="block text-[14px] text-ink-500">
                          {dayMonth(r.date, lang)} · {r.mode}
                        </span>
                      </span>
                      <span className="tnum font-semibold text-ink-900">{rupees(r.amount)}</span>
                      <ChevronDown className={clsx("h-5 w-5 shrink-0 text-ink-400 transition", isOpen && "rotate-180")} aria-hidden />
                    </button>
                    {isOpen && (
                      <div className="mx-4 mb-3 animate-fadeIn rounded-xl bg-ink-50 px-3 py-2">
                        <dl className="tnum divide-y divide-ink-200/70 text-sm">
                          {r.heads.map((h) => (
                            <div key={h.key} className="flex justify-between py-1.5">
                              <dt className="text-ink-600">{label(h.key)}</dt>
                              <dd className="font-medium text-ink-900">{rupees(h.amount)}</dd>
                            </div>
                          ))}
                        </dl>
                        {(r.instalments || r.ref) && (
                          <p className="mt-1 text-xs text-ink-500">
                            {r.instalments}
                            {r.ref ? ` · Ref ${r.ref}` : ""}
                          </p>
                        )}
                        <button onClick={() => share(r)} className="link text-sm">
                          <Share2 className="h-4 w-4" aria-hidden /> {L(F.share)}
                        </button>
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}

      {shown === "online" && (
        <ul className="card divide-y divide-ink-100">
          {data.claims.slice(0, 10).map((c) => (
            <li key={c.id} className="px-4 py-3">
              <div className="flex items-baseline justify-between gap-3">
                <span className={clsx("font-medium", CLAIM_TONE[c.status])}>{L(c.status === "pending" ? F.claimPending : c.status === "verified" ? F.claimVerified : F.claimRejected)}</span>
                <span className="tnum font-semibold text-ink-900">{rupees(c.amount)}</span>
              </div>
              <p className="tnum mt-0.5 text-[14px] text-ink-500">
                UTR {c.utr} · {dayMonth(c.paidOn, lang)}
              </p>
              {c.status === "rejected" && c.rejectReason && <p className="mt-1 text-[14px] text-ink-700">{c.rejectReason}</p>}
            </li>
          ))}
        </ul>
      )}

      {paying && data.available && data.pay.upiId && child && (
        <PaySheet
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
          }}
          onClose={() => setPaying(false)}
          onSent={reload}
        />
      )}
    </div>
  );
}
