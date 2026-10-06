"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { useApi } from "./api";

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
  reload: () => void;
}

const Ctx = createContext<ParentState>({ me: undefined, child: undefined, pick: () => {}, stale: false, loading: true, reload: () => {} });
const PICK = "pa:child";

/** The signed-in parent, their children, and which child the screens are showing. */
export function ParentProvider({ children }: { children: React.ReactNode }) {
  const { data: me, stale, loading, reload } = useApi<Me>("/me");
  const [picked, setPicked] = useState<string | null>(null);

  useEffect(() => {
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

  return <Ctx.Provider value={{ me, child, pick, stale, loading, reload }}>{children}</Ctx.Provider>;
}

export const useParent = () => useContext(Ctx);
