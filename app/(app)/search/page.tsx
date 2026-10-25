"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import clsx from "clsx";
import { BookOpen, CalendarDays, Megaphone, Mic, Search, Sparkles } from "lucide-react";
import { useApi } from "@/lib/api";
import { useParent } from "@/lib/parent";
import { useL, useT, type Bi } from "@/lib/i18n";
import { weekdayDate } from "@/lib/format";
import { EventPicture } from "@/components/art";
import { QuickIcon, type QuickIconName } from "@/components/QuickIcons";

interface Hw {
  id: string;
  subject: string;
  title: string;
  details: string;
  assignedOn: string;
}
interface Notice {
  id: string;
  title: string;
  body: string;
  date: string;
}

/** Questions that go straight to School Sahayak. */
const ASK: Bi[] = [
  { hi: "आज का होमवर्क?", en: "Today's homework?" },
  { hi: "कितनी फ़ीस बाकी है?", en: "How much fee is due?" },
  { hi: "अगला एग्ज़ाम कब है?", en: "When is the next exam?" },
  { hi: "बस कहाँ है?", en: "Where is the bus?" },
];
// The same orange tiles as Home's Quick Actions (components/QuickIcons).
const POPULAR: { href: string; text: Bi; icon: QuickIconName }[] = [
  { href: "/fees/", text: { hi: "फ़ीस", en: "Fees" }, icon: "fees" },
  { href: "/attendance/", text: { hi: "हाज़िरी", en: "Attendance" }, icon: "attendance" },
  { href: "/homework/", text: { hi: "होमवर्क", en: "Homework" }, icon: "homework" },
  { href: "/calendar/?tab=timetable", text: { hi: "टाइम टेबल", en: "Timetable" }, icon: "timetable" },
];
const askHref = (q: string) => `/assistant/?q=${encodeURIComponent(q)}`;

