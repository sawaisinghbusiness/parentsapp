"use client";

import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";

/**
 * A fireworks show over the whole screen, made to look and sound like the real thing (the user's ask,
 * 2026-11-14): the screen dims to a night sky, shells whistle up leaving a spark tail, then burst with a
 * flash and a boom into glowing stars that hang, droop under gravity, twinkle and fade. Three kinds of
 * shell: a round peony, a gold willow whose stars fall in long tails, and a crackling one whose stars pop
 * again. About 5.5 seconds, then it calls onDone.
 *
 * Drawn on one canvas with additive light, so overlapping stars glow. The sound is made in the browser
 * (no files). Skipped for people who ask for reduced motion; `sound={false}` keeps it silent.
 */
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

/** Whistle, boom and crackle, synthesised. Every call is safe when sound is blocked. */
function makeSound(enabled: boolean) {
  let ctx: AudioContext | null = null;
  let noise: AudioBuffer | null = null;
  if (enabled) {
    try {
      const Ctx = window.AudioContext || (window as any).webkitAudioContext;
      ctx = new Ctx();
      // The timer ends without a tap, but Start was tapped on this page, so the browser lets this resume.
      ctx!.resume?.().catch(() => null);
      noise = ctx!.createBuffer(1, ctx!.sampleRate * 1.5, ctx!.sampleRate);
      const d = noise.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    } catch {
      ctx = null;
    }
  }
  const out = (pan: number) => {
    const g = ctx!.createGain();
    const p = ctx!.createStereoPanner?.();
    if (p) {
      p.pan.value = Math.max(-1, Math.min(1, pan));
      g.connect(p);
      p.connect(ctx!.destination);
    } else g.connect(ctx!.destination);
    return g;
  };
  return {
    /** The rising whistle of a shell going up. */
    whistle(pan: number, secs: number) {
      if (!ctx) return;
      try {
        const t = ctx.currentTime;
        const o = ctx.createOscillator();
        const g = out(pan);
        o.type = "sine";
        o.frequency.setValueAtTime(520, t);
        o.frequency.exponentialRampToValueAtTime(1500, t + secs);
        g.gain.setValueAtTime(0.0001, t);
        g.gain.exponentialRampToValueAtTime(0.035, t + 0.08);
        g.gain.exponentialRampToValueAtTime(0.0001, t + secs);
        o.connect(g);
        o.start(t);
        o.stop(t + secs + 0.05);
      } catch {
        /* no sound */
      }
    },
    /** The burst: a low thump under a burst of filtered noise that rolls off like an echo. */
    boom(pan: number, big: number) {
      if (!ctx || !noise) return;
      try {
        const t = ctx.currentTime;
        const thump = ctx.createOscillator();
        const tg = out(pan);
        thump.type = "sine";
        thump.frequency.setValueAtTime(140, t);
        thump.frequency.exponentialRampToValueAtTime(38, t + 0.35);
        tg.gain.setValueAtTime(0.5 * big, t);
        tg.gain.exponentialRampToValueAtTime(0.0001, t + 0.5);
        thump.connect(tg);
        thump.start(t);
        thump.stop(t + 0.55);

        const n = ctx.createBufferSource();
        n.buffer = noise;
        const lp = ctx.createBiquadFilter();
        lp.type = "lowpass";
        lp.frequency.setValueAtTime(2600, t);
        lp.frequency.exponentialRampToValueAtTime(180, t + 1.1);
        const ng = out(pan);
        ng.gain.setValueAtTime(0.45 * big, t);
        ng.gain.exponentialRampToValueAtTime(0.0001, t + 1.2);
        n.connect(lp);
        lp.connect(ng);
        n.start(t, Math.random() * 0.2, 1.25);
      } catch {
        /* no sound */
      }
    },
    /** A run of tiny sharp pops, for a crackling shell. */
    crackle(pan: number) {
      if (!ctx || !noise) return;
      try {
        const t0 = ctx.currentTime + 0.25;
        for (let i = 0; i < 26; i++) {
          const t = t0 + Math.random() * 1.1;
          const n = ctx.createBufferSource();
          n.buffer = noise;
          const hp = ctx.createBiquadFilter();
          hp.type = "highpass";
          hp.frequency.value = 2500 + Math.random() * 3000;
          const g = out(pan + (Math.random() - 0.5) * 0.6);
          g.gain.setValueAtTime(0.05 + Math.random() * 0.07, t);
          g.gain.exponentialRampToValueAtTime(0.0001, t + 0.04);
          n.connect(hp);
          hp.connect(g);
          n.start(t, Math.random(), 0.05);
        }
      } catch {
        /* no sound */
      }
    },
    close() {
      const c = ctx;
      ctx = null;
      if (c) setTimeout(() => c.close().catch(() => null), 1500);
    },
  };
}

export function Fireworks({ onDone, sound = true }: { onDone: () => void; sound?: boolean }) {
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
    const audio = makeSound(sound);

    const shells: Shell[] = [];
    const stars: Star[] = [];
    let flash = 0;
    const rand = (a: number, b: number) => a + Math.random() * (b - a);
    const pick = <T,>(a: T[]) => a[Math.floor(Math.random() * a.length)];
    const pan = (x: number) => (x / W) * 1.6 - 0.8;

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
      audio.whistle(pan(x), Math.min(1.1, Math.abs(vy) / 0.16 / 60));
    };

    const burst = (s: Shell) => {
      flash = Math.max(flash, 0.5);
      const big = Math.min(1, W / 420) * rand(0.85, 1.1);
      audio.boom(pan(s.x), s.kind === "willow" ? 1 : 0.8);
      if (s.kind === "crackle") audio.crackle(pan(s.x));
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

      // The night sky: fades in, stays through the show, fades out. Wearing the old frame away a little
      // each time is what leaves every star a soft tail.
      const sky = Math.min(1, t / 350) * (t > LAST + 1700 ? Math.max(0, 1 - (t - LAST - 1700) / 900) : 1);
      canvas.style.backgroundColor = `rgba(6,10,26,${(0.86 * sky).toFixed(3)})`;
      ctx.globalCompositeOperation = "destination-out";
      ctx.fillStyle = "rgba(0,0,0,0.2)";
      ctx.fillRect(0, 0, W, H);
      ctx.globalCompositeOperation = "lighter";
      if (flash > 0.01) {
        ctx.fillStyle = `rgba(255,255,255,${(flash * 0.12).toFixed(3)})`;
        ctx.fillRect(0, 0, W, H);
        flash *= 0.8;
      }
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
      audio.close();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return createPortal(<canvas ref={ref} aria-hidden className="pointer-events-none fixed inset-0 z-[60] h-full w-full" />, document.body);
}
