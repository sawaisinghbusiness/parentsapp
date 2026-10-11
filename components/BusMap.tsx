"use client";

import { useEffect, useRef, useState } from "react";
import type * as Leaflet from "leaflet";
import "leaflet/dist/leaflet.css";
import { LocateFixed } from "lucide-react";
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
export function BusMap({ stops, bus, className, label }: { stops: MapStop[]; bus: LatLng | null; className?: string; label: string }) {
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
    if (pts.length > 1) mod.polyline(pts, { color: "#1446A0", weight: 5, opacity: 0.55, lineJoin: "round" }).addTo(layer.current);
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
  }, [ready, stops]); // eslint-disable-line react-hooks/exhaustive-deps

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
        .marker([bus.lat, bus.lng], { icon: mod.divIcon({ className: "", html: '<span class="map-bus"></span>', iconSize: [30, 30], iconAnchor: [15, 15] }), zIndexOffset: 1000, keyboard: false })
        .addTo(m);
    } else busMarker.current.setLatLng([bus.lat, bus.lng]);
    if (!fitted.current) {
      // No saved stops to frame: go straight to the bus.
      m.setView([bus.lat, bus.lng], 16);
      fitted.current = true;
    } else if (follow) m.panTo([bus.lat, bus.lng], { animate: true, duration: 0.8 });
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
