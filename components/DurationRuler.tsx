"use client";
import { useEffect, useRef, useState, type PointerEvent, type KeyboardEvent, type MouseEvent } from "react";
const clamp = (n: number) => Math.max(1, Math.min(180, n));
const STEP = 12;

export function useDurationScrub(value: number, change: (n: number) => void, enabled: boolean) {
  const [active, setActive] = useState(false);
  const [position, setPosition] = useState(value);
  const press = useRef<{id: number; x: number; start: number; last: number; held: boolean} | null>(null);
  const hold = useRef<ReturnType<typeof setTimeout> | null>(null);
  const consumed = useRef(false);
  const audio = useRef<AudioContext | null>(null);
  const lastSound = useRef(0);
  const cancelHold = () => { if (hold.current !== null) clearTimeout(hold.current); hold.current = null; };
  useEffect(() => { if (!press.current?.held) setPosition(value); }, [value]);
  useEffect(() => () => { if (hold.current !== null) clearTimeout(hold.current); void audio.current?.close().catch(() => {}); }, []);
  useEffect(() => { if (!enabled) { cancelHold(); press.current = null; setActive(false); } }, [enabled]);
  const tick = () => {
    const ctx = audio.current;
    if (!ctx || ctx.state !== "running" || performance.now() - lastSound.current < 32) return;
    lastSound.current = performance.now();
    const oscillator = ctx.createOscillator(), gain = ctx.createGain();
    oscillator.type = "triangle";
    oscillator.frequency.setValueAtTime(1700, ctx.currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(650, ctx.currentTime + .018);
    gain.gain.setValueAtTime(.035, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(.0001, ctx.currentTime + .022);
    oscillator.connect(gain); gain.connect(ctx.destination);
    oscillator.start(); oscillator.stop(ctx.currentTime + .025);
    oscillator.onended = () => { oscillator.disconnect(); gain.disconnect(); };
  };
  const finish = () => { cancelHold(); const p = press.current; press.current = null; setActive(false); if (p) setPosition(p.last); };
  const bindings = {
    onPointerDown: (e: PointerEvent<HTMLElement>) => {
      if (!enabled || e.button !== 0 || !e.isPrimary) return;
      if (e.currentTarget.dataset.durationPresets && !(e.target as HTMLElement).closest('[aria-pressed="true"]')) return;
      cancelHold(); consumed.current = false;
      e.currentTarget.setPointerCapture(e.pointerId);
      press.current = {id:e.pointerId, x:e.clientX, start:value, last:value, held:false};
      try { const Audio = window.AudioContext || (window as any).webkitAudioContext; if (!audio.current && Audio) audio.current = new Audio(); void audio.current?.resume().catch(() => {}); } catch { /* Silent dragging remains available. */ }
      hold.current = setTimeout(() => { if (!press.current) return; press.current.held = true; consumed.current = true; setPosition(value); setActive(true); }, 300);
    },
    onPointerMove: (e: PointerEvent<HTMLElement>) => {
      const p = press.current; if (!p || p.id !== e.pointerId) return;
      if (!p.held) { if (Math.abs(e.clientX-p.x)>10) { cancelHold(); press.current=null; } return; }
      e.preventDefault(); const pos=clamp(p.start+(e.clientX-p.x)/STEP), next=Math.round(pos); setPosition(pos);
      if (next!==p.last) { p.last=next; change(next); tick(); }
    },
    onPointerUp: (e: PointerEvent<HTMLElement>) => { finish(); if(e.currentTarget.hasPointerCapture(e.pointerId)) e.currentTarget.releasePointerCapture(e.pointerId); },
    onPointerCancel: finish,
    onLostPointerCapture: finish,
    onContextMenu: (e: MouseEvent<HTMLElement>) => { if(enabled) e.preventDefault(); },
  };
  const keyboard = (e: KeyboardEvent<HTMLElement>) => {
    if(!enabled) return;
    const delta=e.key==="ArrowRight"||e.key==="ArrowUp"?1:e.key==="ArrowLeft"||e.key==="ArrowDown"?-1:0;
    if(delta||e.key==="Home"||e.key==="End") { e.preventDefault(); change(e.key==="Home"?1:e.key==="End"?180:clamp(value+delta*(e.shiftKey?5:1))); }
  };
  return {active,position,bindings,keyboard,consumeClick:()=>{const held=consumed.current;consumed.current=false;return held;}};
}

export function DurationRuler({position}:{position:number}) {
  const center=Math.round(position);
  return <div className="duration-ruler relative h-[58px] w-full overflow-hidden rounded-[10px] bg-white" aria-hidden="true">
    {Array.from({length:35},(_,i)=>center+i-17).filter(n=>n>=1&&n<=180).map(n=><div key={n} className="absolute top-2 flex w-6 -translate-x-1/2 flex-col items-center" style={{left:`calc(50% + ${(n-position)*STEP}px)`}}>
      <i className={n%5===0?"block h-5 w-[2px] bg-[#647187]":"mt-2 block h-3 w-px bg-[#B4BDC9]"}/>
      {n%5===0&&<span className="tnum mt-1 text-[10px] font-medium text-[#596273]">{n}</span>}
    </div>)}
    <span className="absolute left-1/2 top-0 h-8 w-[2px] -translate-x-1/2 rounded-full bg-[#BE4D25]"/>
  </div>;
}