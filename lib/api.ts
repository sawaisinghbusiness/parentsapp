"use client";
import { setResourceFailure } from "@/lib/resourceStatus";

import { useCallback, useEffect, useRef, useState } from "react";
import { DEMO, demoApi } from "./demo";

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

/** A server that does not answer in this time counts as unreachable, so no screen waits forever. */
const TIMEOUT_MS = 15_000;

/** Calls the backend through this site's own /api (same domain, so the sign-in cookie just works). */
export async function api<T>(path: string, init?: { method?: string; body?: unknown; timeoutMs?: number }): Promise<T> {
  const method = init?.method || (init?.body ? "POST" : "GET");
  if (DEMO) {
    try {
      return (await demoApi(path, method, init?.body)) as T;
    } catch (e: any) {
      throw new ApiError(e?.status ?? 500, e?.message || "");
    }
  }

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), init?.timeoutMs ?? TIMEOUT_MS);
  let res: Response;
  try {
    res = await fetch(`/api/parent${path}`, {
      method,
      credentials: "include",
      headers: init?.body ? { "Content-Type": "application/json" } : undefined,
      body: init?.body ? JSON.stringify(init.body) : undefined,
      cache: "no-store",
      signal: ctrl.signal,
    });
  } catch {
    // Our own timer firing means the server was slow, not that the phone is offline.
    throw new ApiError(0, ctrl.signal.aborted ? "timeout" : "offline");
  } finally {
    clearTimeout(timer);
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new ApiError(res.status, (data as any)?.error || "");
  return data as T;
}

/* ── Last good answer kept on the phone, so slow or no network still shows something ── */

const KEY = "pa:cache:";
export function readCache<T>(path: string): T | undefined {
  try {
    const raw = localStorage.getItem(KEY + path);
    return raw ? (JSON.parse(raw).v as T) : undefined;
  } catch {
    return undefined;
  }
}
function writeCache(path: string, v: unknown) {
  try {
    localStorage.setItem(KEY + path, JSON.stringify({ at: Date.now(), v }));
  } catch {
    /* storage full or blocked: fine, we just won't have an offline copy */
  }
}
const SIGNED = "pa:signed-in";
/** Remembered on this phone after a sign-in, so the app can go straight to sign-in when it's missing. */
export function markSignedIn(on: boolean) {
  try {
    if (on) localStorage.setItem(SIGNED, "1");
    else localStorage.removeItem(SIGNED);
  } catch {
    /* storage blocked: the server's 401 still sends them to sign-in */
  }
}
export function hasSignInMark() {
  try {
    return localStorage.getItem(SIGNED) === "1";
  } catch {
    return false;
  }
}

const REFRESH = "pa:refresh";
/** Loads every screen's data again (pull to refresh). */
export function refreshAll() {
  window.dispatchEvent(new Event(REFRESH));
}

/** Discard server responses for the selected child without touching local study sessions. */
export function invalidateChildCache(id: string) {
  try {
    for (const key of Object.keys(localStorage)) {
      if (!key.startsWith(KEY)) continue;
      const query = new URL(key.slice(KEY.length), "https://cache.local").searchParams;
      if (query.get("student") === id) localStorage.removeItem(key);
    }
  } catch { /* Switching still works when cache access is unavailable. */ }
}

export function clearCache() {
  try {
    for (const k of Object.keys(localStorage)) if (k.startsWith(KEY)) localStorage.removeItem(k);
  } catch {
    /* ignore */
  }
}

/**
 * Shows the saved copy at once, then the fresh one. `stale` is true while only the saved copy is
 * on screen and the network failed, so the page can say "purani jaankari".
 */
export function useApi<T>(path: string | null) {
  // What was saved last time shows in the very first frame, so a screen opens filled, not as grey boxes.
  const [data, setData] = useState<T | undefined>(() => (path && typeof window !== "undefined" ? readCache<T>(path) : undefined));
  const [error, setError] = useState<ApiError | null>(null);
  const [loading, setLoading] = useState(!!path);
  const [stale, setStale] = useState(false);
  const live = useRef(path);
  const resourceKey = useRef(Symbol("resource"));

  const load = useCallback(async () => {
    if (!path) return false;
    live.current = path;
    setLoading(true);
    try {
      const fresh = await api<T>(path);
      if (live.current !== path) return;
      setData(fresh);
      setError(null);
      setStale(false);
      writeCache(path, fresh);
      return true;
    } catch (e) {
      if (live.current !== path) return;
      const err = e instanceof ApiError ? e : new ApiError(0, "offline");
      setError(err);
      setStale(true);
      if (err.status === 401) {
        markSignedIn(false);
        window.location.replace("/login/");
      }
      return false;
    } finally {
      if (live.current === path) setLoading(false);
    }
  }, [path]);

  useEffect(() => {
    if (!path) return;
    setData(readCache<T>(path));
    setError(null);
    setStale(false);
    load();
  }, [path, load]);

  // Pull to refresh (see AppShell) asks every screen on show to load again.
  useEffect(() => {
    if (!path) return;
    const again = () => load();
    window.addEventListener(REFRESH, again);
    return () => window.removeEventListener(REFRESH, again);
  }, [path, load]);

  useEffect(() => {
    const key = resourceKey.current;
    setResourceFailure(key, path && error ? {path,hasData:data!==undefined,status:error.status,retry:load} : null);
    return () => setResourceFailure(key,null);
  }, [path,error,data,load]);
  return { data, error, loading, stale, reload: load };
}

/**
 * Sign-out on a shared phone (audit 2026-11-16): besides the saved answers, forget the chosen child,
 * study sessions, fee screen choices, notice "seen" marks and the assistant's settings. The language
 * stays, and so does the demo's own sample store.
 */
export function clearOnSignOut() {
  clearCache();
  try {
    const keep = new Set(["pa:lang", "pa:demo-store", "pa:signed-in", "pa:demo-session"]);
    for (const k of Object.keys(localStorage)) if (k.startsWith("pa:") && !keep.has(k)) localStorage.removeItem(k);
  } catch {
    /* ignore */
  }
}
