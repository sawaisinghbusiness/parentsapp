"use client";

import { useCallback, useEffect, useRef, useState } from "react";

const DURATION = 300;
const drawerWidth = () => Math.min(Math.min(window.innerWidth, 560) * 0.84, 320);
type Gesture = { x: number; y: number; at: number; lastX: number; lastAt: number; velocity: number; start: number; dragging: boolean };

/** Finger-following touch motion; React renders only when the overlay becomes active/inactive. */
export function useSideMenuMotion(enabled: boolean) {
  const layerRef = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(false);
  const visible = useRef(false);
  const position = useRef(0);
  const gesture = useRef<Gesture | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const frame = useRef(0);

  const cancelPending = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    if (frame.current) cancelAnimationFrame(frame.current);
    timer.current = null;
    frame.current = 0;
  }, []);

  const paint = useCallback((x: number, duration = 0) => {
    const width = drawerWidth();
    position.current = Math.min(width, Math.max(0, x));
    const node = layerRef.current;
    if (!node) return;
    node.style.setProperty("--drawer-duration", `${duration}ms`);
    node.style.setProperty("--drawer-x", `${position.current - width}px`);
    node.style.setProperty("--drawer-opacity", String(position.current / width * 0.4));
  }, []);

  const reveal = useCallback(() => {
    visible.current = true;
    setActive(true);
  }, []);

  const settle = useCallback((open: boolean) => {
    cancelPending();
    if (open) reveal();
    const duration = window.matchMedia("(prefers-reduced-motion: reduce)").matches ? 0 : DURATION;
    paint(open ? drawerWidth() : 0, duration);
    if (!open) {
      timer.current = setTimeout(() => {
        visible.current = false;
        setActive(false);
        timer.current = null;
      }, duration);
    }
  }, [cancelPending, paint, reveal]);

  const openMenu = useCallback(() => {
    if (!enabled) return;
    cancelPending();
    if (!visible.current) paint(0);
    reveal();
    // The mounted panel gets its starting transform before transitioning to the target.
    layerRef.current?.getBoundingClientRect();
    frame.current = requestAnimationFrame(() => { frame.current = 0; settle(true); });
  }, [enabled, cancelPending, paint, reveal, settle]);

  const closeMenu = useCallback(() => settle(false), [settle]);

  useEffect(() => {
    if (!enabled) { cancelPending(); visible.current = false; setActive(false); return; }
    const blocked = (target: Element | null) => {
      if (target?.closest("input, textarea, select, [contenteditable='true'], [data-swipe]")) return true;
      const dialog = target?.closest('[role="dialog"]');
      if (dialog && dialog !== layerRef.current) return true;
      if (!visible.current && document.querySelector('[role="dialog"]')) return true;
      for (let el = target; el && el !== document.body; el = el.parentElement) {
        if (el.scrollWidth > el.clientWidth + 2 && /auto|scroll/.test(getComputedStyle(el).overflowX)) return true;
      }
      return false;
    };
    const start = (e: TouchEvent) => {
      if (e.touches.length !== 1 || blocked(e.target as Element)) { gesture.current = null; return; }
      const p = e.touches[0];
      const panel = layerRef.current?.querySelector<HTMLElement>("[data-drawer-panel]");
      let current = position.current;
      if (visible.current && panel) current = drawerWidth() + new DOMMatrixReadOnly(getComputedStyle(panel).transform).m41;
      gesture.current = { x: p.clientX, y: p.clientY, at: performance.now(), lastX: p.clientX, lastAt: performance.now(), velocity: 0, start: current, dragging: false };
    };
    const move = (e: TouchEvent) => {
      const g = gesture.current;
      if (!g) return;
      if (e.touches.length !== 1) { gesture.current = null; if (g.dragging) settle(g.start > drawerWidth() / 2); return; }
      const p = e.touches[0], dx = p.clientX - g.x, dy = p.clientY - g.y;
      if (!g.dragging) {
        if (Math.abs(dx) < 8 && Math.abs(dy) < 8) return;
        if (Math.abs(dy) > Math.abs(dx) * 0.8 || (!visible.current && dx <= 0)) { gesture.current = null; return; }
        // Native scrolling already claimed this gesture; leave it alone.
        if (!e.cancelable) { gesture.current = null; return; }
        cancelPending();
        paint(g.start);
        reveal();
        g.dragging = true;
      }
      if (e.cancelable) e.preventDefault();
      const now = performance.now();
      g.velocity = (p.clientX - g.lastX) / Math.max(1, now - g.lastAt);
      g.lastX = p.clientX; g.lastAt = now;
      // Coalesce touch events to one transform/opacity update per display frame.
      if (frame.current) cancelAnimationFrame(frame.current);
      frame.current = requestAnimationFrame(() => { frame.current = 0; paint(g.start + dx); });
    };
    const finish = (e: TouchEvent) => {
      const g = gesture.current;
      gesture.current = null;
      if (!g?.dragging) return;
      cancelPending();
      const endX = e.changedTouches[0]?.clientX ?? g.lastX;
      const x = Math.min(drawerWidth(), Math.max(0, g.start + endX - g.x));
      paint(x);
      // Suppress the synthetic click after a drag, without blocking ordinary menu taps.
      const suppress = (click: MouseEvent) => { click.preventDefault(); click.stopImmediatePropagation(); };
      window.addEventListener("click", suppress, { capture: true, once: true });
      setTimeout(() => window.removeEventListener("click", suppress, true), 400);
      const velocity = performance.now() - g.lastAt < 100 ? g.velocity : 0;
      settle(Math.abs(velocity) > 0.45 ? velocity > 0 : x > drawerWidth() * 0.5);
    };
    const cancel = () => {
      const g = gesture.current; gesture.current = null;
      if (g?.dragging) settle(g.start > drawerWidth() / 2);
    };
    const resize = () => { if (visible.current) settle(position.current > drawerWidth() / 2); else paint(0); };
    window.addEventListener("touchstart", start, { passive: true });
    window.addEventListener("touchmove", move, { passive: false });
    window.addEventListener("touchend", finish);
    window.addEventListener("touchcancel", cancel);
    window.addEventListener("resize", resize);
    return () => {
      window.removeEventListener("touchstart", start);
      window.removeEventListener("touchmove", move);
      window.removeEventListener("touchend", finish);
      window.removeEventListener("touchcancel", cancel);
      window.removeEventListener("resize", resize);
      cancelPending();
    };
  }, [enabled, cancelPending, paint, reveal, settle]);

  return { active, openMenu, closeMenu, layerRef };
}
