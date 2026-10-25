"use client";

import { forwardRef, useCallback, useEffect, useRef, useState, type CSSProperties } from "react";
import clsx from "clsx";

export type Slide = { src: string; alt: string };

const EASE = "transform 460ms cubic-bezier(0.22, 0.61, 0.36, 1)";
const AUTO_MS = 5000;

/**
 * The Home banner as a swipeable loop (the user's ask, 2026-10-23): the middle slide shows first, one
 * waits hidden on each side. Swipe left and the right one slides in; swipe right for the left one; it
 * never runs out. The banner follows the finger, settles on release (a quick flick is enough), and
 * up-down scrolling of the page is left alone.
 *
 * The loop: the track holds [last, ...slides, first]; after settling on a copy at either end it jumps,
 * without animating, to the real slide it copies.
 */
export const BannerSlider = forwardRef<HTMLDivElement, { slides: Slide[]; start?: number; className?: string; style?: CSSProperties }>(function BannerSlider(
  { slides, start = 0, className, style },
  ref,
) {
  const n = slides.length;
  const track = [slides[n - 1], ...slides, slides[0]];
  const [pos, setPos] = useState(start + 1); // index in `track`
  const [drag, setDrag] = useState(0); // px the finger has moved
  const [animate, setAnimate] = useState(false);
  const box = useRef<HTMLDivElement | null>(null);
  const touch = useRef<{ id: number; x: number; y: number; t: number; axis: "" | "x" | "y" } | null>(null);
  const current = (((pos - 1) % n) + n) % n;
  const posNow = useRef(pos);
  posNow.current = pos;
  const lastMove = useRef(0);

  const go = useCallback((to: number) => {
    lastMove.current = Date.now();
    setAnimate(true);
    setDrag(0);
    setPos(to);
  }, []);

  // Every 5s it swipes right by itself (the user's ask, 2026-10-23). It waits while a finger is on it or the
  // app is in the background, and counts 5s again from the last swipe. Not for phones set to less motion.
  useEffect(() => {
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;
    lastMove.current = Date.now();
    const timer = setInterval(() => {
      if (touch.current || document.hidden) lastMove.current = Date.now();
      else if (Date.now() - lastMove.current >= AUTO_MS) go(posNow.current - 1);
    }, 250);
    return () => clearInterval(timer);
  }, [go]);

  /** Settled on a copy at an end: swap to the real slide in the same frame, so nothing visibly moves. */
  function settled() {
    if (pos === 0 || pos === n + 1) {
      setAnimate(false);
      setPos(pos === 0 ? n : 1);
    }
  }

  function down(e: React.PointerEvent) {
    if (touch.current || (e.pointerType === "mouse" && e.button !== 0)) return;
    // A swipe that starts while the last one is still settling picks up from the real slide.
    if (pos === 0 || pos === n + 1) settled();
    touch.current = { id: e.pointerId, x: e.clientX, y: e.clientY, t: performance.now(), axis: "" };
  }

  function move(e: React.PointerEvent) {
    const t = touch.current;
    if (!t || t.id !== e.pointerId) return;
    const dx = e.clientX - t.x;
    const dy = e.clientY - t.y;
    if (!t.axis) {
      if (Math.abs(dx) < 6 && Math.abs(dy) < 6) return;
      // Mostly sideways: it's ours. Mostly up-down: the page scrolls and we let go.
      t.axis = Math.abs(dx) > Math.abs(dy) ? "x" : "y";
      if (t.axis === "y") {
        touch.current = null;
        return;
      }
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
      setAnimate(false);
    }
    setDrag(dx);
  }

  function up(e: React.PointerEvent) {
    const t = touch.current;
    if (!t || t.id !== e.pointerId) return;
    touch.current = null;
    if (t.axis !== "x") return;
    const dx = e.clientX - t.x;
    const width = box.current?.offsetWidth || 1;
    const speed = dx / Math.max(1, performance.now() - t.t); // px per ms
    if (dx < -width * 0.18 || speed < -0.45) go(pos + 1);
    else if (dx > width * 0.18 || speed > 0.45) go(pos - 1);
    else go(pos);
  }

  const total = track.length;
  return (
    <div ref={ref} className={className} style={style}>
      <div
        ref={box}
        role="region"
        aria-roledescription="carousel"
        aria-label="School banners"
        data-swipe
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "ArrowRight") go(pos + 1);
          if (e.key === "ArrowLeft") go(pos - 1);
        }}
        className="relative overflow-hidden rounded-2xl shadow-card outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
        style={{ touchAction: "pan-y" }}
        onPointerDown={down}
        onPointerMove={move}
        onPointerUp={up}
        onPointerCancel={up}
      >
        <div
          className="flex select-none will-change-transform"
          style={{
            width: `${total * 100}%`,
            transform: `translate3d(calc(${(-pos * 100) / total}% + ${drag}px), 0, 0)`,
            transition: animate ? EASE : "none",
          }}
          onTransitionEnd={(e) => {
            if (e.target === e.currentTarget) settled();
          }}
        >
          {track.map((s, i) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              key={i}
              src={s.src}
              alt={i === pos ? s.alt : ""}
              aria-hidden={i !== pos}
              draggable={false}
              width={1280}
              height={720}
              className="block aspect-[1280/720] object-cover"
              style={{ width: `${100 / total}%` }}
            />
          ))}
        </div>
      </div>
      {/* Where you are: the current one is a longer bar. */}
      <div className="mt-2.5 flex justify-center gap-1.5">
        {slides.map((s, i) => (
          <button
            key={s.src}
            type="button"
            onClick={() => go(i + 1)}
            aria-label={`${i + 1} / ${n}`}
            aria-current={i === current}
            className="grid h-6 place-items-center px-0.5"
          >
            <span className={clsx("block h-1.5 rounded-full transition-all duration-300", i === current ? "w-5 bg-brand-600" : "w-1.5 bg-ink-300")} />
          </button>
        ))}
      </div>
    </div>
  );
});
