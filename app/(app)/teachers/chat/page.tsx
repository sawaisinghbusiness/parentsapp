"use client";

import { Fragment, useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { CheckCheck, ChevronLeft, SendHorizontal } from "lucide-react";
import { api, ApiError } from "@/lib/api";
import { useParent } from "@/lib/parent";
import { useL, useT, type Lang } from "@/lib/i18n";
import { ampm } from "@/lib/meetings";
import { clockOf, dayLine, type ChatMessage, type Thread } from "@/lib/teachers";
import { Avatar, ErrorCard, Skeleton } from "@/components/ui";

/** New replies show without a refresh: the chat is asked again this often while it is on screen. */
const POLL_MS = 8000;

/** "Fri, October": weekday and month formatted apart (together, some browsers print "Fri (month: October)"). */
const monthDay = (iso: string, lang: Lang) => {
  const d = new Date(iso + "T00:00:00");
  const loc = lang === "hi" ? "hi-IN" : "en-IN";
  return `${d.toLocaleDateString(loc, { weekday: "short" })}, ${d.toLocaleDateString(loc, { month: "long" })}`;
};

/** One conversation with one of the child's teachers. Same look as the rest of the app. */
export default function TeacherChatPage() {
  const { child } = useParent();
  const L = useL();
  const { lang } = useT();
  const [teacherId, setTeacherId] = useState("");
  const [data, setData] = useState<Thread>();
  const [error, setError] = useState<ApiError | null>(null);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [fail, setFail] = useState("");
  const end = useRef<HTMLDivElement>(null);
  const count = useRef(0);

  useEffect(() => {
    setTeacherId(new URLSearchParams(window.location.search).get("id") || "");
  }, []);

  const load = useCallback(async () => {
    if (!child || !teacherId) return;
    try {
      setData(await api<Thread>(`/teachers/chat?student=${child.id}&teacher=${teacherId}`));
      setError(null);
    } catch (e) {
      const err = e instanceof ApiError ? e : new ApiError(0, "offline");
      if (err.status === 401) window.location.replace("/login/");
      setError(err);
    }
  }, [child, teacherId]);

  useEffect(() => {
    load();
    const t = setInterval(() => document.visibilityState === "visible" && load(), POLL_MS);
    return () => clearInterval(t);
  }, [load]);

  // Down to the newest message when one arrives.
  useEffect(() => {
    const n = data?.messages.length || 0;
    if (n !== count.current) end.current?.scrollIntoView({ block: "end", behavior: count.current ? "smooth" : "auto" });
    count.current = n;
  }, [data]);

  async function post(path: string, body: Record<string, unknown>) {
    if (!child || busy) return false;
    setBusy(true);
    setFail("");
    try {
      setData(await api<Thread>(path, { body: { student: child.id, ...body } }));
      return true;
    } catch (e: any) {
      setFail(e?.status === 0 ? L({ hi: "इंटरनेट नहीं है। फिर भेजें।", en: "No internet. Try again." }) : e?.message || L({ hi: "नहीं भेज पाए।", en: "Could not send. Try again." }));
      return false;
    } finally {
      setBusy(false);
    }
  }

  async function send() {
    const msg = text.trim();
    if (!msg) return;
    if (await post("/teachers/send", { teacher: teacherId, text: msg })) setText("");
  }

  const t = data?.teacher;
  const role = t ? [t.classTeacher ? L({ hi: "क्लास टीचर", en: "Class teacher" }) : "", t.subjects.join(", ")].filter(Boolean).join(" · ") : "";

  return (
    <div className="flex min-h-[100dvh] flex-col bg-ink-50">
      <header className="pt-safe sticky top-0 z-20 border-b border-ink-100 bg-white">
        <div className="flex h-14 items-center gap-2 pl-1.5 pr-4">
          <Link href="/teachers/" className="grid h-11 w-11 shrink-0 place-items-center rounded-full text-ink-900 active:bg-ink-100" aria-label={L({ hi: "वापस", en: "Back" })}>
            <ChevronLeft className="h-6 w-6" aria-hidden />
          </Link>
          {t ? (
            <>
              <Avatar name={t.name} url={t.photoUrl} size={36} />
              <div className="min-w-0">
                <p className="truncate text-[16px] font-semibold leading-tight text-ink-900">{t.name}</p>
                {role && <p className="truncate text-[12.5px] text-ink-500">{role}</p>}
              </div>
            </>
          ) : (
            <Skeleton className="h-9 w-40 rounded-lg" />
          )}
        </div>
      </header>

      <div className="flex-1 px-4 pb-28 pt-3" aria-live="polite">
        {!data ? (
          error ? (
            <ErrorCard offline={error.status === 0} onRetry={load} />
          ) : (
            <div className="space-y-3">
              <Skeleton className="ml-auto h-14 w-3/4 rounded-2xl" />
              <Skeleton className="h-20 w-4/5 rounded-2xl" />
            </div>
          )
        ) : data.messages.length === 0 ? (
          <div className="mx-auto mt-12 max-w-[280px] text-center">
            <span className="mx-auto block w-fit">
              <Avatar name={data.teacher.name} url={data.teacher.photoUrl} size={64} />
            </span>
            <p className="mt-3 text-[17px] font-semibold text-ink-900">{data.teacher.name}</p>
            <p className="mt-1 text-[14.5px] leading-snug text-ink-500">{L({ hi: "अपने बच्चे के बारे में कुछ भी पूछें। टीचर यहीं जवाब देंगे।", en: "Ask anything about your child. The teacher will reply here." })}</p>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {data.messages.map((m, i) => {
              const newDay = i === 0 || new Date(m.at).toDateString() !== new Date(data.messages[i - 1].at).toDateString();
              return (
                <Fragment key={m.id}>
                  {newDay && <p className="self-center pb-0.5 pt-2 text-[12.5px] font-medium text-ink-400">{dayLine(m.at, lang)}</p>}
                  {m.meeting ? <MeetCard m={m} today={data.today} busy={busy} onAnswer={(a) => post("/teachers/meet", { message: m.id, answer: a })} /> : <Bubble m={m} lang={lang} />}
                </Fragment>
              );
            })}
          </div>
        )}
        <div ref={end} />
      </div>

      <div className="pb-safe fixed inset-x-0 bottom-0 z-20 mx-auto max-w-[560px] border-t border-ink-100 bg-white">
        {fail && (
          <p className="px-4 pt-2 text-[13px] text-rose-600" role="alert">
            {fail}
          </p>
        )}
        <form
          className="flex items-end gap-2 px-3 py-2.5"
          onSubmit={(e) => {
            e.preventDefault();
            send();
          }}
        >
          <label htmlFor="msg" className="sr-only">
            {L({ hi: "संदेश", en: "Message" })}
          </label>
          <textarea
            id="msg"
            rows={1}
            value={text}
            maxLength={1000}
            onChange={(e) => setText(e.target.value)}
            placeholder={L({ hi: "संदेश लिखें", en: "Write a message" })}
            className="max-h-32 min-h-[46px] flex-1 resize-none rounded-xl border border-ink-200 bg-white px-3.5 py-[11px] text-[16px] leading-snug text-ink-900 outline-none placeholder:text-ink-400 focus:border-brand-600 focus:ring-2 focus:ring-brand-100"
          />
          <button type="submit" disabled={busy || !text.trim() || !data} aria-label={L({ hi: "भेजें", en: "Send" })} className="grid h-[46px] w-[46px] shrink-0 place-items-center rounded-xl bg-brand-700 text-white transition-opacity disabled:opacity-40">
            <SendHorizontal className="h-5 w-5" aria-hidden />
          </button>
        </form>
      </div>
    </div>
  );
}

function Bubble({ m, lang }: { m: ChatMessage; lang: Lang }) {
  const mine = m.from === "parent";
  return (
    <div className={mine ? "max-w-[80%] self-end rounded-2xl rounded-br-md bg-brand-700 px-3.5 pb-1.5 pt-2 text-white" : "max-w-[80%] self-start rounded-2xl rounded-bl-md border border-ink-100 bg-white px-3.5 pb-1.5 pt-2 text-ink-900"}>
      <p className="whitespace-pre-wrap break-words text-[15px] leading-snug">{m.text}</p>
      <p className={`mt-0.5 flex items-center justify-end gap-1 text-[11px] ${mine ? "text-white/70" : "text-ink-400"}`}>
        {clockOf(m.at, lang)}
        {mine && <CheckCheck className="h-3.5 w-3.5" aria-hidden />}
      </p>
    </div>
  );
}

/** The teacher's time to meet: Okay (it goes to Meetings) or Another time. */
function MeetCard({ m, today, busy, onAnswer }: { m: ChatMessage; today: string; busy: boolean; onAnswer: (a: "yes" | "other") => void }) {
  const L = useL();
  const { lang } = useT();
  const x = m.meeting!;
  const past = x.date < today;
  const place = { school: L({ hi: "स्कूल में", en: "In school" }), call: L({ hi: "फ़ोन पर", en: "Phone call" }), online: L({ hi: "ऑनलाइन", en: "Online" }) }[x.place];
  return (
    <div className="w-[84%] max-w-[320px] self-start overflow-hidden rounded-2xl border border-ink-100 bg-white">
      <p className="px-4 pt-3 text-[12.5px] font-semibold text-ink-500">{L({ hi: "मिलने का समय", en: "Meeting time" })}</p>
      <div className="flex items-center gap-3 px-4 pb-3 pt-1">
        <b className="tnum text-[32px] font-bold leading-none text-brand-700">{+x.date.slice(8)}</b>
        <span className="text-[14px] leading-snug text-ink-700">
          {monthDay(x.date, lang)} · {ampm(x.time)}
          <br />
          <span className="text-ink-500">
            {place} · {x.minutes} {L({ hi: "मिनट", en: "min" })}
          </span>
        </span>
      </div>
      {x.status === "waiting" && !past ? (
        <div className="grid grid-cols-2 gap-2 border-t border-ink-100 p-3">
          <button disabled={busy} onClick={() => onAnswer("yes")} className="h-10 rounded-xl bg-brand-700 text-[14.5px] font-semibold text-white disabled:opacity-50">
            {L({ hi: "ठीक है", en: "Okay" })}
          </button>
          <button disabled={busy} onClick={() => onAnswer("other")} className="h-10 rounded-xl border border-ink-200 bg-white text-[14.5px] font-semibold text-ink-800 disabled:opacity-50">
            {L({ hi: "दूसरा समय", en: "Another time" })}
          </button>
        </div>
      ) : (
        <p className="flex items-center gap-1.5 border-t border-ink-100 px-4 py-2.5 text-[13.5px] font-medium">
          {x.status === "yes" ? (
            <>
              <span className="h-2 w-2 rounded-full bg-jade-600" aria-hidden />
              <span className="text-jade-700">{L({ hi: "आप आएँगे", en: "You're coming" })}</span>
              <Link href="/meetings/" className="ml-auto font-semibold text-brand-700">
                {L({ hi: "मीटिंग देखें", en: "See in Meetings" })}
              </Link>
            </>
          ) : (
            <span className="text-ink-500">{x.status === "other" ? L({ hi: "दूसरा समय माँगा", en: "You asked for another time" }) : L({ hi: "यह समय निकल गया", en: "This time has passed" })}</span>
          )}
        </p>
      )}
    </div>
  );
}
