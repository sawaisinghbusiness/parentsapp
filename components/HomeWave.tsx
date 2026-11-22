"use client";

import { useEffect, useState } from "react";

/*
 * Home's bottom wave (user, 2026-11-22): navy rising to the right with a gold stripe on its edge, behind the
 * rounded tab bar. It breathes slowly like calm water: the edge rises and falls a few pixels over ~9 seconds,
 * all layers together so the gold always rides the navy's edge. Still for people who ask for less motion.
 *
 * Each shape is one smooth line (the two curves meet with the same slope), so there is no sharp point where the
 * navy dips and the gold begins. Every frame has the same commands, so the browser can blend between them.
 */

// The navy's top edge, three frames (A rest, B a little lower on the right, C a little higher).
const EDGE = [
  "M0 30 C 80 34, 140 58, 200 56 C 270 54, 340 40, 400 26",
  "M0 34 C 90 31, 140 55, 200 54 C 270 53, 335 44, 400 31",
  "M0 27 C 75 36, 140 60, 200 58 C 270 56, 345 37, 400 22",
];
// The gold stripe: the rising half of that edge.
const GOLD = [
  "M200 56 C 270 54, 340 40, 400 26",
  "M200 54 C 270 53, 335 44, 400 31",
  "M200 58 C 270 56, 345 37, 400 22",
];
// The soft lighter-blue sweep behind, for depth.
const BACK = [
  "M0 30 C 90 22, 190 34, 270 30 C 330 27, 370 16, 400 8",
  "M0 27 C 90 25, 190 31, 270 28 C 330 26, 372 19, 400 12",
  "M0 32 C 90 20, 190 36, 270 32 C 330 29, 368 14, 400 5",
];
const close = (d: string) => `${d} L400 72 L0 72 Z`;
// rest → lower → rest → higher → rest, eased, so it never looks like a loop restarting.
const cycle = (f: string[], map = (d: string) => d) => [f[0], f[1], f[0], f[2], f[0]].map(map).join(";");
const SPLINES = "0.45 0 0.55 1;0.45 0 0.55 1;0.45 0 0.55 1;0.45 0 0.55 1";
const DUR = "9s";

function Breathe({ frames, map }: { frames: string[]; map?: (d: string) => string }) {
  return <animate attributeName="d" dur={DUR} repeatCount="indefinite" calcMode="spline" keyTimes="0;0.25;0.5;0.75;1" keySplines={SPLINES} values={cycle(frames, map)} />;
}

export function HomeWave() {
  const [still, setStill] = useState(true);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const set = () => setStill(mq.matches);
    set();
    mq.addEventListener?.("change", set);
    return () => mq.removeEventListener?.("change", set);
  }, []);

  return (
    <div aria-hidden className="pointer-events-none fixed inset-x-0 bottom-0 z-[19] mx-auto h-[calc(64px+72px+env(safe-area-inset-bottom,0px))] max-w-[560px]">
      <svg viewBox="0 0 400 72" preserveAspectRatio="none" className="absolute inset-x-0 top-0 h-[72px] w-full overflow-visible">
        <defs>
          <linearGradient id="hw-navy" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#173E80" />
            <stop offset="1" stopColor="#0B2250" />
          </linearGradient>
          <linearGradient id="hw-back" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor="#3C6CC0" stopOpacity="0.10" />
            <stop offset="1" stopColor="#3C6CC0" stopOpacity="0.32" />
          </linearGradient>
          <linearGradient id="hw-gold" gradientUnits="userSpaceOnUse" x1="200" y1="0" x2="400" y2="0">
            <stop offset="0" stopColor="#E39A2D" stopOpacity="0" />
            <stop offset="0.3" stopColor="#E8A93A" />
            <stop offset="0.75" stopColor="#F3C259" />
            <stop offset="1" stopColor="#FFD978" />
          </linearGradient>
          <filter id="hw-glow" x="-10%" y="-300%" width="120%" height="700%">
            <feGaussianBlur stdDeviation="2" />
          </filter>
        </defs>

        {/* page colour under the see-through blue, so the list scrolling behind does not show through */}
        <path d={close(BACK[0])} fill="#F7F9FC">{!still && <Breathe frames={BACK} map={close} />}</path>
        <path d={close(BACK[0])} fill="url(#hw-back)">{!still && <Breathe frames={BACK} map={close} />}</path>
        <path d={close(EDGE[0])} fill="url(#hw-navy)">{!still && <Breathe frames={EDGE} map={close} />}</path>
        {/* gold: drawn as a line on the navy's edge (a fixed width on screen), with a soft glow under it */}
        <g transform="translate(0 -3)">
          <path d={GOLD[0]} stroke="#F2C45A" strokeOpacity="0.5" strokeWidth="7" strokeLinecap="round" fill="none" vectorEffect="non-scaling-stroke" filter="url(#hw-glow)">
            {!still && <Breathe frames={GOLD} />}
          </path>
          <path d={GOLD[0]} stroke="url(#hw-gold)" strokeWidth="5" strokeLinecap="round" fill="none" vectorEffect="non-scaling-stroke">
            {!still && <Breathe frames={GOLD} />}
          </path>
        </g>
        {/* a hairline of light along the navy's edge */}
        <path d={EDGE[0]} stroke="#FFFFFF" strokeOpacity="0.3" strokeWidth="1" fill="none" vectorEffect="non-scaling-stroke">
          {!still && <Breathe frames={EDGE} />}
        </path>
      </svg>
      <div className="absolute inset-x-0 bottom-0 top-[71px] bg-[#0B2250]" />
    </div>
  );
}
