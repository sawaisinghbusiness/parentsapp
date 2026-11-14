"use client";

import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";

/** Silent fireworks on a transparent canvas. Respects reduced motion. */
const COLORS = ["#FF5A5F", "#FFC53D", "#5AD1FF", "#7CFF8A", "#C58BFF", "#FF8A3D", "#FF6FD8", "#FFFFFF"];
const GOLD = "#FFD27A";

type Kind = "peony" | "willow" | "crackle";
interface Shell {
  x: number;
  y: number;
  vx: number;
  vy: number;
  burstAt: number;
  color: string;
  kind: Kind;
}
interface Star {
  x: number;
  y: number;
  px: number;
  py: number;
  vx: number;
  vy: number;
  life: number;
  max: number;
  color: string;
  size: number;
  drag: number;
  gravity: number;
  /** Pops into a few tiny sparks when it dies (crackle shells). */
  pop: boolean;
}

export function Fireworks({ onDone }: { onDone: () => void }) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      onDone();
      return;
    }
    const canvas = ref.current!;
    const ctx = canvas.getContext("2d")!;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const W = window.innerWidth;
    const H = window.innerHeight;
    canvas.width = W * dpr;
    canvas.height = H * dpr;
    ctx.scale(dpr, dpr);

    const shells: Shell[] = [];
    const stars: Star[] = [];
    const rand = (a: number, b: number) => a + Math.random() * (b - a);
    const pick = <T,>(a: T[]) => a[Math.floor(Math.random() * a.length)];

    // Nine shells: a steady start, then a quick finale of three together.
    const times = [0, 420, 800, 1250, 1650, 2100, 2750, 2850, 2950];
    const kinds: Kind[] = ["peony", "peony", "willow", "peony", "crackle", "peony", "willow", "peony", "crackle"];
    const launches = times.map((at, i) => ({ at: at + rand(0, 90), kind: kinds[i], done: false }));
    const LAST = 2950;

    const launch = (kind: Kind) => {
      const x = rand(W * 0.14, W * 0.86);
      const burstAt = rand(H * 0.16, H * 0.42);
      // Speed so the shell, slowing under gravity (0.16 per frame), tops out just above its burst height.
      const vy = -Math.sqrt(2 * 0.16 * (H - burstAt + 30));
      shells.push({ x, y: H + 6, vx: rand(-0.5, 0.5), vy, burstAt, color: kind === "willow" ? GOLD : pick(COLORS), kind });

    };

    const burst = (s: Shell) => {
      const big = Math.min(1, W / 420) * rand(0.85, 1.1);

      const n = s.kind === "willow" ? 90 : s.kind === "crackle" ? 70 : Math.round(rand(110, 150));
      const speed = (s.kind === "willow" ? 4.2 : 6.2) * big;
      const two = s.kind === "peony" && Math.random() < 0.5 ? pick(COLORS) : s.color;
      for (let i = 0; i < n; i++) {
        // A sphere seen from the side: even angles, speeds spread so the ball looks filled, not a ring.
        const a = rand(0, Math.PI * 2);
        const v = speed * Math.cbrt(Math.random()) * rand(0.92, 1.05);
        const max = s.kind === "willow" ? rand(110, 150) : rand(60, 95);
        stars.push({
          x: s.x,
          y: s.y,
          px: s.x,
          py: s.y,
          vx: Math.cos(a) * v,
          vy: Math.sin(a) * v,
          life: max,
          max,
          color: i % 2 ? two : s.color,
          size: s.kind === "willow" ? 1.4 : rand(1.5, 2.3),
          drag: s.kind === "willow" ? 0.955 : 0.962,
          gravity: s.kind === "willow" ? 0.075 : 0.05,
          pop: s.kind === "crackle",
        });
      }
    };

    const start = performance.now();
    let raf = 0;
    const frame = (now: number) => {
      const t = now - start;
      launches.forEach((l) => {
        if (!l.done && t >= l.at) {
          l.done = true;
          launch(l.kind);
        }
      });

      // Transparent trails: the app stays visible behind the silent celebration.
      ctx.globalCompositeOperation = "destination-out";
      ctx.fillStyle = "rgba(0,0,0,0.2)";
      ctx.fillRect(0, 0, W, H);
      ctx.globalCompositeOperation = "lighter";
      ctx.lineCap = "round";

      for (let i = shells.length - 1; i >= 0; i--) {
        const s = shells[i];
        const px = s.x;
        const py = s.y;
        s.x += s.vx;
        s.y += s.vy;
        s.vy += 0.16;
        ctx.strokeStyle = "rgba(255,226,170,0.9)";
        ctx.lineWidth = 2.2;
        ctx.beginPath();
        ctx.moveTo(px, py);
        ctx.lineTo(s.x, s.y);
        ctx.stroke();
        // Sparks shed from the tail.
        if (Math.random() < 0.6) {
          const max = rand(10, 18);
          stars.push({ x: s.x, y: s.y, px: s.x, py: s.y, vx: rand(-0.5, 0.5), vy: rand(0.4, 1.4), life: max, max, color: "#FFC98A", size: 1, drag: 0.96, gravity: 0.04, pop: false });
        }
        if (s.y <= s.burstAt || s.vy >= -0.6) {
          burst(s);
          shells.splice(i, 1);
        }
      }

      for (let i = stars.length - 1; i >= 0; i--) {
        const s = stars[i];
        s.px = s.x;
        s.py = s.y;
        s.vx *= s.drag;
        s.vy = s.vy * s.drag + s.gravity;
        s.x += s.vx;
        s.y += s.vy;
        s.life -= 1;
        const a = Math.max(0, s.life / s.max);
        // Bright at first, then fading; near the end the star flickers like a dying ember.
        const twinkle = a < 0.35 ? 0.45 + Math.random() * 0.55 : 1;
        ctx.globalAlpha = Math.min(1, a * 1.6) * twinkle;
        ctx.strokeStyle = s.color;
        ctx.lineWidth = s.size * (0.5 + a * 0.7);
        ctx.beginPath();
        ctx.moveTo(s.px, s.py);
        ctx.lineTo(s.x, s.y);
        ctx.stroke();
        // A white-hot core while the star is young.
        if (a > 0.7 && s.size > 1.2) {
          ctx.globalAlpha = (a - 0.7) * 3;
          ctx.fillStyle = "#FFFFFF";
          ctx.beginPath();
          ctx.arc(s.x, s.y, s.size * 0.7, 0, Math.PI * 2);
          ctx.fill();
        }
        if (s.life <= 0 || s.y > H + 10) {
          if (s.pop && s.life <= 0) {
            for (let k = 0; k < 4; k++) {
              const max = rand(8, 16);
              stars.push({ x: s.x, y: s.y, px: s.x, py: s.y, vx: rand(-1.8, 1.8), vy: rand(-1.8, 1.8), life: max, max, color: "#FFF3C4", size: 1.1, drag: 0.9, gravity: 0.03, pop: false });
            }
          }
          stars.splice(i, 1);
        }
      }
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = "source-over";

      if (t < LAST + 2600) raf = requestAnimationFrame(frame);
      else onDone();
    };
    raf = requestAnimationFrame(frame);
    return () => {
      cancelAnimationFrame(raf);

    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return createPortal(<canvas ref={ref} aria-hidden className="pointer-events-none fixed inset-0 z-[60] h-full w-full" />, document.body);
}
