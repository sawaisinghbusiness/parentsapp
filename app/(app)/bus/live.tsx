"use client";

import { useEffect, useRef, useState } from "react";
import { BellRing, TriangleAlert } from "lucide-react";
import { useL } from "@/lib/i18n";
import { ALERT_MIN, DELAY_WHY, metresTo, minutesFor, type LiveBus } from "@/lib/bus";
import { BusMap, type MapStop } from "@/components/BusMap";
import { Button, CARD, SUPPORT } from "@/components/kit";
import { Status } from "@/components/ui";

/** The bus counts as "not sending" after this long without a new place (same as LiveBus). */
export const QUIET_MS = 2 * 60_000;

export const agoText = (iso: string | null, L: ReturnType<typeof useL>) => {
  if (!iso) return "";
  const s = Math.max(0, Math.round((Date.now() - Date.parse(iso)) / 1000));
  if (s < 60) return L({ hi: `${s} सेकंड पहले`, en: `${s} sec ago` });
  return L({ hi: `${Math.round(s / 60)} मिनट पहले`, en: `${Math.round(s / 60)} min ago` });
};

export const timeText = (iso: string) => new Date(iso).toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit" });

/** "07:15" -> "7:15 AM" */
export function clock(t: string) {
  const [h, m] = t.split(":").map(Number);
  if (Number.isNaN(h) || Number.isNaN(m)) return t;
  return `${((h + 11) % 12) + 1}:${String(m).padStart(2, "0")} ${h < 12 ? "AM" : "PM"}`;
}

/**
 * The running trip, laid out like a ride sheet: the map on top, and under it one line that says how
 * fresh the bus's place is, the one thing a parent needs (minutes to the stop, or "on the bus"), and
 * how far along the route the bus is. The alerts (three minutes out, got on / got off) work exactly
 * as in components/LiveBus.
 */
