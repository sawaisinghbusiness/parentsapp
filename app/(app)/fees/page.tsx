"use client";

import { useState } from "react";
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

const CLAIM_DOT = { pending: "bg-marigold-500", verified: "bg-jade-600", rejected: "bg-rose-500" } as const;

export default function FeesPage() {
  const { child } = useParent();
  const L = useL();
  const { lang } = useT();
  const { data, error, reload } = useApi<Fees>(child ? `/fees?student=${child.id}` : null);
  const [paying, setPaying] = useState(false);
  const [open, setOpen] = useState<string | null>(null);

  if (!data) {
    if (error && error.status !== 401) return <ErrorCard offline={error.status === 0} onRetry={reload} />;
    return (
      <>
        {[140, 180, 120].map((h, i) => (
          <div key={i} className="card space-y-3 p-4">
            <Skeleton className="h-4 w-28" />
            <div style={{ height: h - 48 }} className="skeleton" />
          </div>
        ))}
      </>
    );
  }

  const label = (key: string) => (HEAD[key] ? L(HEAD[key]) : key.replace(/_fee$/, "").replace(/_/g, " "));
  const claimsOpen = data.claims.slice(0, 5);

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
    <div className="animate-rise space-y-6 pb-2">
      {/* 1. What to pay now, and the one action on this screen */}
      <section className="px-1 pt-1">
        {!data.available ? (
          <>
            <p className="text-ink-700">{L(F.notAvailable)}</p>
            <CallOffice phone={data.pay.officePhone} className="mt-3 w-full" />
          </>
        ) : (
          <>
            {data.dueNow > 0 ? (
              <>
                <p className="text-[15px] font-medium text-ink-500">{L(F.dueNow)}</p>
                <p className="tnum mt-1 text-[34px] font-semibold leading-none text-ink-900">{rupees(data.dueNow + data.fine)}</p>
                {data.fine > 0 && (
                  <p className="tnum mt-2 text-[15px] text-ink-600">
                    {rupees(data.dueNow)} {L({ hi: "फ़ीस", en: "fee" })} + {rupees(data.fine)} {L(F.fine)}
                  </p>
                )}
              </>
            ) : (
              <p className="flex items-center gap-2.5 text-[22px] font-semibold text-ink-900">
                <span className="dot h-3 w-3 bg-jade-600" aria-hidden />
                {L(F.allPaid)}
              </p>
            )}

            {data.session.balance > 0 &&
              (data.pay.upiId ? (
                <button onClick={() => setPaying(true)} className="btn-primary mt-5 w-full rounded-full">
                  {L(F.payUpi)}
                </button>
              ) : (
                <div className="mt-4 space-y-3">
                  <p className="text-sm text-ink-600">{L(F.noOnline)}</p>
                  <CallOffice phone={data.pay.officePhone} className="w-full" />
                </div>
              ))}
          </>
        )}
      </section>

      {/* The year in three plain lines, not three tiles */}
      {data.available && (
        <section>
          <h2 className="px-1 pb-2 text-[15px] font-medium text-ink-500">{L({ hi: "इस साल का हिसाब", en: "This year" })}</h2>
          <dl className="card tnum divide-y divide-ink-100 px-4">
            {[
              [L(F.yearFee), data.session.total, ""],
              [L(F.paid), data.session.paid, ""],
              [L(F.left), data.session.balance, "font-semibold"],
            ].map(([k, v, w]) => (
              <div key={k as string} className="flex min-h-[52px] items-center justify-between">
                <dt className="text-[16px] text-ink-600">{k as string}</dt>
                <dd className={clsx("text-[17px] text-ink-900", w as string)}>{rupees(v as number)}</dd>
              </div>
            ))}
          </dl>
        </section>
      )}

      {/* 2. Online payments the school is checking (and recent outcomes) */}
      {claimsOpen.length > 0 && (
        <section>
          <h2 className="px-1 pb-2 text-[15px] font-medium text-ink-500">{L(F.claims)}</h2>
          <div className="card px-4 py-1">
          <ul className="divide-y divide-ink-100">
            {claimsOpen.map((c) => (
              <li key={c.id} className="py-3 first:pt-2 last:pb-0">
                <div className="flex items-baseline justify-between gap-3">
                  <span className="flex items-center gap-2 font-medium text-ink-900">
                    <span className={clsx("dot", CLAIM_DOT[c.status])} aria-hidden />
                    {L(c.status === "pending" ? F.claimPending : c.status === "verified" ? F.claimVerified : F.claimRejected)}
                  </span>
                  <span className="tnum font-bold text-ink-900">{rupees(c.amount)}</span>
                </div>
                <p className="tnum mt-0.5 text-sm text-ink-500">
                  UTR {c.utr} · {dayMonth(c.paidOn, lang)}
                </p>
                {c.status === "rejected" && c.rejectReason && <p className="mt-1 text-sm text-ink-700">{c.rejectReason}</p>}
              </li>
            ))}
          </ul>
          </div>
        </section>
      )}

      {/* 3. Instalments */}
      {data.available && data.instalments.length > 0 && (
        <section>
          <h2 className="px-1 pb-2 text-[15px] font-medium text-ink-500">{L(F.instalments)}</h2>
          <div className="card px-4 py-1">
          <ul className="divide-y divide-ink-100">
            {data.instalments.map((i) => {
              const state = i.outstanding <= 0 ? "paid" : i.overdue ? "overdue" : i.paid > 0 ? "part" : "upcoming";
              return (
                <li key={i.name} className="flex items-start justify-between gap-3 py-3 first:pt-2 last:pb-0">
                  <div className="min-w-0">
                    <p className="font-semibold text-ink-900">{i.name}</p>
                    <p className="text-sm text-ink-500">
                      {L(F.dueOn)}: {dayMonth(i.due, lang)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="tnum font-bold text-ink-900">{rupees(state === "paid" ? i.amount : i.outstanding)}</p>
                    <p className="flex items-center justify-end gap-1.5 text-sm text-ink-600">
                      <span className={clsx("dot", state === "paid" ? "bg-jade-600" : state === "overdue" ? "bg-rose-500" : state === "part" ? "bg-marigold-500" : "bg-ink-300")} aria-hidden />
                      {L(state === "paid" ? F.insPaid : state === "overdue" ? F.insOverdue : state === "part" ? F.insPart : F.insUpcoming)}
                    </p>
                    {i.fine > 0 && (
                      <p className="tnum text-xs text-ink-500">
                        + {L(F.fine)} {rupees(i.fine)}
                      </p>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
          </div>
        </section>
      )}

      {/* 4. Receipts */}
      <section>
        <h2 className="px-1 pb-2 text-[15px] font-medium text-ink-500">{L(F.receipts)}</h2>
        <div className="card px-4 py-1">
        {data.receipts.length === 0 ? (
          <p className="py-3 text-ink-600">{L(F.noReceipts)}</p>
        ) : (
          <ul className="divide-y divide-ink-100">
            {data.receipts.map((r) => {
              const isOpen = open === r.id;
              return (
                <li key={r.id}>
                  <button onClick={() => setOpen(isOpen ? null : r.id)} aria-expanded={isOpen} className="flex min-h-[60px] w-full items-center gap-3 py-2.5 text-left">
                    <span className="min-w-0 flex-1">
                      <span className="tnum block font-semibold text-ink-900">{r.receiptNo}</span>
                      <span className="block text-sm text-ink-500">
                        {dayMonth(r.date, lang)} · {r.mode}
                      </span>
                    </span>
                    <span className="tnum font-bold text-ink-900">{rupees(r.amount)}</span>
                    <ChevronDown className={clsx("h-5 w-5 shrink-0 text-ink-400 transition", isOpen && "rotate-180")} aria-hidden />
                  </button>
                  {isOpen && (
                    <div className="mb-3 animate-fadeIn rounded-xl bg-ink-50 px-3 py-2">
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
      </section>

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
