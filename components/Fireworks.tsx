"use client";

import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";

/**
 * A short fireworks show over the whole screen: rockets rise from the bottom, burst into coloured
 * sparks, and the sparks fall and fade away. About 4 seconds, then it calls onDone.
 * Drawn on one canvas; skipped for people who ask for reduced motion.
 */
// Strong colours that show on the app's white screens.
const COLORS = ["#39BC13", "#F5A400", "#F03A47", "#1E88E5", "#8E44EC", "#FF6B1A", "#E91E8C"];

interface Rocket {
  x: number;
  y: number;
  vx: number;
  vy: number;
  burstAt: number;
  color: string;
  trail: { x: number; y: number }[];
}
interface Spark {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  max: number;
  color: string;
  size: number;
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

    const rockets: Rocket[] = [];
    const sparks: Spark[] = [];
    const rand = (a: number, b: number) => a + Math.random() * (b - a);
    const pick = <T,>(a: T[]) => a[Math.floor(Math.random() * a.length)];

    // Seven rockets over the first two seconds, from across the bottom.
    const launches = Array.from({ length: 7 }, (_, i) => ({ at: i * 280 + rand(0, 120), done: false }));
    const launch = () => {
      const x = rand(W * 0.15, W * 0.85);
      rockets.push({ x, y: H + 8, vx: rand(-0.6, 0.6), vy: -rand(H * 0.0155, H * 0.019), burstAt: rand(H * 0.18, H * 0.45), color: pick(COLORS), trail: [] });
    };
    const burst = (r: Rocket) => {
      const n = Math.round(rand(56, 76));
      const speed = rand(3.2, 4.6);
      const second = Math.random() < 0.5 ? pick(COLORS) : r.color;
      for (let i = 0; i < n; i++) {
        const a = (i / n) * Math.PI * 2 + rand(-0.08, 0.08);
        const s = speed * rand(0.55, 1);
        const max = rand(55, 85);
        sparks.push({ x: r.x, y: r.y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: max, max, color: i % 3 === 0 ? second : r.color, size: rand(2.4, 3.6) });
      }
    };

    const start = performance.now();
    let raf = 0;
    const frame = (now: number) => {
      const t = now - start;
      launches.forEach((l) => {
        if (!l.done && t >= l.at) {
          l.done = true;
          launch();
        }
      });

      // Fade the last frame a little, leaving soft trails, on a clear canvas.
      ctx.globalCompositeOperation = "destination-out";
      ctx.fillStyle = "rgba(0,0,0,0.28)";
      ctx.fillRect(0, 0, W, H);
      ctx.globalCompositeOperation = "source-over";

      for (let i = rockets.length - 1; i >= 0; i--) {
        const r = rockets[i];
        r.trail.push({ x: r.x, y: r.y });
        if (r.trail.length > 6) r.trail.shift();
        r.x += r.vx;
        r.y += r.vy;
        r.vy += 0.12; // slows as it rises
        ctx.strokeStyle = r.color;
        ctx.lineWidth = 3;
        ctx.beginPath();
        r.trail.forEach((p, k) => (k ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)));
        ctx.lineTo(r.x, r.y);
        ctx.stroke();
        if (r.y <= r.burstAt || r.vy >= -1) {
          burst(r);
          rockets.splice(i, 1);
        }
      }

      for (let i = sparks.length - 1; i >= 0; i--) {
        const s = sparks[i];
        s.x += s.vx;
        s.y += s.vy;
        s.vx *= 0.985;
        s.vy = s.vy * 0.985 + 0.06; // gravity: the sparks fall
        s.life -= 1;
        const a = Math.max(0, s.life / s.max);
        ctx.globalAlpha = a;
        ctx.fillStyle = s.color;
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.size * (0.6 + a * 0.4), 0, Math.PI * 2);
        ctx.fill();
        if (s.life <= 0 || s.y > H + 10) sparks.splice(i, 1);
      }
      ctx.globalAlpha = 1;

      if (t < 2400 || rockets.length || sparks.length) raf = requestAnimationFrame(frame);
      else onDone();
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return createPortal(<canvas ref={ref} aria-hidden className="pointer-events-none fixed inset-0 z-[60] h-full w-full" />, document.body);
}
