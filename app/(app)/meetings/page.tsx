"use client";

import { useState } from "react";
import Link from "next/link";
import clsx from "clsx";
import { ChevronRight } from "lucide-react";
import { api, useApi } from "@/lib/api";
import { useParent } from "@/lib/parent";
import { useL, useT } from "@/lib/i18n";
import { ampm, type MeetingRow } from "@/lib/meetings";
import { ErrorCard, Skeleton, Status } from "@/components/ui";
import { Button, DateBlock, Group, Quiet, Section, SUPPORT, Tabs, TITLE } from "@/components/kit";
import "@/components/study.css";

/** The kit Button's look, for the "Pick a time" link (kit Button is a <button>). */
const LINK_PRIMARY =
  "inline-flex min-h-[48px] items-center justify-center gap-2 rounded-xl bg-[#0D2A5E] px-5 text-[16px] font-semibold text-white transition-colors active:bg-[#0A2149]";

/**
 * Every meeting for this child's class: upcoming ones to answer, and past ones.
 * One card of ruled rows; each row is a date block, the title, "place or Online · time", a written state, and the
 * actions (Pick a time / I'll come / Can't come) as full 48px buttons under the text.
 */
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
  const href = (m: MeetingRow) => `/meetings/detail/?id=${m.id}`;

  return (
    <div className="study space-y-6 pb-4 pt-1">
      <Tabs
        value={tab}
        onChange={setTab}
        label={L({ hi: "मीटिंग", en: "Meetings" })}
        options={[
          { key: "upcoming", text: L({ hi: "आने वाली", en: "Upcoming" }) },
          { key: "past", text: L({ hi: "पिछली", en: "Past" }) },
        ]}
      />

      <Section>
        {!data ? (
          error && error.status !== 401 ? (
            <ErrorCard offline={error.status === 0} onRetry={reload} />
          ) : (
            <Skeleton className="h-64 w-full rounded-2xl" />
          )
        ) : list.length === 0 ? (
          <Quiet>{tab === "upcoming" ? L({ hi: "अभी कोई मीटिंग नहीं है।", en: "No meetings coming up." }) : L({ hi: "कोई पिछली मीटिंग नहीं।", en: "No past meetings." })}</Quiet>
        ) : (
          <Group>
            {list.map((m) => {
              const open = tab === "upcoming";
              // The written state of this meeting for this family (only while it is still to come, as on the real page).
              const state =
                !open ? null : m.kind === "ptm" ? (
                  m.slot ? <Status tone="ok">{L({ hi: `आपका समय ${ampm(m.slot)}`, en: `Your time ${ampm(m.slot)}` })}</Status> : null
                ) : m.answer === "yes" ? (
                  <Status tone="ok">{L({ hi: "आ रहे हैं", en: "Coming" })}</Status>
                ) : m.answer === "no" ? (
                  <Status tone="mute">{L({ hi: "नहीं आ रहे", en: "Not coming" })}</Status>
                ) : null;
              const pickTime = open && m.kind === "ptm" && !m.slot;
              const askAnswer = open && m.kind === "general" && !m.answer;
              return (
                <li key={m.id}>
                  <Link href={href(m)} className="flex min-h-[72px] items-center gap-4 px-4 py-3 transition-colors active:bg-[#F1F5F9]">
                    <DateBlock iso={m.date} lang={lang} />
                    <span className="min-w-0 flex-1">
                      <span className={clsx("block break-words", TITLE)}>{m.title}</span>
                      <span className={clsx("tnum mt-1 block break-words", SUPPORT)}>
                        {m.onlineUrl ? L({ hi: "ऑनलाइन", en: "Online" }) : m.place || m.audience} · {ampm(m.start)}
                      </span>
                      {state && <span className="mt-2 block">{state}</span>}
                    </span>
                    <ChevronRight className="h-5 w-5 shrink-0 text-ink-400" strokeWidth={1.75} aria-hidden />
                  </Link>
                  {pickTime && (
                    <div className="flex items-center gap-3 px-4 pb-4">
                      <Link href={href(m)} className={LINK_PRIMARY}>
                        {L({ hi: "समय चुनें", en: "Pick a time" })}
                      </Link>
                      {m.slotsLeft !== null && <span className={clsx("tnum", SUPPORT)}>{L({ hi: `${m.slotsLeft} समय खाली`, en: `${m.slotsLeft} open` })}</span>}
                    </div>
                  )}
                  {askAnswer && (
                    <div className="flex gap-2 px-4 pb-4">
                      <Button className="flex-1" disabled={busy === m.id} onClick={() => answer(m, "yes")}>
                        {L({ hi: "आऊँगा", en: "I'll come" })}
                      </Button>
                      <Button kind="line" className="flex-1" disabled={busy === m.id} onClick={() => answer(m, "no")}>
                        {L({ hi: "नहीं आ पाऊँगा", en: "Can't come" })}
                      </Button>
                    </div>
                  )}
                </li>
              );
            })}
          </Group>
        )}
        {fail && <p className="mt-3 text-[14px] leading-5 text-[#A32F35]">{fail}</p>}
      </Section>
    </div>
  );
}
