"use client";

import { useState } from "react";
import Link from "next/link";
import clsx from "clsx";
import { ChevronRight } from "lucide-react";
import { api, useApi } from "@/lib/api";
import { useParent } from "@/lib/parent";
import { useL, useT } from "@/lib/i18n";
import { ampm, type MeetingRow } from "@/lib/meetings";
import { Empty, ErrorCard, Skeleton } from "@/components/ui";

/** Every meeting for this child's class: upcoming ones to answer, and past ones. */
export default function MeetingsPage() {
  const { child } = useParent();
  const L = useL();
  const { lang } = useT();
  const [tab, setTab] = useState<"upcoming" | "past">("upcoming");
  const { data, error, reload } = useApi<{ upcoming: MeetingRow[]; past: MeetingRow[] }>(child ? `/meetings?student=${child.id}` : null);
  const [busy, setBusy] = useState<string | null>(null);
  const [fail, setFail] = useState("");

  async function answer(m: MeetingRow, a: "yes" | "no") {
    if (!child) return;
    setBusy(m.id);
    setFail("");
    try {
      await api("/meetings/answer", { body: { student: child.id, id: m.id, answer: a } });
      reload();
    } catch (e: any) {
      setFail(e?.status === 0 ? L({ hi: "इंटरनेट नहीं है।", en: "No internet. Try again." }) : e?.message || L({ hi: "नहीं हो पाया।", en: "Could not save. Try again." }));
    } finally {
      setBusy(null);
    }
  }

  const list = data ? data[tab] : [];
  const month = (iso: string) => new Date(iso + "T00:00:00").toLocaleDateString(lang === "hi" ? "hi-IN" : "en-IN", { month: "short" }).toUpperCase();

  return (
    <div className="animate-rise space-y-4">
      <div className="relative grid grid-cols-2 rounded-full bg-brand-50 p-1 ring-1 ring-brand-100" role="tablist">
        <span aria-hidden className="slide-pill absolute bottom-1 left-1 top-1 w-[calc(50%-4px)] rounded-full bg-brand-700 shadow-[0_2px_8px_rgba(20,70,160,.25)]" style={{ transform: tab === "past" ? "translateX(100%)" : "none" }} />
        {(["upcoming", "past"] as const).map((k) => (
          <button key={k} role="tab" aria-selected={tab === k} onClick={() => setTab(k)} className={clsx("relative h-11 rounded-full text-[15px] transition-colors duration-300", tab === k ? "font-semibold text-white" : "font-medium text-ink-600")}>
            {k === "upcoming" ? L({ hi: "आने वाली", en: "Upcoming" }) : L({ hi: "पिछली", en: "Past" })}
          </button>
        ))}
      </div>

      {!data ? (
        error && error.status !== 401 ? (
          <ErrorCard offline={error.status === 0} onRetry={reload} />
        ) : (
          <Skeleton className="h-64 w-full rounded-[20px]" />
        )
      ) : list.length === 0 ? (
        <Empty>{tab === "upcoming" ? L({ hi: "अभी कोई मीटिंग नहीं है।", en: "No meetings coming up." }) : L({ hi: "कोई पिछली मीटिंग नहीं।", en: "No past meetings." })}</Empty>
      ) : (
        <ul className="overflow-hidden rounded-[20px] border border-ink-100 bg-white shadow-[0_1px_2px_rgba(15,23,42,.04)]">
          {list.map((m) => {
            const open = tab === "upcoming";
            return (
              <li key={m.id} className="border-b border-ink-100 last:border-b-0">
                <div className="flex gap-3.5 px-4 py-3.5">
                  <div className="w-10 shrink-0 pt-0.5 text-center">
                    <b className="tnum block text-[22px] font-extrabold leading-none text-brand-700">{+m.date.slice(8)}</b>
                    <span className="text-[11px] font-semibold tracking-[.04em] text-ink-500">{month(m.date)}</span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <Link href={`/meetings/detail/?id=${m.id}`} className="flex items-start justify-between gap-2">
                      <span className="min-w-0">
                        <span className="block text-[15px] font-bold leading-snug">{m.title}</span>
                        <span className="mt-0.5 block text-[12.5px] text-ink-500">
                          {m.onlineUrl ? L({ hi: "ऑनलाइन", en: "Online" }) : m.place || m.audience} · {ampm(m.start)}
                        </span>
                      </span>
                      <ChevronRight className="mt-0.5 h-4 w-4 shrink-0 text-ink-300" aria-hidden />
                    </Link>
                    {open && m.kind === "ptm" && (
                      <div className="mt-2.5 flex items-center gap-2.5">
                        {m.slot ? (
                          <span className="text-[12.5px] font-semibold text-jade-700">{L({ hi: `आपका समय ${ampm(m.slot)}`, en: `Your time ${ampm(m.slot)}` })}</span>
                        ) : (
                          <>
                            <Link href={`/meetings/detail/?id=${m.id}`} className="inline-flex h-[38px] items-center rounded-xl bg-brand-700 px-4 text-[13.5px] font-semibold text-white">
                              {L({ hi: "समय चुनें", en: "Pick a time" })}
                            </Link>
                            {m.slotsLeft !== null && <span className="text-[12.5px] text-ink-500">{L({ hi: `${m.slotsLeft} समय खाली`, en: `${m.slotsLeft} open` })}</span>}
                          </>
                        )}
                      </div>
                    )}
                    {open && m.kind === "general" && !m.answer && (
                      <div className="mt-2.5 flex gap-2">
                        <button disabled={busy === m.id} onClick={() => answer(m, "yes")} className="h-[38px] rounded-xl bg-brand-50 px-4 text-[13.5px] font-semibold text-brand-700 disabled:opacity-50">
                          {L({ hi: "आऊँगा", en: "I'll come" })}
                        </button>
                        <button disabled={busy === m.id} onClick={() => answer(m, "no")} className="h-[38px] rounded-xl px-4 text-[13.5px] font-semibold text-ink-700 ring-1 ring-inset ring-ink-200 disabled:opacity-50">
                          {L({ hi: "नहीं आ पाऊँगा", en: "Can't come" })}
                        </button>
                      </div>
                    )}
                    {open && m.kind === "general" && m.answer === "no" && <p className="mt-2 text-[12.5px] text-ink-500">{L({ hi: "आपने बताया आप नहीं आ पाएँगे", en: "You said you can't come" })}</p>}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
      {fail && <p className="text-[13px] text-rose-600">{fail}</p>}
    </div>
  );
}
