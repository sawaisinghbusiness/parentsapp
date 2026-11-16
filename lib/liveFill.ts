"use client";
/**
 * Live trips often have stops whose place nobody has saved yet (the driver's phone saves it the first time
 * the bus stops there). Without places, the minutes-to-your-stop, the "3 minutes away" alert and the stop
 * pins never appear (audit 2026-11-16). Same approach as the staff app's lib/routeFill.ts, on the phone only
 * (nothing is written to the backend):
 *   1. a stop (or the school) with no place is looked up by its name on OpenStreetMap (Photon), within ~20 km
 *      of a place the trip already knows (else Barmer); a stop that can't be found goes ~1 km on from the
 *      stop before it, so the order still holds;
 *   2. when the backend sent no road line, the road through all places comes from OSRM.
 * Results are kept in this browser, so each route is looked up once.
 */
import { useEffect, useState } from "react";
import type { LatLng, LiveBus } from "@/lib/bus";

const BARMER: LatLng = { lat: 25.7521, lng: 71.3967 };
const placed = (p: { lat: number | null; lng: number | null }) => p.lat !== null && p.lng !== null;

function remember<T>(key: string, v?: T): T | null {
  try {
    if (v !== undefined) localStorage.setItem(key, JSON.stringify(v));
    else {
      const raw = localStorage.getItem(key);
      return raw ? (JSON.parse(raw) as T) : null;
    }
  } catch {
    /* storage blocked: just fetched again next time */
  }
  return null;
}

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9ऀ-ॿ ]+/g, " ").trim();
const kmBetween = (a: LatLng, b: LatLng) => Math.hypot((a.lat - b.lat) * 111, (a.lng - b.lng) * 100);
const timeout = (ms: number) => (typeof AbortSignal !== "undefined" && "timeout" in AbortSignal ? AbortSignal.timeout(ms) : undefined);

/** A result counts only within 20 km and when its name has the stop's first word. "Not found" is remembered. */
async function lookUp(name: string, near: LatLng): Promise<LatLng | null> {
  const key = `pa:place:${near.lat.toFixed(2)},${near.lng.toFixed(2)}:${norm(name)}`;
  const hit = remember<LatLng | { none: true }>(key);
  if (hit) return "none" in hit ? null : hit;
  const word = norm(name).split(" ")[0] || "";
  try {
    const res = await fetch(`https://photon.komoot.io/api/?limit=5&lat=${near.lat}&lon=${near.lng}&q=${encodeURIComponent(`${name} Barmer`)}`, { signal: timeout(8000) });
    if (!res.ok) return null;
    const j = await res.json();
    for (const f of j?.features || []) {
      const [lng, lat] = f?.geometry?.coordinates || [];
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) continue;
      const p = { lat: Number(lat), lng: Number(lng) };
      const label = norm(`${f.properties?.name || ""} ${f.properties?.street || ""}`);
      if (kmBetween(p, near) <= 20 && word.length >= 3 && label.includes(word)) {
        remember(key, p);
        return p;
      }
    }
  } catch {
    return null;
  }
  remember(key, { none: true });
  return null;
}

async function roadLine(points: LatLng[]): Promise<[number, number][] | null> {
  const key = "pa:road:" + points.map((p) => `${p.lat.toFixed(5)},${p.lng.toFixed(5)}`).join("|");
  const hit = remember<[number, number][]>(key);
  if (hit) return hit;
  try {
    const res = await fetch(`https://router.project-osrm.org/route/v1/driving/${points.map((p) => `${p.lng},${p.lat}`).join(";")}?overview=full&geometries=geojson`, { signal: timeout(10000) });
    const r = (await res.json())?.routes?.[0];
    if (!r?.geometry?.coordinates?.length) return null;
    const pts = r.geometry.coordinates.map(([lng, lat]: number[]) => [lat, lng] as [number, number]);
    remember(key, pts);
    return pts;
  } catch {
    return null;
  }
}

type Fill = { stops: Record<string, LatLng>; school: LatLng | null; path: [number, number][] | null };

async function fill(live: LiveBus): Promise<Fill> {
  const known = [...live.stops, live.school].find(placed);
  const near: LatLng = known ? { lat: known.lat!, lng: known.lng! } : live.bus || BARMER;
  const stops: Record<string, LatLng> = {};
  let prev: LatLng | null = null;
  let k = 0;
  // Places are worked out in the morning order (home stops first, then school), whichever way this trip runs.
  const ordered = live.kind === "morning" ? live.stops : [...live.stops].reverse();
  const all: LatLng[] = [];
  for (const s of ordered) {
    if (placed(s)) {
      prev = { lat: s.lat!, lng: s.lng! };
      all.push(prev);
      continue;
    }
    let p = await lookUp(s.name, near);
    if (!p) {
      const from: LatLng = prev || near;
      const a = (k++ * 70 + 30) * (Math.PI / 180);
      p = { lat: from.lat + 0.009 * Math.cos(a), lng: from.lng + 0.01 * Math.sin(a) };
    }
    stops[s.name] = p;
    prev = p;
    all.push(p);
  }
  let school: LatLng | null = null;
  if (!placed(live.school) && live.school.name) school = await lookUp(live.school.name, near);
  const schoolAt = placed(live.school) ? { lat: live.school.lat!, lng: live.school.lng! } : school;
  if (schoolAt) all.push(schoolAt);
  let path: [number, number][] | null = null;
  if (!live.pathRoad && all.length >= 2) {
    const road = await roadLine(all);
    if (road) path = live.kind === "morning" ? road : [...road].reverse();
  }
  return { stops, school, path };
}

const signature = (l: LiveBus) => `${l.tripId || ""}|${l.kind}|${l.school.name}@${l.school.lat},${l.school.lng}|${l.pathRoad ? 1 : 0}|` + l.stops.map((s) => `${s.name}@${s.lat},${s.lng}`).join(";");

/** The live trip as the server sent it, then with missing stop places (and a road line) filled in. */
export function useFilledLive(live: LiveBus | null): LiveBus | null {
  const [filled, setFilled] = useState<{ sig: string; f: Fill } | null>(null);
  const need = !!live && live.running && !live.demo && (live.stops.some((s) => !placed(s)) || !placed(live.school) || !live.pathRoad);
  const sig = live && need ? signature(live) : "";
  useEffect(() => {
    if (!live || !need) return;
    let gone = false;
    void fill(live).then((f) => {
      if (!gone) setFilled({ sig, f });
    });
    return () => {
      gone = true;
    };
  }, [sig]); // eslint-disable-line react-hooks/exhaustive-deps
  if (!live || !need || !filled || filled.sig !== sig) return live;
  const { f } = filled;
  return {
    ...live,
    stops: live.stops.map((s) => (placed(s) || !f.stops[s.name] ? s : { ...s, lat: f.stops[s.name].lat, lng: f.stops[s.name].lng })),
    school: !placed(live.school) && f.school ? { ...live.school, lat: f.school.lat, lng: f.school.lng } : live.school,
    ...(f.path ? { path: f.path, pathRoad: true } : {}),
  };
}
