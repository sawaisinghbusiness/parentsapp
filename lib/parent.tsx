"use client";

import { Fragment, createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { invalidateChildCache, useApi, type ApiError } from "./api";
import { useL } from "./i18n";
import { DEMO, demoSignedIn } from "./demo";

export interface Child {
  id: string;
  name: string;
  class: string;
  section: string;
  classSec: string;
  rollNo: string;
  srNo: string;
  admissionNo: string;
  photoUrl: string | null;
  fatherName: string;
  motherName: string;
  bus: boolean;
  busRoute: string | null;
  busStop: string | null;
}

export interface School {
  name: string;
  shortName: string;
  logoUrl: string | null;
  /** School photo from ERP Settings for the Home header; null until one is uploaded. */
  heroUrl?: string | null;
  address: string;
  officePhone: string;
  payQrUrl: string | null;
  upiName: string;
}

export interface Me {
  phone: string;
  children: Child[];
  school: School;
}

interface ParentState {
  me: Me | undefined;
  child: Child | undefined;
  pick: (id: string) => void;
  stale: boolean;
  loading: boolean;
  /** Set when /me failed and there is no saved copy: the screens show an error instead of loading forever. */
  error: ApiError | null;
  reload: () => void;
}

const Ctx = createContext<ParentState>({ me: undefined, child: undefined, pick: () => {}, stale: false, loading: true, error: null, reload: () => {} });
const PICK = "pa:child";

/** The signed-in parent, their children, and which child the screens are showing. */
export function ParentProvider({ children }: { children: React.ReactNode }) {
  const { data: me, stale, loading, error, reload } = useApi<Me>("/me");
  // The browser tab carries the school's name from ERP Settings.
  useEffect(() => {
    if (me?.school.name) document.title = `${me.school.name} · Parents`;
  }, [me?.school.name]);
  const [picked, setPicked] = useState<string | null>(null);
  const [selectionReady, setSelectionReady] = useState(false);
  const [switchingTo, setSwitchingTo] = useState<string | null>(null);
  const L = useL();

  useEffect(() => {
    // Not signed in: straight to the sign-in page, without first drawing the home screen.
    if (DEMO && !demoSignedIn()) {
      window.location.replace("/login/");
      return;
    }
    try {
      setPicked(localStorage.getItem(PICK));
    } catch {
      /* Storage may be unavailable. */
    }
    setSelectionReady(true);
  }, []);

  const pick = useCallback((id: string) => {
    const current = me?.children.find(c => c.id === picked) || me?.children[0];
    if (id === current?.id || !me?.children.some(c => c.id === id)) return;
    invalidateChildCache(id);
    let remembered = false;
    try { localStorage.setItem(PICK, id); remembered = localStorage.getItem(PICK) === id; } catch { /* Fall back to remounting in this tab. */ }
    setPicked(id);
    if (remembered) {
      setSwitchingTo(id);
      requestAnimationFrame(() => requestAnimationFrame(() => window.location.reload()));
    }
  }, [me, picked]);

  const child = useMemo(() => selectionReady ? (me?.children.find((c) => c.id === picked) || me?.children[0]) : undefined, [me, picked, selectionReady]);

  return <Ctx.Provider value={{ me, child, pick, stale, loading, error: me ? null : error, reload }}>
    {!selectionReady || switchingTo ? <div className="flex min-h-[100dvh] flex-col items-center justify-center gap-3 bg-[#F7F9FC] px-6 text-center" role="status" aria-live="polite" aria-busy="true">
      <span className="h-7 w-7 animate-spin rounded-full border-2 border-[#DCE4ED] border-t-[#0D2A5E] motion-reduce:animate-none" aria-hidden="true" />
      {switchingTo && <p className="text-lg font-semibold text-ink-900">{me?.children.find(c => c.id === switchingTo)?.name}</p>}
      <p className="text-sm text-ink-600">{L({"hi":"प्रोफ़ाइल लोड हो रही है","en":"Loading profile"})}</p>
    </div> : <Fragment key={child?.id || "no-child"}>{children}</Fragment>}
  </Ctx.Provider>;
}

export const useParent = () => useContext(Ctx);
