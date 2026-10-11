"use client";

import { useEffect, useRef, useState } from "react";
import clsx from "clsx";
import { BellRing, TriangleAlert } from "lucide-react";
import { api } from "@/lib/api";
import { DEMO } from "@/lib/demo";
import { useL } from "@/lib/i18n";
import { ALERT_MIN, DELAY_WHY, metresTo, minutesFor, type LiveBus } from "@/lib/bus";
import { BusMap, type MapStop } from "./BusMap";

const POLL_MS = DEMO ? 2_000 : 10_000;
/** The bus counts as "not sending" after this long without a new place. */
const QUIET_MS = 2 * 60_000;

/** Asks the school where the bus is every 10 seconds while the screen is open. */
export function useLiveBus(studentId: string | null) {
  const [live, setLive] = useState<LiveBus | null>(null);
  useEffect(() => {
    if (!studentId) return;
    let stop = false;
    const tick = async () => {
      try {
        const r = await api<LiveBus>(`/bus/live?student=${studentId}`);
        if (!stop) setLive(r);
      } catch {
        /* keep the last place on screen; the "seconds ago" line tells the parent it is old */
      }
    };
    tick();
    const t = setInterval(() => document.visibilityState === "visible" && tick(), POLL_MS);
    return () => {
      stop = true;
      clearInterval(t);
    };
  }, [studentId]);
  return live;
}

const agoText = (iso: string | null, L: ReturnType<typeof useL>) => {
  if (!iso) return "";
  const s = Math.max(0, Math.round((Date.now() - Date.parse(iso)) / 1000));
  if (s < 60) return L({ hi: `${s} सेकंड पहले`, en: `${s} sec ago` });
  return L({ hi: `${Math.round(s / 60)} मिनट पहले`, en: `${Math.round(s / 60)} min ago` });
};

const timeText = (iso: string) => new Date(iso).toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit" });

/**
 * The running trip: the map, how many minutes until the bus reaches this child's stop, and an
 * alert (sound, buzz and a phone notification if allowed) three minutes before it does.
 */