/** The browser's own speech-to-text (Chrome on Android has it); absent elsewhere, so the mic hides. */
const speechApi = () => (typeof window === "undefined" ? null : (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition || null);

/**
 * Search, opening like PhonePe's (the user's reference, 2026-10-23): a coloured glow wakes under the bar,
 * "Ask School Sahayak" types itself in, the chips, Popular and New for you ease in one after another, and
 * after a few seconds the glow settles and the hint becomes "Type or speak here…". Typing searches this
 * child's homework and the school's notices; any question can also go to School Sahayak.
 */
export default function SearchPage() {
  const { child } = useParent();
  const L = useL();
  const { lang } = useT();
  const [q, setQ] = useState("");
  const [typed, setTyped] = useState(0);
  const [settled, setSettled] = useState(false);
  const [canSpeak, setCanSpeak] = useState(false);
  const [listening, setListening] = useState(false);
  const rec = useRef<any>(null);
  const hw = useApi<{ items: Hw[] }>(child ? `/homework?student=${child.id}` : null);
  const notices = useApi<{ notices: Notice[] }>(child ? `/notices?student=${child.id}` : null);
  // Same request as Home, so it is usually already on the phone.
  const home = useApi<{ events?: { id: string; title: string; date: string; coverUrl?: string | null; scene?: string | null }[] }>(child ? `/home?student=${child.id}` : null);
  const prompt = L({ hi: "स्कूल सहायक से पूछें", en: "Ask School Sahayak" });

  // The hint types itself in, then settles into a plain one.
  useEffect(() => {
    setCanSpeak(!!speechApi());
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) {
      setSettled(true);
      return;
    }
    let n = 0;
    const tick = setInterval(() => {
      n += 1;
      setTyped(n);
      if (n >= prompt.length) clearInterval(tick);
    }, 55);
    const calm = setTimeout(() => setSettled(true), 4300);
    return () => {
      clearInterval(tick);
      clearTimeout(calm);
    };
  }, [prompt]);
  useEffect(() => () => rec.current?.abort?.(), []);

  function listen() {
    const Api = speechApi();
    if (!Api) return;
    if (listening) {
      rec.current?.stop();
      return;
    }
    const r = new Api();
    r.lang = lang === "hi" ? "hi-IN" : "en-IN";
    r.interimResults = false;
    r.onresult = (e: any) => setQ(String(e.results?.[0]?.[0]?.transcript || ""));
    r.onend = () => setListening(false);
    rec.current = r;
    setListening(true);
    r.start();
  }

  const term = q.trim().toLowerCase();
  const found = useMemo(() => {
    if (term.length < 2) return null;
    const has = (...xs: string[]) => xs.some((x) => x.toLowerCase().includes(term));
    return {
      hw: (hw.data?.items || []).filter((h) => has(h.subject, h.title, h.details)),
      notices: (notices.data?.notices || []).filter((n) => has(n.title, n.body)),
    };
  }, [term, hw.data, notices.data]);
  // New for you: the next school events, then the latest notices.
  const latest = [
    ...(home.data?.events || []).slice(0, 3).map((e) => ({ id: `e${e.id}`, href: "/events/", title: e.title, date: e.date, cover: e.coverUrl || null, scene: e.scene || null, kind: "event" as const })),
    ...(notices.data?.notices || []).slice(0, 2).map((n) => ({ id: `n${n.id}`, href: "/notice/", title: n.title, date: n.date, cover: null, scene: null, kind: "notice" as const })),
  ];
  const stagger = (i: number) => ({ animationDelay: `${1.3 + i * 0.12}s` });

  return (
    <div className="space-y-5 pb-4 pt-2">
      <div className="relative">
        {!settled && <span aria-hidden className="search-glow" />}
        <label className="relative flex h-14 items-center gap-3 rounded-full border border-ink-100 bg-[#F3F5F6] pl-[18px] pr-2">
          <Search className="h-[22px] w-[22px] shrink-0 text-ink-800" strokeWidth={2} aria-hidden />
          <span className="relative min-w-0 flex-1">
            <input
              type="search"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              enterKeyHint="search"
              aria-label={L({ hi: "खोजें या पूछें", en: "Search or ask" })}
              placeholder={settled ? L({ hi: "लिखें या बोलें…", en: "Type or speak here…" }) : ""}
              className="h-10 w-full bg-transparent text-[16px] outline-none placeholder:text-ink-400 focus-visible:ring-0 focus-visible:ring-offset-0"
            />
            {/* The typed-in hint, in the glow's colours, until something is written or it settles. */}
            {!settled && !q && (
              <span aria-hidden className="pointer-events-none absolute inset-y-0 left-0 flex items-center whitespace-nowrap text-[16px]">
                <span className="search-ai-text font-medium">{prompt.slice(0, typed)}</span>
                <span className="search-caret" />
              </span>
            )}
          </span>
          {canSpeak && (
            <button type="button" onClick={listen} aria-pressed={listening} aria-label={L({ hi: "बोलकर खोजें", en: "Search by speaking" })} className={clsx("grid h-11 w-11 shrink-0 place-items-center rounded-full", listening ? "animate-pulse bg-rose-500 text-white" : "text-ink-800 active:bg-ink-100")}>
              <Mic className="h-5 w-5" aria-hidden />
            </button>
          )}
        </label>
      </div>

      {found ? (
        <div className="space-y-2">
          <Link href={askHref(q.trim())} className="row-card flex items-center gap-3">
            <Sparkles className="h-5 w-5 shrink-0 text-[#E2558E]" aria-hidden />
            <span className="min-w-0 flex-1 truncate text-[15px]">
              {L({ hi: "स्कूल सहायक से पूछें:", en: "Ask School Sahayak:" })} <b className="font-semibold">{q.trim()}</b>
            </span>
          </Link>
          {found.hw.length + found.notices.length === 0 ? (
            <p className="px-0.5 pt-1 text-[14px] text-ink-500">{L({ hi: "होमवर्क या सूचना में कुछ नहीं मिला।", en: "Nothing found in homework or notices." })}</p>
          ) : (
            <ul className="space-y-2">
              {found.hw.map((h) => (
                <li key={h.id}>
                  <Link href="/homework/" className="row-card">
                    <span className="meta">
                      <span>
                        <BookOpen aria-hidden />
                        {L({ hi: "होमवर्क", en: "Homework" })} · {h.subject}
                      </span>
                      <span>
                        <CalendarDays aria-hidden />
                        {weekdayDate(h.assignedOn, lang)}
                      </span>
                    </span>
                    <span className="mt-1 block text-[15px] font-bold">{h.title}</span>
                  </Link>
                </li>
              ))}
              {found.notices.map((n) => (
                <li key={n.id}>
                  <Link href="/notice/" className="row-card">
                    <span className="meta">
                      <span>
                        <Megaphone aria-hidden />
                        {L({ hi: "सूचना", en: "Notice" })}
                      </span>
                      <span>
                        <CalendarDays aria-hidden />
                        {weekdayDate(n.date, lang)}
                      </span>
                    </span>
                    <span className="mt-1 block text-[15px] font-bold">{n.title}</span>
                    <span className="mt-0.5 line-clamp-2 block text-[14px] text-ink-600">{n.body}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : (
        <>
          {/* Questions for School Sahayak */}
          <div className="search-in no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4" style={stagger(0)}>
            {ASK.map((a) => (
              <Link key={a.en} href={askHref(L(a))} className="search-chip h-[38px] shrink-0 rounded-xl px-3.5 text-[14px] font-medium leading-[36px] text-ink-900">
                {L(a)}
              </Link>
            ))}
          </div>

          <section className="search-in space-y-2.5" style={stagger(1)}>
            <h2 className="px-0.5 text-[15px] font-semibold text-ink-500">{L({ hi: "ज़्यादा खोले जाने वाले", en: "Popular" })}</h2>
            <div className="grid grid-cols-4 gap-2">
              {POPULAR.map(({ href, text, icon }) => (
                <Link key={href} href={href} className="flex min-h-[44px] flex-col items-center gap-1.5 text-center text-[12px] leading-tight text-ink-700">
                  <QuickIcon name={icon} size={44} />
                  {L(text)}
                </Link>
              ))}
            </div>
          </section>

          {latest.length > 0 && (
            <section className="search-in space-y-2.5" style={stagger(2)}>
              <h2 className="px-0.5 text-[15px] font-semibold text-ink-500">{L({ hi: "आपके लिए नया", en: "New for you" })}</h2>
              <div className="no-scrollbar -mx-4 flex gap-3 overflow-x-auto px-4 pb-1">
                {latest.map((n) => (
                  <Link key={n.id} href={n.href} className="w-[210px] shrink-0 overflow-hidden rounded-2xl border border-ink-100 bg-white">
                    {/* An event shows its photo (or its scene's picture, as on Home); a notice its icon. */}
                    {n.kind === "event" ? (
                      <EventPicture url={n.cover} scene={n.scene} alt="" className="!aspect-auto h-24" />
                    ) : (
                      <span className="grid h-24 place-items-center bg-[#FFF3E6]">
                        <QuickIcon name="notice" size={52} />
                      </span>
                    )}
                    <span className="block px-3 pb-3 pt-2.5">
                      <b className="line-clamp-1 block text-[14.5px] font-semibold text-ink-900">{n.title}</b>
                      <small className="mt-0.5 block text-[12px] text-ink-500">
                        {weekdayDate(n.date, lang)} · {n.kind === "event" ? L({ hi: "कार्यक्रम", en: "Event" }) : L({ hi: "सूचना", en: "Notice" })}
                      </small>
                    </span>
                  </Link>
                ))}
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
}
