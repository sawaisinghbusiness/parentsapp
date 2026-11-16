"use client";

import { useEffect } from "react";
import { APP_LOCK } from "./appLock";

/**
 * Screens where a parent must be able to zoom (audit 2026-11-16): the report card, an album photo and the
 * payment QR. While `on`, the viewport allows pinch zoom and AppLock lets the pinch through; on leaving,
 * the fixed size comes back. Does nothing when APP_LOCK is off (zoom is already allowed then).
 */
export function useAllowZoom(on = true) {
  useEffect(() => {
    if (!APP_LOCK || !on) return;
    const meta = document.querySelector<HTMLMetaElement>('meta[name="viewport"]');
    const was = meta?.content;
    if (meta) meta.content = (was || "width=device-width, initial-scale=1").replace(/,?\s*(maximum-scale|user-scalable)=[^,]*/g, "") + ", maximum-scale=5, user-scalable=yes";
    document.documentElement.dataset.zoom = "1";
    return () => {
      if (meta && was !== undefined) meta.content = was;
      delete document.documentElement.dataset.zoom;
    };
  }, [on]);
}
