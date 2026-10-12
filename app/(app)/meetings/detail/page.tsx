"use client";

import { useEffect, useState } from "react";
import clsx from "clsx";
import { CalendarDays, MapPin, Users, Video } from "lucide-react";
import { api, useApi } from "@/lib/api";
import { useParent } from "@/lib/parent";
import { useL, useT } from "@/lib/i18n";
import { ampm, type MeetingDetail } from "@/lib/meetings";
import { ErrorCard, Skeleton } from "@/components/ui";

/** One meeting: when and where, the agenda, and either a PTM time to pick or "I'll come / Can't come". */
export default function MeetingDetailPage() {
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
    return <Skeleton className="h-80 w-full rounded-[20px]" />;
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
      if (e?.status === 409) reload();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="animate-rise space-y-4 pb-24">
      <div className="px-0.5">
        <h2 className="text-[22px] font-extrabold leading-tight tracking-[-0.01em]">{m.title}</h2>
        <p className="mt-0.5 text-[13.5px] text-ink-500">{[m.host, m.audience].filter(Boolean).join(" · ")}</p>
      </div>

      <ul className="overflow-hidden rounded-[20px] border border-ink-100 bg-white">
        <li className="flex items-center gap-3 px-4 py-3">
          <CalendarDays className="h-[18px] w-[18px] text-brand-700" aria-hidden />
          <span>
            <span className="block text-[14px] font-medium">{day}</span>
            <span className="block text-[12.5px] text-ink-500">
              {ampm(m.start)} – {ampm(m.end)}
            </span>
          </span>
        </li>
        <li className="flex items-center gap-3 border-t border-ink-100 px-4 py-3">
          {m.onlineUrl ? <Video className="h-[18px] w-[18px] text-brand-700" aria-hidden /> : <MapPin className="h-[18px] w-[18px] text-brand-700" aria-hidden />}
          <span className="text-[14px] font-medium">{m.onlineUrl ? L({ hi: "ऑनलाइन मीटिंग", en: "Online meeting" }) : m.place || L({ hi: "स्कूल में", en: "At school" })}</span>
        </li>
        {(m.agenda || m.coming > 0) && (
          <li className="flex items-start gap-3 border-t border-ink-100 px-4 py-3">
            <Users className="mt-0.5 h-[18px] w-[18px] text-brand-700" aria-hidden />
            <span>
              {m.coming > 0 && <span className="block text-[14px] font-medium">{L({ hi: `${m.coming} परिवार आ रहे हैं`, en: `${m.coming} families attending` })}</span>}
              {m.agenda && <span className="block whitespace-pre-line text-[12.5px] leading-snug text-ink-500">{m.agenda}</span>}
            </span>
          </li>
        )}
      </ul>

      {m.kind === "ptm" && !over && (
        <section>
          <p className="mb-2 px-0.5 text-[13px] font-semibold text-ink-500">{L({ hi: "अपना समय चुनें", en: "Pick your time" })}</p>
          <div className="grid grid-cols-3 gap-2 rounded-[20px] border border-ink-100 bg-white p-3.5">
            {m.slots.map((s) => {
              const on = chosen === s.time;
              return (
                <button
                  key={s.time}
                  disabled={s.taken || busy}
                  onClick={() => setPick(s.time)}
                  aria-pressed={on}
                  className={clsx(
                    "tnum h-11 rounded-xl text-[14px] font-semibold transition-colors",
                    on ? "bg-brand-700 text-white" : s.taken ? "bg-ink-50 text-ink-300" : "text-ink-900 ring-1 ring-inset ring-ink-200 active:bg-ink-50"
                  )}
                >
                  {ampm(s.time).replace(/ (AM|PM)$/, "")}
                </button>
              );
            })}
          </div>
          <p className="mt-2 px-0.5 text-[12.5px] text-ink-500">{L({ hi: "हल्के समय दूसरे पैरेंट्स ले चुके हैं", en: "Faded times are taken by other parents" })}</p>
        </section>
      )}

      {fail && <p className="text-[13px] text-rose-600">{fail}</p>}

      {!over && (
        <div className="pb-safe fixed inset-x-0 bottom-[66px] z-10 mx-auto max-w-[560px] bg-gradient-to-t from-white via-white to-white/0 px-4 pb-3 pt-6">
          {m.kind === "ptm" ? (
            pick && pick !== m.slot ? (
              <button disabled={busy} onClick={() => send("/meetings/slot", { time: pick })} className="h-[52px] w-full rounded-2xl bg-brand-700 text-[15px] font-bold text-white shadow-[0_6px_16px_rgba(15,58,136,.25)] disabled:opacity-60">
                {L({ hi: `${day} · ${ampm(pick)} पक्का करें`, en: `Confirm ${day} · ${ampm(pick)}` })}
              </button>
            ) : m.slot ? (
              <p className="py-3 text-center text-[14px] font-semibold text-jade-700">{L({ hi: `आपका समय: ${day} · ${ampm(m.slot)}`, en: `Your time: ${day} · ${ampm(m.slot)}` })}</p>
            ) : null
          ) : m.onlineUrl && m.answer !== "no" ? (
            <>
              <a href={canJoin ? m.onlineUrl : undefined} target="_blank" rel="noopener" aria-disabled={!canJoin} className={clsx("flex h-[52px] w-full items-center justify-center gap-2 rounded-2xl text-[15px] font-bold", canJoin ? "bg-brand-700 text-white shadow-[0_6px_16px_rgba(15,58,136,.25)]" : "bg-ink-100 text-ink-400")}>
                <Video className="h-5 w-5" aria-hidden />
                {L({ hi: "मीटिंग जॉइन करें", en: "Join meeting" })}
              </a>
              <p className="mt-2 text-center text-[12.5px] text-ink-500">
                {L({ hi: "10 मिनट पहले खुलेगा", en: "Opens 10 minutes before" })}
                {!m.answer && (
                  <>
                    {" · "}
                    <button onClick={() => send("/meetings/answer", { answer: "no" })} className="underline">
                      {L({ hi: "नहीं आ पाऊँगा", en: "Can't come" })}
                    </button>
                  </>
                )}
              </p>
            </>
          ) : !m.answer ? (
            <div className="flex gap-2">
              <button disabled={busy} onClick={() => send("/meetings/answer", { answer: "yes" })} className="h-[52px] flex-1 rounded-2xl bg-brand-700 text-[15px] font-bold text-white disabled:opacity-60">
                {L({ hi: "आऊँगा", en: "I'll come" })}
              </button>
              <button disabled={busy} onClick={() => send("/meetings/answer", { answer: "no" })} className="h-[52px] flex-1 rounded-2xl bg-white text-[15px] font-bold text-ink-900 ring-1 ring-inset ring-ink-200 disabled:opacity-60">
                {L({ hi: "नहीं आ पाऊँगा", en: "Can't come" })}
              </button>
            </div>
          ) : (
            <button disabled={busy} onClick={() => send("/meetings/answer", { answer: m.answer === "yes" ? "no" : "yes" })} className="w-full py-3 text-center text-[13.5px] font-semibold text-brand-700">
              {m.answer === "yes" ? L({ hi: "नहीं आ पाऊँगा? बदलें", en: "Can't come after all? Change" }) : L({ hi: "आ सकते हैं? बदलें", en: "Can come after all? Change" })}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
