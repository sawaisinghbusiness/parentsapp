"use client";

import Link from "next/link";
import clsx from "clsx";
import { Check, Share2 } from "lucide-react";
import { useApi } from "@/lib/api";
import { useParent } from "@/lib/parent";
import { useL, useT } from "@/lib/i18n";
import { dayMonth, fullDate, rupees } from "@/lib/format";
import { insState, type Fees, type Instalment, type Receipt } from "@/lib/fees";
import { F, HEAD } from "@/lib/text/fees";
import { CallOffice, ErrorCard, ListSkeleton, SchoolMark, Skeleton, Status } from "@/components/ui";

const CLAIM_TONE = { pending: "wait", verified: "ok", rejected: "bad" } as const;

/** "MTNA/2026-27/01409" → "01409": the part a parent reads out at the office. */
const shortNo = (no: string) => no.split("/").pop() || no;

/** Whole days from today to an ISO date (negative once it has passed). */
function daysTo(iso: string) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.round((new Date(iso + "T00:00:00").getTime() - today.getTime()) / 86_400_000);
}

/**
 * Fees tab as a bill (user picked the PhonePe-bill look, 2026-10-20): what is due now is one bill with
 * its fee heads, a torn line and the total; Pay sits in a bar above the tabs. Below: later bills, then
 * paid ones with their receipt. Each row opens Fee Detail.
 */
