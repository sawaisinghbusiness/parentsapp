"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import clsx from "clsx";
import { BookOpen, Bus, CalendarCheck, ChevronLeft, ClipboardList, IndianRupee, Megaphone, Mic, Plus, SendHorizontal, Table2, X, type LucideIcon } from "lucide-react";
import { api } from "@/lib/api";
import { useParent } from "@/lib/parent";
import { useL, useT, type Bi } from "@/lib/i18n";
import { Thinking, Thought, TypeOut } from "@/components/SahayakThinking";

/** `thought` and `fresh` stay on the phone: the server only gets role and content. */
type Turn = { role: "user" | "assistant"; content: string; thought?: { secs: number; steps: Bi[] }; fresh?: boolean };
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

/** What the "thinking" lines say, from the question's topic. They move on a timer (see SahayakThinking). */
function stepsFor(question: string, name: string): Bi[] {
  const q = question.toLowerCase();
  const n = { hi: name || "बच्चे", en: name || "your child" };
  const write = { hi: "जवाब लिख रहा हूँ", en: "Writing the answer" };
  if (/fee|फ़ीस|फीस|बकाया|baki|paisa|पैसे/.test(q)) return [{ hi: `${n.hi} की फ़ीस देख रहा हूँ`, en: `Checking ${n.en}'s fees` }, { hi: "जमा और बाकी रकम मिला रहा हूँ", en: "Matching paid and due amounts" }, write];
  if (/attend|ha[sz]i?ri|हाज़िरी|हाजिरी|absent|present|गैरहाज़िर/.test(q)) return [{ hi: `${n.hi} की हाज़िरी देख रहा हूँ`, en: `Checking ${n.en}'s attendance` }, { hi: "दिन गिन रहा हूँ", en: "Counting the days" }, write];
  if (/home ?work|होमवर्क|गृहकार्य/.test(q)) return [{ hi: `${n.hi} की क्लास का होमवर्क देख रहा हूँ`, en: `Checking ${n.en}'s class homework` }, { hi: "विषय के हिसाब से छाँट रहा हूँ", en: "Sorting by subject" }, write];
  if (/exam|test|result|marks|pariksha|paper|परीक्षा|एग्ज़ाम|एग्जाम|रिज़ल्ट|नंबर/.test(q)) return [{ hi: "एग्ज़ाम की जानकारी देख रहा हूँ", en: "Checking exams" }, { hi: `${n.hi} के नंबर देख रहा हूँ`, en: `Checking ${n.en}'s marks` }, write];
  if (/bus|van|transport|बस|वैन/.test(q)) return [{ hi: "बस की जानकारी देख रहा हूँ", en: "Checking the bus" }, { hi: "रूट और स्टॉप देख रहा हूँ", en: "Checking route and stop" }, write];
  if (/time ?table|period|टाइम टेबल|पीरियड/.test(q)) return [{ hi: "टाइम टेबल देख रहा हूँ", en: "Checking the timetable" }, { hi: "आज के पीरियड छाँट रहा हूँ", en: "Picking today's periods" }, write];
  if (/notice|event|holiday|program|function|chh?utti|suchna|सूचना|छुट्टी|कार्यक्रम|प्रोग्राम/.test(q)) return [{ hi: "सूचनाएँ और कार्यक्रम देख रहा हूँ", en: "Checking notices and events" }, { hi: "तारीखें मिला रहा हूँ", en: "Matching the dates" }, write];
  return [{ hi: "सवाल समझ रहा हूँ", en: "Reading the question" }, { hi: `${n.hi} की जानकारी देख रहा हूँ`, en: `Checking ${n.en}'s details` }, write];
}

