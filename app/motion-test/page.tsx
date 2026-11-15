"use client";
import { notFound } from "next/navigation";

/**
 * DESIGN REFERENCE (2026-11-13): the user liked this screen's spacing and look, and the slide motion.
 * Keep it as the reference for new screens: white page, 56px sticky header with a centred 17px title and
 * a back chevron, bordered 14px-radius rows with a 24px outline icon, 15px labels, quiet grey sub-lines.
 * Three dummy screens, no data. Not linked from anywhere.
 */

import "@fontsource-variable/plus-jakarta-sans";
import { useState } from "react";
import { BookOpen, CalendarCheck, ChevronLeft, ChevronRight, FileText, Trophy, Wallet } from "lucide-react";

type Screen = { id: string; title: string };
const HOME: Screen = { id: "home", title: "Home" };

export default function MotionTest() {
  if(process.env.NODE_ENV === "production")notFound();
  const [stack, setStack] = useState<Screen[]>([HOME]);
  const [dir, setDir] = useState<"fwd" | "back">("fwd");
  const top = stack[stack.length - 1];
  const open = (s: Screen) => {
    setDir("fwd");
    setStack((x) => [...x, s]);
  };
  const back = () => {
    if (stack.length < 2) return;
    setDir("back");
    setStack((x) => x.slice(0, -1));
  };

  return (
    <div className="mx-auto min-h-[100dvh] max-w-[560px] overflow-hidden bg-white" style={{ fontFamily: "'Plus Jakarta Sans Variable', system-ui, sans-serif", color: "#242628" }}>
      <style>{`
        .mt-fwd { animation: mt-in-right .3s cubic-bezier(.2,.8,.2,1) both; }
        .mt-back { animation: mt-in-left .3s cubic-bezier(.2,.8,.2,1) both; }
        @keyframes mt-in-right { from { transform: translate3d(32%,0,0); opacity: 0; } }
        @keyframes mt-in-left { from { transform: translate3d(-24%,0,0); opacity: 0; } }
        @media (prefers-reduced-motion: reduce) { .mt-fwd, .mt-back { animation: none; } }
      `}</style>

      <header className="sticky top-0 z-10 flex h-14 items-center gap-1 border-b border-[#E6E7E8] bg-white/95 px-2 backdrop-blur">
        {stack.length > 1 ? (
          <button type="button" onClick={back} className="grid h-11 w-11 place-items-center rounded-full active:bg-neutral-100" aria-label="Back">
            <ChevronLeft className="h-6 w-6" aria-hidden />
          </button>
        ) : (
          <span className="w-11" />
        )}
        <h1 className="flex-1 text-center text-[17px] font-semibold">{top.title}</h1>
        <span className="w-11" />
      </header>

      <main key={top.id + stack.length} className={dir === "fwd" ? "mt-fwd" : "mt-back"}>
        {top.id === "home" ? (
          <div className="space-y-3 p-4">
            <p className="text-[13px] text-[#666A6E]">Kisi row par tap karo: naya page daayein se aayega. Upar ‹ dabao: pichhla page baayein se wapas aayega.</p>
            {[
              { id: "att", title: "Attendance", icon: CalendarCheck },
              { id: "hw", title: "Homework", icon: BookOpen },
              { id: "fees", title: "Fees", icon: Wallet },
              { id: "res", title: "Results", icon: Trophy },
            ].map(({ id, title, icon: Icon }) => (
              <button key={id} type="button" onClick={() => open({ id, title })} className="flex w-full items-center gap-3 rounded-[14px] border border-[#E6E7E8] bg-white px-4 py-4 text-left active:bg-neutral-50">
                <Icon className="h-6 w-6" strokeWidth={1.6} aria-hidden />
                <span className="flex-1 text-[15px] font-medium">{title}</span>
                <ChevronRight className="h-5 w-5" strokeWidth={1.8} aria-hidden />
              </button>
            ))}
          </div>
        ) : stack.length === 2 ? (
          <div className="divide-y divide-[#E6E7E8] px-4">
            {[1, 2, 3, 4, 5, 6].map((n) => (
              <button key={n} type="button" onClick={() => open({ id: `${top.id}-${n}`, title: `${top.title} detail ${n}` })} className="flex w-full items-center gap-3 py-4 text-left active:bg-neutral-50">
                <FileText className="h-5 w-5 shrink-0" strokeWidth={1.7} aria-hidden />
                <span className="flex-1">
                  <span className="block text-[15px] font-medium">
                    {top.title} item {n}
                  </span>
                  <span className="block text-[12.5px] text-[#666A6E]">Tap to open the detail</span>
                </span>
                <ChevronRight className="h-5 w-5" strokeWidth={1.8} aria-hidden />
              </button>
            ))}
          </div>
        ) : (
          <div className="space-y-3 p-4">
            {[0, 1, 2, 3].map((n) => (
              <div key={n} className="rounded-[14px] border border-[#E6E7E8] p-4">
                <div className="h-3.5 w-2/3 rounded bg-[#F3F4F4]" />
                <div className="mt-2 h-3 w-1/2 rounded bg-[#F3F4F4]" />
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
