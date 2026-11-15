"use client";

import { useEffect, useRef, useState } from "react";
import type * as Leaflet from "leaflet";
import "leaflet/dist/leaflet.css";
import "./bus-map.css";
import { LocateFixed } from "lucide-react";
import { animateReceivedPoint } from "@/lib/receivedMotion";
import type { LatLng } from "@/lib/bus";

/** Where the map starts before the route or the bus is known. */
const BARMER: [number, number] = [25.7521, 71.3967];

export interface MapStop {
  name: string;
  lat: number;
  lng: number;
  state: "done" | "next" | "later" | "school";
}

/**
 * OpenStreetMap with the route's stops, the line between them and the bus. Follows the bus while
 * it moves; once the map is dragged it stays put until "back to the bus" is tapped.
 * Leaflet is loaded in the browser only (it needs `window`).
 */
export function BusMap({ stops, path, bus, className, label }: { stops: MapStop[]; path?: [number,number][] | null; bus: LatLng | null; className?: string; label: string }) {
  const box = useRef<HTMLDivElement>(null);
  const L = useRef<typeof Leaflet | null>(null);
  const map = useRef<Leaflet.Map | null>(null);
  const layer = useRef<Leaflet.LayerGroup | null>(null);
  const busMarker = useRef<Leaflet.Marker | null>(null);
  const [ready, setReady] = useState(false);
  const [follow, setFollow] = useState(true);
  const fitted = useRef(false);

  useEffect(() => {
    let gone = false;
    import("leaflet").then((mod) => {
      if (gone || !box.current || map.current) return;
      L.current = mod;
      const m = mod.map(box.current, { zoomControl: false, attributionControl: true });
      mod.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19,
        attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      }).addTo(m);
      m.attributionControl.setPrefix(false);
      // A view before anything is known (no saved stops yet), so Leaflet never draws without one.
      m.setView(BARMER, 13);
      m.on("dragstart", () => setFollow(false));
      layer.current = mod.layerGroup().addTo(m);
      map.current = m;
      setReady(true);
    });
    return () => {
      gone = true;
      map.current?.remove();
      map.current = null;
    };
  }, []);

  // Stops and the line between them.
  useEffect(() => {
    const mod = L.current;
    const m = map.current;
    if (!ready || !mod || !m || !layer.current) return;
    layer.current.clearLayers();
    const pts = stops.map((s) => [s.lat, s.lng] as [number, number]);
    if (path && path.length > 1) mod.polyline(path, { color: "#3F6652", weight: 4, opacity: 0.8, lineJoin: "round" }).addTo(layer.current);
    for (const s of stops) {
      mod.marker([s.lat, s.lng], {
        icon: mod.divIcon({ className: "", html: `<span class="map-stop map-stop-${s.state}"></span>`, iconSize: [18, 18], iconAnchor: [9, 9] }),
        title: s.name,
        keyboard: false,
      })
        .bindTooltip(s.name, { direction: "top", offset: [0, -8] })
        .addTo(layer.current);
    }
    if (!fitted.current && pts.length) {
      const all = bus ? [...pts, [bus.lat, bus.lng] as [number, number]] : pts;
      m.fitBounds(mod.latLngBounds(all), { padding: [36, 36], maxZoom: 16 });
      fitted.current = true;
    }
  }, [ready, stops, path]); // eslint-disable-line react-hooks/exhaustive-deps

  // The bus.
  useEffect(() => {
    const mod = L.current;
    const m = map.current;
    if (!ready || !mod || !m) return;
    if (!bus) {
      busMarker.current?.remove();
      busMarker.current = null;
      return;
    }
    if (!busMarker.current) {
      busMarker.current = mod
        .marker([bus.lat, bus.lng], { icon: mod.divIcon({ className: "", html: '<span class="bus-position-marker"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="5" y="3" width="14" height="16" rx="3"/><path d="M5 11h14M8 3v8m8-8v8M7 19v2m10-2v2"/><path d="M8 15h1m6 0h1"/></svg></span>', iconSize: [38, 38], iconAnchor: [19, 19] }), zIndexOffset: 1000, keyboard: false })
        .addTo(m);
    }
    const marker=busMarker.current;const old=marker.getLatLng();
    const cancel=animateReceivedPoint({lat:old.lat,lng:old.lng},bus,point=>marker.setLatLng([point.lat,point.lng]),{duration:1000,road:path||[],reduced:window.matchMedia("(prefers-reduced-motion: reduce)").matches});
    if (!fitted.current) {
      // No saved stops to frame: go straight to the bus.
      m.setView([bus.lat, bus.lng], 16);
      fitted.current = true;
    } else if (follow) m.panTo([bus.lat, bus.lng], { animate: !window.matchMedia("(prefers-reduced-motion: reduce)").matches, duration: 0.8 });
    return cancel;
  }, [ready, bus?.lat, bus?.lng, follow]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className={`relative isolate ${className || ""}`}>
      <div ref={box} className="h-full w-full bg-[#EEF0E8]" role="img" aria-label={label} />
      {bus && !follow && (
        <button
          onClick={() => setFollow(true)}
          className="absolute bottom-3 right-3 z-[500] flex min-h-[44px] items-center gap-1.5 rounded-xl bg-white px-3.5 text-[14px] font-semibold text-ink-900 shadow-[0_2px_10px_rgba(11,34,82,0.18)] active:bg-ink-50"
        >
          <LocateFixed className="h-[18px] w-[18px]" aria-hidden />
          Bus
        </button>
      )}
    </div>
  );
}