/** The browser's own speech-to-text (Chrome on Android has it); absent elsewhere, so the mic hides. */
const speechApi = () => (typeof window === "undefined" ? null : (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition || null);

/** School Sahayak's face: a purple orb with two eyes that floats and blinks. */
function Orb({ size, still }: { size: number; still?: boolean }) {
  const eyeW = Math.round(size * 0.107);
  const eyeH = Math.round(size * 0.227);
  return (
    <span className={clsx("sahayak-orb flex shrink-0 items-center justify-center rounded-full", !still && "sahayak-float")} style={{ width: size, height: size, gap: Math.round(size * 0.147) }} aria-hidden>
      <span className="sahayak-eye rounded-full bg-white" style={{ width: eyeW, height: eyeH }} />
      <span className="sahayak-eye rounded-full bg-white" style={{ width: eyeW, height: eyeH }} />
    </span>
  );
}

/**
 * School Sahayak: the parent asks about their child in their own words; the backend answers from
 * that child's data only. Opens on the orb and four big questions (the user's reference, 2026-10-22).
 */
export default function AssistantPage() {
  const { child } = useParent();
  const L = useL();
  const { lang } = useT();
  const [turns, setTurns] = useState<Turn[]>([]);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [steps, setSteps] = useState<Bi[]>([]);
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
    const thinking = stepsFor(msg, first);
    const started = Date.now();
    setTurns(next);
    setText("");
    setFail("");
    setList(false);
    setSteps(thinking);
    setBusy(true);
    try {
      const messages = next.map(({ role, content }) => ({ role, content }));
      const r = await api<{ reply: string }>("/assistant", { timeoutMs: 45_000, body: { student: child.id, messages } });
      const secs = Math.max(1, Math.round((Date.now() - started) / 1000));
      setTurns([...next, { role: "assistant", content: r.reply, thought: { secs, steps: thinking }, fresh: true }]);
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
    <div className="sahayak-bg relative flex min-h-[100dvh] flex-col overflow-hidden text-[#2A2350]">
      {/* Soft round shapes behind everything, as in the reference. */}
      <span aria-hidden className="pointer-events-none absolute -left-24 top-[420px] h-64 w-64 rounded-full bg-[radial-gradient(circle_at_35%_35%,#fff_0%,#E9DDFF_55%,#D9C8FF_100%)] opacity-70" />
      <span aria-hidden className="pointer-events-none absolute -right-16 top-24 h-48 w-48 rounded-full bg-[radial-gradient(circle_at_35%_35%,#fff_0%,#FBDDF2_55%,#F5C6E8_100%)] opacity-70" />

      <header className="pt-safe sticky top-0 z-20">
        <div className="flex h-14 items-center gap-2.5 px-2">
          <Link href="/" className="grid h-11 w-11 shrink-0 place-items-center rounded-full active:bg-white/60" aria-label={L({ hi: "वापस", en: "Back" })}>
            <ChevronLeft className="h-6 w-6" aria-hidden />
          </Link>
          {empty ? (
            <p className="flex-1 pr-11 text-center text-[15px] font-semibold text-[#5A5380]">{L({ hi: "स्कूल सहायक", en: "School Sahayak" })}</p>
          ) : (
            <>
              <Orb size={36} still />
              <div className="min-w-0">
                <p className="text-[16px] font-semibold leading-tight">{L({ hi: "स्कूल सहायक", en: "School Sahayak" })}</p>
                <p className="truncate text-[12.5px] text-[#6B6492]">{first && L({ hi: `${first} के बारे में`, en: `About ${first}` })}</p>
              </div>
            </>
          )}
        </div>
      </header>

      {empty ? (
        <div className="relative flex flex-1 flex-col px-4 pb-40">
          <div className="mt-4 text-center">
            <p className="text-[26px] font-semibold leading-tight">{first ? `Hello, ${first}!` : "Hello!"}</p>
            <p className="mt-1 text-[21px] font-medium leading-snug text-[#3E3670]">{L({ hi: "आज क्या जानना है?", en: "What would you like to know?" })}</p>
          </div>
          <div className="flex flex-1 flex-col items-center justify-center gap-5 py-6">
            <Orb size={150} />
            <span aria-hidden className="sahayak-shadow h-3.5 w-28 rounded-full bg-[#6A45E0]/20" />
            <p className="max-w-[270px] text-center text-[14px] leading-snug text-[#5A5380]">
              {L({ hi: `${first || "बच्चे"} की फ़ीस, हाज़िरी, होमवर्क या एग्ज़ाम के बारे में पूछें – हिंदी या English में।`, en: `Ask about ${first || "your child"}'s fees, attendance, homework or exams – in Hindi or English.` })}
            </p>
          </div>
          <div className="grid grid-cols-2 gap-2.5">
            {QUESTIONS.slice(0, 4).map(({ text: q, icon: Icon }) => (
              <button key={q.en} type="button" disabled={!child} onClick={() => ask(L(q))} className="flex min-h-[48px] items-center gap-2 rounded-[14px] border border-[#E3DCFA] bg-white/85 px-3 py-2 text-left text-[14px] font-medium leading-tight active:bg-white disabled:opacity-50">
                <Icon className="h-[18px] w-[18px] shrink-0 text-[#6A45E0]" strokeWidth={2} aria-hidden />
                {L(q)}
              </button>
            ))}
          </div>
        </div>
      ) : (
        <div className="relative flex flex-1 flex-col gap-3 px-4 pb-[calc(11rem_+_env(keyboard-inset-height,0px))] pt-2" aria-live="polite">
          {turns.map((t, i) =>
            t.role === "user" ? (
              <p key={i} className="max-w-[78%] self-end whitespace-pre-wrap break-words rounded-[18px] rounded-br-md bg-[#6A45E0] px-3.5 py-2.5 text-[15px] leading-snug text-white">
                {t.content}
              </p>
            ) : (
              <div key={i} className="flex max-w-[86%] flex-col gap-1 self-start">
                {t.thought && <Thought secs={t.thought.secs} steps={t.thought.steps} />}
                <p className="whitespace-pre-wrap break-words rounded-[18px] rounded-bl-md border border-[#E8E2FB] bg-white/90 px-3.5 py-2.5 text-[15px] leading-relaxed">
                  {t.fresh ? <TypeOut text={t.content} onGrow={() => end.current?.scrollIntoView({ block: "end" })} /> : t.content}
                </p>
              </div>
            )
          )}
          {busy && <Thinking steps={steps} />}
          <div ref={end} />
        </div>
      )}

      <div className="fixed inset-x-0 bottom-[env(keyboard-inset-height,0px)] z-20 mx-auto max-w-[560px] px-4 pb-[calc(1.25rem_+_env(safe-area-inset-bottom,0px))] pt-2">
        {list && (
          <div className="sahayak-glass mb-2.5 overflow-hidden rounded-2xl" role="menu">
            <div className="flex items-center justify-between px-4 pb-1 pt-3">
              <p className="text-[13px] font-semibold text-[#6B6492]">{L({ hi: "ये पूछ सकते हैं", en: "You can ask" })}</p>
              <button type="button" onClick={() => setList(false)} className="grid h-9 w-9 place-items-center rounded-full active:bg-[#F1ECFF]" aria-label={L({ hi: "बंद करें", en: "Close" })}>
                <X className="h-4 w-4" aria-hidden />
              </button>
            </div>
            {QUESTIONS.map(({ text: q, icon: Icon }) => (
              <button key={q.en} type="button" role="menuitem" disabled={busy || !child} onClick={() => ask(L(q))} className="flex min-h-[48px] w-full items-center gap-3 border-t border-[#F1ECFF] px-4 text-left text-[15px] active:bg-[#F7F4FF] disabled:opacity-50">
                <Icon className="h-[18px] w-[18px] shrink-0 text-[#6A45E0]" aria-hidden />
                {L(q)}
              </button>
            ))}
          </div>
        )}
        {!empty && !list && (
          <div className="no-scrollbar -mx-4 -mt-2 mb-0.5 flex gap-2 overflow-x-auto px-4 pb-3 pt-2">
            {QUESTIONS.map((q) => (
              <button key={q.text.en} type="button" disabled={busy || !child} onClick={() => ask(L(q.text))} className="sahayak-glass h-10 shrink-0 rounded-xl px-3 text-[14px] font-medium active:bg-white disabled:opacity-50">
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
          className="sahayak-glass flex items-center gap-2 rounded-[30px] py-2 pl-2 pr-2"
          onSubmit={(e) => {
            e.preventDefault();
            ask(text);
          }}
        >
          <button type="button" onClick={() => setList((v) => !v)} aria-expanded={list} aria-label={L({ hi: "सवालों की सूची", en: "List of questions" })} className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[#F1ECFF] text-[#6A45E0] active:bg-[#E6DEFF]">
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
            className="h-11 min-w-0 flex-1 bg-transparent text-[16px] outline-none placeholder:text-[#8A84A8] focus-visible:ring-0 focus-visible:ring-offset-0"
          />
          {text.trim() || !canSpeak ? (
            <button type="submit" disabled={busy || !text.trim() || !child} aria-label={L({ hi: "भेजें", en: "Send" })} className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-[#6A45E0] text-white transition-opacity disabled:opacity-40">
              <SendHorizontal className="h-5 w-5" aria-hidden />
            </button>
          ) : (
            <button type="button" onClick={listen} disabled={busy || !child} aria-pressed={listening} aria-label={listening ? L({ hi: "सुनना बंद करें", en: "Stop listening" }) : L({ hi: "बोलकर पूछें", en: "Ask by speaking" })} className={clsx("grid h-11 w-11 shrink-0 place-items-center rounded-full text-white transition-colors disabled:opacity-40", listening ? "animate-pulse bg-rose-500" : "bg-[#6A45E0]")}>
              <Mic className="h-5 w-5" aria-hidden />
            </button>
          )}
        </form>
      </div>
    </div>
  );
}
