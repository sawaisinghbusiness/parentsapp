"use client";

import clsx from "clsx";
import { Bus as BusIcon, Check, Phone, School } from "lucide-react";
import { useApi } from "@/lib/api";
import { useParent } from "@/lib/parent";
import { useL, useT } from "@/lib/i18n";
import { phoneText } from "@/lib/format";
import { M } from "@/lib/text/more";
import type { LiveBus } from "@/lib/bus";
import { ErrorCard, ListSkeleton, Skeleton, Status } from "@/components/ui";
import { useLiveBus } from "@/components/LiveBus";
import { CARD, Group, Row, Section, SUPPORT, TITLE } from "@/components/kit";
import { LiveSheet, clock } from "./live";
import "@/components/study.css";

interface Bus {
  opted: boolean;
  routeName?: string | null;
  stop?: string | null;
  pickup?: string | null;
  route?: {
    vehicleNo: string | null;
    driverName: string | null;
    driverPhone: string | null;
    conductorName: string | null;
    conductorPhone: string | null;
    stops: { name: string; time: string }[];
  } | null;
}

const NAVY_LINE = "border border-[#C9D4E1] bg-white text-[#0D2A5E] active:bg-[#F1F5F9]";

/**
 * School bus, preview. Built like a ride / delivery tracker: while the bus runs, the map with a sheet
 * under it (freshness, minutes to the stop, progress), then the crew with call buttons, then the route
 * as a vertical timeline that marks passed stops, where the bus is, the next stop and the child's stop
 * in shape and words. When the bus is not running the pickup time is the hero, and the timeline shows
 * the scheduled times. Same data and calls as app/(app)/bus.
 */
