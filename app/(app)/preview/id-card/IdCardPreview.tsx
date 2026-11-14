"use client";

import { useEffect, useRef, useState } from "react";
import QRCode from "qrcode";
import { RotateCw } from "lucide-react";
import { useL } from "@/lib/i18n";
import { initials } from "@/lib/format";
import { M } from "@/lib/text/more";
import { Button } from "@/components/kit";
import type { IdCardData } from "@/components/more/IdCard";

/**
 * Preview copy of components/more/IdCard.tsx, redrawn as a printed card rather than a template.
 * Same content front and back, same flip. CR80 portrait (54 × 85.6 mm), drawn in millimetres and scaled to the phone.
 *
 * Material: off-white card stock, a hairline edge, one deep school green (header band only), ink in two tones.
 * Signature detail: the lanyard slot punched through the top of the card (it shows the page through it on both faces).
 * Radii nest: card 3 mm → emergency box 1.6 mm → photo 0.8 mm.
 */

const CARD_W = 54;
const CARD_H = 85.6;
const MM = 96 / 25.4; // CSS pixels in a millimetre

/** Deep, calm school green. White text on it is well above 7:1. */
const BAND = "#1F4A40";
/** Card stock and inks. */
const STOCK = "#FBFAF7";
const INK = "#1B1C1A";
const INK_2 = "#55574F"; // labels, supporting lines
const RULE = "#DAD7CE"; // hairlines printed on the stock
const PAGE = "#F7F9FC"; // the app background, seen through the punched slot

const longDate = (d: string) => new Date(d + "T00:00:00").toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
const dob = (d: string | null) => (d ? new Date(d + "T00:00:00").toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "—");
const phone = (p?: string) => {
  const d = (p || "").replace(/\D/g, "").slice(-10);
  if (/^(\d)\1{9}$/.test(d)) return "—"; // 9999999999-style placeholders
  return d.length === 10 ? `${d.slice(0, 5)} ${d.slice(5)}` : p || "—";
};
/** "Nursery - A" -> "Nursery – A", as on the printed card. */
const classLabel = (classSec: string) => classSec.replace(/\s*-\s*/, " – ");

interface CardSchool {
  name: string;
  short: string;
  logoUrl: string | null;
  address: string;
  phone: string;
  affiliation: string;
  session: string;
  validTill: string | null;
}

/** The punched lanyard slot: a real hole, so it shows the page behind it, with a faint pressed edge. */
function Slot({ onBand }: { onBand?: boolean }) {
  return (
    <span
      aria-hidden
      className="absolute left-1/2 top-[2.4mm] h-[1.7mm] w-[9mm] -translate-x-1/2 rounded-full"
      style={{ background: PAGE, boxShadow: onBand ? "inset 0 0.15mm 0.2mm rgba(0,0,0,0.35)" : `inset 0 0.15mm 0.2mm rgba(0,0,0,0.18), 0 0 0 0.15mm ${RULE}` }}
    />
  );
}

function Logo({ school, size, onBand }: { school: CardSchool; size: string; onBand?: boolean }) {
  const ring = onBand ? "none" : `0 0 0 0.2mm ${RULE}`;
  return school.logoUrl ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={school.logoUrl} alt="" className="shrink-0 rounded-full bg-white object-contain p-[0.5mm]" style={{ width: size, height: size, boxShadow: ring }} />
  ) : (
    <span className="flex shrink-0 items-center justify-center rounded-full bg-white text-[5.4pt] font-semibold tracking-[0.02em]" style={{ width: size, height: size, color: BAND, boxShadow: ring }}>
      {school.short}
    </span>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <>
      <dt style={{ color: INK_2 }}>{label}</dt>
      <dd className="min-w-0 truncate font-medium tabular-nums">{value}</dd>
    </>
  );
}

