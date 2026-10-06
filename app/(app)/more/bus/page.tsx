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
      <Phone className="h-4 w-4 text-jade-600" aria-hidden />
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
        <section className="card p-4">
          <p className="card-title">{L(M.route)}</p>
          <p className="mt-0.5 text-xl font-bold leading-snug text-ink-900">{data.routeName}</p>
          <dl className="mt-2 divide-y divide-ink-100 border-t border-ink-100">
            <InfoRow label={L(M.stop)} value={data.stop || <span className="font-normal text-ink-500">{L(M.notSet)}</span>} />
            {data.pickup && <InfoRow label={L(M.pickup)} value={<span className="tnum">{clock(data.pickup)}</span>} />}
            {r?.vehicleNo && <InfoRow label={L(M.vehicle)} value={<span className="tnum">{r.vehicleNo}</span>} />}
            {r?.driverName && <InfoRow label={L(M.driver)} value={r.driverName} />}
            {r?.conductorName && <InfoRow label={L(M.conductor)} value={r.conductorName} />}
          </dl>
          {(r?.driverPhone || r?.conductorPhone) && (
            <div className="mt-3 space-y-2">
              {r?.driverPhone && <CallButton phone={r.driverPhone} label={L(M.callDriver)} />}
              {r?.conductorPhone && <CallButton phone={r.conductorPhone} label={L(M.callConductor)} />}
            </div>
          )}
        </section>

        {r && r.stops.length > 0 && (
          <section className="card p-4">
            <p className="card-title">{L(M.allStops)}</p>
            <ol className="mt-1 divide-y divide-ink-100">
              {r.stops.map((s, i) => {
                const mine = s.name === data.stop;
                return (
                  <li key={`${s.name}-${i}`} className="flex items-center gap-3 py-2.5">
                    <span className={clsx("dot", mine ? "bg-brand-600" : "bg-ink-300")} aria-hidden />
                    <span className={clsx("min-w-0 flex-1", mine ? "font-semibold text-ink-900" : "text-ink-700")}>{s.name}</span>
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
    <div className="animate-rise space-y-3">
      <SubHeader title={L(M.bus)} />
      {body()}
    </div>
  );
}