export default function BusPreviewPage() {
  const { child, me } = useParent();
  const L = useL();
  const { t } = useT();
  const { data, error, reload } = useApi<Bus>(child ? `/bus?student=${child.id}` : null);
  const live = useLiveBus(child && data?.opted ? child.id : null);

  if (!data) {
    if (error && error.status !== 401) return <ErrorCard offline={error.status === 0} onRetry={reload} />;
    return (
      <div className="space-y-3">
        <Skeleton className="h-[240px] w-full rounded-2xl" />
        <ListSkeleton rows={3} />
      </div>
    );
  }

  if (!data.opted || !data.routeName) {
    const office = me?.school.officePhone;
    return (
      <div className="study space-y-6 pb-4 pt-1">
        <Section>
          <div className={clsx(CARD, "px-4 py-6")}>
            <span className="grid h-12 w-12 place-items-center rounded-full bg-[#EEF3F8]">
              <BusIcon className="h-6 w-6 text-[#0D2A5E]" strokeWidth={1.75} aria-hidden />
            </span>
            <p className="mt-4 text-[20px] font-semibold leading-7 text-ink-900">
              {data.opted ? L({ hi: "रूट अभी तय नहीं", en: "No route yet" }) : L({ hi: `${child?.name.split(" ")[0] || ""} बस से नहीं आते`, en: `${child?.name.split(" ")[0] || "Your child"} doesn't take the bus` })}
            </p>
            <p className="mt-2 text-[16px] leading-6 text-ink-500">
              {data.opted
                ? L({ hi: "स्कूल ऑफ़िस से पूछें।", en: "Please ask the school office." })
                : L({ hi: "बस लगवानी हो तो स्कूल ऑफ़िस से बात करें।", en: "To start the bus, please talk to the school office." })}
            </p>
            {office && (
              <a href={`tel:${office.replace(/\s/g, "")}`} className={clsx("mt-5 inline-flex min-h-[48px] w-full items-center justify-center gap-2 rounded-xl px-5 text-[16px] font-semibold transition-colors", NAVY_LINE)}>
                <Phone className="h-5 w-5" strokeWidth={1.75} aria-hidden />
                {t("common.call")}
              </a>
            )}
          </div>
        </Section>
      </div>
    );
  }

  const r = data.route;
  const running = !!live?.running && !!child;
  const myTime = r?.stops.find((s) => s.name === data.stop)?.time || data.pickup || null;

  return (
    <div className="study space-y-6 pb-4 pt-1">
      <Section>
        {running && live && child ? (
          <LiveSheet live={live} childName={child.name} myTime={myTime} />
        ) : (
          <div className={CARD}>
            <div className="relative flex min-h-[128px] items-center overflow-hidden bg-[#EEF3FD] px-4 py-4">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/img/bus.webp" alt="" className="absolute inset-y-0 right-0 h-full w-[46%] object-cover object-right" />
              <div className="relative w-[58%]">
                <p className={SUPPORT}>{data.pickup ? L(M.pickup) : L(M.stop)}</p>
                <p className="tnum mt-1 text-[28px] font-semibold leading-9 text-ink-900">{data.pickup ? clock(data.pickup) : data.stop || L(M.notSet)}</p>
              </div>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2 border-t border-[#DCE4ED] px-4 py-3">
              <p className="min-w-0 text-[16px] leading-6 text-ink-900">{[data.pickup ? data.stop : null, data.routeName].filter(Boolean).join(" · ")}</p>
              {live && !live.running && <Status tone="mute">{L({ hi: "अभी नहीं चल रही", en: "Not running now" })}</Status>}
            </div>
          </div>
        )}
      </Section>

      {(r?.vehicleNo || r?.driverName || r?.conductorName) && (
        <Section title={L({ hi: "बस और स्टाफ़", en: "Bus and crew" })} delay={70}>
          <Group>
            {r?.vehicleNo && <Row lead={<Lead><BusIcon className="h-5 w-5 text-[#0D2A5E]" strokeWidth={1.75} aria-hidden /></Lead>} title={<Plate no={r.vehicleNo} />} sub={L(M.vehicle)} />}
            {r?.driverName && <Crew name={r.driverName} role={L(M.driver)} phone={r.driverPhone} call={L(M.callDriver)} />}
            {r?.conductorName && <Crew name={r.conductorName} role={L(M.conductor)} phone={r.conductorPhone} call={L(M.callConductor)} />}
          </Group>
          {/* A phone without a name still gets its call button, as on the real page. */}
          {((!r?.driverName && r?.driverPhone) || (!r?.conductorName && r?.conductorPhone)) && (
            <div className="mt-3 space-y-2">
              {!r?.driverName && r?.driverPhone && <CallWide phone={r.driverPhone} text={L(M.callDriver)} />}
              {!r?.conductorName && r?.conductorPhone && <CallWide phone={r.conductorPhone} text={L(M.callConductor)} />}
            </div>
          )}
        </Section>
      )}
      {!(r?.vehicleNo || r?.driverName || r?.conductorName) && (r?.driverPhone || r?.conductorPhone) && (
        <div className="space-y-2">
          {r?.driverPhone && <CallWide phone={r.driverPhone} text={L(M.callDriver)} />}
          {r?.conductorPhone && <CallWide phone={r.conductorPhone} text={L(M.callConductor)} />}
        </div>
      )}

      {r && r.stops.length > 0 && (
        <Section title={L(M.allStops)} delay={140}>
          <p className={clsx("-mt-1 mb-3", SUPPORT)}>
            {data.routeName} · {L({ hi: "समय तय समय-सारणी के हैं", en: "times are as scheduled" })}
          </p>
          <Timeline route={r.stops} myStop={data.stop || null} live={running ? live : null} childName={child?.name || ""} />
        </Section>
      )}
    </div>
  );
}

function Lead({ children }: { children: React.ReactNode }) {
  return <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-[#EEF3F8]">{children}</span>;
}

/** The registration number as a plate: bordered, even figures. Quiet, not a badge. */
function Plate({ no }: { no: string }) {
  return (
    <span className="inline-flex items-stretch overflow-hidden rounded-md border border-ink-900 bg-white align-middle">
      <span className="flex items-center border-r border-[#DCE4ED] px-1.5 text-[12px] font-medium leading-4 text-ink-500">IND</span>
      <span className="tnum px-2.5 py-0.5 text-[16px] font-medium leading-6 tracking-[0.04em] text-ink-900">{no}</span>
    </span>
  );
}

function initials(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();
}

function Crew({ name, role, phone, call }: { name: string; role: string; phone: string | null; call: string }) {
  return (
    <Row
      lead={
        <Lead>
          <span className="text-[14px] font-semibold leading-5 text-[#0D2A5E]">{initials(name)}</span>
        </Lead>
      }
      title={name}
      sub={
        <>
          {role}
          {phone && <span className="tnum"> · {phoneText(phone)}</span>}
        </>
      }
      trail={
        phone ? (
          <a href={`tel:${phone}`} aria-label={`${call} ${phoneText(phone)}`} className={clsx("grid h-12 w-12 place-items-center rounded-xl transition-colors", NAVY_LINE)}>
            <Phone className="h-5 w-5" strokeWidth={1.75} aria-hidden />
          </a>
        ) : undefined
      }
    />
  );
}

function CallWide({ phone, text }: { phone: string; text: string }) {
  return (
    <a href={`tel:${phone}`} className={clsx("inline-flex min-h-[48px] w-full items-center justify-center gap-2 rounded-xl px-5 text-[16px] font-semibold transition-colors", NAVY_LINE)}>
      <Phone className="h-5 w-5" strokeWidth={1.75} aria-hidden />
      {text}
      <span className="tnum font-normal text-ink-500">{phoneText(phone)}</span>
    </a>
  );
}

type Item =
  | { kind: "stop"; name: string; time: string; passed: boolean; next: boolean; mine: boolean }
  | { kind: "bus" }
  | { kind: "school"; name: string; passed: boolean };

/**
 * The route top to bottom in the order the bus drives it. Each stop says what it is in words
 * (Passed, Next stop, Your stop) as well as by its mark; while the bus runs, a bus row sits between
 * the last passed stop and the next one, and the line above it is drawn solid.
 */
function Timeline({ route, myStop, live, childName }: { route: { name: string; time: string }[]; myStop: string | null; live: LiveBus | null; childName: string }) {
  const L = useL();
  const first = childName.split(" ")[0];
  const morning = live ? live.kind === "morning" : true;
  // While running, the live list is in trip order and knows which stops are done.
  const src = live && live.stops.length ? live.stops.map((s) => ({ name: s.name, time: s.time, done: s.done })) : route.map((s) => ({ ...s, done: false }));
  const nextIdx = live ? src.findIndex((s) => !s.done) : -1;

  const items: Item[] = [];
  if (live && !morning && live.school.name) items.push({ kind: "school", name: live.school.name, passed: true });
  src.forEach((s, i) => {
    if (live && live.bus && i === nextIdx) items.push({ kind: "bus" });
    items.push({ kind: "stop", name: s.name, time: s.time, passed: s.done, next: i === nextIdx, mine: s.name === myStop });
  });
  if (live && live.bus && nextIdx === -1) items.push({ kind: "bus" });
  if (live && morning && live.school.name) items.push({ kind: "school", name: live.school.name, passed: false });

  const travelled = (it: Item | undefined) => !!it && (it.kind === "bus" || ((it.kind === "stop" || it.kind === "school") && it.passed));

  return (
    <ol className={clsx(CARD, "py-2")}>
      {items.map((it, i) => {
        const up = i > 0 && travelled(items[i - 1]) && travelled(it);
        const down = i < items.length - 1 && travelled(it) && travelled(items[i + 1]);
        return (
          <li key={i} className="flex min-h-[64px] items-stretch gap-3 px-4">
            <span className="relative flex w-7 shrink-0 items-center justify-center" aria-hidden>
              {i > 0 && <span className={clsx("absolute left-1/2 top-0 h-1/2 w-0.5 -translate-x-1/2", up ? "bg-[#0D2A5E]" : "bg-[#DCE4ED]")} />}
              {i < items.length - 1 && <span className={clsx("absolute bottom-0 left-1/2 h-1/2 w-0.5 -translate-x-1/2", down ? "bg-[#0D2A5E]" : "bg-[#DCE4ED]")} />}
              <Mark it={it} />
            </span>
            <span className="flex min-w-0 flex-1 items-center gap-3 py-2">
              {it.kind === "bus" ? (
                <span className="min-w-0 flex-1">
                  <span className="block text-[16px] font-medium leading-6 text-[#0D2A5E]">{L({ hi: "बस यहाँ है", en: "The bus is here" })}</span>
                </span>
              ) : it.kind === "school" ? (
                <span className="min-w-0 flex-1">
                  <span className={clsx("block", TITLE)}>{it.name}</span>
                  <span className={clsx("block", SUPPORT)}>{L({ hi: "स्कूल", en: "School" })}</span>
                </span>
              ) : (
                <>
                  <span className="min-w-0 flex-1">
                    <span className={clsx("block text-[16px] leading-6", it.mine ? "font-semibold text-ink-900" : it.passed ? "text-ink-500" : "text-ink-900")}>{it.name}</span>
                    {(it.mine || it.passed || it.next) && (
                      <span className="block text-[14px] leading-5">
                        {[
                          it.passed && !it.mine ? <span key="p" className="text-ink-500">{L({ hi: "निकल गई", en: "Passed" })}</span> : null,
                          it.next ? <span key="n" className="font-medium text-ink-900">{L({ hi: "अगला स्टॉप", en: "Next stop" })}</span> : null,
                          it.mine ? (
                            <span key="m" className="font-medium text-[#0D2A5E]">
                              {it.passed && live
                                ? live.child.done
                                  ? morning
                                    ? L({ hi: `आपका स्टॉप · ${first} चढ़ गया`, en: `Your stop · ${first} got on` })
                                    : L({ hi: `आपका स्टॉप · ${first} उतर गया`, en: `Your stop · ${first} got off` })
                                  : L({ hi: "आपका स्टॉप · निकल गई", en: "Your stop · passed" })
                                : L({ hi: "आपका स्टॉप", en: "Your stop" })}
                            </span>
                          ) : null,
                        ]
                          .filter(Boolean)
                          .reduce<React.ReactNode[]>((a, n, k) => (k ? [...a, <span key={`s${k}`} className="text-ink-500"> · </span>, n] : [n]), [])}
                      </span>
                    )}
                  </span>
                  {it.time && <span className={clsx("tnum shrink-0 text-[16px] leading-6", it.mine ? "font-semibold text-ink-900" : "text-ink-500")}>{clock(it.time)}</span>}
                </>
              )}
            </span>
          </li>
        );
      })}
    </ol>
  );
}

/** The mark on the line: filled tick (passed), bus, ring with a centre (next), larger navy ring (yours), small hollow dot (later), square (school). */
function Mark({ it }: { it: Item }) {
  if (it.kind === "bus")
    return (
      <span className="relative grid h-7 w-7 place-items-center rounded-full bg-[#0D2A5E] ring-4 ring-white">
        <BusIcon className="h-4 w-4 text-white" strokeWidth={1.75} />
      </span>
    );
  if (it.kind === "school")
    return (
      <span className={clsx("relative grid h-6 w-6 place-items-center rounded-md ring-4 ring-white", it.passed ? "bg-[#0D2A5E]" : "border-2 border-[#0D2A5E] bg-white")}>
        <School className={clsx("h-3.5 w-3.5", it.passed ? "text-white" : "text-[#0D2A5E]")} strokeWidth={2} />
      </span>
    );
  if (it.passed)
    return (
      <span className="relative grid h-5 w-5 place-items-center rounded-full bg-[#0D2A5E] ring-4 ring-white">
        <Check className="h-3 w-3 text-white" strokeWidth={3} />
      </span>
    );
  if (it.mine) return <span className="relative block h-6 w-6 rounded-full border-[6px] border-[#0D2A5E] bg-white ring-4 ring-white" />;
  if (it.next)
    return (
      <span className="relative grid h-5 w-5 place-items-center rounded-full border-2 border-[#0D2A5E] bg-white ring-4 ring-white">
        <span className="h-2 w-2 rounded-full bg-[#0D2A5E]" />
      </span>
    );
  return <span className="relative block h-3 w-3 rounded-full border-2 border-[#8A97A8] bg-white ring-4 ring-white" />;
}