function Front({ c, school }: { c: IdCardData["child"]; school: CardSchool }) {
  return (
    <div className="relative flex h-full w-full flex-col overflow-hidden rounded-[3mm]" style={{ background: STOCK, color: INK }}>
      <div className="relative px-[3.4mm] pb-[3mm] pt-[5.6mm] text-white" style={{ background: BAND }}>
        <Slot onBand />
        <div className="flex items-center gap-[2mm]">
          <Logo school={school} size="8mm" onBand />
          <div className="min-w-0 leading-[1.2]">
            <div className="line-clamp-2 text-[7.6pt] font-semibold">{school.name}</div>
            <div className="mt-[0.4mm] truncate text-[5.4pt] text-white/80">{school.address}</div>
            {school.affiliation && <div className="truncate text-[5.2pt] text-white/70">{school.affiliation}</div>}
          </div>
        </div>
      </div>

      <div className="mt-[3.6mm] flex justify-center">
        {/* Passport proportion, 35 × 45 */}
        {c.photoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={c.photoUrl} alt="" className="h-[21.6mm] w-[16.8mm] rounded-[0.8mm] object-cover" style={{ boxShadow: `0 0 0 0.2mm ${RULE}` }} />
        ) : (
          <span
            className="flex h-[21.6mm] w-[16.8mm] items-center justify-center rounded-[0.8mm] text-[12pt] font-medium tracking-[0.04em]"
            style={{ background: "#EEECE6", color: "#6E6C64", boxShadow: `0 0 0 0.2mm ${RULE}` }}
          >
            {initials(c.name)}
          </span>
        )}
      </div>

      <div className="px-[3.4mm] pt-[2.2mm] text-center">
        <div className="line-clamp-2 text-[9.6pt] font-semibold leading-[1.2] tracking-[-0.005em]">{c.name}</div>
        <div className="mt-[0.6mm] text-[6.6pt] font-medium" style={{ color: BAND }}>
          Class {classLabel(c.classSec)}
        </div>
      </div>

      <div className="mx-[3.4mm] mt-[2.4mm] border-t-[0.2mm]" style={{ borderColor: RULE }} />

      <dl className="mt-[2mm] grid grid-cols-[11.5mm_minmax(0,1fr)] gap-x-[1.6mm] gap-y-[0.9mm] px-[3.4mm] text-[6.3pt] leading-[1.25]">
        <Field label="Adm. no." value={c.admissionNo || c.srNo || "—"} />
        <Field label="Roll no." value={c.rollNo || "—"} />
        <Field label="Father" value={c.fatherName || "—"} />
        <Field label="D.O.B." value={dob(c.dob)} />
        <Field label="Mobile" value={phone(c.mobile)} />
      </dl>

      <div className="mt-auto flex items-end justify-between px-[3.4mm] pb-[2mm] pt-[2mm] text-[5.6pt]" style={{ color: INK_2 }}>
        <span className="tabular-nums">Session {school.session}</span>
        <span className="w-[16mm] border-t-[0.2mm] pt-[0.5mm] text-center" style={{ borderColor: "#8E8C83" }}>
          Principal
        </span>
      </div>
      <div className="mx-[3.4mm] flex h-[4.4mm] items-center justify-center border-t-[0.2mm] text-[5.8pt] font-medium tabular-nums" style={{ borderColor: RULE, color: BAND }}>
        {school.phone ? `Ph. ${phone(school.phone)}` : school.name}
      </div>
    </div>
  );
}

function Back({ c, school }: { c: IdCardData["child"]; school: CardSchool }) {
  return (
    <div className="relative flex h-full w-full flex-col overflow-hidden rounded-[3mm]" style={{ background: STOCK, color: INK }}>
      <Slot />
      <div className="flex flex-1 flex-col px-[3.4mm] pt-[6.4mm]">
        <p className="text-center text-[5.6pt]" style={{ color: INK_2 }}>
          If found, please return to
        </p>
        <div className="mt-[1.2mm] flex flex-col items-center text-center">
          <Logo school={school} size="7mm" />
          <div className="mt-[1mm] text-[7.6pt] font-semibold leading-[1.2]" style={{ color: BAND }}>
            {school.name}
          </div>
          <div className="mt-[0.4mm] text-[5.8pt] leading-[1.3]" style={{ color: INK_2 }}>
            {school.address}
          </div>
          {school.phone && <div className="mt-[0.2mm] text-[6pt] font-medium tabular-nums">Ph. {phone(school.phone)}</div>}
        </div>

        <div className="mt-[3mm] rounded-[1.6mm] border-[0.2mm] px-[2.4mm] py-[1.8mm]" style={{ borderColor: RULE }}>
          <div className="text-[5.6pt]" style={{ color: INK_2 }}>
            In emergency, call
          </div>
          <div className="mt-[0.3mm] text-[6.8pt] font-medium leading-[1.2]">{c.fatherName || "Parent"}</div>
          <div className="text-[8.6pt] font-semibold tabular-nums leading-[1.25]" style={{ color: BAND }}>
            {phone(c.mobile)}
          </div>
        </div>

        <div className="mt-[2.4mm] flex items-start gap-[2.4mm]">
          <dl className="min-w-0 flex-1 space-y-[1.2mm] text-[6.2pt] leading-[1.3]">
            <div>
              <dt className="text-[5.6pt]" style={{ color: INK_2 }}>
                Address
              </dt>
              <dd className="line-clamp-3">{c.address || "—"}</dd>
            </div>
            <div>
              <dt className="text-[5.6pt]" style={{ color: INK_2 }}>
                Transport
              </dt>
              <dd className="line-clamp-2">{c.bus || "Own"}</dd>
            </div>
          </dl>
          <StudentQr c={c} school={school} />
        </div>

        <ul className="mt-auto list-disc space-y-[0.4mm] border-t-[0.2mm] pb-[1.8mm] pl-[2.6mm] pt-[1.6mm] marker:text-[#A8A59B] text-[5.3pt] leading-[1.3]" style={{ borderColor: RULE, color: INK_2 }}>
          <li>This card belongs to the school and cannot be transferred.</li>
          <li>Carry it every day and show it when asked.</li>
          <li>Tell the school office at once if it is lost.</li>
        </ul>
      </div>
      <div className="flex h-[4.6mm] items-center justify-center text-[5.8pt] font-medium tabular-nums text-white" style={{ background: BAND }}>
        {school.validTill ? `Valid till ${longDate(school.validTill)}` : `Session ${school.session}`}
      </div>
    </div>
  );
}

