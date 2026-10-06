"use client";

import Link from "next/link";
import clsx from "clsx";
import { ChevronRight } from "lucide-react";
import { useApi } from "@/lib/api";
import { useParent } from "@/lib/parent";
import { useT } from "@/lib/i18n";
import { dayMonth, rupees, weekdayDate } from "@/lib/format";
import { ErrorCard, Skeleton } from "@/components/ui";

interface Home {
  date: string;
  attendance: { status: "Present" | "Absent" | "Leave" | "HalfDay" | null; holiday: string | null };
  fees: { dueNow: number; fine: number; balance: number; next: { name: string; due: string; amount: number } | null } | null;
  homework: { id: string; subject: string; title: string; details: string; assignedOn: string; dueDate: string | null }[];
  notice: { id: string; title: string; body: string; date: string } | null;
}

const ATT_DOT = { Present: "bg-jade-600", Absent: "bg-rose-500", Leave: "bg-marigold-500", HalfDay: "bg-marigold-500" } as const;

export default function HomePage() {
  const { child } = useParent();
  const { data, error, reload } = useApi<Home>(child ? `/home?student=${child.id}` : null);
  const { t, lang } = useT();

  if (!data) {
    if (error && error.status !== 401) return <ErrorCard offline={error.status === 0} onRetry={reload} />;
    return (
      <>
        <Skeleton className="h-5 w-40 mx-1 mt-1" />
        {[96, 132, 120].map((h, i) => (
          <div key={i} className="card space-y-3 p-4">
            <Skeleton className="h-4 w-28" />
            <Skeleton className="w-full" />
            <div style={{ height: h - 56 }} className="skeleton" />
          </div>
        ))}
      </>
    );
  }

  const { attendance: att, fees, homework, notice } = data;
  const due = fees ? fees.dueNow + fees.fine : 0;

  return (
    <div className="animate-rise space-y-3">
      <p className="px-1 pt-1 text-sm font-medium text-ink-500">{weekdayDate(data.date, lang)}</p>

      {/* 1. Today's attendance */}
      <Link href="/attendance/" className="card flex items-center gap-4 p-4 active:bg-ink-50">
        <div className="min-w-0 flex-1">
          <p className="card-title">{t("home.attendance")}</p>
          <p className="mt-1 flex items-center gap-2 text-xl font-bold text-ink-900">
            {att.holiday && !att.status ? (
              <>
                <span className="dot bg-ink-300" aria-hidden />
                {t("home.holiday")}
                <span className="truncate text-base font-medium text-ink-500">· {att.holiday === "Sunday" ? (lang === "hi" ? "रविवार" : "Sunday") : att.holiday}</span>
              </>
            ) : att.status ? (
              <>
                <span className={clsx("dot", ATT_DOT[att.status])} aria-hidden />
                {t(`att.${att.status}`)}
              </>
            ) : (
              <>
                <span className="dot border-2 border-ink-300 bg-white" aria-hidden />
                <span className="text-ink-600">{t("home.notMarked")}</span>
              </>
            )}
          </p>
        </div>
        <span className="flex items-center text-sm font-semibold text-brand-700">
          {t("home.month")} <ChevronRight className="h-4 w-4" aria-hidden />
        </span>
      </Link>

      {/* 2. Fees */}
      <section className="card p-4">
        <p className="card-title">{t("home.fees")}</p>
        {!fees ? (
          <p className="mt-2 text-ink-600">{t("home.feesUnavailable")}</p>
        ) : due > 0 ? (
          <>
            <p className="mt-1 flex items-center gap-2 text-sm font-medium text-ink-600">
              <span className="dot bg-rose-500" aria-hidden />
              {t("home.due")}
            </p>
            <p className="tnum mt-0.5 text-[32px] font-extrabold leading-tight tracking-tight text-ink-900">{rupees(due)}</p>
            {fees.fine > 0 && (
              <p className="tnum text-sm text-ink-600">
                {rupees(fees.dueNow)} + {t("home.fine")} {rupees(fees.fine)}
              </p>
            )}
            <Link href="/fees/" className="btn-primary mt-4 w-full">
              {t("home.payNow")}
            </Link>
          </>
        ) : (
          <>
            <p className="mt-1 flex items-center gap-2 text-xl font-bold text-ink-900">
              <span className="dot bg-jade-600" aria-hidden />
              {t("home.allPaid")}
            </p>
            {fees.next && (
              <p className="tnum mt-2 text-ink-600">
                {t("home.next")}: <span className="font-semibold text-ink-800">{rupees(fees.next.amount)}</span> · {dayMonth(fees.next.due, lang)}
              </p>
            )}
          </>
        )}
      </section>

      {/* 3. Homework */}
      <section className="card p-4">
        <div className="flex items-center justify-between">
          <p className="card-title">{t("home.homework")}</p>
          <Link href="/study/" className="link -my-3 text-sm">
            {t("common.seeAll")} <ChevronRight className="h-4 w-4" aria-hidden />
          </Link>
        </div>
        {homework.length === 0 ? (
          <p className="mt-1 text-ink-600">{t("home.noHomework")}</p>
        ) : (
          <ul className="mt-1 divide-y divide-ink-100">
            {homework.slice(0, 4).map((h) => (
              <li key={h.id} className="py-3 first:pt-1 last:pb-0">
                <p className="text-sm font-semibold text-brand-700">{h.subject}</p>
                <p className="font-medium text-ink-900">{h.title}</p>
                {h.dueDate && (
                  <p className="mt-0.5 text-sm text-ink-500">
                    {t("home.dueBy")}: {dayMonth(h.dueDate, lang)}
                  </p>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* 4. Latest message from the school */}
      <section className="card p-4">
        <p className="card-title">{t("home.notice")}</p>
        {!notice ? (
          <p className="mt-1 text-ink-600">{t("home.noNotice")}</p>
        ) : (
          <>
            <p className="mt-1 font-semibold text-ink-900">{notice.title}</p>
            <p className="mt-1 line-clamp-4 whitespace-pre-line text-ink-700">{notice.body}</p>
            <p className="mt-2 text-sm text-ink-500">{dayMonth(notice.date, lang)}</p>
          </>
        )}
      </section>
    </div>
  );
}
