"use client";

import clsx from "clsx";
import { Phone } from "lucide-react";
import { useApi } from "@/lib/api";
import { useParent } from "@/lib/parent";
import { useL } from "@/lib/i18n";
import { phoneText } from "@/lib/format";
import { M } from "@/lib/text/more";
import { CallOffice, ErrorCard, Skeleton } from "@/components/ui";
import { InfoRow, SubHeader } from "@/components/more/parts";

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

function CallButton({ phone, label }: { phone: string; label: string }) {
  return (
    <a href={`tel:${phone}`} className="btn-quiet w-full">
      <Phone className="h-4 w-4" aria-hidden />
      {label}
      <span className="tnum font-normal text-ink-500">{phoneText(phone)}</span>
    </a>
  );
}

export default function BusPage() {
  const { child, me } = useParent();
  const L = useL();
  const { data, error, reload } = useApi<Bus>(child ? `/bus?student=${child.id}` : null);

  const body = () => {
    if (!data) {
      if (error && error.status !== 401) return <ErrorCard offline={error.status === 0} onRetry={reload} />;
      return (
        <div className="card space-y-3 p-4">
          <Skeleton className="h-6 w-56" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-2/3" />
        </div>
      );
    }
    if (!data.opted)
      return (
        <div className="card space-y-3 p-5">
          <p className="text-ink-700">{L(M.noBus)}</p>
          <CallOffice phone={me?.school.officePhone} className="w-full" />
        </div>
      );
    if (!data.routeName)
      return (
        <div className="card space-y-3 p-5">
          <p className="text-ink-700">{L(M.noRoute)}</p>
          <CallOffice phone={me?.school.officePhone} className="w-full" />
        </div>
      );

    const r = data.route;
    return (
      <>
        {/* When the bus comes, on the sky block */}
        <section className="hero">
          <p className="hero-label">{data.pickup ? L(M.pickup) : L(M.stop)}</p>
          <p className={data.pickup ? "hero-big" : "text-[26px] font-semibold leading-tight"}>{data.pickup ? clock(data.pickup) : data.stop || L(M.notSet)}</p>
          <p className="hero-sub">{[data.pickup ? data.stop : null, data.routeName].filter(Boolean).join(" · ")}</p>
        </section>

        {(r?.vehicleNo || r?.driverName || r?.conductorName) && (
          <dl className="card divide-y divide-ink-100 px-4">
            {r?.driverName && <InfoRow label={L(M.driver)} value={r.driverName} />}
            {r?.conductorName && <InfoRow label={L(M.conductor)} value={r.conductorName} />}
            {r?.vehicleNo && <InfoRow label={L(M.vehicle)} value={<span className="tnum">{r.vehicleNo}</span>} />}
          </dl>
        )}
        {(r?.driverPhone || r?.conductorPhone) && (
          <div className="space-y-2">
            {r?.driverPhone && <CallButton phone={r.driverPhone} label={L(M.callDriver)} />}
            {r?.conductorPhone && <CallButton phone={r.conductorPhone} label={L(M.callConductor)} />}
          </div>
        )}

        {r && r.stops.length > 0 && (
          <section className="pt-1.5">
            <h2 className="sec-title">{L(M.allStops)}</h2>
            <ol className="card relative px-4 py-1.5">
              <span className="absolute bottom-6 left-[21px] top-6 w-0.5 bg-ink-200" aria-hidden />
              {r.stops.map((s, i) => {
                const mine = s.name === data.stop;
                return (
                  <li key={`${s.name}-${i}`} className="relative flex items-center gap-3 py-2.5">
                    <span className={clsx("h-2.5 w-2.5 shrink-0 rounded-full border-2", mine ? "border-brand-600 bg-brand-600" : "border-ink-400 bg-white")} aria-hidden />
                    <span className={clsx("min-w-0 flex-1", mine ? "font-semibold text-ink-900" : "text-ink-700")}>
                      {s.name}
                      {mine && <span className="font-normal text-brand-700"> · {L({ hi: "आपका स्टॉप", en: "your stop" })}</span>}
                    </span>
                    {s.time && <span className={clsx("tnum shrink-0", mine ? "font-semibold text-ink-900" : "text-ink-500")}>{clock(s.time)}</span>}
                  </li>
                );
              })}
            </ol>
          </section>
        )}
      </>
    );
  };

  return (
    <div className="animate-rise space-y-2.5">
      <SubHeader title={L(M.bus)} />
      {body()}
    </div>
  );
}
