"use client";

import Link from "next/link";
import { CalendarDays } from "lucide-react";
import { useApi } from "@/lib/api";
import { useL, useT } from "@/lib/i18n";
import { fullDate } from "@/lib/format";
import type { EventRow } from "@/lib/events";
import { EventPicture } from "@/components/art";
import { Empty, ErrorCard, Skeleton } from "@/components/ui";

/** Every event the school posts, newest and upcoming first; tap one for its photos. */
export default function EventsPage() {
  const L = useL();
  const { lang } = useT();
  const { data, error, reload } = useApi<{ events: EventRow[] }>("/events");

  if (!data) {
    if (error?.status === 404) return <Empty>{L({ hi: "स्कूल ने अभी कोई कार्यक्रम नहीं डाला।", en: "The school has not posted any events yet." })}</Empty>;
    if (error && error.status !== 401) return <ErrorCard offline={error.status === 0} onRetry={reload} />;
    return (
      <div className="grid grid-cols-2 gap-x-3 gap-y-4">
        {[0, 1, 2, 3].map((i) => (
          <Skeleton key={i} className="aspect-[16/11] w-full rounded-xl" />
        ))}
      </div>
    );
  }
  if (!data.events.length) return <Empty>{L({ hi: "स्कूल ने अभी कोई कार्यक्रम नहीं डाला।", en: "The school has not posted any events yet." })}</Empty>;

  return (
    <ul className="animate-rise grid grid-cols-2 gap-x-3 gap-y-4">
      {data.events.map((e) => (
        <li key={e.id}>
          <Link href={`/events/album/?id=${encodeURIComponent(e.id)}`} className="block active:opacity-80">
            <EventPicture url={e.coverUrl} scene={e.scene} alt={e.title} className="rounded-xl" />
            <p className="mt-2 text-[14px] font-semibold leading-snug">{e.title}</p>
            <p className="meta mt-0.5">
              <span>
                <CalendarDays aria-hidden />
                {fullDate(e.date, lang)}
              </span>
            </p>
            {e.upcoming && <p className="mt-0.5 text-[12px] font-semibold text-brand-600">{L({ hi: "आने वाला", en: "Upcoming" })}</p>}
          </Link>
        </li>
      ))}
    </ul>
  );
}
