"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { CalendarDays, ChevronLeft, ChevronRight, Download, Image as ImageIcon, Play, X } from "lucide-react";
import { useApi } from "@/lib/api";
import { useL, useT } from "@/lib/i18n";
import { fullDate } from "@/lib/format";
import { savePhoto, type Album } from "@/lib/events";
import { EventPicture } from "@/components/art";
import { Empty, ErrorCard, Skeleton } from "@/components/ui";

/** One event's photos and videos in a grid; each opens full screen and can be saved. */
export default function AlbumPage() {
  const L = useL();
  const { lang } = useT();
  const [id, setId] = useState<string | null>(null);
  useEffect(() => setId(new URLSearchParams(window.location.search).get("id") || ""), []);
  const { data, error, reload } = useApi<Album>(id ? `/events/album?id=${encodeURIComponent(id)}` : null);
  const [open, setOpen] = useState<number | null>(null);

  if (!data) {
    if (error?.status === 404) return <Empty>{L({ hi: "यह कार्यक्रम नहीं मिला।", en: "This event was not found." })}</Empty>;
    if (error && error.status !== 401) return <ErrorCard offline={error.status === 0} onRetry={reload} />;
    return (
      <div className="grid grid-cols-3 gap-1.5">
        {Array.from({ length: 9 }, (_, i) => (
          <Skeleton key={i} className="aspect-[16/11] w-full rounded-lg" />
        ))}
      </div>
    );
  }

  const name = (i: number) => `${data.title.replace(/[^\w]+/g, "-")}-${i + 1}`;

  return (
    <div className="animate-rise space-y-3">
      <div>
        <h2 className="text-[18px] font-bold">{data.title}</h2>
        <p className="meta mt-1">
          <span>
            <CalendarDays aria-hidden />
            {fullDate(data.date, lang)}
          </span>
          {data.photos.length > 0 && (
            <span>
              <ImageIcon aria-hidden />
              {data.photoCount} {L({ hi: "फ़ोटो", en: "photos" })}
              {data.videoCount > 0 && ` · ${data.videoCount} ${L({ hi: "वीडियो", en: "videos" })}`}
            </span>
          )}
        </p>
      </div>

      {data.photos.length === 0 ? (
        <Empty>{data.upcoming ? L({ hi: "कार्यक्रम के बाद फ़ोटो यहाँ आएँगी।", en: "Photos will show here after the event." }) : L({ hi: "इस कार्यक्रम की कोई फ़ोटो नहीं डाली गई।", en: "No photos were posted for this event." })}</Empty>
      ) : (
        <ul className="grid grid-cols-3 gap-1.5">
          {data.photos.map((p, i) => (
            <li key={p.id} className="relative">
              <button onClick={() => setOpen(i)} className="block w-full active:opacity-80" aria-label={`${data.title} ${i + 1}`}>
                <EventPicture url={p.video ? null : p.url} scene={p.scene} alt="" className="rounded-lg" />
                {p.video && (
                  <span className="absolute left-1/2 top-1/2 grid h-7 w-7 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full bg-night-900/60 text-white" aria-hidden>
                    <Play className="h-3.5 w-3.5 fill-current" />
                  </span>
                )}
              </button>
              {!p.video && (
                <button onClick={() => savePhoto(p, name(i))} className="absolute bottom-0.5 right-0.5 grid h-9 w-9 place-items-center" aria-label={L({ hi: "फ़ोन में सेव करें", en: "Save to phone" })}>
                  <span className="grid h-6 w-6 place-items-center rounded-full bg-white/90 text-ink-900">
                    <Download className="h-3.5 w-3.5" aria-hidden />
                  </span>
                </button>
              )}
            </li>
          ))}
        </ul>
      )}

      {open !== null && <Viewer album={data} index={open} onIndex={setOpen} onClose={() => setOpen(null)} name={name} />}
    </div>
  );
}

function Viewer({ album, index, onIndex, onClose, name }: { album: Album; index: number; onIndex: (i: number) => void; onClose: () => void; name: (i: number) => string }) {
  const L = useL();
  const p = album.photos[index];
  const last = album.photos.length - 1;

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const key = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft" && index > 0) onIndex(index - 1);
      if (e.key === "ArrowRight" && index < last) onIndex(index + 1);
    };
    window.addEventListener("keydown", key);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", key);
    };
  }, [index, last, onClose, onIndex]);

  return createPortal(
    <div className="fixed inset-0 z-50 flex animate-fadeIn flex-col bg-night-950" role="dialog" aria-modal="true" aria-label={album.title}>
      <div className="pt-safe flex items-center justify-between px-2 text-white">
        <button onClick={onClose} className="grid h-12 w-12 place-items-center" aria-label={L({ hi: "बंद करें", en: "Close" })}>
          <X className="h-6 w-6" aria-hidden />
        </button>
        <span className="tnum text-[14px] text-white/80">
          {index + 1} / {album.photos.length}
        </span>
        {!p.video ? (
          <button onClick={() => savePhoto(p, name(index))} className="grid h-12 w-12 place-items-center" aria-label={L({ hi: "फ़ोन में सेव करें", en: "Save to phone" })}>
            <Download className="h-5 w-5" aria-hidden />
          </button>
        ) : (
          <span className="w-12" />
        )}
      </div>
      <div className="relative flex flex-1 items-center justify-center px-2">
        {p.video && p.url ? (
          <video src={p.url} controls playsInline className="max-h-full w-full" />
        ) : (
          <div className="relative w-full max-w-[540px]">
            <EventPicture url={p.video ? null : p.url} scene={p.scene} alt={`${album.title} ${index + 1}`} />
            {p.video && <p className="mt-3 text-center text-[14px] text-white/70">{L({ hi: "वीडियो जल्द यहीं चलेंगे।", en: "Videos will play here soon." })}</p>}
          </div>
        )}
        {index > 0 && (
          <button onClick={() => onIndex(index - 1)} className="absolute left-1 grid h-12 w-12 place-items-center rounded-full text-white" aria-label={L({ hi: "पिछली", en: "Previous" })}>
            <ChevronLeft className="h-7 w-7" aria-hidden />
          </button>
        )}
        {index < last && (
          <button onClick={() => onIndex(index + 1)} className="absolute right-1 grid h-12 w-12 place-items-center rounded-full text-white" aria-label={L({ hi: "अगली", en: "Next" })}>
            <ChevronRight className="h-7 w-7" aria-hidden />
          </button>
        )}
      </div>
      <div className="pb-safe h-10" />
    </div>,
    document.body
  );
}