/** Same QR as the printed card: the child's identity as plain text, drawn as SVG. */
function StudentQr({ c, school }: { c: IdCardData["child"]; school: CardSchool }) {
  const text = [c.name, `Class ${classLabel(c.classSec)}`, `SR no. ${c.srNo}`, c.admissionNo ? `Adm. no. ${c.admissionNo}` : "", school.name].filter(Boolean).join("\n");
  const qr = QRCode.create(text, { errorCorrectionLevel: "M" });
  const n = qr.modules.size;
  let d = "";
  for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) if (qr.modules.get(x, y)) d += `M${x} ${y}h1v1h-1z`;
  return (
    <svg viewBox={`-1 -1 ${n + 2} ${n + 2}`} className="h-[15mm] w-[15mm] shrink-0" role="img" aria-label={`QR code for ${c.name}`} shapeRendering="crispEdges">
      <rect x={-1} y={-1} width={n + 2} height={n + 2} fill={STOCK} />
      <path d={d} fill={INK} />
    </svg>
  );
}

function Face({ scale, back, children }: { scale: number; back?: boolean; children: React.ReactNode }) {
  return (
    <div
      className={`absolute inset-0 overflow-hidden rounded-[3mm] [backface-visibility:hidden] ${back ? "[transform:rotateY(180deg)]" : ""}`}
      style={{ boxShadow: `0 0 0 0.5px #CFCBC0, 0 1px 2px rgba(24,24,20,0.06), 0 14px 28px -14px rgba(24,24,20,0.30)` }}
    >
      <div style={{ width: `${CARD_W}mm`, height: `${CARD_H}mm`, transform: `scale(${scale})`, transformOrigin: "top left", lineHeight: 1.2, letterSpacing: "normal" }}>{children}</div>
    </div>
  );
}

export function IdCardPreview({ data }: { data: IdCardData }) {
  const L = useL();
  const ref = useRef<HTMLDivElement>(null);
  const [flipped, setFlipped] = useState(false);
  const [scale, setScale] = useState(1.5);
  const { child: c, school: s, card } = data;
  const school: CardSchool = {
    name: card?.name || s.name,
    short: card?.short || s.shortName || initials(s.name),
    logoUrl: s.logoUrl,
    address: card?.address || s.address,
    phone: card?.phone || s.officePhone,
    affiliation: card?.affiliation || "",
    session: data.session,
    validTill: card?.validTill || null,
  };

  // As wide as the column allows, capped so the card, its control and the note fit on one phone screen.
  useEffect(() => {
    const fit = () => setScale(Math.min(1.6, (ref.current?.clientWidth || 300) / (CARD_W * MM)));
    fit();
    window.addEventListener("resize", fit);
    return () => window.removeEventListener("resize", fit);
  }, []);

  const turn = () => setFlipped((f) => !f);
  const w = CARD_W * MM * scale;
  const h = CARD_H * MM * scale;

  return (
    <div className="flex flex-col items-center">
      <div ref={ref} className="w-full max-w-[320px]">
        <div className="mx-auto [perspective:1600px]" style={{ width: w, height: h }}>
          <div
            role="button"
            tabIndex={0}
            onClick={turn}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                turn();
              }
            }}
            aria-pressed={flipped}
            aria-label={L(M.studentId)}
            className="relative h-full w-full cursor-pointer select-none rounded-[3mm] transition-transform duration-700 [transform-style:preserve-3d] [transition-timing-function:cubic-bezier(0.3,0.9,0.3,1)] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#0D2A5E]/25 motion-reduce:duration-0"
            style={{ transform: flipped ? "rotateY(180deg)" : "none" }}
          >
            <Face scale={scale}>
              <Front c={c} school={school} />
            </Face>
            <Face scale={scale} back>
              <Back c={c} school={school} />
            </Face>
          </div>
        </div>
      </div>
      <Button kind="line" onClick={turn} aria-pressed={flipped} className="mt-6 min-w-[176px]">
        <RotateCw className="h-5 w-5" strokeWidth={1.75} aria-hidden />
        {flipped ? L({ hi: "आगे का हिस्सा देखें", en: "Show front" }) : L({ hi: "पीछे का हिस्सा देखें", en: "Show back" })}
      </Button>
    </div>
  );
}
