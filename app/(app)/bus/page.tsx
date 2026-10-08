"use client";

import clsx from "clsx";
import { Phone } from "lucide-react";
import { useApi } from "@/lib/api";
import { useParent } from "@/lib/parent";
import { useL } from "@/lib/i18n";
import { phoneText } from "@/lib/format";
import { M } from "@/lib/text/more";
import { CallOffice, ErrorCard, ListSkeleton } from "@/components/ui";

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

/** "07:15" -> "7:15 AM" */
function clock(t: string) {
  const [h, m] = t.split(":").map(Number);
  if (Number.isNaN(h) || Number.isNaN(m)) return t;
  return `${((h + 11) % 12) + 1}:${String(m).padStart(2, "0")} ${h < 12 ? "AM" : "PM"}`;
}

/** When the bus comes to this child's stop, who drives it, and every stop on the route. */
export default function BusPage() {
  const { child, me } = useParent();
  const L = useL();
  const { data, error, reload } = useApi<Bus>(child ? `/bus?student=${child.id}` : null);

  if (!data) {
    if (error && error.status !== 401) return <ErrorCard offline={error.status === 0} onRetry={reload} />;
    return <ListSkeleton rows={3} />;
  }
  if (!data.opted || !data.routeName)
    return (
      <div className="row-card space-y-3 p-4">
        <p className="text-ink-700">{L(data.opted ? M.noRoute : M.noBus)}</p>
        <CallOffice phone={me?.school.officePhone} className="w-full" />
      </div>
    );

  const r = data.route;
  return (
    <div className="animate-rise space-y-4">
      <section className="banner banner-photo min-h-[128px]">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/img/bus.webp" alt="" />
        <div>
          <p className="text-[13px] text-ink-500">{data.pickup ? L(M.pickup) : L(M.stop)}</p>
          <p className="tnum text-[28px] font-extrabold leading-tight">{data.pickup ? clock(data.pickup) : data.stop || L(M.notSet)}</p>
          <p className="mt-1 text-[13px] leading-snug text-ink-500">{[data.pickup ? data.stop : null, data.routeName].filter(Boolean).join(" · ")}</p>
        </div>
      </section>

      {(r?.vehicleNo || r?.driverName || r?.conductorName) && (
        <dl className="kv">
          {r?.driverName && (
            <div>
              <dt>{L(M.driver)}</dt>
              <dd>{r.driverName}</dd>
            </div>
          )}
          {r?.conductorName && (
            <div>
              <dt>{L(M.conductor)}</dt>
              <dd>{r.conductorName}</dd>
            </div>
          )}
          {r?.vehicleNo && (
            <div>
              <dt>{L(M.vehicle)}</dt>
              <dd className="tnum">{r.vehicleNo}</dd>
            </div>
          )}
        </dl>
      )}

      {(r?.driverPhone || r?.conductorPhone) && (
        <div className="space-y-2">
          {r?.driverPhone && (
            <a href={`tel:${r.driverPhone}`} className="btn-line w-full">
              <Phone className="h-4 w-4" aria-hidden />
              {L(M.callDriver)}
              <span className="tnum font-normal text-ink-500">{phoneText(r.driverPhone)}</span>
            </a>
          )}
          {r?.conductorPhone && (
            <a href={`tel:${r.conductorPhone}`} className="btn-line w-full">
              <Phone className="h-4 w-4" aria-hidden />
              {L(M.callConductor)}
              <span className="tnum font-normal text-ink-500">{phoneText(r.conductorPhone)}</span>
            </a>
          )}
        </div>
      )}

      {r && r.stops.length > 0 && (
        <section className="space-y-1">
          <h2 className="mlabel">{L(M.allStops)}</h2>
          <ol className="relative">
            <span className="absolute bottom-5 left-[6px] top-5 w-0.5 bg-brand-100" aria-hidden />
            {r.stops.map((s, i) => {
              const mine = s.name === data.stop;
              return (
                <li key={`${s.name}-${i}`} className="relative flex min-h-[48px] items-center gap-3">
                  <span className={clsx("h-3.5 w-3.5 shrink-0 rounded-full border-2 ring-2 ring-white", mine ? "border-brand-600 bg-brand-600" : "border-brand-200 bg-white")} aria-hidden />
                  <span className={clsx("min-w-0 flex-1 text-[15px]", mine ? "font-bold" : "text-ink-700")}>
                    {s.name}
                    {mine && <span className="font-medium text-brand-600"> · {L({ hi: "आपका स्टॉप", en: "your stop" })}</span>}
                  </span>
                  {s.time && <span className={clsx("tnum shrink-0 text-[14px]", mine ? "font-bold" : "text-ink-500")}>{clock(s.time)}</span>}
                </li>
              );
            })}
          </ol>
        </section>
      )}
    </div>
  );
}
