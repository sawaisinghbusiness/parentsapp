"use client";

import "@fontsource-variable/plus-jakarta-sans";
import "@fontsource-variable/noto-sans-devanagari";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import clsx from "clsx";
import { BookOpen, Bus, CalendarCheck, ChevronLeft, ClipboardList, IndianRupee, Megaphone, Mic, Plus, SendHorizontal, Table2, X, type LucideIcon } from "lucide-react";
import { api } from "@/lib/api";
import { useParent } from "@/lib/parent";
import { useL, useT, type Bi } from "@/lib/i18n";
import { Thinking, Thought, TypeOut } from "@/components/SahayakThinking";

/** `thought` and `fresh` stay on the phone: the server only gets role and content. */
type Turn = { role: "user" | "assistant"; content: string; thought?: { secs: number }; fresh?: boolean };
type Question = { text: Bi; icon: LucideIcon };

/** The first four are the big buttons on the opening screen; "+" lists them all. */
const QUESTIONS: Question[] = [
  { text: { hi: "कितनी फ़ीस बाकी है?", en: "How much fee is due?" }, icon: IndianRupee },
  { text: { hi: "इस महीने की हाज़िरी?", en: "Attendance this month?" }, icon: CalendarCheck },
  { text: { hi: "आज का होमवर्क?", en: "Today's homework?" }, icon: BookOpen },
  { text: { hi: "अगला एग्ज़ाम कब है?", en: "When is the next exam?" }, icon: ClipboardList },
  { text: { hi: "बस कहाँ है?", en: "Where is the bus?" }, icon: Bus },
  { text: { hi: "आज का टाइम टेबल?", en: "Today's timetable?" }, icon: Table2 },
  { text: { hi: "नई सूचनाएँ?", en: "Any new notices?" }, icon: Megaphone },
];