export function LiveBusCard({ live, childName }: { live: LiveBus; childName: string }) {
  const L = useL();
  const first = childName.split(" ")[0];
  const morning = live.kind === "morning";
  const mine = live.stops.find((s) => s.name === live.myStop) || null;
  const m = live.myStop && mine && !mine.done ? metresTo(live, live.myStop) : null;
  const mins = m !== null ? minutesFor(m) : null;
  // No place yet, or none for a while (phone off, no signal).
  const quiet = !live.bus || !live.at || Date.now() - Date.parse(live.at) > QUIET_MS;
  const [, redraw] = useState(0);
  useEffect(() => {
    const t = setInterval(() => redraw((x) => x + 1), 5_000);
    return () => clearInterval(t);
  }, []);

  // Three minutes out: once per trip.
  const [near, setNear] = useState(false);
  const warned = useRef(false);
  useEffect(() => {
    if (mins === null || mins > ALERT_MIN || warned.current || !morning) return;
    warned.current = true;
    setNear(true);
    navigator.vibrate?.([200, 100, 200]);
    const title = L({ hi: `बस ${mins} मिनट में आ रही है`, en: `Bus in ${mins} min` });
    const body = L({ hi: `${live.myStop} पर ${first} को तैयार रखें।`, en: `Have ${first} ready at ${live.myStop}.` });
    notify(title, body);
  }, [mins]); // eslint-disable-line react-hooks/exhaustive-deps

  // Driver ticked the child: on the bus / got off.
  const told = useRef(live.child.done);
  useEffect(() => {
    if (!live.child.done || told.current) return;
    told.current = true;
    notify(morning ? L({ hi: `${first} बस में चढ़ गया`, en: `${first} got on the bus` }) : L({ hi: `${first} बस से उतर गया`, en: `${first} got off the bus` }), live.myStop || "");
  }, [live.child.done]); // eslint-disable-line react-hooks/exhaustive-deps

  const stops: MapStop[] = live.stops
    .filter((s) => s.lat !== null && s.lng !== null)
    .map((s) => ({ name: s.name, lat: s.lat!, lng: s.lng!, state: s.done ? "done" : s.name === live.myStop ? "next" : "later" }));
  const school: MapStop[] = live.school.lat !== null && live.school.lng !== null ? [{ name: live.school.name, lat: live.school.lat, lng: live.school.lng, state: "school" }] : [];
  const line = morning ? [...stops, ...school] : [...school, ...stops];
  const leftStops = live.stops.filter((s) => !s.done).findIndex((s) => s.name === live.myStop);

  return (
    <section className="space-y-3">
      <BusMap stops={line} bus={live.bus} className="h-[240px] overflow-hidden rounded-2xl" label={L({ hi: "बस का नक्शा", en: "Bus map" })} />

      {live.delay && (
        <div role="status" className="flex gap-3 rounded-xl bg-marigold-50 px-3.5 py-3">
          <TriangleAlert className="mt-0.5 h-5 w-5 shrink-0 text-marigold-600" aria-hidden />
          <div>
            <p className="text-[14.5px] font-bold">{L({ hi: "बस देर से आएगी", en: "The bus is running late" })}</p>
            <p className="mt-0.5 text-[13px] leading-snug text-ink-600">
              {(() => {
                const why = DELAY_WHY[live.delay.reason] || DELAY_WHY.other;
                const late = live.delay.minutes >= 30 ? L({ hi: "30 मिनट से ज़्यादा", en: "more than 30 minutes" }) : L({ hi: `करीब ${live.delay.minutes} मिनट`, en: `about ${live.delay.minutes} minutes` });
                return L({ hi: `${why.hi} बस ${late} देर से पहुँचेगी।`, en: `${why.en}, the bus will be ${late} late.` });
              })()}
            </p>
          </div>
        </div>
      )}

      {near && mins !== null && (
        <div role="alert" className="flex items-center gap-2.5 rounded-xl bg-ink-900 px-3.5 py-3 text-[14.5px] font-semibold text-white">
          <BellRing className="h-5 w-5 shrink-0 text-marigold-300" aria-hidden />
          {L({ hi: `बस ${mins} मिनट में ${live.myStop} पहुँच रही है`, en: `The bus reaches ${live.myStop} in ${mins} min` })}
        </div>
      )}

      <div className="flex items-end gap-3">
        <div className="min-w-0 flex-1">
          <p className="meta">
            <span>
              <span className={clsx("dot h-2 w-2", quiet ? "bg-marigold-500" : "bg-jade-600")} aria-hidden />
              {!live.bus || !live.at
                ? L({ hi: "ट्रिप शुरू हो गई, बस की जगह अभी नहीं आई", en: "The trip has started; the bus's place hasn't come yet" })
                : quiet
                  ? L({ hi: `बस की जगह ${agoText(live.at, L)} की है`, en: `Bus place from ${agoText(live.at, L)}` })
                  : `${L({ hi: "बस चल रही है", en: "Bus is moving" })} · ${agoText(live.at, L)}`}
            </span>
          </p>
          {live.child.done ? (
            <>
              <p className="mt-1 text-[17px] font-bold leading-snug">{morning ? L({ hi: `${first} बस में है`, en: `${first} is on the bus` }) : L({ hi: `${first} बस से उतर गया`, en: `${first} got off the bus` })}</p>
              <p className="text-[13px] text-ink-500">
                {live.myStop}
                {live.child.at ? ` · ${timeText(live.child.at)}` : ""}
              </p>
            </>
          ) : (
            <>
              <p className="mt-1 text-[17px] font-bold leading-snug">{L({ hi: "आपके स्टॉप तक", en: "To your stop" })}</p>
              <p className="text-[13px] text-ink-500">
                {live.myStop}
                {leftStops > 0 ? ` · ${L({ hi: `${leftStops} स्टॉप बाकी`, en: leftStops === 1 ? "1 stop before yours" : `${leftStops} stops before yours` })}` : leftStops === 0 ? ` · ${L({ hi: "अगला स्टॉप आपका", en: "yours is next" })}` : ""}
              </p>
            </>
          )}
        </div>
        {!live.child.done && mins !== null && (
          <div className="shrink-0 text-right">
            <p className="tnum text-[34px] font-extrabold leading-none">{mins}</p>
            <p className="text-[12.5px] text-ink-500">{L({ hi: "मिनट", en: "min" })}</p>
          </div>
        )}
      </div>

      <AlertSwitch />
    </section>
  );
}

/** Lets the phone show the bus alerts as notifications. Hidden once allowed (or if the phone can't). */
function AlertSwitch() {
  const L = useL();
  const [perm, setPerm] = useState<NotificationPermission | "none">("none");
  useEffect(() => setPerm(typeof Notification === "undefined" ? "none" : Notification.permission), []);
  if (perm !== "default") return null;
  return (
    <button onClick={() => Notification.requestPermission().then(setPerm)} className="btn-line w-full">
      <BellRing className="h-4 w-4" aria-hidden />
      {L({ hi: "बस आने पर फ़ोन पर अलर्ट चालू करें", en: "Turn on bus alerts on this phone" })}
    </button>
  );
}

function notify(title: string, body: string) {
  try {
    if (typeof Notification === "undefined" || Notification.permission !== "granted") return;
    // Android shows notifications only through a service worker; until the app has one (with web
    // push, next step) this works on desktop and the on-screen banner covers phones.
    if (navigator.serviceWorker?.controller) navigator.serviceWorker.ready.then((reg) => reg.showNotification(title, { body, icon: "/icon-192.png", tag: "bus" }));
    else new Notification(title, { body, icon: "/icon-192.png", tag: "bus" });
  } catch {
    /* the banner on screen is enough */
  }
}
