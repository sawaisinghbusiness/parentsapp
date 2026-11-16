"use client";

import { useEffect } from "react";

/**
 * Temporary lock (the user's ask, 2026-11-14, "abhi ke liye"): the app keeps its size, pinch and
 * double-tap zoom do nothing, and text cannot be selected or copied. Text boxes still work normally.
 *
 * To undo: set APP_LOCK in lib/appLock.ts to false. That turns this off and gives the page its zoom back.
 */
export function AppLock() {
  useEffect(() => {
    const root = document.documentElement;
    root.classList.add("app-lock");

    // Text boxes, and anything marked data-allow-copy (receipt numbers, UTR), can still be selected and copied.
    const typing = (t: EventTarget | null) => {
      const el = t instanceof Text ? t.parentElement : t;
      return el instanceof HTMLElement && !!el.closest("input, textarea, select, [contenteditable='true'], [data-allow-copy]");
    };
    // A screen that allows zoom (useAllowZoom: report card, album photo, payment QR) sets data-zoom on <html>.
    const zoomOk = () => root.dataset.zoom === "1";
    // iPhone ignores the viewport's no-zoom setting, so its pinch gesture is stopped here.
    const gesture = (e: Event) => {
      if (!zoomOk()) e.preventDefault();
    };
    const pinch = (e: TouchEvent) => {
      if (e.touches.length > 1 && !zoomOk()) e.preventDefault();
    };
    // Ctrl + wheel and Ctrl +/- zoom on a computer.
    const wheel = (e: WheelEvent) => {
      if (e.ctrlKey) e.preventDefault();
    };
    const keys = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && ["+", "-", "=", "0"].includes(e.key)) e.preventDefault();
    };
    // No copying, cutting or long-press menu, except inside a text box.
    const block = (e: Event) => {
      if (!typing(e.target)) e.preventDefault();
    };

    document.addEventListener("gesturestart", gesture, { passive: false });
    document.addEventListener("touchmove", pinch, { passive: false });
    window.addEventListener("wheel", wheel, { passive: false });
    window.addEventListener("keydown", keys);
    document.addEventListener("copy", block);
    document.addEventListener("cut", block);
    document.addEventListener("contextmenu", block);
    document.addEventListener("selectstart", block);
    return () => {
      root.classList.remove("app-lock");
      document.removeEventListener("gesturestart", gesture);
      document.removeEventListener("touchmove", pinch);
      window.removeEventListener("wheel", wheel);
      window.removeEventListener("keydown", keys);
      document.removeEventListener("copy", block);
      document.removeEventListener("cut", block);
      document.removeEventListener("contextmenu", block);
      document.removeEventListener("selectstart", block);
    };
  }, []);
  return null;
}
