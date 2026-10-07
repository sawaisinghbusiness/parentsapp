"use client";

import { useEffect, useState } from "react";
import clsx from "clsx";
import { CalendarDays } from "lucide-react";
import { useApi } from "@/lib/api";
import { useParent } from "@/lib/parent";
import { useL, useT } from "@/lib/i18n";
import { fullDate, rupees } from "@/lib/format";
import { INS_TEXT, INS_TONE, insState, type Fees } from "@/lib/fees";
import { F, HEAD } from "@/lib/text/fees";
import { Empty, ErrorCard, ListSkeleton, Status } from "@/components/ui";
import { PaySheet } from "@/components/fees/PaySheet";

/** One instalment: every fee head, concession and late fine, so the parent sees where the money goes. */
export default function FeeDetailPage() {
  const { child } = useParent();
  const L = useL();
  const { lang } = useT();
  const { data, error, reload } = useApi<Fees>(child ? `/fees?student=${child.id}` : null);
  const [index, setIndex] = useState<number | null>(null);
  const [paying, setPaying] = useState(false);
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
      {st === "paid" && ins.paidOn && <p className="text-[13px] text-ink-500">{L({ hi: `${fullDate(ins.paidOn, lang)} को जमा हुई। रसीद फ़ीस पेज पर है।`, en: `Paid on ${fullDate(ins.paidOn, lang)}. The receipt is on the Fees page.` })}</p>}

      {st !== "paid" && data.pay.upiId && (
        <button onClick={() => setPaying(true)} className="btn-primary w-full">
          {L({ hi: "भरें", en: "Pay" })} {rupees(toPay)}
        </button>
      )}

      {paying && data.pay.upiId && child && (
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
            suggest: toPay,
          }}
          onClose={() => setPaying(false)}
          onSent={reload}
        />
      )}
    </div>
  );
}
