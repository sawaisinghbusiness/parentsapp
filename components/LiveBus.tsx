"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import type { LiveBus } from "@/lib/bus";
import { useFilledLive } from "@/lib/liveFill";

const POLL_MS = 10_000;

/** Asks the school where the bus is every 10 seconds while the screen is open. */
export function useLiveBus(studentId: string | null) {
  const [snapshot, setSnapshot] = useState<{studentId:string;live:LiveBus}|null>(null);
  useEffect(() => {
    if (!studentId) return;
    let stopped=false,busy=false;
    const tick=async()=>{if(busy)return;busy=true;try{const live=await api<LiveBus>(`/bus/live?student=${encodeURIComponent(studentId)}`);if(!stopped)setSnapshot({studentId,live:{...live,unavailable:false}})}catch{if(!stopped)setSnapshot(previous=>previous?.studentId===studentId?{studentId,live:{...previous.live,unavailable:true}}:{studentId,live:{running:false,unavailable:true,kind:"morning",at:null,bus:null,stops:[],school:{name:"",lat:null,lng:null},myStop:null,child:{done:false,at:null}}})}finally{busy=false}};
    void tick();const timer=setInterval(()=>{if(document.visibilityState==="visible")void tick()},POLL_MS);
    const visible=()=>{if(document.visibilityState==="visible")void tick()};document.addEventListener("visibilitychange",visible);
    return()=>{stopped=true;clearInterval(timer);document.removeEventListener("visibilitychange",visible)};
  },[studentId]);
  // Stops without a saved place get one on the phone, so minutes, alerts and pins work (lib/liveFill.ts).
  return useFilledLive(snapshot?.studentId===studentId?snapshot.live:null);
}
