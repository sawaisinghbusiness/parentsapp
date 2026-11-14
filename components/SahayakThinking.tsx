"use client";

import { useEffect, useMemo, useState } from "react";
import { useL } from "@/lib/i18n";

/**
 * School Sahayak while it waits and after it answers. The server answers in one go and reports no progress,
 * so nothing here pretends to: one honest "fetching" line while waiting (a "taking longer" line after 12s),
 * and the real time taken above the answer. The earlier timed "checking fees… counting days…" steps were
 * removed on 2026-11-14 because they were not what the server was doing.
 */

const SLOW_MS = 12_000;

/** Shown while waiting for the answer. */
export function Thinking() {
  const L = useL();
  const [slow, setSlow] = useState(false);

  useEffect(() => {
    const late = setTimeout(() => setSlow(true), SLOW_MS);
    return () => clearTimeout(late);
  }, []);

  return (
    <div className="flex max-w-[86%] flex-col gap-1.5 self-start" role="status">
      <p className="flex items-center gap-2 text-[14px]">
        <span className="h-4 w-4 shrink-0 animate-spin rounded-full border-2 border-[#DCE4ED] border-t-[#0D2A5E]" aria-hidden />
        <span className="text-[#666A6E]">{slow ? L({ hi: "थोड़ा और समय लग रहा है…", en: "Taking a little longer…" }) : L({ hi: "स्कूल की जानकारी ला रहा हूँ…", en: "Fetching school information…" })}</span>
      </p>
    </div>
  );
}

/** Above an answer: how long the answer really took. */
export function Thought({ secs }: { secs: number }) {
  const L = useL();
  return <p className="text-[12.5px] text-[#666A6E]">{L({ hi: `${secs} सेकंड में जवाब`, en: `Answered in ${secs}s` })}</p>;
}

/** A new answer appears word by word; all at once when the phone asks for less motion. */
export function TypeOut({ text, onGrow }: { text: string; onGrow?: () => void }) {
  const parts = useMemo(() => text.split(/(\s+)/), [text]);
  const [n, setN] = useState(0);

  useEffect(() => {
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) {
      setN(parts.length);
      return;
    }
    setN(0);
    const t = setInterval(() => setN((k) => (k >= parts.length ? k : k + 1)), 25);
    return () => clearInterval(t);
  }, [parts]);

  useEffect(() => {
    onGrow?.();
  }, [n]); // eslint-disable-line react-hooks/exhaustive-deps

  return <>{parts.slice(0, n).join("")}</>;
}
