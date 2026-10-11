/** Live school bus for parents: where the bus is now and how long until it reaches the child's stop. */

export interface LatLng {
  lat: number;
  lng: number;
}
export interface LiveStop {
  name: string;
  time: string;
  lat: number | null;
  lng: number | null;
  done: boolean;
}
export interface LiveBus {
  running: boolean;
  kind: "morning" | "afternoon";
  /** When the bus last sent its place; null when it hasn't sent one for a while. */
  at: string | null;
  bus: LatLng | null;
  /** In the order this trip reaches them. */
  stops: LiveStop[];
  /** null until a driver saves it at the school gate. */
  school: { name: string; lat: number | null; lng: number | null };
  myStop: string | null;
  /** Ticked by the driver: got on (morning) / got off (afternoon). */
  child: { done: boolean; at: string | null };
  /** Set by the driver when the bus is running late. */
  delay?: { reason: string; minutes: number; at: string } | null;
  /** The child is absent today, so the bus won't stop for them and no alerts come. */
  absent?: boolean;
}

/** The driver's reasons, as parents read them. */
export const DELAY_WHY: Record<string, { hi: string; en: string }> = {
  traffic: { hi: "ट्रैफ़िक जाम की वजह से", en: "Because of a traffic jam" },
  breakdown: { hi: "बस ख़राब होने की वजह से", en: "Because the bus broke down" },
  puncture: { hi: "टायर पंक्चर होने की वजह से", en: "Because of a flat tyre" },
  road: { hi: "रास्ता बंद होने की वजह से", en: "Because a road is closed" },
  other: { hi: "किसी वजह से", en: "For a reason on the road" },
};

/** Metres between two points (haversine). */
export function metres(a: LatLng, b: LatLng) {
  const R = 6371e3;
  const rad = Math.PI / 180;
  const dLat = (b.lat - a.lat) * rad;
  const dLng = (b.lng - a.lng) * rad;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

/** Town driving: straight-line metres × 1.3 at about 20 km/h. Same sum as the driver's app. */
export const minutesFor = (m: number) => Math.max(1, Math.round(((m * 1.3) / 1000 / 20) * 60));

/** Metres the bus still has to drive to reach `stop`: to the next stop, then stop to stop. */
export function metresTo(live: LiveBus, stop: string) {
  if (!live.bus) return null;
  const left = live.stops.filter((s) => !s.done);
  const idx = left.findIndex((s) => s.name === stop);
  if (idx < 0) return null;
  let at: LatLng = live.bus;
  let sum = 0;
  for (const s of left.slice(0, idx + 1)) {
    if (s.lat === null || s.lng === null) continue;
    sum += metres(at, { lat: s.lat, lng: s.lng });
    at = { lat: s.lat, lng: s.lng };
  }
  return sum;
}

/** Alert the parent when the bus is this many minutes from their stop. */
export const ALERT_MIN = 3;
