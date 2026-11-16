"use client";

import { useEffect, useRef, useState } from "react";
import { BellRing, TriangleAlert } from "lucide-react";
import { useL } from "@/lib/i18n";
import { ALERT_MIN, DELAY_WHY, isBusLocationFresh, metresTo, minutesFor, type LiveBus } from "@/lib/bus";
import { BusMap, type MapStop } from "@/components/BusMap";
import { Button } from "@/components/kit";
import "./bus-status.css";

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
  const quiet = !isBusLocationFresh(live);

  const [, redraw] = useState(0);
  useEffect(() => {
    const t = setInterval(() => redraw((x) => x + 1), 5_000);
    return () => clearInterval(t);
  }, []);

  // Three minutes out: once per trip.
  const [near, setNear] = useState(false);
  const warned = useRef(false);
  useEffect(() => {
    if (quiet || live.unavailable || live.demo || live.child.done || mins === null || mins > ALERT_MIN || warned.current || !morning) return;
    warned.current = true;
    setNear(true);
    navigator.vibrate?.([200, 100, 200]);
    const title = L({ hi: `बस ${mins} मिनट में आ रही है`, en: `Bus in ${mins} min` });
    const body = L({ hi: `${live.myStop} पर ${first} को तैयार रखें।`, en: `Have ${first} ready at ${live.myStop}.` });
    notify(title, body);
  }, [mins, quiet, live.unavailable, live.demo, live.child.done]); // eslint-disable-line react-hooks/exhaustive-deps

  // Driver ticked the child: on the bus / got off.
  const told = useRef(live.child.done);
  useEffect(() => {
    if (live.unavailable || live.demo || !live.child.done || told.current) return;
    told.current = true;
    notify(morning ? L({ hi: `${first} बस में बैठ चुके हैं`, en: `${first} got on the bus` }) : L({ hi: `${first} बस से उतर चुके हैं`, en: `${first} got off the bus` }), live.myStop || "");
  }, [live.child.done, live.unavailable, live.demo]); // eslint-disable-line react-hooks/exhaustive-deps

  const stops: MapStop[] = live.stops
    .filter((s) => s.lat !== null && s.lng !== null)
    .map((s) => ({ name: s.name, lat: s.lat!, lng: s.lng!, state: s.done ? "done" : s.name === live.myStop ? "next" : "later" }));
  const school: MapStop[] = live.school.lat !== null && live.school.lng !== null ? [{ name: live.school.name, lat: live.school.lat, lng: live.school.lng, state: "school" }] : [];
  const line = morning ? [...stops, ...school] : [...school, ...stops];
  const leftStops = live.stops.filter((s) => !s.done).findIndex((s) => s.name === live.myStop);

  const statusTitle = live.child.done
    ? morning ? L({hi:`${first} बस में है`,en:`${first} is on the bus`}) : L({hi:`${first} बस से उतर चुके हैं`,en:`${first} has been dropped off`})
    : live.absent ? L({hi:"आज बस का इंतज़ार नहीं है",en:"No pickup expected today"})
    : mine?.done ? L({hi:"आपका स्टॉप निकल चुका है",en:"Your stop has been passed"})
    : leftStops === 0 ? L({hi:"अगला स्टॉप आपका है",en:"Your stop is next"})
    : leftStops > 0 ? L({hi:`आपके स्टॉप से ${leftStops} स्टॉप दूर`,en:`${leftStops} ${leftStops===1?"stop":"stops"} before yours`})
    : L({hi:"ट्रिप शुरू हो गई है",en:"The trip has started"});
  return (
    <section className="parent-bus-status parent-bus-tracking">
      <div className="parent-bus-personal"><div className="tracking-stop"><div><h2>{statusTitle}</h2><p>{live.myStop || L({hi:"स्टॉप अभी नहीं जुड़ा",en:"Stop not assigned"})}</p></div>{!live.child.done&&!quiet&&mins!==null&&<strong className="tracking-eta">{mins}<small>{L({hi:"मिनट लगभग",en:"min approx."})}</small></strong>}</div>
        {live.child.done&&<p className="parent-bus-recorded">{L({hi:"ड्राइवर की एंट्री",en:"Recorded by the driver"})}{live.child.at?` · ${timeText(live.child.at)}`:""}</p>}
        {!live.child.done&&mine?.done&&<p className="parent-bus-exception">{L({hi:"बच्चे की एंट्री अभी नहीं हुई। बस स्टाफ़ से जाँच करें।",en:"Your child's entry is missing. Please check with the bus crew."})}</p>}
        {live.demo&&<p className="parent-bus-demo">{L({hi:"डेमो · नमूना ट्रिप, असली लोकेशन नहीं",en:"Demo · sample trip, not a live location"})}</p>}
      </div>
      <BusMap stops={line} path={live.pathRoad?live.path:null} bus={live.bus} className="h-[220px] overflow-hidden" label={L({hi:"बस की आख़िरी मिली लोकेशन",en:"Last received bus location"})}/>
      <div className="tracking-update" role="status"><span className={quiet?"is-quiet":"is-current"}/><p>{live.unavailable?L({hi:"कनेक्शन नहीं मिला · पिछली जानकारी",en:"Connection lost · last received information"}):!live.bus||!live.at?L({hi:"बस की लोकेशन का इंतज़ार",en:"Waiting for the bus location"}):quiet?L({hi:`पिछली लोकेशन · ${agoText(live.at,L)}`,en:`Last location · ${agoText(live.at,L)}`}):L({hi:`लोकेशन अपडेट · ${agoText(live.at,L)}`,en:`Location updated · ${agoText(live.at,L)}`})}</p></div>
      {!live.child.done&&!quiet&&mins!==null&&<p className="tracking-estimate-note">{L({hi:"आने का समय दूरी पर आधारित अनुमान है। ट्रैफ़िक शामिल नहीं है।",en:"Arrival is estimated from distance, without live traffic."})}</p>}
      {quiet&&<p className="tracking-estimate-note">{L({hi:"नई लोकेशन मिलने तक आने का अनुमान नहीं दिखेगा।",en:"Arrival estimates resume after a fresh location update."})}</p>}
      {/* Three minutes out: said on screen too, not only as a phone notification (audit 2026-11-16). */}
      {near&&!live.child.done&&!mine?.done&&<div className="parent-bus-delay" role="alert"><BellRing size={18} aria-hidden/><div><strong>{L({hi:"बस आपके स्टॉप के पास है",en:"The bus is almost at your stop"})}</strong><p>{L({hi:`${first} को ${live.myStop||"स्टॉप"} पर तैयार रखें।`,en:`Have ${first} ready at ${live.myStop||"the stop"}.`})}</p></div></div>}
      {live.delay&&<div className="parent-bus-delay" role="status"><TriangleAlert size={18} aria-hidden/><div><strong>{L({hi:`ड्राइवर ने ${live.delay.minutes>=30?"30+":live.delay.minutes} मिनट देरी बताई`,en:`Driver reports ${live.delay.minutes>=30?"30+":live.delay.minutes} min delay`})}</strong><p>{L(DELAY_WHY[live.delay.reason]||DELAY_WHY.other)}</p></div></div>}
      {!live.demo&&<AlertSwitch/>}
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
    // Older browsers answer through a callback and return nothing; both ways land in setPerm.
    <Button kind="line" onClick={() => { const p = Notification.requestPermission(setPerm) as Promise<NotificationPermission> | undefined; p?.then?.(setPerm); }} className="w-full">
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
