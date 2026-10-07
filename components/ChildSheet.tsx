"use client";

import { useEffect } from "react";
import { createPortal } from "react-dom";
import { Check } from "lucide-react";
import { useParent } from "@/lib/parent";
import { useL } from "@/lib/i18n";
import { Avatar } from "./ui";

/** Bottom sheet to choose which child the app shows. Opened from Home and from the top bar. */
export function ChildSheet({ onClose }: { onClose: () => void }) {
  const { me, child, pick } = useParent();
  const L = useL();

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const esc = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", esc);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", esc);
    };
  }, [onClose]);

  if (!me) return null;
  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end justify-center" role="dialog" aria-modal="true" aria-label={L({ hi: "बच्चा चुनें", en: "Choose child" })}>
      <button className="absolute inset-0 animate-fadeIn bg-night-950/50" onClick={onClose} aria-label={L({ hi: "बंद करें", en: "Close" })} />
      <div className="pb-safe relative w-full max-w-[560px] animate-slide-up rounded-t-3xl bg-white px-4 pb-4 pt-2">
        <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-ink-200" aria-hidden />
        <p className="px-1 pb-2 text-lg font-bold text-ink-900">{L({ hi: "किस बच्चे की जानकारी देखनी है?", en: "Whose details do you want to see?" })}</p>
        <ul className="divide-y divide-ink-100">
          {me.children.map((c, i) => {
            const on = c.id === child?.id;
            return (
              <li key={c.id}>
                <button
                  onClick={() => {
                    pick(c.id);
                    onClose();
                  }}
                  className="flex min-h-[72px] w-full items-center gap-3 px-1 py-2 text-left"
                >
                  <Avatar name={c.name} url={c.photoUrl} size={48} tint={i} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[17px] font-semibold text-ink-900">{c.name}</span>
                    <span className="block text-sm text-ink-500">
                      {L({ hi: "कक्षा", en: "Class" })} {c.classSec}
                      {c.rollNo ? ` · ${L({ hi: "रोल", en: "Roll" })} ${c.rollNo}` : ""}
                    </span>
                  </span>
                  {on && <Check className="h-6 w-6 shrink-0 text-brand-600" aria-label={L({ hi: "चुना हुआ", en: "Selected" })} />}
                </button>
              </li>
            );
          })}
        </ul>
      </div>
    </div>,
    document.body
  );
}
