"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import clsx from "clsx";
import { CalendarDays, Share2 } from "lucide-react";
import { useApi } from "@/lib/api";
import { useParent } from "@/lib/parent";
import { useL, useT } from "@/lib/i18n";
import { dayMonth, fullDate, rupees } from "@/lib/format";
import { INS_TEXT, INS_TONE, insState, type Fees, type Receipt } from "@/lib/fees";
import { F, HEAD } from "@/lib/text/fees";
import { Empty, ErrorCard, ListSkeleton, Status } from "@/components/ui";

/** One instalment: every fee head, concession and late fine. Unpaid → Pay Now; paid → its receipt to share. */
export default function FeeDetailPage() {
  const { child } = useParent();
  const L = useL();
  const { lang } = useT();
  const { data, error, reload } = useApi<Fees>(child ? `/fees?student=${child.id}` : null);
  const [index, setIndex] = useState<number | null>(null);
  useEffect(() => setIndex(Number(new URLSearchParams(window.location.search).get("i")) || 0), []);

  if (!data) {
    if (error && error.status !== 401) return <ErrorCard offline={error.status === 0} onRetry={reload} />;
    return <ListSkeleton rows={2} />;
  }
  const ins = data.available && index !== null ? data.instalments[index] : undefined;
  if (!data.available || !ins) return <Empty>{L(F.notAvailable)}</Empty>;

  const st = insState(ins);
  const label = (key: string) => (HEAD[key] ? L(HEAD[key]) : key.replace(/_fee$/, "").replace(/_/g, " "));
  const heads = ins.heads || [];
  const fine = ins.overdue ? ins.fine : 0;
  const toPay = ins.outstanding + fine;
  // A receipt names the instalments it paid ("Quarter 1, Quarter 2").
  const receipts = data.receipts.filter((r) => r.instalments.split(/\s*,\s*/).includes(ins.name));

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
    <div className="animate-rise space-y-4">
      <div className="row-card">
        <div className="flex items-center justify-between gap-2">
          <span className="meta">
            <span>
              <CalendarDays aria-hidden />
              {L({ hi: "आख़िरी तारीख", en: "Last date" })} {fullDate(ins.due, lang)}
            </span>
          </span>
          <Status tone={INS_TONE[st]}>{L(INS_TEXT[st])}</Status>
        </div>
        <p className="mt-1 text-[16px] font-bold">{ins.name}</p>
      </div>

      <dl className="kv tnum">
        {heads.length > 0 ? (
          heads.map((h) => (
            <div key={h.key}>
              <dt>{label(h.key)}</dt>
              <dd className={clsx(h.amount < 0 && "text-jade-600")}>{h.amount < 0 ? `− ${rupees(-h.amount)}` : rupees(h.amount)}</dd>
            </div>
          ))
        ) : (
          <div>
            <dt>{L({ hi: "किस्त की फ़ीस", en: "Instalment fee" })}</dt>
            <dd>{rupees(ins.amount)}</dd>
          </div>
        )}
        {ins.paid > 0 && st !== "paid" && (
          <div>
            <dt>{L({ hi: "पहले जमा", en: "Already paid" })}</dt>
            <dd className="text-jade-600">− {rupees(ins.paid)}</dd>
          </div>
        )}
        {st !== "paid" && (
          <div>
            <dt>{L(F.fine)}</dt>
            <dd>{rupees(fine)}</dd>
          </div>
        )}
        <div className="!py-3">
          <dt className="!text-[16px] !font-bold !text-ink-900">{st === "paid" ? L({ hi: "कुल जमा", en: "Total paid" }) : L({ hi: "कुल", en: "Total" })}</dt>
          <dd className="!text-[17px] !font-extrabold">{rupees(st === "paid" ? ins.amount : toPay)}</dd>
        </div>
      </dl>

      {st === "upcoming" && <p className="text-[13px] text-ink-500">{L({ hi: `${fullDate(ins.due, lang)} तक भरें, उसके बाद लेट फ़ाइन लगेगा।`, en: `Pay by ${fullDate(ins.due, lang)} to avoid a late fine.` })}</p>}

      {receipts.length > 0 && (
        <section className="space-y-2">
          <h2 className="mlabel">{L(F.receipts)}</h2>
          {receipts.map((r) => (
            <div key={r.id} className="row-card">
              <dl className="kv tnum">
                <div>
                  <dt>{L({ hi: "रसीद नंबर", en: "Receipt no." })}</dt>
                  <dd>{r.receiptNo}</dd>
                </div>
                <div>
                  <dt>{L({ hi: "तारीख", en: "Date" })}</dt>
                  <dd>{fullDate(r.date, lang)}</dd>
                </div>
                <div>
                  <dt>{L({ hi: "कैसे", en: "Mode" })}</dt>
                  <dd>
                    {r.mode}
                    {r.ref ? ` · ${r.ref}` : ""}
                  </dd>
                </div>
                <div>
                  <dt>{L({ hi: "रकम", en: "Amount" })}</dt>
                  <dd className="font-bold">{rupees(r.amount)}</dd>
                </div>
              </dl>
              <button onClick={() => share(r)} className="link text-[14px]">
                <Share2 className="h-4 w-4" aria-hidden /> {L(F.share)}
              </button>
            </div>
          ))}
        </section>
      )}
      {st === "paid" && !receipts.length && ins.paidOn && <p className="text-[13px] text-ink-500">{L({ hi: `${fullDate(ins.paidOn, lang)} को जमा हुई।`, en: `Paid on ${fullDate(ins.paidOn, lang)}.` })}</p>}

      {st !== "paid" &&
        (data.pay.upiId ? (
          <div className="sticky bottom-[calc(62px+env(safe-area-inset-bottom))] -mx-4 border-t border-ink-100 bg-white px-4 pb-3 pt-2.5">
            <Link href={`/fees/pay/?i=${index}`} className="btn-primary w-full">
              {L({ hi: "अभी भरें", en: "Pay Now" })} <span className="tnum">{rupees(toPay)}</span>
            </Link>
          </div>
        ) : (
          <p className="text-[14px] text-ink-500">{L(F.noOnline)}</p>
        ))}
    </div>
  );
}