export function LiveSheet({ live, childName, myTime }: { live: LiveBus; childName: string; myTime: string | null }) {
  const L = useL();
  const first = childName.split(" ")[0];
  const morning = live.kind === "morning";
  const mine = live.stops.find((s) => s.name === live.myStop) || null;
  const m = live.myStop && mine && !mine.done ? metresTo(live, live.myStop) : null;
  const mins = m !== null ? minutesFor(m) : null;
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
  const doneCount = live.stops.filter((s) => s.done).length;

  const fresh = !live.bus || !live.at ? (
    <Status tone="wait">{L({ hi: "बस की जगह अभी नहीं आई", en: "Waiting for the bus's place" })}</Status>
  ) : quiet ? (
    <Status tone="wait">{L({ hi: `पुरानी जगह · ${agoText(live.at, L)}`, en: `Old place · ${agoText(live.at, L)}` })}</Status>
  ) : (
    <Status tone="ok">{L({ hi: "चल रही है", en: "Moving" })}</Status>
  );

  return (
    <div className="space-y-3">
      <section className={CARD}>
        <BusMap stops={line} bus={live.bus} className="h-[240px] overflow-hidden" label={L({ hi: "बस का नक्शा", en: "Bus map" })} />

        <div className="border-t border-[#DCE4ED] px-4 pb-4 pt-4">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            {fresh}
            {live.bus && live.at && !quiet && <span className={SUPPORT}>{L({ hi: `अपडेट ${agoText(live.at, L)}`, en: `Updated ${agoText(live.at, L)}` })}</span>}
          </div>
          {!live.bus || !live.at ? (
            <p className={`mt-1 ${SUPPORT}`}>{L({ hi: "ट्रिप शुरू हो गई है।", en: "The trip has started." })}</p>
          ) : null}

          {live.child.done ? (
            <div className="mt-3">
              <p className="text-[20px] font-semibold leading-7 text-ink-900">{morning ? L({ hi: `${first} बस में है`, en: `${first} is on the bus` }) : L({ hi: `${first} बस से उतर गया`, en: `${first} got off the bus` })}</p>
              <p className={`mt-1 ${SUPPORT}`}>
                {live.myStop}
                {live.child.at ? ` · ${timeText(live.child.at)}` : ""}
              </p>
            </div>
          ) : (
            <div className="mt-3 flex items-end gap-4">
              <div className="min-w-0 flex-1">
                <p className="text-[20px] font-semibold leading-7 text-ink-900">
                  {leftStops === 0
                    ? L({ hi: `अगला स्टॉप आपका है`, en: "Your stop is next" })
                    : leftStops > 0
                      ? L({ hi: `आपके स्टॉप से ${leftStops} स्टॉप दूर`, en: leftStops === 1 ? "1 stop before yours" : `${leftStops} stops before yours` })
                      : L({ hi: "आपके स्टॉप तक", en: "To your stop" })}
                </p>
                <p className={`mt-1 ${SUPPORT}`}>
                  {live.myStop}
                  {myTime ? ` · ${L({ hi: "तय समय", en: "scheduled" })} ${clock(myTime)}` : ""}
                </p>
              </div>
              {mins !== null && (
                <p className="shrink-0 text-right">
                  <span className="block text-[14px] leading-5 text-ink-500">{L({ hi: "लगभग", en: "about" })}</span>
                  <span className="tnum text-[28px] font-semibold leading-9 text-ink-900">{mins}</span>
                  <span className="ml-1 text-[16px] leading-6 text-ink-500">{L({ hi: "मिनट", en: "min" })}</span>
                </p>
              )}
            </div>
          )}

          {live.stops.length > 0 && (
            <div className="mt-4">
              <div className="flex gap-1" aria-hidden>
                {live.stops.map((s, i) => (
                  <span key={`${s.name}-${i}`} className={`h-1.5 flex-1 rounded-full ${s.done ? "bg-[#0D2A5E]" : "bg-[#E6ECF3]"}`} />
                ))}
              </div>
              <p className={`mt-2 ${SUPPORT}`}>{L({ hi: `${live.stops.length} में से ${doneCount} स्टॉप निकल गए`, en: `${doneCount} of ${live.stops.length} stops passed` })}</p>
            </div>
          )}
        </div>
      </section>

      {live.delay && (
        <div role="status" className={`${CARD} flex gap-3 px-4 py-4`}>
          <TriangleAlert className="mt-0.5 h-5 w-5 shrink-0 text-ink-500" strokeWidth={1.75} aria-hidden />
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-[16px] font-medium leading-6 text-ink-900">{L({ hi: "बस देर से आएगी", en: "The bus is running late" })}</p>
              <Status tone="wait">{L({ hi: "देरी", en: "Late" })}</Status>
            </div>
            <p className={`mt-1 ${SUPPORT}`}>
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
        <div role="alert" className="flex items-center gap-3 rounded-2xl bg-[#0D2A5E] px-4 py-3 text-[16px] font-medium leading-6 text-white">
          <BellRing className="h-5 w-5 shrink-0" strokeWidth={1.75} aria-hidden />
          {L({ hi: `बस ${mins} मिनट में ${live.myStop} पहुँच रही है`, en: `The bus reaches ${live.myStop} in ${mins} min` })}
        </div>
      )}

      <AlertSwitch />
    </div>
  );
}

/** Lets the phone show the bus alerts as notifications. Hidden once allowed (or if the phone can't). */
function AlertSwitch() {
  const L = useL();
  const [perm, setPerm] = useState<NotificationPermission | "none">("none");
  useEffect(() => setPerm(typeof Notification === "undefined" ? "none" : Notification.permission), []);
  if (perm !== "default") return null;
  return (
    <Button kind="line" onClick={() => Notification.requestPermission().then(setPerm)} className="w-full">
      <BellRing className="h-5 w-5" strokeWidth={1.75} aria-hidden />
      {L({ hi: "बस आने पर फ़ोन पर अलर्ट चालू करें", en: "Turn on bus alerts on this phone" })}
    </Button>
  );
}

function notify(title: string, body: string) {
  try {
    if (typeof Notification === "undefined" || Notification.permission !== "granted") return;
    if (navigator.serviceWorker?.controller) navigator.serviceWorker.ready.then((reg) => reg.showNotification(title, { body, icon: "/icon-192.png", tag: "bus" }));
    else new Notification(title, { body, icon: "/icon-192.png", tag: "bus" });
  } catch {
    /* the banner on screen is enough */
  }
}
