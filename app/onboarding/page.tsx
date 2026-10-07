"use client";

import { useState } from "react";
import clsx from "clsx";
import { useL, type Bi } from "@/lib/i18n";
import { Art, type ArtName } from "@/components/art";

/** Also read by the sign-in page, which sends a first-time phone here. */
const SEEN_KEY = "pa:onboarded";

const SLIDES: { art: ArtName; title: Bi; text: Bi }[] = [
  {
    art: "bus",
    title: { hi: "पता रहे बच्चा स्कूल पहुँचा या नहीं", en: "Know when your child reaches school" },
    text: { hi: "कक्षा में हाज़िरी लगते ही उसी सुबह आपके फ़ोन पर दिखती है।", en: "Attendance is marked in class and reaches your phone the same morning." },
  },
  {
    art: "notebook",
    title: { hi: "होमवर्क और रिज़ल्ट, उसी दिन", en: "Homework and results, the same day" },
    text: { hi: "टीचर जो होमवर्क देते हैं और परीक्षा के अंक, सब यहीं मिलेंगे।", en: "Every homework the teacher gives and every exam's marks, in one place." },
  },
  {
    art: "calflag",
    title: { hi: "फ़ीस, छुट्टियाँ और सूचनाएँ", en: "Fees, holidays and notices" },
    text: { hi: "UPI से फ़ीस भरें, रसीद देखें, और स्कूल की हर सूचना पाएँ।", en: "Pay fees by UPI, see receipts, and get every notice from the school." },
  },
];

/** Three slides, shown once after install, then sign-in. */
export default function OnboardingPage() {
  const L = useL();
  const [i, setI] = useState(0);
  const s = SLIDES[i];
  const last = i === SLIDES.length - 1;

  function done() {
    try {
      localStorage.setItem(SEEN_KEY, "1");
    } catch {
      /* private mode: they will just see it again */
    }
    window.location.replace("/login/");
  }

  return (
    <main className="pt-safe pb-safe mx-auto flex min-h-[100dvh] max-w-[480px] flex-col bg-white px-5">
      <div className="flex h-14 items-center justify-end">
        {!last && (
          <button onClick={done} className="min-h-[44px] px-2 text-[15px] font-medium text-ink-500">
            {L({ hi: "छोड़ें", en: "Skip" })}
          </button>
        )}
      </div>
      <div key={i} className="flex flex-1 animate-rise flex-col">
        <div className="grid flex-1 place-items-center rounded-[28px] bg-brand-50 px-6 py-8">
          <Art name={s.art} className="w-full max-w-[260px]" />
        </div>
        <h1 className="mt-7 text-balance text-center text-[24px] font-extrabold leading-tight">{L(s.title)}</h1>
        <p className="mx-auto mt-2.5 max-w-[340px] text-center text-[15px] leading-relaxed text-ink-500">{L(s.text)}</p>
      </div>
      <div className="flex justify-center gap-1.5 py-6" aria-hidden>
        {SLIDES.map((_, k) => (
          <span key={k} className={clsx("h-1.5 rounded-full transition-all", k === i ? "w-5 bg-brand-600" : "w-1.5 bg-ink-200")} />
        ))}
      </div>
      <button onClick={() => (last ? done() : setI(i + 1))} className="btn-primary mb-6 w-full">
        {last ? L({ hi: "शुरू करें", en: "Get Started" }) : L({ hi: "आगे", en: "Next" })}
      </button>
    </main>
  );
}
