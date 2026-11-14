"use client";

import Link from "next/link";
import { useApi } from "@/lib/api";
import { useL, useT } from "@/lib/i18n";
import { fullDate } from "@/lib/format";
import type { EventRow } from "@/lib/events";
import { EventPicture } from "@/components/art";
import { Empty, ErrorCard, Skeleton } from "@/components/ui";
import { Group, Row, Section } from "@/components/kit";
import "@/components/study.css";

const album = (id: string) => `/preview/events/album/?id=${encodeURIComponent(id)}`;

/** Today as YYYY-MM-DD on this phone. */
function todayIso() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/** Preview: upcoming events as rows, past events as a photo grid; tap one for its photos. */
export default function EventsPreview() {
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

  const upcoming = data.events.filter((e) => e.upcoming);
  const past = data.events.filter((e) => !e.upcoming);
  const today = todayIso();
  const loc = lang === "hi" ? "hi-IN" : "en-IN";
  const when = (date: string) => {
    const n = Math.round((Date.parse(date + "T00:00:00Z") - Date.parse(today + "T00:00:00Z")) / 864e5);
    return n <= 0 ? L({ hi: "आज", en: "Today" }) : n === 1 ? L({ hi: "कल", en: "Tomorrow" }) : L({ hi: `${n} दिन में`, en: `In ${n} days` });
  };

  return (
    <div className="study space-y-6 pb-4 pt-1">
      {upcoming.length > 0 && (
        <Section title={L({ hi: "आने वाले कार्यक्रम", en: "Upcoming" })}>
          <Group>
            {upcoming.map((e) => (
              <Row
                key={e.id}
                href={album(e.id)}
                lead={
                  <span className="h-14 w-14 shrink-0 overflow-hidden rounded-xl bg-[#EEF3F8]">
                    <EventPicture url={e.coverUrl} scene={e.scene} alt="" className="!aspect-square h-full" />
                  </span>
                }
                title={e.title}
                sub={`${new Date(e.date + "T00:00:00").toLocaleDateString(loc, { weekday: "short", day: "numeric", month: "short" })} · ${when(e.date)}`}
              />
            ))}
          </Group>
        </Section>
      )}

      {past.length > 0 && (
        <Section title={L({ hi: "पिछले कार्यक्रम", en: "Past events" })} delay={upcoming.length ? 70 : 0}>
          <ul className="grid grid-cols-2 gap-x-3 gap-y-5">
            {past.map((e) => (
              <li key={e.id}>
                <Link href={album(e.id)} className="block transition-opacity active:opacity-80">
                  <EventPicture url={e.coverUrl} scene={e.scene} alt={e.title} className="rounded-xl" />
                  <p className="mt-2 break-words text-[16px] font-medium leading-6 text-ink-900">{e.title}</p>
                  <p className="tnum mt-0.5 text-[14px] leading-5 text-ink-500">{fullDate(e.date, lang)}</p>
                </Link>
              </li>
            ))}
          </ul>
        </Section>
      )}
    </div>
  );
}
