"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import clsx from "clsx";
import { CalendarDays, ChevronDown, Share2 } from "lucide-react";
import { useApi } from "@/lib/api";
import { useParent } from "@/lib/parent";
import { useL, useT } from "@/lib/i18n";
import { dayMonth, fullDate, rupees } from "@/lib/format";
import { INS_TEXT, INS_TONE, insState, type Fees, type Receipt } from "@/lib/fees";
import { F, HEAD } from "@/lib/text/fees";
import { CallOffice, ErrorCard, ListSkeleton, Skeleton, Status } from "@/components/ui";
import { PaySheet } from "@/components/fees/PaySheet";

const CLAIM_TONE = { pending: "wait", verified: "ok", rejected: "bad" } as const;

/** Fees tab: the session in three numbers, one Pay button, each instalment (tap for its breakdown), then receipts. */
export default function FeesPage() {
  const { child } = useParent();
  const L = useL();
  const { lang } = useT();
  const { data, error, reload } = useApi<Fees>(child ? `/fees?student=${child.id}` : null);
  const [paying, setPaying] = useState(false);
  const [open, setOpen] = useState<string | null>(null);

  // Home's "Pay now" lands here with ?pay=1: open the sheet straight away.
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
      <div className="space-y-3">
        <Skeleton className="h-[68px] w-full rounded-2xl" />
        <ListSkeleton rows={4} />
      </div>
    );
  }

  const label = (key: string) => (HEAD[key] ? L(HEAD[key]) : key.replace(/_fee$/, "").replace(/_/g, " "));

  async function share(r: Receipt) {
    const text = `${child?.name} · ${L(F.receiptNo)} ${r.receiptNo}\n${dayMonth(r.date, lang)} · ${rupees(r.amount)} (${r.mode})`;
    try {
      if (navigator.share) await navigator.share({ text });
      else await navigator.clipboard.writeText(text);
    } catch {
      /* user closed the share sheet */
    }
  }

  const payNow = data.available ? (data.dueNow > 0 ? data.options.dueNow : data.options.full) : 0;

  return (
    <div className="animate-rise space-y-3.5">
      {!data.available ? (
        <section className="row-card space-y-3 p-4">
          <p className="text-ink-700">{L(F.notAvailable)}</p>
          <CallOffice phone={data.pay.officePhone} className="w-full" />
        </section>
      ) : (
        <>
          <dl className="tnum grid grid-cols-3 rounded-2xl bg-brand-50 px-3.5 py-3">
            {[
              [L({ hi: "सत्र की फ़ीस", en: "Session total" }), data.session.total, "text-ink-900"],
              [L(F.paid), data.session.paid, "text-jade-600"],
              [L({ hi: "बाकी", en: "Balance" }), data.session.balance, data.session.balance > 0 ? "text-rose-600" : "text-ink-900"],
            ].map(([k, v, tone]) => (
              <div key={k as string}>
                <dd className={clsx("text-[17px] font-extrabold", tone as string)}>{rupees(v as number)}</dd>
                <dt className="text-[12px] text-ink-500">{k as string}</dt>
              </div>
            ))}
          </dl>

          {data.session.balance > 0 &&
            (data.pay.upiId ? (
              <button onClick={() => setPaying(true)} className="btn-primary w-full">
                {data.dueNow > 0 ? `${L({ hi: "बकाया भरें", en: "Pay due" })} ${rupees(payNow)}` : L(F.payUpi)}
              </button>
            ) : (
              <p className="text-[14px] text-ink-500">
                {L(F.noOnline)}{" "}
                {data.pay.officePhone && (
                  <a href={`tel:${data.pay.officePhone.replace(/\s/g, "")}`} className="tnum font-semibold text-brand-600">
                    {data.pay.officePhone}
                  </a>
                )}
              </p>
            ))}

          <ul className="space-y-2">
            {data.instalments.map((i, k) => {
              const st = insState(i);
              return (
                <li key={i.name}>
                  <Link href={`/fees/detail/?i=${k}`} className="row-card">
                    <div className="flex items-center justify-between gap-2">
                      <span className="meta">
                        <span>
                          <CalendarDays aria-hidden />
                          {st === "paid" && i.paidOn ? `${L({ hi: "जमा", en: "Paid on" })} ${fullDate(i.paidOn, lang)}` : `${L({ hi: "आख़िरी तारीख", en: "Last date" })} ${fullDate(i.due, lang)}`}
                        </span>
                      </span>
                      <Status tone={INS_TONE[st]}>{L(INS_TEXT[st])}</Status>
                    </div>
                    <p className="mt-1 text-[15.5px] font-bold">{i.name}</p>
                    <p className="tnum text-[15px] font-semibold text-ink-700">
                      {rupees(st === "paid" ? i.amount : i.outstanding + (i.overdue ? i.fine : 0))}
                      {i.overdue && i.fine > 0 && <span className="text-[13px] font-normal text-ink-500"> · {L(F.fine)} {rupees(i.fine)}</span>}
                    </p>
                  </Link>
                </li>
              );
            })}
          </ul>
        </>
      )}

      {data.claims.length > 0 && (
        <section className="space-y-2 pt-1">
          <h2 className="mlabel">{L(F.claims)}</h2>
          <ul className="space-y-2">
            {data.claims.slice(0, 10).map((c) => (
              <li key={c.id} className="row-card">
                <div className="flex items-center justify-between gap-2">
                  <span className="tnum text-[15.5px] font-bold">{rupees(c.amount)}</span>
                  <Status tone={CLAIM_TONE[c.status]}>{L(c.status === "pending" ? F.claimPending : c.status === "verified" ? F.claimVerified : F.claimRejected)}</Status>
                </div>
                <p className="meta tnum mt-1">
                  <span>UTR {c.utr}</span>
                  <span>{dayMonth(c.paidOn, lang)}</span>
                </p>
                {c.status === "rejected" && c.rejectReason && <p className="mt-1 text-[14px] text-ink-700">{c.rejectReason}</p>}
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="space-y-2 pt-1">
        <h2 className="mlabel">{L(F.receipts)}</h2>
        {data.receipts.length === 0 ? (
          <p className="row-card text-[15px] text-ink-500">{L(F.noReceipts)}</p>
        ) : (
          <ul className="space-y-2">
            {data.receipts.map((r) => {
              const isOpen = open === r.id;
              return (
                <li key={r.id} className="rounded-2xl bg-ink-50">
                  <button onClick={() => setOpen(isOpen ? null : r.id)} aria-expanded={isOpen} className="flex min-h-[60px] w-full items-center gap-3 px-3.5 py-2.5 text-left">
                    <span className="min-w-0 flex-1">
                      <span className="tnum block truncate text-[15px] font-semibold">{r.receiptNo}</span>
                      <span className="block text-[13px] text-ink-500">
                        {dayMonth(r.date, lang)} · {r.mode}
                      </span>
                    </span>
                    <span className="tnum font-bold">{rupees(r.amount)}</span>
                    <ChevronDown className={clsx("h-5 w-5 shrink-0 text-ink-400 transition", isOpen && "rotate-180")} aria-hidden />
                  </button>
                  {isOpen && (
                    <div className="animate-fadeIn px-3.5 pb-2">
                      <dl className="kv tnum border-t border-ink-100 pt-1">
                        {r.heads.map((h) => (
                          <div key={h.key}>
                            <dt>{label(h.key)}</dt>
                            <dd>{rupees(h.amount)}</dd>
                          </div>
                        ))}
                      </dl>
                      {(r.instalments || r.ref) && (
                        <p className="text-[12px] text-ink-500">
                          {r.instalments}
                          {r.ref ? ` · Ref ${r.ref}` : ""}
                        </p>
                      )}
                      <button onClick={() => share(r)} className="link text-[14px]">
                        <Share2 className="h-4 w-4" aria-hidden /> {L(F.share)}
                      </button>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
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
