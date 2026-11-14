"use client";

import { useEffect, useState } from "react";
import clsx from "clsx";
import { CalendarDays, MapPin, Users, Video } from "lucide-react";
import { api, useApi } from "@/lib/api";
import { useParent } from "@/lib/parent";
import { useL, useT } from "@/lib/i18n";
import { ampm, type MeetingDetail } from "@/lib/meetings";
import { ErrorCard, Skeleton, Status } from "@/components/ui";
import { Button, CARD, Group, Section, SUPPORT, TITLE } from "@/components/kit";
import "@/components/study.css";

const ICON = "mt-0.5 h-5 w-5 shrink-0 text-ink-500";

/**
 * Preview: one meeting in the kit look. Same data and actions as /meetings/detail/: when and where, the agenda,
 * and either a PTM time to pick or "I'll come / Can't come". The action bar stays fixed above the tab bar, as a
 * plain white bar with a hairline top border.
 */
export default function MeetingDetailPreviewPage() {
  const { child } = useParent();
  const L = useL();
  const { lang } = useT();
  const [id, setId] = useState("");
  useEffect(() => setId(new URLSearchParams(window.location.search).get("id") || ""), []);
  const { data, error, reload } = useApi<MeetingDetail>(child && id ? `/meetings/detail?student=${child.id}&id=${id}` : null);
  const [m, setM] = useState<MeetingDetail | null>(null);
  const [pick, setPick] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [fail, setFail] = useState("");
  useEffect(() => {
    if (data) setM(data);
  }, [data]);

  if (!m) {
    if (error && error.status !== 401) return <ErrorCard offline={error.status === 0} onRetry={reload} />;
    return <Skeleton className="h-80 w-full rounded-2xl" />;
  }

  const day = new Date(m.date + "T00:00:00").toLocaleDateString(lang === "hi" ? "hi-IN" : "en-IN", { weekday: "short", day: "numeric", month: "short" });
  const today = new Date().toISOString().slice(0, 10);
  const over = m.date < today;
  // The Join button opens 10 minutes before the start.
  const startsAt = new Date(`${m.date}T${m.start}:00`).getTime();
  const canJoin = !!m.onlineUrl && Date.now() >= startsAt - 10 * 60_000 && !over;
  const chosen = pick || m.slot;

  async function send(path: string, body: object) {
    if (!child) return;
    setBusy(true);
    setFail("");
    try {
      setM(await api<MeetingDetail>(path, { body: { student: child.id, id: m!.id, ...body } }));
      setPick(null);
    } catch (e: any) {
      setFail(e?.status === 0 ? L({ hi: "इंटरनेट नहीं है।", en: "No internet. Try again." }) : e?.message || L({ hi: "नहीं हो पाया।", en: "Could not save. Try again." }));
      // Someone else took the time first: load the slots again.
      if (e?.status === 409) reload();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className={clsx("study space-y-6 pt-1", over ? "pb-4" : "pb-32")}>
      <Section>
        <h2 className="text-[20px] font-semibold leading-7 text-ink-900">{m.title}</h2>
        {(m.host || m.audience) && <p className={clsx("mt-1", SUPPORT)}>{[m.host, m.audience].filter(Boolean).join(" · ")}</p>}

        <Group className="mt-4">
          <li className="flex min-h-[72px] items-start gap-4 px-4 py-3">
            <CalendarDays className={ICON} strokeWidth={1.75} aria-hidden />
            <span className="min-w-0">
              <span className={clsx("block", TITLE)}>{day}</span>
              <span className={clsx("tnum mt-1 block", SUPPORT)}>
                {ampm(m.start)} – {ampm(m.end)}
              </span>
            </span>
          </li>
          <li className="flex min-h-[56px] items-start gap-4 px-4 py-4">
            {m.onlineUrl ? <Video className={ICON} strokeWidth={1.75} aria-hidden /> : <MapPin className={ICON} strokeWidth={1.75} aria-hidden />}
            <span className={clsx("min-w-0 break-words", TITLE)}>{m.onlineUrl ? L({ hi: "ऑनलाइन मीटिंग", en: "Online meeting" }) : m.place || L({ hi: "स्कूल में", en: "At school" })}</span>
          </li>
          {(m.agenda || m.coming > 0) && (
            <li className="flex items-start gap-4 px-4 py-3">
              <Users className={ICON} strokeWidth={1.75} aria-hidden />
              <span className="min-w-0">
                {m.coming > 0 && <span className={clsx("block", TITLE)}>{L({ hi: `${m.coming} परिवार आ रहे हैं`, en: `${m.coming} families attending` })}</span>}
                {m.agenda && <span className={clsx("block whitespace-pre-line break-words", SUPPORT, m.coming > 0 && "mt-1")}>{m.agenda}</span>}
              </span>
            </li>
          )}
        </Group>
      </Section>

      {m.kind === "ptm" && !over && (
        <Section title={L({ hi: "अपना समय चुनें", en: "Pick your time" })} delay={70}>
          <div className={clsx(CARD, "grid grid-cols-3 gap-2 p-4")}>
            {m.slots.map((s) => {
              const on = chosen === s.time;
              const label = ampm(s.time).replace(/ (AM|PM)$/, "");
              return (
                <button
                  key={s.time}
                  disabled={s.taken || busy}
                  aria-disabled={s.taken || undefined}
                  aria-label={s.taken && !on ? `${ampm(s.time)}, ${L({ hi: "ले लिया गया", en: "taken" })}` : ampm(s.time)}
                  onClick={() => setPick(s.time)}
                  aria-pressed={on}
                  className={clsx(
                    "tnum min-h-[48px] rounded-xl text-[16px] font-medium transition-colors",
                    on
                      ? "bg-[#0D2A5E] text-white"
                      : s.taken
                        ? "bg-[#F1F5F9] text-ink-500 line-through opacity-60"
                        : "border border-[#C9D4E1] bg-white text-ink-900 active:bg-[#F1F5F9]"
                  )}
                >
                  {label}
                </button>
              );
            })}
          </div>
          <p className={clsx("mt-3", SUPPORT)}>{L({ hi: "कटे हुए समय दूसरे पैरेंट्स ले चुके हैं", en: "Crossed-out times are taken by other parents" })}</p>
        </Section>
      )}

      {fail && <p className="text-[14px] leading-5 text-[#A32F35]">{fail}</p>}

      {/* A PTM with no time picked yet has nothing to show in the bar, so the bar is left out. */}
      {!over && !(m.kind === "ptm" && !m.slot && !(pick && pick !== m.slot)) && (
        <div className="fixed inset-x-0 bottom-[66px] z-10 mx-auto max-w-[560px] border-t border-[#DCE4ED] bg-white px-4 pb-3 pt-3">
          {m.kind === "ptm" ? (
            pick && pick !== m.slot ? (
              <Button className="w-full" disabled={busy} onClick={() => send("/meetings/slot", { time: pick })}>
                {L({ hi: `${day} · ${ampm(pick)} पक्का करें`, en: `Confirm ${day} · ${ampm(pick)}` })}
              </Button>
            ) : m.slot ? (
              <p className="flex min-h-[48px] items-center justify-center">
                <Status tone="ok">{L({ hi: `आपका समय: ${day} · ${ampm(m.slot)}`, en: `Your time: ${day} · ${ampm(m.slot)}` })}</Status>
              </p>
            ) : null
          ) : m.onlineUrl && m.answer !== "no" ? (
            <>
              <a
                href={canJoin ? m.onlineUrl : undefined}
                target="_blank"
                rel="noopener"
                aria-disabled={!canJoin}
                className={clsx(
                  "flex min-h-[48px] w-full items-center justify-center gap-2 rounded-xl text-[16px] font-semibold transition-colors",
                  canJoin ? "bg-[#0D2A5E] text-white active:bg-[#0A2149]" : "bg-[#EEF3F8] text-ink-500"
                )}
              >
                <Video className="h-5 w-5" strokeWidth={1.75} aria-hidden />
                {L({ hi: "मीटिंग जॉइन करें", en: "Join meeting" })}
              </a>
              <p className={clsx("mt-2 flex flex-wrap items-center justify-center gap-x-2 gap-y-1 text-center", SUPPORT)}>
                {m.answer === "yes" && <Status tone="ok">{L({ hi: "आ रहे हैं", en: "Coming" })}</Status>}
                <span>{L({ hi: "10 मिनट पहले खुलेगा", en: "Opens 10 minutes before" })}</span>
                {!m.answer && (
                  <>
                    <span aria-hidden>·</span>
                    <button disabled={busy} onClick={() => send("/meetings/answer", { answer: "no" })} className="-my-3 py-3 font-medium text-[#0D2A5E] underline">
                      {L({ hi: "नहीं आ पाऊँगा", en: "Can't come" })}
                    </button>
                  </>
                )}
              </p>
            </>
          ) : !m.answer ? (
            <div className="flex gap-2">
              <Button className="flex-1" disabled={busy} onClick={() => send("/meetings/answer", { answer: "yes" })}>
                {L({ hi: "आऊँगा", en: "I'll come" })}
              </Button>
              <Button kind="line" className="flex-1" disabled={busy} onClick={() => send("/meetings/answer", { answer: "no" })}>
                {L({ hi: "नहीं आ पाऊँगा", en: "Can't come" })}
              </Button>
            </div>
          ) : (
            <div className="flex min-h-[48px] items-center justify-between gap-3">
              {m.answer === "yes" ? <Status tone="ok">{L({ hi: "आ रहे हैं", en: "Coming" })}</Status> : <Status tone="mute">{L({ hi: "नहीं आ रहे", en: "Not coming" })}</Status>}
              <button disabled={busy} onClick={() => send("/meetings/answer", { answer: m.answer === "yes" ? "no" : "yes" })} className="min-h-[44px] text-right text-[14px] font-medium leading-5 text-[#0D2A5E] disabled:opacity-50">
                {m.answer === "yes" ? L({ hi: "नहीं आ पाऊँगा? बदलें", en: "Can't come after all? Change" }) : L({ hi: "आ सकते हैं? बदलें", en: "Can come after all? Change" })}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
