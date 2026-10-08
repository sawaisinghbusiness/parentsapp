"use client";

import { useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import clsx from "clsx";
import { Bus, ChevronRight, IdCard, Phone, Repeat2, UserRound } from "lucide-react";
import { useParent } from "@/lib/parent";
import { useL } from "@/lib/i18n";
import { phoneText } from "@/lib/format";
import { Avatar, SchoolMark } from "./ui";

/**
 * Tapping the child's photo on Home: a card grows out of the photo (top right) instead of jumping to
 * Profile. On it, a small ID card that turns over on tap (front: who; back: family, mobile, bus),
 * the other children to switch to, and the way on to Profile or the full ID card.
 */
export function ProfilePeek({ onClose }: { onClose: () => void }) {
  const { me, child, pick } = useParent();
  const L = useL();
  const [flipped, setFlipped] = useState(false);
  // Until the first tap, the card leans once to show it can be turned over.
  const [touched, setTouched] = useState(false);
  const [leaving, setLeaving] = useState(false);

  // Plays the card back into the photo, then unmounts.
  const close = useCallback(() => {
    setLeaving(true);
    setTimeout(onClose, 200);
  }, [onClose]);

  useEffect(() => {
    const esc = (e: KeyboardEvent) => e.key === "Escape" && close();
    window.addEventListener("keydown", esc);
    return () => window.removeEventListener("keydown", esc);
  }, [close]);

  if (!me || !child) return null;
  const tint = Math.max(0, me.children.findIndex((c) => c.id === child.id));
  const others = me.children.filter((c) => c.id !== child.id);

  return createPortal(
    <div className={clsx("fixed inset-0 z-50", leaving && "peek-leaving")} role="dialog" aria-modal="true" aria-label={child.name}>
      <button className="peek-backdrop absolute inset-0 bg-night-950/35 backdrop-blur-[2px]" onClick={close} aria-label={L({ hi: "बंद करें", en: "Close" })} />
      <div className="pt-safe pointer-events-none absolute inset-x-0 top-0 mx-auto max-w-[560px] px-3">
        <div className="peek-card pointer-events-auto ml-auto mt-[62px] w-full max-w-[340px] rounded-3xl bg-white p-3 shadow-[0_18px_50px_rgba(11,34,82,0.28)]">
          <button
            className="flip block w-full text-left"
            onClick={() => {
              setTouched(true);
              setFlipped((f) => !f);
            }}
            aria-pressed={flipped}
            aria-label={flipped ? L({ hi: "कार्ड का आगे का हिस्सा दिखाएँ", en: "Show front of card" }) : L({ hi: "कार्ड पलटें", en: "Turn the card over" })}
          >
            <span className={clsx("flip-inner", flipped && "is-flipped", !touched && "nudge")}>
              {/* Front: who */}
              <span className="flip-face id-face">
                <span className="flex items-center gap-2 text-[11.5px] font-semibold uppercase tracking-[0.06em] text-white/85">
                  <SchoolMark name={me.school.name} url={me.school.logoUrl} size={22} />
                  <span className="truncate">{me.school.name}</span>
                </span>
                <span className="mt-3 flex items-center gap-3">
                  <span className="peek-photo rounded-full ring-[3px] ring-white/90">
                    <Avatar name={child.name} url={child.photoUrl} size={64} tint={tint} />
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate text-[19px] font-bold leading-tight text-white">{child.name}</span>
                    <span className="mt-0.5 block text-[13.5px] text-white/85">
                      {L({ hi: "कक्षा", en: "Class" })} {child.classSec.replace(/\s*-\s*/, "-")}
                      {child.rollNo && ` · ${L({ hi: "रोल", en: "Roll" })} ${child.rollNo}`}
                    </span>
                    {child.srNo && <span className="tnum mt-1 inline-block rounded-md bg-white/15 px-1.5 py-0.5 text-[11.5px] font-semibold tracking-wide text-white">{/^SR/i.test(child.srNo) ? child.srNo : `SR ${child.srNo}`}</span>}
                  </span>
                </span>
                <span className="flip-hint mt-3 flex items-center justify-end gap-1 text-[11.5px] font-medium text-white/75">
                  <Repeat2 className="h-3.5 w-3.5" aria-hidden />
                  {L({ hi: "पलटने के लिए छुएँ", en: "Tap to turn over" })}
                </span>
              </span>

              {/* Back: family, mobile, bus */}
              <span className="flip-face flip-back id-face">
                <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1.5 text-[13px]">
                  {child.fatherName && (
                    <>
                      <dt className="text-white/70">{L({ hi: "पिता", en: "Father" })}</dt>
                      <dd className="truncate font-semibold text-white">{child.fatherName}</dd>
                    </>
                  )}
                  {child.motherName && (
                    <>
                      <dt className="text-white/70">{L({ hi: "माता", en: "Mother" })}</dt>
                      <dd className="truncate font-semibold text-white">{child.motherName}</dd>
                    </>
                  )}
                  <dt className="text-white/70">{L({ hi: "मोबाइल", en: "Mobile" })}</dt>
                  <dd className="tnum flex items-center gap-1 font-semibold text-white">
                    <Phone className="h-3.5 w-3.5" aria-hidden />
                    {phoneText(me.phone)}
                  </dd>
                  {child.admissionNo && (
                    <>
                      <dt className="text-white/70">{L({ hi: "प्रवेश सं.", en: "Adm. no" })}</dt>
                      <dd className="tnum truncate font-semibold text-white">{child.admissionNo}</dd>
                    </>
                  )}
                  <dt className="text-white/70">{L({ hi: "बस", en: "Bus" })}</dt>
                  <dd className="flex min-w-0 items-center gap-1 font-semibold text-white">
                    <Bus className="h-3.5 w-3.5 shrink-0" aria-hidden />
                    <span className="truncate">{child.bus ? child.busRoute || L({ hi: "स्कूल बस", en: "School bus" }) : L({ hi: "नहीं", en: "No" })}</span>
                  </dd>
                </dl>
                <span className="flip-hint mt-2 flex items-center justify-end gap-1 text-[11.5px] font-medium text-white/75">
                  <Repeat2 className="h-3.5 w-3.5" aria-hidden />
                  {L({ hi: "वापस पलटें", en: "Turn back" })}
                </span>
              </span>
            </span>
          </button>

          {others.length > 0 && (
            <div className="peek-item mt-3 px-1" style={{ "--i": 1 } as React.CSSProperties}>
              <p className="mb-1.5 text-[12px] font-semibold uppercase tracking-[0.05em] text-ink-400">{L({ hi: "दूसरे बच्चे", en: "Switch to" })}</p>
              <div className="flex flex-wrap gap-2">
                {others.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => {
                      pick(c.id);
                      close();
                    }}
                    className="flex min-h-[44px] items-center gap-2 rounded-full border border-ink-200 py-1 pl-1 pr-3 text-[14px] font-semibold text-ink-900 active:bg-ink-50"
                  >
                    <Avatar name={c.name} url={c.photoUrl} size={34} tint={me.children.findIndex((x) => x.id === c.id)} />
                    {c.name.split(" ")[0]}
                  </button>
                ))}
              </div>
            </div>
          )}

          <ul className="mt-2">
            {[
              { href: "/profile/", icon: UserRound, text: L({ hi: "पूरी प्रोफ़ाइल", en: "Full profile" }) },
              { href: "/id-card/", icon: IdCard, text: L({ hi: "आईडी कार्ड", en: "ID card" }) },
            ].map(({ href, icon: Icon, text }, k) => (
              <li key={href} className="peek-item" style={{ "--i": k + 2 } as React.CSSProperties}>
                <Link href={href} onClick={onClose} className="flex min-h-[50px] items-center gap-3 rounded-xl px-1.5 text-[15px] font-semibold text-ink-900 active:bg-ink-50">
                  <span className="grid h-9 w-9 place-items-center rounded-xl bg-brand-50 text-brand-600">
                    <Icon className="h-[19px] w-[19px]" strokeWidth={1.9} aria-hidden />
                  </span>
                  <span className="flex-1">{text}</span>
                  <ChevronRight className="h-[18px] w-[18px] text-ink-400" aria-hidden />
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>,
    document.body
  );
}