export default function FeesPage() {
  const { child, me } = useParent();
  const L = useL();
  const { lang } = useT();
  const { data, error, reload } = useApi<Fees>(child ? `/fees?student=${child.id}` : null);

  if (!data) {
    if (error && error.status !== 401) return <ErrorCard offline={error.status === 0} onRetry={reload} />;
    return (
      <div className="space-y-3">
        <Skeleton className="h-[300px] w-full rounded-2xl" />
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
    <ul className="divide-y divide-[#F5E6D0] overflow-hidden rounded-[14px] bg-white">
      {list.map((r) => (
        <li key={r.id}>
          <button onClick={() => share(r)} className="flex min-h-[60px] w-full items-center gap-3 px-4 py-3 text-left active:bg-[#FFF8EE]">
            <span className="min-w-0 flex-1">
              <span className="block text-[15px] font-semibold">
                {fullDate(r.date, lang)} · {r.mode}
              </span>
              <span className="tnum block truncate text-[13px] text-stone-500">
                {L(F.receiptNo)} {shortNo(r.receiptNo)}
                {r.instalments ? ` · ${r.instalments}` : ""}
              </span>
            </span>
            <span className="tnum text-[15px] font-semibold">{rupees(r.amount)}</span>
            <Share2 className="h-5 w-5 shrink-0 text-[#C2410C]" aria-label={L(F.share)} />
          </button>
        </li>
      ))}
    </ul>
  );

  const heading = (text: string) => <h2 className="pl-1 text-[14px] font-bold text-stone-500">{text}</h2>;

  if (!data.available) {
    return (
      <div className="animate-rise space-y-4">
        <section className="space-y-3 rounded-2xl bg-white p-4">
          <p className="text-stone-700">{L(F.notAvailable)}</p>
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

  return (
    <div className="animate-rise space-y-4">
      {claims.length > 0 && (
        <ul className="space-y-2">
          {claims.map((c) => (
            <li key={c.id} className="rounded-[14px] bg-white px-4 py-3">
              <div className="flex items-center justify-between gap-2">
                <span className="tnum text-[15.5px] font-bold">{rupees(c.amount)}</span>
                <Status tone={CLAIM_TONE[c.status]}>{L(c.status === "pending" ? F.claimPending : c.status === "verified" ? F.claimVerified : F.claimRejected)}</Status>
              </div>
              <p className="meta tnum mt-1">
                <span>UTR {c.utr}</span>
                <span>{dayMonth(c.paidOn, lang)}</span>
              </p>
              {c.status === "rejected" && c.rejectReason && <p className="mt-1 text-[14px] text-stone-700">{c.rejectReason}</p>}
            </li>
          ))}
        </ul>
      )}

      {first ? (
        <section className="overflow-hidden rounded-2xl bg-white shadow-[0_1px_0_#F2D9B5,0_8px_24px_rgba(146,64,14,0.08)]">
          <div className="flex items-center gap-3 border-b border-[#F5E6D0] px-[18px] pb-3.5 pt-4">
            {me?.school ? <SchoolMark name={me.school.name} url={me.school.logoUrl} size={40} /> : null}
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[15px] font-bold">
                {L({ hi: "फ़ीस बिल", en: "Fee bill" })} · {owing.map(({ i }) => i.name).join(", ")}
              </span>
              <span className="block truncate text-[13px] text-stone-500">
                {child?.name} · {child?.classSec}
              </span>
            </span>
            <span className={clsx("tnum shrink-0 text-right text-[12px] font-bold leading-tight", days < 0 ? "text-rose-600" : "text-[#B45309]")}>
              {days < 0 ? L({ hi: `${-days} दिन`, en: `${-days} days` }) : days === 0 ? L({ hi: "आज", en: "Today" }) : L({ hi: `${days} दिन`, en: `${days} days` })}
              <br />
              {days < 0 ? L({ hi: "से लेट", en: "late" }) : days === 0 ? L({ hi: "आख़िरी दिन", en: "last day" }) : L({ hi: "बाकी", en: "left" })}
            </span>
          </div>

          <dl className="tnum space-y-2.5 px-[18px] py-3.5 text-[15px]">
            {[...heads.values()].map((h) => (
              <div key={h.label} className="flex justify-between gap-3">
                <dt className="text-stone-600">{h.label}</dt>
                <dd className={clsx(h.amount < 0 && "text-jade-700")}>{h.amount < 0 ? `− ${rupees(-h.amount)}` : rupees(h.amount)}</dd>
              </div>
            ))}
            {already > 0 && (
              <div className="flex justify-between gap-3">
                <dt className="text-stone-600">{L({ hi: "पहले जमा", en: "Already paid" })}</dt>
                <dd className="text-jade-700">− {rupees(already)}</dd>
              </div>
            )}
            <div className="flex justify-between gap-3">
              <dt className="text-stone-600">{L(F.fine)}</dt>
              <dd className={fine > 0 ? "text-rose-600" : "text-stone-500"}>{rupees(fine)}</dd>
            </div>
          </dl>

          <div className="mx-[18px] border-t-2 border-dashed border-[#F2D9B5]" />

          <div className="px-[18px] pb-[18px] pt-3.5">
            <div className="flex items-baseline justify-between gap-3">
              <span className="text-[15px] font-semibold">{L({ hi: "कुल भरना है", en: "Total to pay" })}</span>
              <span className="tnum text-[30px] font-extrabold">{rupees(owe)}</span>
            </div>
            <p className="mt-1 text-[13px] text-stone-500">
              {first.i.overdue
                ? L({ hi: `आख़िरी तारीख ${fullDate(first.i.due, lang)} थी, फ़ाइन जुड़ गया है`, en: `Last date was ${fullDate(first.i.due, lang)}, fine added` })
                : L({ hi: `आख़िरी तारीख ${fullDate(first.i.due, lang)} · उसके बाद लेट फ़ाइन`, en: `Last date ${fullDate(first.i.due, lang)} · late fine after that` })}
            </p>
          </div>
        </section>
      ) : (
        <section className="flex items-center gap-3.5 rounded-2xl bg-white p-[18px] shadow-[0_1px_0_#F2D9B5,0_8px_24px_rgba(146,64,14,0.08)]">
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-jade-600 text-white">
            <Check className="h-6 w-6" strokeWidth={2.5} aria-hidden />
          </span>
          <span>
            <span className="block text-[18px] font-extrabold leading-tight">{L({ hi: "इस साल की फ़ीस पूरी जमा", en: "This year's fees are paid" })}</span>
            <span className="tnum mt-0.5 block text-[14px] text-stone-500">
              {rupees(session.total)} · {child?.name}
            </span>
          </span>
        </section>
      )}

      {later.length > 0 && (
        <section className="space-y-2">
          {heading(L({ hi: "आगे के बिल", en: "Coming bills" }))}
          <ul className="divide-y divide-[#F5E6D0] overflow-hidden rounded-[14px] bg-white">
            {later.map(({ i, k, st }) => (
              <li key={i.name}>
                <Link href={`/fees/detail/?i=${k}`} className="flex min-h-[60px] items-center gap-3 px-4 py-3 active:bg-[#FFF8EE]">
                  <span className="h-5 w-5 shrink-0 rounded-full border-2 border-stone-300" aria-hidden />
                  <span className="min-w-0 flex-1">
                    <span className="block text-[15px] font-semibold">{i.name}</span>
                    <span className="tnum block text-[13px] text-stone-500">
                      {st === "part" ? L({ hi: `${rupees(i.paid)} जमा · `, en: `${rupees(i.paid)} paid · ` }) : ""}
                      {L({ hi: `आख़िरी तारीख ${fullDate(i.due, lang)}`, en: `Last date ${fullDate(i.due, lang)}` })}
                    </span>
                  </span>
                  <span className="tnum text-[15px] font-semibold">{rupees(toPay(i))}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {paid.length > 0 && (
        <section className="space-y-2">
          {heading(L({ hi: "पिछले बिल", en: "Paid bills" }))}
          <ul className="divide-y divide-[#F5E6D0] overflow-hidden rounded-[14px] bg-white">
            {paid.map(({ i, k }) => {
              const r = paidBy(i.name);
              const on = r?.date || i.paidOn;
              const line = [on && `${L({ hi: "जमा", en: "Paid" })} ${dayMonth(on, lang)}`, r && `${L(F.receiptNo)} ${shortNo(r.receiptNo)}`].filter(Boolean).join(" · ") || L(F.insPaid);
              return (
                <li key={i.name}>
                  <Link href={`/fees/detail/?i=${k}`} className="flex min-h-[60px] items-center gap-3 px-4 py-3 active:bg-[#FFF8EE]">
                    <Check className="h-5 w-5 shrink-0 text-jade-700" strokeWidth={2.5} aria-hidden />
                    <span className="min-w-0 flex-1">
                      <span className="block text-[15px] font-semibold">{i.name}</span>
                      <span className="tnum block text-[13px] text-stone-500">{line}</span>
                    </span>
                    <span className="tnum text-[15px] font-semibold">{rupees(i.amount)}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {(!first || loose.length > 0) && data.receipts.length > 0 && (
        <section className="space-y-2">
          {heading(L(F.receipts))}
          {receiptList(first ? loose : data.receipts)}
        </section>
      )}

      {first && (
        <div className="sticky bottom-[calc(104px+env(safe-area-inset-bottom))] -mx-4 flex items-center gap-3 border-t border-[#F5E6D0] bg-white px-4 py-3">
          <span className="min-w-0 flex-1">
            <span className="block truncate text-[12px] text-stone-500">{owing.map(({ i }) => i.name).join(", ")}</span>
            <span className="tnum block text-[20px] font-extrabold leading-tight">{rupees(owe)}</span>
          </span>
          {data.pay.upiId ? (
            <Link href={`/fees/pay/?i=${first.k}`} className="flex h-12 items-center rounded-xl bg-[#EA580C] px-7 text-[16px] font-bold text-white active:bg-[#C2410C]">
              {L({ hi: "अभी भरें", en: "Pay now" })}
            </Link>
          ) : (
            <span className="max-w-[60%] text-right text-[12px] leading-snug text-stone-500">
              {L(F.noOnline)}{" "}
              {data.pay.officePhone && (
                <a href={`tel:${data.pay.officePhone.replace(/\s/g, "")}`} className="tnum font-semibold text-[#C2410C]">
                  {data.pay.officePhone}
                </a>
              )}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