/** The browser's own speech-to-text (Chrome on Android has it); absent elsewhere, so the mic hides. */
const speechApi = () => (typeof window === "undefined" ? null : (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition || null);

/**
 * AI Assistant: the parent asks about their child in their own words; the backend answers from
 * that child's data only. Opens on the orb and four big questions (the user's reference, 2026-10-22).
 */
export default function AssistantPage() {
  const { child } = useParent();
  const L = useL();
  const { lang } = useT();
  const [turns, setTurns] = useState<Turn[]>([]);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [fail, setFail] = useState("");
  const [list, setList] = useState(false);
  const [listening, setListening] = useState(false);
  const [canSpeak, setCanSpeak] = useState(false);
  const end = useRef<HTMLDivElement>(null);
  const rec = useRef<any>(null);
  const first = child?.name.split(" ")[0] || "";

  useEffect(() => setCanSpeak(!!speechApi()), []);

  // A new child is a new conversation. The server gets the child's data ready now, so the first answer is quick.
  useEffect(() => {
    setTurns([]);
    setFail("");
    if (child) api("/assistant/warm", { body: { student: child.id } }).catch(() => {});
  }, [child?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    end.current?.scrollIntoView({ block: "end", behavior: "smooth" });
  }, [turns, busy]);

  useEffect(() => () => rec.current?.abort?.(), []);

  // A question handed over from Search (/assistant/?q=…) is asked straight away, once. It waits a tick, so
  // the new-child reset above has already run (React runs effects twice in development).
  const handed = useRef<string | null | undefined>(undefined);
  useEffect(() => {
    if (handed.current === undefined) handed.current = new URLSearchParams(window.location.search).get("q");
    const asked = handed.current;
    if (!asked || !child) return;
    const t = setTimeout(() => {
      handed.current = null;
      window.history.replaceState(null, "", window.location.pathname);
      ask(asked);
    }, 0);
    return () => clearTimeout(t);
  }, [child?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // Chrome on Android: the keyboard slides over the page and the bar rides up with it (bottom = keyboard
  // height), instead of first covering the bar and then jumping the page.
  useEffect(() => {
    const vk = (navigator as any).virtualKeyboard;
    if (!vk) return;
    vk.overlaysContent = true;
    const keep = () => end.current?.scrollIntoView({ block: "end" });
    vk.addEventListener?.("geometrychange", keep);
    return () => {
      vk.overlaysContent = false;
      vk.removeEventListener?.("geometrychange", keep);
    };
  }, []);

  async function ask(q: string) {
    const msg = q.trim();
    if (!msg || busy || !child) return;
    const next: Turn[] = [...turns.map((t) => ({ ...t, fresh: false })), { role: "user", content: msg }];
    const started = Date.now();
    setTurns(next);
    setText("");
    setFail("");
    setList(false);
    setBusy(true);
    try {
      const messages = next.map(({ role, content }) => ({ role, content }));
      const r = await api<{ reply: string }>("/assistant", { timeoutMs: 45_000, body: { student: child.id, messages } });
      const secs = Math.max(1, Math.round((Date.now() - started) / 1000));
      setTurns([...next, { role: "assistant", content: r.reply, thought: { secs }, fresh: true }]);
    } catch (e: any) {
      // The question goes back in the box so it can be sent again.
      setTurns(turns);
      setText(msg);
      setFail(e?.status === 0 && e?.message === "timeout" ? L({ hi: "जवाब आने में देर हो गई। फिर भेजें।", en: "The answer took too long. Try again." }) : e?.status === 0 ? L({ hi: "इंटरनेट नहीं है। फिर भेजें।", en: "No internet. Try again." }) : e?.message || L({ hi: "जवाब नहीं आया। फिर भेजें।", en: "No answer came. Try again." }));
    } finally {
      setBusy(false);
    }
  }

  /** Speak the question: what is heard goes straight in as the question. */
  function listen() {
    const Api = speechApi();
    if (!Api || busy) return;
    if (listening) {
      rec.current?.stop();
      return;
    }
    const r = new Api();
    r.lang = lang === "hi" ? "hi-IN" : "en-IN";
    r.interimResults = false;
    r.maxAlternatives = 1;
    r.onresult = (e: any) => {
      const said = String(e.results?.[0]?.[0]?.transcript || "");
      if (said) ask(said);
    };
    r.onerror = (e: any) => {
      if (e?.error === "not-allowed") setFail(L({ hi: "माइक की इजाज़त दें, फिर बोलें।", en: "Allow the microphone, then speak." }));
    };
    r.onend = () => setListening(false);
    rec.current = r;
    setFail("");
    setListening(true);
    r.start();
  }

  const empty = turns.length === 0;

  return (
    <div className="relative flex min-h-[100dvh] flex-col overflow-x-clip bg-[#F7F9FC] text-[#242628]" style={{ fontFamily: "'Plus Jakarta Sans Variable','Noto Sans Devanagari Variable',system-ui,sans-serif" }}>
      {/* Stays at the top while the chat scrolls (overflow-x-clip above, not hidden, so sticky works). */}
      <header className="pt-safe sticky top-0 z-20 border-b border-[#DCE4ED] bg-white">
        <div className="flex h-14 items-center gap-2.5 px-2">
          <Link href="/" className="grid h-11 w-11 shrink-0 place-items-center rounded-full active:bg-[#EAF0F6]" aria-label={L({ hi: "वापस", en: "Back" })}>
            <ChevronLeft className="h-6 w-6" aria-hidden />
          </Link>
          <div className="min-w-0">
            <p className="text-[17px] font-semibold leading-tight">{L({ hi: "एआई असिस्टेंट", en: "AI Assistant" })}</p>
            <p className="truncate text-[12.5px] text-[#666A6E]">{child ? L({ hi: `${child.name} · कक्षा ${child.classSec}`, en: `${child.name} · Class ${child.classSec}` }) : ""}</p>
          </div>
        </div>
      </header>

      {empty ? (
        <div className="relative flex flex-1 flex-col px-5 pb-40 pt-6">
          <h1 className="text-[20px] font-semibold leading-7">{L({ hi: "आज क्या जानना है?", en: "What would you like to know?" })}</h1>
          <p className="mt-1.5 text-[14px] leading-[21px] text-[#666A6E]">
            {L({
              hi: `${first || "बच्चे"} की फ़ीस, हाज़िरी, होमवर्क, परीक्षा, बस और सूचनाओं के बारे में पूछें। जवाब स्कूल के रिकॉर्ड से आता है।`,
              en: `Ask about ${first || "your child"}'s fees, attendance, homework, exams, bus and notices. Answers come from the school's records.`,
            })}
          </p>
          <h2 className="mb-2 mt-6 text-[13px] font-semibold text-[#666A6E]">{L({ hi: "ये पूछ सकते हैं", en: "You can ask" })}</h2>
          <div className="overflow-hidden rounded-[14px] border border-[#DCE4ED] bg-white">
            {QUESTIONS.map(({ text: q, icon: Icon }) => (
              <button key={q.en} type="button" disabled={!child} onClick={() => ask(L(q))} className="flex min-h-[52px] w-full items-center gap-3 border-t border-[#DCE4ED] px-4 text-left text-[15px] font-medium first:border-t-0 active:bg-[#EAF0F6] disabled:opacity-50">
                <Icon className="h-5 w-5 shrink-0 text-[#0D2A5E]" strokeWidth={1.7} aria-hidden />
                <span className="min-w-0 flex-1">{L(q)}</span>
              </button>
            ))}
          </div>
        </div>
      ) : (
        <div className="relative flex flex-1 flex-col gap-3 px-4 pb-[calc(11rem_+_env(keyboard-inset-height,0px))] pt-2" aria-live="polite">
          {turns.map((t, i) =>
            t.role === "user" ? (
              <p key={i} className="max-w-[78%] self-end whitespace-pre-wrap break-words rounded-[14px] rounded-br-md bg-[#0D2A5E] px-3.5 py-2.5 text-[15px] leading-snug text-white">
                {t.content}
              </p>
            ) : (
              <div key={i} className="flex max-w-[86%] flex-col gap-1 self-start">
                {t.thought && <Thought secs={t.thought.secs} />}
                <p className="whitespace-pre-wrap break-words rounded-[14px] rounded-bl-md border border-[#DCE4ED] bg-white px-3.5 py-2.5 text-[15px] leading-relaxed">
                  {t.fresh ? <TypeOut text={t.content} onGrow={() => end.current?.scrollIntoView({ block: "end" })} /> : t.content}
                </p>
              </div>
            )
          )}
          {busy && <Thinking />}
          <div ref={end} />
        </div>
      )}

      <div className="fixed inset-x-0 bottom-[env(keyboard-inset-height,0px)] z-20 mx-auto max-w-[560px] bg-[#F7F9FC] px-4 pb-[calc(1rem_+_env(safe-area-inset-bottom,0px))] pt-2">
        {list && (
          <div className="mb-2.5 overflow-hidden rounded-[14px] border border-[#DCE4ED] bg-white shadow-[0_8px_24px_rgba(13,42,94,.10)]" role="menu">
            <div className="flex items-center justify-between px-4 pb-1 pt-3">
              <p className="text-[13px] font-semibold text-[#666A6E]">{L({ hi: "ये पूछ सकते हैं", en: "You can ask" })}</p>
              <button type="button" onClick={() => setList(false)} className="grid h-9 w-9 place-items-center rounded-full active:bg-[#EAF0F6]" aria-label={L({ hi: "बंद करें", en: "Close" })}>
                <X className="h-4 w-4" aria-hidden />
              </button>
            </div>
            {QUESTIONS.map(({ text: q, icon: Icon }) => (
              <button key={q.en} type="button" role="menuitem" disabled={busy || !child} onClick={() => ask(L(q))} className="flex min-h-[48px] w-full items-center gap-3 border-t border-[#DCE4ED] px-4 text-left text-[15px] active:bg-[#EAF0F6] disabled:opacity-50">
                <Icon className="h-[18px] w-[18px] shrink-0 text-[#0D2A5E]" aria-hidden />
                {L(q)}
              </button>
            ))}
          </div>
        )}
        {!empty && !list && (
          <div className="no-scrollbar -mx-4 -mt-2 mb-0.5 flex gap-2 overflow-x-auto px-4 pb-3 pt-2">
            {QUESTIONS.map((q) => (
              <button key={q.text.en} type="button" disabled={busy || !child} onClick={() => ask(L(q.text))} className="h-10 shrink-0 rounded-[12px] border border-[#DCE4ED] bg-white px-3 text-[14px] font-medium active:bg-[#EAF0F6] disabled:opacity-50">
                {L(q.text)}
              </button>
            ))}
          </div>
        )}
        {fail && (
          <p className="pb-2 text-[13px] text-rose-600" role="alert">
            {fail}
          </p>
        )}
        <form
          className="flex items-center gap-2 rounded-[14px] border border-[#7D8998] bg-white py-1.5 pl-2 pr-2 focus-within:border-[#0D2A5E] focus-within:ring-2 focus-within:ring-[#0D2A5E]/15"
          onSubmit={(e) => {
            e.preventDefault();
            ask(text);
          }}
        >
          <button type="button" onClick={() => setList((v) => !v)} aria-expanded={list} aria-label={L({ hi: "सवालों की सूची", en: "List of questions" })} className="grid h-9 w-9 shrink-0 place-items-center rounded-[10px] bg-[#EAF0F6] text-[#0D2A5E] active:bg-[#DCE4ED]">
            <Plus className={clsx("h-[18px] w-[18px] transition-transform duration-200", list && "rotate-45")} strokeWidth={2.2} aria-hidden />
          </button>
          <label htmlFor="ask" className="sr-only">
            {L({ hi: "सवाल", en: "Question" })}
          </label>
          <input
            id="ask"
            value={text}
            maxLength={1000}
            autoComplete="off"
            onChange={(e) => setText(e.target.value)}
            placeholder={listening ? L({ hi: "सुन रहे हैं… बोलिए", en: "Listening… speak now" }) : L({ hi: "कुछ भी पूछें…", en: "Ask anything…" })}
            className="h-11 min-w-0 flex-1 bg-transparent text-[16px] outline-none placeholder:text-[#666A6E] focus-visible:ring-0 focus-visible:ring-offset-0"
          />
          {text.trim() || !canSpeak ? (
            <button type="submit" disabled={busy || !text.trim() || !child} aria-label={L({ hi: "भेजें", en: "Send" })} className="grid h-11 w-11 shrink-0 place-items-center rounded-[12px] bg-[#0D2A5E] text-white transition-opacity disabled:opacity-40">
              <SendHorizontal className="h-5 w-5" aria-hidden />
            </button>
          ) : (
            <button type="button" onClick={listen} disabled={busy || !child} aria-pressed={listening} aria-label={listening ? L({ hi: "सुनना बंद करें", en: "Stop listening" }) : L({ hi: "बोलकर पूछें", en: "Ask by speaking" })} className={clsx("grid h-11 w-11 shrink-0 place-items-center rounded-[12px] text-white transition-colors disabled:opacity-40", listening ? "bg-[#A32F35]" : "bg-[#0D2A5E]")}>
              <Mic className="h-5 w-5" aria-hidden />
            </button>
          )}
        </form>
      </div>
    </div>
  );
}
