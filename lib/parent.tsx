"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { useApi, type ApiError } from "./api";
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
  address: string;
  officePhone: string;
  upiId: string | null;
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
  const [picked, setPicked] = useState<string | null>(null);

  useEffect(() => {
    // Not signed in: straight to the sign-in page, without first drawing the home screen.
    if (DEMO && !demoSignedIn()) {
      window.location.replace("/login/");
      return;
    }
    try {
      setPicked(localStorage.getItem(PICK));
    } catch {
      /* ignore */
    }
  }, []);

  const pick = useCallback((id: string) => {
    setPicked(id);
    try {
      localStorage.setItem(PICK, id);
    } catch {
      /* ignore */
    }
  }, []);

  const child = useMemo(() => me?.children.find((c) => c.id === picked) || me?.children[0], [me, picked]);

  return <Ctx.Provider value={{ me, child, pick, stale, loading, error: me ? null : error, reload }}>{children}</Ctx.Provider>;
}

export const useParent = () => useContext(Ctx);
