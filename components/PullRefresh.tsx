"use client";

import { useEffect, useRef, useState } from "react";
import { RefreshCw } from "lucide-react";
import { refreshAll } from "@/lib/api";
import { useL } from "@/lib/i18n";

/** How far (px) the finger has to pull before letting go refreshes. */
const TRIGGER = 72;
const MAX = 110;

/**
 * Pull down from the top of a screen to load it again, like native apps: a round spinner follows
 * the finger, and letting go past the mark reloads every screen's data (not the whole page).
 * Ignored while the pull starts inside something already scrolled down (like the day list).
 */
export function PullRefresh({ off }: { off?: boolean }) {
  const L = useL();
  const [pull, setPull] = useState(0);
  const [busy, setBusy] = useState(false);
  const start = useRef<{ y: number; x: number } | null>(null);
  const pullRef = useRef(0);

  useEffect(() => {
    if (off) return;
    const scrolledDown = (el: Element | null) => {
      if (window.scrollY > 0) return true;
      for (let n = el; n && n !== document.body; n = n.parentElement) {
        const o = getComputedStyle(n).overflowY;
        if ((o === "auto" || o === "scroll") && n.scrollTop > 0) return true;
      }
      return false;
    };
    const down = (e: TouchEvent) => {
      if (busy || e.touches.length !== 1 || document.querySelector('[role="dialog"]') || scrolledDown(e.target as Element)) return (start.current = null);
      start.current = { y: e.touches[0].clientY, x: e.touches[0].clientX };
    };
    const move = (e: TouchEvent) => {
      const s = start.current;
      if (!s) return;
      const dy = e.touches[0].clientY - s.y;
      const dx = Math.abs(e.touches[0].clientX - s.x);
      if (dy <= 0 || dx > dy) {
        if (pullRef.current) set(0);
        return;
      }
      // Resistance: the further you pull, the slower it follows.
      set(Math.min(MAX, dy * 0.5));
    };
    const up = () => {
      if (!start.current) return;
      start.current = null;
      if (pullRef.current >= TRIGGER) {
        setBusy(true);
        set(TRIGGER * 0.75);
        refreshAll();
        setTimeout(() => {
          setBusy(false);
          set(0);
        }, 900);
      } else set(0);
    };
    const set = (v: number) => {
      pullRef.current = v;
      setPull(v);
    };
    window.addEventListener("touchstart", down, { passive: true });
    window.addEventListener("touchmove", move, { passive: true });
    window.addEventListener("touchend", up, { passive: true });
    window.addEventListener("touchcancel", up, { passive: true });
    return () => {
      window.removeEventListener("touchstart", down);
      window.removeEventListener("touchmove", move);
      window.removeEventListener("touchend", up);
      window.removeEventListener("touchcancel", up);
    };
  }, [off, busy]);

  if (!pull && !busy) return null;
  const ready = pull >= TRIGGER || busy;
  return (
    <div className="pointer-events-none fixed inset-x-0 top-0 z-40 mx-auto flex max-w-[560px] justify-center" style={{ transform: `translateY(${pull - 44}px)`, transition: start.current ? "none" : "transform .25s ease-out" }} aria-live="polite">
      <span className="pt-safe">
        <span className="grid h-10 w-10 place-items-center rounded-full bg-white text-ink-900 shadow-[0_2px_10px_rgba(15,23,42,.18)] ring-1 ring-ink-100">
          <RefreshCw className={busy ? "h-[18px] w-[18px] animate-spin" : "h-[18px] w-[18px]"} style={busy ? undefined : { transform: `rotate(${pull * 3}deg)`, opacity: ready ? 1 : 0.55 }} aria-hidden />
          <span className="sr-only">{busy ? L({ hi: "नई जानकारी आ रही है", en: "Refreshing" }) : ""}</span>
        </span>
      </span>
    </div>
  );
}
