"use client";

/**
 * The notice bell's "new" count (audit 2026-11-16). The server only sends how many notices came in the
 * last 7 days, with no "read" flag, so the phone remembers the newest notice date the parent has seen on
 * the Notices page, per child. The bell then counts only when a newer notice than that exists.
 * A server-side seen flag would be exact; this keeps the badge from staying lit after reading.
 */
const key = (child: string) => `pa:notice-seen:${child}`;

export function markNoticesSeen(child: string, newest: string | undefined) {
  if (!newest) return;
  try {
    const was = localStorage.getItem(key(child)) || "";
    if (newest > was) localStorage.setItem(key(child), newest);
  } catch {
    /* storage blocked: the badge just stays as the server says */
  }
}

/** How many to show on the bell: the server's count, or none once the newest notice was already seen. */
export function unseenCount(child: string | undefined, count: number, newest: string | undefined) {
  if (!child || !count) return 0;
  try {
    const seen = localStorage.getItem(key(child));
    if (seen && newest && newest <= seen) return 0;
  } catch {
    /* ignore */
  }
  return count;
}
