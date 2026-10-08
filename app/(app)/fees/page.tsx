"use client";

import Link from "next/link";
import clsx from "clsx";
import { CalendarDays } from "lucide-react";
import { useApi } from "@/lib/api";
import { useParent } from "@/lib/parent";
import { useL, useT } from "@/lib/i18n";
import { dayMonth, fullDate, rupees } from "@/lib/format";
import { INS_TEXT, INS_TONE, insState, type Fees } from "@/lib/fees";
import { F } from "@/lib/text/fees";
import { CallOffice, ErrorCard, ListSkeleton, Skeleton, Status } from "@/components/ui";

const CLAIM_TONE = { pending: "wait", verified: "ok", rejected: "bad" } as const;

/**
 * Fees tab, as the kit has it: the session in three numbers, then the instalments (unpaid first).
 * Each opens Fee Detail, which has Pay Now or, once paid, the receipt.
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
        <Skeleton className="h-[68px] w-full rounded-2xl" />
        <ListSkeleton rows={4} />
      </div>
    );
  }

  // Pending UPI payments stay on top until the school checks them; checked ones show for a while below.
  const claims = data.claims.slice(0, 10);
  const order = data.available ? data.instalments.map((i, k) => ({ i, k })).sort((a, b) => Number(insState(a.i) === "paid") - Number(insState(b.i) === "paid")) : [];
  const named = new Set(data.available ? data.instalments.map((i) => i.name) : []);
  // Receipts that name no instalment (e.g. a lump sum) have no Fee Detail to live on, so they stay here.
  const loose = data.receipts.filter((r) => !r.instalments.split(/\s*,\s*/).some((n) => named.has(n)));

  return (
    <div className="animate-rise space-y-3.5">
      {claims.length > 0 && (
        <ul className="space-y-2">
          {claims.map((c) => (
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
      )}

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

          <ul className="space-y-2">
            {order.map(({ i, k }) => {
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

          {data.session.balance > 0 && !data.pay.upiId && (
            <p className="text-[14px] text-ink-500">
              {L(F.noOnline)}{" "}
              {data.pay.officePhone && (
                <a href={`tel:${data.pay.officePhone.replace(/\s/g, "")}`} className="tnum font-semibold text-brand-600">
                  {data.pay.officePhone}
                </a>
              )}
            </p>
          )}
        </>
      )}

      {loose.length > 0 && (
        <section className="space-y-2 pt-1">
          <h2 className="mlabel">{L(F.receipts)}</h2>
          <ul className="space-y-2">
            {loose.map((r) => (
              <li key={r.id} className="row-card flex items-center gap-3">
                <span className="min-w-0 flex-1">
                  <span className="tnum block truncate text-[15px] font-semibold">{r.receiptNo}</span>
                  <span className="block text-[13px] text-ink-500">
                    {dayMonth(r.date, lang)} · {r.mode}
                  </span>
                </span>
                <span className="tnum font-bold">{rupees(r.amount)}</span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
